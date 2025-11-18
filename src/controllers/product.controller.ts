import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import {
  category,
  productInsertSchema,
  products,
  productUpdateSchema,
} from "@/schema/schema";
import formidable from "formidable";
import { extractFormFields } from "@/utils/formdata.util";
import cloudinary from "@/configs/cloudinary.config";
import { eq, or, isNull, ilike, sql } from "drizzle-orm";
// import * as XLSX from "xlsx";

// import ExcelJS from "exceljs";
import fs from "fs";
import Papa from "papaparse";

interface FormData {
  name: string;
  price: string;
  description: string;
  categoryId: string;
  addonItemIds: string[];
  availability: string;
}

export const insertController = async (req: Request, res: Response) => {
  try {
    const form = formidable();

    const [formData, files] = await form.parse<any, "productImage">(req);
    const productImage = files.productImage?.[0];

    console.log(formData);
    let variants = [];
    if (formData.variants && formData.variants[0]) {
      try {
        variants = JSON.parse(formData.variants[0]);
      } catch (e) {
        return res.status(status.BAD_REQUEST).json({
          message:
            "Invalid variants format. Please provide a valid JSON array.",
        });
      }
    }

    let addonItemIds: string[] = [];

    if (formData.addonItemIds) {
      addonItemIds = Array.isArray(formData.addonItemIds)
        ? formData.addonItemIds
        : [formData.addonItemIds];
    }

    const otherFields =
      extractFormFields<Omit<FormData, "addonItemIds">>(formData);

    const payloadToValidate = {
      ...otherFields,
      addonItemIds,
      variants, // MODIFICATION: Add parsed variants to the payload
      availability: Array.isArray(otherFields.availability)
        ? otherFields.availability[0] === "true"
        : otherFields.availability === "true",
    };

    const { data, error } = productInsertSchema.safeParse(payloadToValidate);

    if (!data) {
      console.log(error);
      logger.error("Validation failed", error);
      return res.status(status.UNPROCESSABLE_ENTITY).json({
        message: "Please provide all nesscary data.",
        error: error?.format(),
      });
    }

    if (!productImage) {
      return res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "Image not provided" });
    }
    const cloudinaryResponse = await cloudinary.uploader.upload(
      productImage.filepath,
      { folder: "products" }
    );
    if (!cloudinaryResponse) {
      return res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "Problem with image" });
    }

    const insertedProduct = await database
      .insert(products)
      .values({
        name: data.name,
        description: data.description,
        price: String(data.price),
        image: cloudinaryResponse.secure_url,
        categoryId: data.categoryId,
        discount: data.discount,
        availability: data.availability,
        addonItemIds: data.addonItemIds || [],
        variants: data.variants || [],
      })
      .returning();

    if (insertedProduct[0]) {
      return res.status(status.CREATED).json({
        message: "Product added successfully",
        data: insertedProduct[0],
      });
    } else {
      // It's good practice to handle the case where insertion might fail silently
      throw new Error("Product could not be created.");
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
    const { search, wati } = req.query;

    let productData;

    console.log("This is the search", search);

    if (id) {
      productData = await database.query.products.findFirst({
        with: { category: true },
        where: eq(products.id, id),
      });
    } else if (search && typeof search === "string") {
      productData = await database.query.products.findMany({
        with: { category: true },
        where: ilike(products.name, `%${search.toLowerCase()}%`),
        orderBy: (products, { desc }) => [desc(products.createdAt)],
      });
      console.log("This is the product data", productData);
    } else {
      productData = await database.query.products.findMany({
        with: { category: true },
        orderBy: (products, { desc }) => [desc(products.createdAt)],
      });
    }

    if (
      !productData ||
      (Array.isArray(productData) && productData.length === 0)
    ) {
      return res.status(status.OK).json({
        message: "No products found",
        data: Array.isArray(productData) ? [] : null,
      });
    }

    if (wati && wati.toString().toLowerCase() === "true") {
      if (Array.isArray(productData)) {
        const menuList = productData
          .map((p, i) => `${i + 1}. ${p.name} -- ${p.price}`)
          .join("\n");
        return res.status(status.OK).json({
          menu: menuList,
          items: productData.map((p, i) => ({
            number: i + 1,
            id: p.id,
            name: p.name,
            price: p.price,
          })),
        });
      } else {
        return res.status(status.OK).json({
          menu: `1. ${productData.name} -- ${productData.price}`,
          items: [
            {
              number: 1,
              id: productData.id,
              name: productData.name,
              price: productData.price,
            },
          ],
        });
      }
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

export const insertBulkController = async (req: any, res: any) => {
  try {
    const form = formidable({ multiples: false, maxFields: 20000 });
    const [_fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) return res.status(400).json({ message: "Archivo faltante" });

    const csvContent = fs.readFileSync(file.filepath, "utf-8");

    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data as any[];

    if (!rows.length) {
      return res.status(400).json({ message: "El CSV está vacío" });
    }

    const formatted = await Promise.all(
      rows.map(async (row, index) => {
        console.log(row);
        const name = (row["Nombre"] || "").trim();
        const categoryRaw = (
          row["Categoría"] ||
          row["Categorías"] ||
          ""
        ).trim();
        const price = row["Precio normal"] || "0";
        const imageUrl = (row["Imágenes"] || row["Imagen"] || "").trim();

        if (!categoryRaw) {
          throw new Error(`La categoría está vacía en la fila ${index + 2}`);
        }

        const categoryName = categoryRaw.toLowerCase();

        console.log(categoryName);

        // Lookup category case-insensitively
        const [existingCategory] = await database
          .select()
          .from(category)
          .where(sql`LOWER(${category.name}) = ${categoryName}`);

        if (!existingCategory) {
          throw new Error(
            `La categoría '${categoryRaw}' no existe en la fila ${index + 2}`
          );
        }

        const categoryId = existingCategory.id;

        // Handle image
        let imgURL = "";
        if (imageUrl) {
          if (!imageUrl.startsWith("http")) {
            const upload = await cloudinary.uploader.upload(imageUrl, {
              folder: "products",
            });
            imgURL = upload.secure_url;
          } else {
            imgURL = imageUrl;
          }
        }

        return {
          name,
          description: "",
          price,
          categoryId,
          image: imgURL,
          availability: true,
        };
      })
    );

    const inserted = await database
      .insert(products)
      .values(formatted)
      .returning();

    res.json({ message: "Productos subidos correctamente", data: inserted });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message });
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

    if (req.is("application/json")) {
      const { data, error } = productUpdateSchema.safeParse(req.body);

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
    } else {
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

export const getProductsForBranch = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.params;
    const { wati } = req.query;

    if (!branchId) {
      return res.status(400).json({ error: "Branch ID is required." });
    }

    const availableProductsCTE = database.$with("available_products").as(
      database
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          image: products.image,
          price: products.price,
          availability: products.availability,
          status: products.status,
          categoryId: products.categoryId,
        })
        .from(products)
        .where(or(eq(products.branchId, branchId), isNull(products.branchId)))
    );

    const result = await database
      .with(availableProductsCTE)
      .select({
        product: {
          id: availableProductsCTE.id,
          name: availableProductsCTE.name,
          description: availableProductsCTE.description,
          image: availableProductsCTE.image,
          price: availableProductsCTE.price,
          availability: availableProductsCTE.availability,
          status: availableProductsCTE.status,
        },
        category: {
          id: category.id,
          name: category.name,
        },
      })
      .from(availableProductsCTE)
      .leftJoin(category, eq(availableProductsCTE.categoryId, category.id))
      .where(eq(availableProductsCTE.status, "publish"));

    if (!result || result.length === 0) {
      return res.status(200).json({ message: "No products found", data: [] });
    }

    // WATI MODE RESPONSE
    if (wati === "true") {
      const productList = result
        .map((p, i) => `${i + 1}. ${p.product.name} - $${p.product.price}`)
        .join("\n");

      const productIds = result.map((p) => p.product.id);

      return res.status(200).json({
        menu: `📋 Available Products:\n${productList}\n\nReply with the product number to order.`,
        productIds,
      });
    }

    // Default (web) mode
    return res.status(200).json({
      message: "Products fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Failed to fetch products for branch:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const assignProductToBranch = async (req: Request, res: Response) => {
  console.log("This is the request body: ", req.body);
  console.log("This is the request params: ", req.params);

  try {
    // 1. Get the Product ID from the URL parameters
    const { productId } = req.params;

    const { branchId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required." });
    }

    // Note: 'branchId' can be null, so we don't check for its existence,
    // only that the key is present in the body if you want to be strict.
    // A check for `branchId === undefined` would be more robust.

    // 3. Perform the update operation in the database
    const updatedProduct = await database
      .update(products)
      .set({
        branchId: branchId,
      })
      .where(eq(products.id, productId))
      .returning({
        updatedId: products.id,
        name: products.name,
        assignedBranchId: products.branchId,
      });

    // 4. Check if the update operation found and updated a product
    if (updatedProduct.length === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    // 5. Return a success response
    return res.status(200).json({
      message: "Product branch assignment updated successfully.",
      product: updatedProduct[0],
    });
  } catch (error) {
    console.error("Failed to assign product to branch:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getCategoriesWithProducts = async (
  _req: Request,
  res: Response
) => {
  try {
    const categoriesWithProducts = await database.query.category.findMany({
      where: (categories, { eq }) => eq(categories.visibility, true),
      with: {
        products: {
          where: (products, { eq }) => eq(products.availability, true),
        },
      },
    });

    const result = categoriesWithProducts.filter(
      (category) => category.products.length > 0
    );

    return res.status(status.OK).json({
      message: "Categories and products fetched successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching categories with products:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      error: "An unexpected error occurred.",
    });
  }
};
