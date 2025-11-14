import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import {
  categoryInsertSchema,
  category,
  categoryUpdateSchema,
} from "@/schema/schema";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import formidable from "formidable";

export const insertController = async (req: Request, res: Response) => {
  try {
    const { data, error } = categoryInsertSchema.safeParse(req.body);
    // console.log("This is category data:", data);
    console.log("This is request body of category", req.body);

    if (!data) {
      logger.error("Validation failed", error);
      return res.status(status.UNPROCESSABLE_ENTITY).json({
        message: "Validation error",
        error: error?.format(),
      });
    }

    const insertedCategory = await database
      .insert(category)
      .values(data)
      .returning();

    if (insertedCategory[0]) {
      return res.status(status.CREATED).json({
        message: "category inserted successfully",
        data: insertedCategory[0],
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
    const { id } = req.params;

    if (!id) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Category ID is required" });
    }

    const deletedCategory = await database
      .delete(category)
      .where(eq(category.id, id))
      .returning();

    if (deletedCategory.length === 0) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Category not found" });
    }

    res.status(status.OK).json({
      message: "Category deleted successfully",
      data: deletedCategory[0],
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
    const { id } = req.body;

    let categories;

    if (id) {
      categories = await database.query.category.findFirst({
        where: (category, { eq }) => eq(category.id, id),
      });
    } else {
      categories = await database.query.category.findMany();
    }

    res.status(status.OK).json({
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    logger.error("Internal Server Error in fetchController:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const updateController = async (req: Request, res: Response) => {
  try {
    // Get the ID from URL parameters, just like in deleteController
    const { id } = req.params;

    if (!id) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Category ID is required in the URL." });
    }

    // Validate the request body using the new partial schema
    const { data, error } = categoryUpdateSchema.safeParse(req.body);

    if (error) {
      logger.error("Update validation failed", error);
      return res.status(status.UNPROCESSABLE_ENTITY).json({
        message: "Validation error",
        error: error.format(),
      });
    }

    // Check if there is actually any data to update
    if (Object.keys(data).length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "No fields provided to update." });
    }

    // Perform the database update
    const updatedCategory = await database
      .update(category)
      .set(data) // Drizzle will only update the fields present in the 'data' object
      .where(eq(category.id, id))
      .returning();
    console.log("This is the updated category", updatedCategory);
    // Handle case where the category was not found, just like in deleteController
    if (updatedCategory.length === 0) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Category not found" });
    }

    // Send the successful response
    res.status(status.OK).json({
      message: "Category updated successfully",
      data: updatedCategory[0],
    });
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const insertBulkCategoriesController = async (
  req: Request,
  res: Response
) => {
  try {
    // STEP 1: Parse the incoming file from the form data
    const form = formidable({ multiples: false });
    const [_fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Archivo no encontrado." });
    }

    // STEP 2: Read the data from the Excel spreadsheet
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file.filepath);
    const sheet = workbook.worksheets[0];

    const categoriesToInsert: any[] = [];

    // STEP 3: Iterate over each row and extract category data
    sheet.eachRow((row, rowNumber) => {
      // Skip the header row (row 1)
      if (rowNumber === 1) return;

      const categoryName = row.getCell(1).value;
      const categoryDescription = row.getCell(2).value;

      // Basic validation: ensure the category has a name
      if (categoryName) {
        categoriesToInsert.push({
          // Ensure these keys ('name', 'description') match your database schema columns
          name: categoryName,
          description: categoryDescription || null, // Use null if description is empty
        });
      }
    });

    if (categoriesToInsert.length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "El archivo no contiene categorías para agregar." });
    }

    // STEP 4: Insert the collected data into the database in a single transaction
    const inserted = await database
      .insert(category)
      .values(categoriesToInsert)
      .returning();

    res.json({
      message: "Categorías cargadas exitosamente.",
      data: inserted,
    });
  } catch (err: any) {
    console.error(err); // Log the error for debugging
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Ocurrió un error al procesar el archivo." });
  }
};
