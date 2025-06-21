import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import { addonInsertSchema, addon } from "@/schema/schema";
import { eq } from "drizzle-orm";

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
