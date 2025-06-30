import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import {
  productInsertSchema,
  products,
  productUpdateSchema,
} from "@/schema/schema";
import formidable from "formidable";
import { extractFormFields } from "@/utils/formdata.util";
import cloudinary from "@/configs/cloudinary.config";
import { eq } from "drizzle-orm";

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
    console.log("This is fields", data);

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
        ...fields,
      })
      .returning();
    console.log("this is inserted product", insertedProduct);
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

export const deleteController = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "Product ID is required" });
    }

    const productsToDelete = await database
      .select({
        image: products.image,
      })
      .from(products)
      .where(eq(products.id, id));

    const product = productsToDelete[0];

    if (!product) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Product not found" });
    }

    if (product.image) {
      const publicId = product.image.split("/").pop()?.split(".")[0];
      const folder = "products";

      if (publicId) {
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      }
    }

    const deletedProduct = await database
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    if (deletedProduct.length === 0) {
      return res.status(status.NOT_FOUND).json({
        message: "Product not found, it may have already been deleted.",
      });
    }

    res.status(status.OK).json({
      message: "Product deleted successfully",
      data: deletedProduct[0],
    });
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const fetchController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let productData;

    if (id) {
      // Fetch a single product
      productData = await database.query.products.findFirst({
        // Define the 'with' clause inline here
        with: {
          category: true, // TypeScript now correctly infers this as the literal 'true'
        },
        where: eq(products.id, id),
      });
    } else {
      // Fetch all products
      productData = await database.query.products.findMany({
        // Define the 'with' clause inline here as well
        with: {
          category: true,
        },
        orderBy: (products, { desc }) => [desc(products.createdAt)],
      });
    }

    if (
      !productData ||
      (Array.isArray(productData) && productData.length === 0)
    ) {
      return res.status(status.OK).json({
        message: "No products found",
        data: Array.isArray(productData) ? [] : null, // Ensure consistent response type
      });
    }

    res.status(status.OK).json({
      message: "Product(s) fetched successfully",
      data: productData,
    });
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const updateController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Product ID is required." });
    }

    let validatedData: Partial<typeof products.$inferInsert> = {};
    console.log(validatedData);
    // --- Scenario 1: Simple JSON update (for the availability switch) ---
    if (req.is("application/json")) {
      const { data, error } = productUpdateSchema.safeParse(req.body);
      if (error) {
        return res
          .status(status.UNPROCESSABLE_ENTITY)
          .json({ message: "Validation error", error: error.format() });
      }
      // Ensure price is a string to match the database schema
      validatedData = {
        ...data,
        price: data.price !== undefined ? String(data.price) : undefined,
      };
    }
    // --- Scenario 2: Full form update (for editing name, description, image, etc.) ---
    else if (req.is("multipart/form-data")) {
      const form = formidable();
      const [formData, files] = await form.parse(req);
      const newProductImage = files.productImage?.[0];

      const fields = extractFormFields<FormData>(formData);
      const { data, error } = productUpdateSchema.safeParse(fields);

      if (error) {
        return res
          .status(status.UNPROCESSABLE_ENTITY)
          .json({ message: "Validation error", error: error.format() });
      }

      validatedData = {
        ...data,
        price: data.price !== undefined ? String(data.price) : undefined,
      };

      if (newProductImage) {
        const existingProduct = await database.query.products.findFirst({
          where: eq(products.id, id),
          columns: { image: true },
        });
        if (existingProduct?.image) {
          const publicId = existingProduct.image
            .split("/")
            .pop()
            ?.split(".")[0];
          if (publicId)
            await cloudinary.uploader.destroy(`products/${publicId}`);
        }

        const cloudinaryResponse = await cloudinary.uploader.upload(
          newProductImage.filepath,
          { folder: "products" }
        );
        validatedData.image = cloudinaryResponse.secure_url;
      }
    }
    // --- Handle unsupported types ---
    else {
      return res
        .status(status.UNSUPPORTED_MEDIA_TYPE)
        .json({ message: "Content-Type not supported." });
    }

    // --- Common logic for both scenarios from here ---

    if (Object.keys(validatedData).length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "No fields provided to update." });
    }

    const updatedProduct = await database
      .update(products)
      .set(validatedData)
      .where(eq(products.id, id))
      .returning();

    if (updatedProduct.length === 0) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Product not found" });
    }

    res.status(status.OK).json({
      message: "Product updated successfully",
      data: updatedProduct[0],
    });
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};
