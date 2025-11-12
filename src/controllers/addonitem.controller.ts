import { database } from "@/configs/connection.config";
import {
  addonItem,
  addonItemInsertSchema,
  addonItemUpdateSchema,
  // type AddonItem,
} from "@/schema/schema";
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
    const { id } = req.params;

    if (!id) {
      res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "Addon doesn't exit" });
    }

    const db = await database
      .delete(addonItem)
      .where(eq(addonItem.id, id))
      .returning();

    if (db.length === 0) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Addon item not found" });
    }

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

export const updateAddonItemController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Addon Item ID is required." });
    }

    let validatedData: Partial<typeof addonItem.$inferInsert> = {};

    if (req.is("application/json")) {
      const { data, error } = addonItemUpdateSchema.safeParse(req.body);

      if (error) {
        return res
          .status(status.UNPROCESSABLE_ENTITY)
          .json({ message: "Validation error", error: error.format() });
      }
      validatedData = {
        ...data,
        price: data.price !== undefined ? String(data.price) : undefined,
      };
    } else if (req.is("multipart/form-data")) {
      const form = formidable();
      const [formData, files] = await form.parse(req);

      const newAddonItemImage = files.addonItemImage?.[0];

      const fields =
        extractFormFields<typeof addonItemUpdateSchema._type>(formData);

      const { data, error } = addonItemUpdateSchema.safeParse(fields);

      if (error) {
        return res
          .status(status.UNPROCESSABLE_ENTITY)
          .json({ message: "Validation error", error: error.format() });
      }
      validatedData = {
        ...data,
        price: data.price !== undefined ? String(data.price) : undefined,
      };

      if (newAddonItemImage) {
        const existingItem = await database.query.addonItem.findFirst({
          where: eq(addonItem.id, id),
          columns: { image: true },
        });

        if (existingItem?.image) {
          const publicId = existingItem.image.split("/").pop()?.split(".")[0];
          if (publicId)
            await cloudinary.uploader.destroy(`addon_items/${publicId}`);
        }

        const cloudinaryResponse = await cloudinary.uploader.upload(
          newAddonItemImage.filepath,
          { folder: "addon_items" }
        );
        validatedData.image = cloudinaryResponse.secure_url;
      }
    } else {
      return res
        .status(status.UNSUPPORTED_MEDIA_TYPE)
        .json({ message: "Content-Type not supported." });
    }

    if (Object.keys(validatedData).length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "No fields provided to update." });
    }

    const updatedAddonItem = await database
      .update(addonItem)
      .set(validatedData)
      .where(eq(addonItem.id, id))
      .returning();

    if (updatedAddonItem.length === 0) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Addon Item not found" });
    }

    res.status(status.OK).json({
      message: "Addon Item updated successfully",
      data: updatedAddonItem[0],
    });
  } catch (error) {
    logger.error("Failed to update addon item:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};
