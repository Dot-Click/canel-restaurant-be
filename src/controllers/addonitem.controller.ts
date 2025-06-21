import { database } from "@/configs/connection.config";
import { addon, addonItem, addonItemInsertSchema } from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import formidable from "formidable";
import status from "http-status";
import { extractFormFields } from "@/utils/formdata.util";
import cloudinary from "@/configs/cloudinary.config";

interface FormData {
  name: string;
  description: string;
  price: string;
  addonId: string;
}

export const createAddonItem = async (req: Request, res: Response) => {
  try {
    const form = formidable();
    // step 1 parse form
    const [formData, files] = await form.parse<any, "addonImage">(req);
    const addonImage = files.addonImage?.[0];

    // step 2 extract fields
    const fields = extractFormFields<FormData>(formData);

    // step 3 validate fields
    const { data, error } = addonItemInsertSchema.safeParse(fields);
    console.log("This is fields", files);

    if (!data) {
      logger.error("Validation failed", error);
      return res.status(status.UNPROCESSABLE_ENTITY).json({
        message: "Validation error",
        error: error?.format(),
      });
    }

    // validate incoming image
    if (!addonImage) {
      return res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "Image not provided" });
    }

    // upload to cloudinary
    const cloudinaryResponse = await cloudinary.uploader.upload(
      addonImage.filepath,
      {
        folder: "addon",
        use_filename: true,
        unique_filename: false,
      }
    );

    if (!cloudinaryResponse) {
      return res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "Problem with image" });
    }

    // return console.log("this is cloudinary response", cloudinaryResponse);

    // public url

    const insertedAddon = await database
      .insert(addonItem)
      .values({
        name: fields.name!,
        description: fields.description!,
        price: fields.price!,
        image: cloudinaryResponse.secure_url,
        addonId: fields.addonId!,
        ...fields,
      })
      .returning();
    console.log("this is Addon product", insertedAddon);
    if (insertedAddon[0]) {
      return res.status(status.CREATED).json({
        message: "Addon inserted successfully",
        data: insertedAddon[0],
      });
    }
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const deleteAddonItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "Addon doesn't exit" });
    }

    const db = await database.delete(addon).where(eq(addon.id, id)).returning();

    res.status(status.OK).json(db);
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const fetchAddonItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    let addonItem;

    if (id) {
      addonItem = await database.query.addonItem.findFirst({
        with: { addon: true },
        where: (addonItem, { eq }) => eq(addonItem.id, id),
      });
    } else {
      addonItem = await database.query.addonItem.findMany({
        with: { addon: true },
      });
    }

    res.status(status.OK).json({
      message: "addon Item fetched successfully",
      data: addonItem,
    });
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};
