import { Request, Response } from "express";
import { database } from "@/configs/connection.config";
import { reportIntervals } from "@/schema/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/utils/logger.util";

export const getIntervalsController = async (_req: Request, res: Response) => {
  try {
    const intervals = await database.select().from(reportIntervals).where(eq(reportIntervals.isActive, true));
    return res.status(200).json({ success: true, data: intervals });
  } catch (error) {
    logger.error("Error fetching intervals:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createIntervalController = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [newItem] = await database.insert(reportIntervals).values(data).returning();
    return res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    logger.error("Error creating interval:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateIntervalController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const [updatedItem] = await database.update(reportIntervals).set(data).where(eq(reportIntervals.id, id)).returning();
    return res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    logger.error("Error updating interval:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteIntervalController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await database.delete(reportIntervals).where(eq(reportIntervals.id, id));
    return res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    logger.error("Error deleting interval:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
