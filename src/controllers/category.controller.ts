import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import { categoryInsertSchema, category } from "@/schema/schema";

export const insertController = async (req: Request, res: Response) => {
  try {
    const { data, error } = categoryInsertSchema.safeParse(req.body);
    // console.log("This is category data:", data);
    console.log("This is request body", req.body);
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
