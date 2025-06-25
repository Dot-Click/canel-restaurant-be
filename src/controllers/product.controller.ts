import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import {
  branch,
  productBranches,
  productInsertSchema,
  products,
} from "@/schema/schema";
import formidable from "formidable";
import { extractFormFields } from "@/utils/formdata.util";
import cloudinary from "@/configs/cloudinary.config";
import { and, eq, or } from "drizzle-orm";

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

export const assignProductToBranch = async (req: Request, res: Response) => {
  const { productId, branchId } = req.body;

  if (!productId || !branchId) {
    return res.status(400).json({ error: "Missing productId or branchId" });
  }

  try {
    await database.insert(productBranches).values({ productId, branchId });
    return res.status(201).json({ message: "Product assigned to branch." });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Server error assigning product to branch." });
  }
};

export const removeProductFromBranch = async (req: Request, res: Response) => {
  const { productId, branchId } = req.body;

  try {
    await database
      .delete(productBranches)
      .where(
        and(
          eq(productBranches.productId, productId),
          eq(productBranches.branchId, branchId)
        )
      );

    return res.status(200).json({ message: "Product removed from branch." });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to remove product from branch." });
  }
};

export const getProductsForBranch = async (req: Request, res: Response) => {
  const { branchId } = req.params;

  try {
    const branchProducts = await database
      .select()
      .from(products)
      .leftJoin(productBranches, eq(products.id, productBranches.productId))
      .where(
        or(eq(products.isGlobal, true), eq(productBranches.branchId, branchId))
      );

    return res.status(200).json(branchProducts);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to fetch products for branch." });
  }
};

export const getBranchesForProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    const result = await database
      .select()
      .from(productBranches)
      .innerJoin(branch, eq(productBranches.branchId, branch.id))
      .where(eq(productBranches.productId, productId));

    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Failed to fetch branches for product." });
  }
};
