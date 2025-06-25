import { Request, Response } from "express";
import { database } from "../configs/connection.config";
import { branch, branchInsertSchema } from "../schema/schema";
import { eq } from "drizzle-orm";
import { status } from "http-status";
import { logger } from "@/utils/logger.util";

// interface AddBranchRequest {
//   name: string;
//   address: string;
//   location: string;
//   phoneNumber: string;
//   operatingHours: string;
//   manager: string;
//   city: string;
//   status: string;
// }

export const addBranchController = async (req: Request, res: Response) => {
  try {
    const { data, error } = branchInsertSchema.safeParse(req.body);

    if (!data) {
      logger.error("Validation failed", error);
      return res.status(status.UNPROCESSABLE_ENTITY).json({
        message: "Validation error",
        error: error?.format(),
      });
    }

    const newBranch = await database.insert(branch).values(data).returning();

    return res.status(201).json({
      message: "Branch added successfully",
      data: newBranch[0],
    });
  } catch (error) {
    console.error("Error adding branch:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const removeBranchController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedBranch = await database
      .delete(branch)
      .where(eq(branch.id, id))
      .returning();

    if (!deletedBranch.length) {
      return res.status(404).json({
        message: "Branch not found",
      });
    }

    return res.status(200).json({
      message: "Branch removed successfully",
      data: deletedBranch[0],
    });
  } catch (error) {
    console.error("Error removing branch:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const fetchBranchController = async (_req: Request, res: Response) => {
  try {
    const branches = await database.select().from(branch);

    return res.status(200).json({
      message: "Branches fetched successfully",
      data: branches,
    });
  } catch (error) {
    console.error("Error fetching branches:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const fetchCitiesController = async (_req: Request, res: Response) => {
  try {
    const branches = await database.select({ city: branch.city }).from(branch);

    const uniqueCities = Array.from(
      new Set(branches.map((b) => b.city).filter(Boolean))
    );

    return res.status(status.OK).json({
      message: "Cities fetched successfully",
      data: uniqueCities,
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const fetchAreasController = async (req: Request, res: Response) => {
  const { city } = req.params;
  console.log(city);
  try {
    const rows = await database
      .select({ area: branch.location })
      .from(branch)
      .where(eq(branch.city, city));

    // Dedupe & filter out empty
    const uniqueAreas = Array.from(
      new Set(rows.map((r) => r.area).filter(Boolean))
    );

    return res.status(status.OK).json({
      message: "Areas fetched successfully",
      data: uniqueAreas,
    });
  } catch (err) {
    console.error("Error fetching areas:", err);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (err as Error).message });
  }
};
