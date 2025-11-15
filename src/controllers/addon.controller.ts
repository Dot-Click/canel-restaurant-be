import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import { addonInsertSchema, addon, addonUpdateSchema } from "@/schema/schema";
import { eq } from "drizzle-orm";
import formidable from "formidable";
import fs from "fs";
import Papa from "papaparse";

interface Item {
  id: string;
  name: string;
  price: string;
  status?: boolean;
  image: string;
  discount?: number;
}

interface GroupedAddon {
  addonId: string;
  addonName: string;
  items: Item[];
}

// === INSERT CONTROLLER FOR ADDON ===
export const insertController = async (req: Request, res: Response) => {
  try {
    const { data, error } = addonInsertSchema.safeParse(req.body);

    console.log("This is request body of addon", req.body);

    if (!data) {
      logger.error("Validation failed", error);
      return res.status(status.UNPROCESSABLE_ENTITY).json({
        message: "Validation error",
        error: error?.format(),
      });
    }

    // Inserting into the 'addon' table
    const insertedAddon = await database.insert(addon).values(data).returning();

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

// === DELETE CONTROLLER FOR ADDON ===
export const deleteController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Addon ID is required" });
    }

    // Deleting from the 'addon' table
    const deletedAddon = await database
      .delete(addon)
      .where(eq(addon.id, id))
      .returning();

    if (deletedAddon.length === 0) {
      return res.status(status.NOT_FOUND).json({ message: "Addon not found" });
    }

    res.status(status.OK).json({
      message: "Addon deleted successfully",
      data: deletedAddon[0],
    });
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

// === FETCH CONTROLLER FOR ADDON ===
export const fetchController = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    let addons;

    if (id) {
      addons = await database.query.addon.findFirst({
        where: (addon, { eq }) => eq(addon.id, id),
      });
    } else {
      addons = await database.query.addon.findMany();
    }

    res.status(status.OK).json({
      message: "Addons fetched successfully",
      data: addons,
    });
  } catch (error) {
    logger.error("Internal Server Error in fetchController:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const getAddonsWithItemsController = async (
  _req: Request,
  res: Response
) => {
  try {
    // 1. Fetch all addon items and include their parent "addon" (category)
    const allItems = await database.query.addonItem.findMany({
      // where: eq(addonItem.status, true),
      with: {
        addon: true,
      },
    });

    if (!allItems || allItems.length === 0) {
      return res.status(status.OK).json({
        message: "No addon items found.",
        data: [],
      });
    }

    // 2. Group the flat array of items by their category ('addon')
    const groupedData = new Map<string, GroupedAddon>();

    for (const item of allItems) {
      // --- THIS IS THE FIX ---
      // Check for the 'addon' property now
      if (!item.addon) {
        continue;
      }

      // Destructure 'addon' from the item
      const { addon, ...itemDetails } = item;

      // If we haven't seen this category ID yet, create a new group for it
      if (!groupedData.has(addon.id)) {
        groupedData.set(addon.id, {
          addonId: addon.id,
          addonName: addon.name,
          items: [],
        });
      }

      // Add the current item to its category's group
      groupedData.get(addon.id)!.items.push({
        id: itemDetails.id,
        name: itemDetails.name,
        price: itemDetails.price,
        image: itemDetails.image ?? "",
        discount:
          itemDetails.discount === null ? undefined : itemDetails.discount,
      });
    }

    // 3. Convert the Map to an array for the final JSON response
    const result = Array.from(groupedData.values());

    return res.status(status.OK).json({
      message: "Addons and their items fetched successfully.",
      data: result,
    });
  } catch (error) {
    logger.error("Error fetching grouped addon items:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while fetching addon items.",
    });
  }
};

export const updateAddonCategoryController = async (
  req: Request,
  res: Response
) => {
  try {
    // 1. Get the ID from URL parameters
    const { id } = req.params;

    if (!id) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Addon Category ID is required in the URL." });
    }

    // 2. Validate the request body using our new partial schema
    const validationResult = addonUpdateSchema.safeParse(req.body);

    if (!validationResult.success) {
      logger.error("Update validation failed", validationResult.error);
      return res.status(status.UNPROCESSABLE_ENTITY).json({
        message: "Validation error",
        error: validationResult.error.format(),
      });
    }

    const dataToUpdate = validationResult.data;

    // 3. Check if there is actually any data to update
    if (Object.keys(dataToUpdate).length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "No fields provided to update." });
    }

    // 4. Perform the database update
    const updatedAddonCategory = await database
      .update(addon)
      .set(dataToUpdate)
      .where(eq(addon.id, id))
      .returning();

    // 5. Handle case where the item was not found
    if (updatedAddonCategory.length === 0) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Addon Category not found" });
    }

    // 6. Send the successful response
    res.status(status.OK).json({
      message: "Addon Category updated successfully",
      data: updatedAddonCategory[0],
    });
  } catch (error) {
    logger.error("Failed to update addon category:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};

export const insertBulkAddonCategoriesController = async (
  req: Request,
  res: Response
) => {
  try {
    // STEP 1: Parse the file
    const form = formidable({ multiples: false });
    const [_fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Archivo no encontrado." });
    }

    const csvContent = fs.readFileSync(file.filepath, "utf-8");

    // STEP 2: Parse CSV
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    const rows = parsed.data as any[];

    if (!rows.length) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "El CSV está vacío." });
    }

    // STEP 3: Map CSV rows to DB format
    const categoriesToInsert = rows.map((row, index) => {
      const name = (row["Nombre"] || row["Nombre de categoría"] || "").trim();
      const description = (row["Descripción"] || "").trim() || null;

      if (!name) {
        throw new Error(
          `Fila ${index + 2} no tiene un nombre de categoría válido.`
        );
      }

      return { name, description };
    });

    if (!categoriesToInsert.length) {
      return res.status(status.BAD_REQUEST).json({
        message: "El archivo no contiene categorías de complementos válidas.",
      });
    }

    // STEP 4: Insert into DB
    const inserted = await database
      .insert(addon)
      .values(categoriesToInsert)
      .returning();

    res.json({
      message: "Categorías de complementos cargadas exitosamente.",
      data: inserted,
    });
  } catch (err: any) {
    console.error(err);
    res.status(status.INTERNAL_SERVER_ERROR).json({
      message: err.message || "Ocurrió un error al procesar el archivo.",
    });
  }
};
