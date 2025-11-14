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
import ExcelJS from "exceljs";

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
    // --- STEP 1: PARSE THE FILE (No changes here) ---
    const form = formidable({ multiples: false, maxFields: 20000 });
    const [_fields, files] = await form.parse(req);
    const file = files.file?.[0];
    if (!file) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Archivo no encontrado." });
    }

    // --- STEP 2: READ THE EXCEL WORKBOOK & IMAGES ---
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file.filepath);
    const sheet = workbook.worksheets[0];
    const sheetImages = sheet.getImages(); // <-- Added: Get image information

    const rows: any[] = [];
    const images: any[] = [];

    // --- STEP 3: EXTRACT TEXT DATA FROM ROWS ---
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const itemName = row.getCell(1).value;
      const itemDescription = row.getCell(2).value;
      const addonCategoryId = row.getCell(3).value;
      const itemPrice = row.getCell(4).value;

      if (itemName && itemPrice && addonCategoryId) {
        rows.push({
          name: itemName,
          description: itemDescription,
          price: Number(itemPrice),
          addon_id: addonCategoryId,
          _rowNumber: rowNumber,
        });
      }
    });

    const workbookImages = workbook.model.media;

    sheetImages.forEach((imgObj, index) => {
      const media = workbookImages[index];
      images.push({
        row: imgObj.range.tl.nativeRow + 1,
        base64: `data:image/${media.extension};base64,${Buffer.from(
          media.buffer
        ).toString("base64")}`,
      });
    });

    const formattedItems = await Promise.all(
      rows.map(async (item) => {
        let imageURL = "";
        const matchedImage = images.find((img) => img.row === item._rowNumber);

        if (matchedImage) {
          const upload = await cloudinary.uploader.upload(matchedImage.base64, {
            folder: "addon_items", // Optional: organize in Cloudinary
          });
          imageURL = upload.secure_url;
        }

        // Return the final object for the database
        return {
          name: item.name,
          description: item.description,
          price: item.price,
          addonId: item.addon_id,
          image: imageURL || null,
        };
      })
    );

    if (formattedItems.length === 0) {
      return res.status(status.BAD_REQUEST).json({
        message: "El archivo no contiene complementos válidos para agregar.",
      });
    }

    console.log(formattedItems);

    // --- STEP 6: INSERT FINAL DATA INTO DATABASE ---
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
    if (err.code === "23503") {
      return res.status(status.BAD_REQUEST).json({
        message:
          "Error: Una o más 'ID de Categoría del Complemento' no existen. Verifique el archivo.",
      });
    }
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Ocurrió un error al procesar el archivo." });
  }
};
