import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import { productInsertSchema, products } from "@/schema/schema";
import formidable from "formidable";
import { extractFormFields } from "@/utils/formdata.util";
import cloudinary from "@/configs/cloudinary.config";

interface FormData {
  name: string;
  price: string;
  description: string;
  categoryId: string;
}

export const insertController = async (req: Request, res: Response) => {
  try {
    const form = formidable();

    // step 1 parse form
    const [formData, files] = await form.parse<any, "productImage">(req);
    const productImage = files.productImage?.[0];

    // step 2 extract fields
    const fields = extractFormFields<FormData>(formData);

    // step 3 validate fields
    const { data, error } = productInsertSchema.safeParse(fields);

    if (!data) {
      logger.error("Validation failed", error);
      return res.status(status.UNPROCESSABLE_ENTITY).json({
        message: "Validation error",
        error: error?.format(),
      });
    }

    // validate incoming image
    if (!productImage) {
      return res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "Image not provided" });
    }

    // upload to cloudinary
    const cloudinaryResponse = await cloudinary.uploader.upload(
      productImage.filepath,
      {
        folder: "products",
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

    const insertedProduct = await database
      .insert(products)
      .values({
        name: fields.name!,
        description: fields.description!,
        price: fields.price!,
        image: cloudinaryResponse.secure_url,
        categoryId: fields.categoryId!,
      })
      .returning();

    if (insertedProduct[0]) {
      return res.status(status.CREATED).json({
        message: "Product inserted successfully",
        data: insertedProduct[0],
      });
    }
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};
