import { database } from "@/configs/connection.config";
import {
  addon,
  addonItem,
  addonItemInsertSchema,
  addonItemUpdateSchema,
  // type AddonItem,
} from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import { eq, sql } from "drizzle-orm";
import { Request, Response } from "express";
import formidable from "formidable";
import status from "http-status";
import { extractFormFields } from "@/utils/formdata.util";
import cloudinary from "@/configs/cloudinary.config";
// import ExcelJS from "exceljs";
import fs from "fs";
import Papa from "papaparse";

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

export const insertBulkAddonItemController = async (
  req: Request,
  res: Response
) => {
  try {
    // --- STEP 1: PARSE THE FILE ---
    const form = formidable({ multiples: false, maxFields: 20000 });
    const [_fields, files] = await form.parse(req);
    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ message: "Archivo no encontrado." });
    }

    const csvContent = fs.readFileSync(file.filepath, "utf-8");
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    const rows = parsed.data as any[];

    if (!rows.length) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "El CSV está vacío" });
    }

    // --- STEP 2: Process each row ---
    const formattedItems = await Promise.all(
      rows.map(async (row, index) => {
        const name = (row["Nombre"] || "").trim();
        const description = (row["Descripción"] || "").trim();
        const addonCategoryRaw = (
          row["Categoría"] ||
          row["Categorías"] ||
          ""
        ).trim();
        const price = row["Precio"] || "0";
        const imageUrl = (row["Imágenes"] || row["Imagen"] || "").trim();

        if (!name || !price || !addonCategoryRaw) {
          throw new Error(
            `Fila ${index + 2} tiene campos obligatorios vacíos.`
          );
        }

        if (!addonCategoryRaw) {
          throw new Error(`La categoría está vacía en la fila ${index + 2}`);
        }

        const addonCategoryName = addonCategoryRaw.toLowerCase();

        // Lookup addon category case-insensitively
        const [existingCategory] = await database
          .select()
          .from(addon)
          .where(sql`LOWER(${addon.name}) = ${addonCategoryName}`);

        if (!existingCategory) {
          throw new Error(
            `La categoría '${addonCategoryName}' no existe en la fila ${
              index + 2
            }`
          );
        }

        let finalImage = "";
        if (imageUrl) {
          if (!imageUrl.startsWith("http")) {
            const upload = await cloudinary.uploader.upload(imageUrl, {
              folder: "addon_items",
            });
            finalImage = upload.secure_url;
          } else {
            finalImage = imageUrl;
          }
        }

        return {
          name,
          description,
          price,
          addonId: existingCategory.id,
          image: finalImage || null,
        };
      })
    );

    if (formattedItems.length === 0) {
      return res.status(status.BAD_REQUEST).json({
        message: "El archivo no contiene complementos válidos para agregar.",
      });
    }

    const inserted = await database
      .insert(addonItem)
      .values(formattedItems)
      .returning();

    res.json({
      message: "Complementos cargados exitosamente.",
      data: inserted,
    });
  } catch (err: any) {
    console.error(err);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Ocurrió un error al procesar el archivo.",
    });
  }
};
