import { Request, Response } from "express";
import { database } from "../configs/connection.config";
import {
  branch,
  city,
  branchInsertSchema,
  branchSchedule,
} from "../schema/schema";
import { eq, ilike } from "drizzle-orm";
import { status } from "http-status";
import { logger } from "@/utils/logger.util";
import { z } from "zod";

const apiBranchAddPayloadSchema = branchInsertSchema
  .omit({ cityId: true }) // Client doesn't send cityId
  .extend({
    cityName: z.string({ required_error: "City name is required." }).min(1),
    areas: z.array(z.string()).optional(),
    email: z.string().email("Invalid email format.").optional(),
    orderType: z.enum(["both", "pickup", "delivery"]).optional(),
  });

const apiBranchUpdatePayloadSchema = branchInsertSchema.partial().extend({
  areas: z.array(z.string()).optional(),
  email: z.string().email("Invalid email format.").optional(),
  orderType: z.enum(["both", "pickup", "delivery"]).optional(),
  name: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  status: z.enum(["open", "closed"]).optional(),
  cityId: z.string().optional(),
  manager: z.string().optional(),
});

export const addBranchController = async (req: Request, res: Response) => {
  try {
    const validation = apiBranchAddPayloadSchema.safeParse(req.body);
    console.log(req.body);
    if (!validation.success) {
      return res.status(status.UNPROCESSABLE_ENTITY).json({
        message: "Validation error",
        error: validation.error.format(),
      });
    }

    const { cityName, openingTime, closingTime, ...branchData } =
      validation.data as {
        cityName: string;
        openingTime?: string;
        closingTime?: string;
        name: string;
        address: string;
        manager?: string;
        phoneNumber?: string;
        areas?: string[];
        email?: string;
        deliveryRate: number;
        orderType: "both" | "pickup" | "delivery";
      };

    const newBranch = await database.transaction(async (tx) => {
      // Check if city exists
      let existingCity = await tx.query.city.findFirst({
        where: eq(city.name, cityName),
      });

      let cityId: string;
      if (existingCity) {
        cityId = existingCity.id;
      } else {
        const [newCity] = await tx
          .insert(city)
          .values({ name: cityName })
          .returning();
        cityId = newCity.id;
      }

      // Insert branch
      const [insertedBranch] = await tx
        .insert(branch)
        .values({ ...branchData, cityId, manager: branchData.manager || "" })
        .returning({ id: branch.id });

      // Insert schedule for 7 days if openingTime & closingTime exist
      if (openingTime && closingTime) {
        const scheduleData = Array.from({ length: 7 }, (_, i) => ({
          branchId: insertedBranch.id,
          dayOfWeek: i,
          openTime: openingTime,
          closeTime: closingTime,
          isActive: true,
        }));

        await tx.insert(branchSchedule).values(scheduleData);
      }

      return insertedBranch;
    });

    return res.status(status.CREATED).json({
      message: "Branch + Schedule added successfully",
      data: newBranch,
    });
  } catch (error) {
    logger.error("Error adding branch:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "Could not add branch.",
    });
  }
};

export const fetchAllBranchesController = async (
  _req: Request,
  res: Response
) => {
  try {
    // const { wati } = req.query;

    const branches = await database.query.branch.findMany({
      with: {
        city: { columns: { name: true } },
        manager: { columns: { id: true, fullName: true, email: true } },
      },
      orderBy: (branch, { asc }) => [asc(branch.name)],
    });

    if (!branches || branches.length === 0) {
      return res
        .status(status.OK)
        .json({ message: "No branches found", data: [] });
    }

    // Default (web) mode
    return res
      .status(status.OK)
      .json({ message: "Branches fetched successfully", data: branches });
  } catch (error) {
    logger.error("Error fetching branches:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Could not fetch branches." });
  }
};

export const fetchSingleBranchController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const singleBranch = await database.query.branch.findFirst({
      where: eq(branch.id, id),
      with: {
        city: true,
        manager: { columns: { id: true, fullName: true, email: true } },
      },
    });

    if (!singleBranch) {
      return res.status(status.NOT_FOUND).json({ message: "Branch not found" });
    }
    console.log(singleBranch);
    return res
      .status(status.OK)
      .json({ message: "Branch fetched successfully", data: singleBranch });
  } catch (error) {
    logger.error("Error fetching single branch:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Could not fetch branch." });
  }
};

export const updateBranchController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = apiBranchUpdatePayloadSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(status.UNPROCESSABLE_ENTITY).json({
        message: "Validation error",
        error: validation.error.format(),
      });
    }

    if (Object.keys(validation.data).length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "No fields to update provided." });
    }

    const [updatedBranch] = await database
      .update(branch)
      .set(validation.data)
      .where(eq(branch.id, id))
      .returning();

    console.log(updatedBranch);
    if (!updatedBranch) {
      return res.status(status.NOT_FOUND).json({ message: "Branch not found" });
    }

    return res
      .status(status.OK)
      .json({ message: "Branch updated successfully", data: updatedBranch });
  } catch (error) {
    logger.error("Error updating branch:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Could not update branch." });
  }
};

export const removeBranchController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [deletedBranch] = await database
      .delete(branch)
      .where(eq(branch.id, id))
      .returning();

    if (!deletedBranch) {
      return res.status(status.NOT_FOUND).json({ message: "Branch not found" });
    }

    return res
      .status(status.OK)
      .json({ message: "Branch removed successfully" });
  } catch (error) {
    logger.error("Error removing branch:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Could not remove branch." });
  }
};

export const fetchCitiesController = async (_req: Request, res: Response) => {
  try {
    const allCities = await database.select().from(city).orderBy(city.name);
    return res
      .status(status.OK)
      .json({ message: "Cities fetched successfully", data: allCities });
  } catch (error) {
    logger.error("Error fetching cities:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Could not fetch cities." });
  }
};

export const fetchAreasForCityController = async (
  req: Request,
  res: Response
) => {
  try {
    // 1. Get the city name from the URL parameter.
    // We convert it to lowercase to ensure case-insensitive matching.
    const { cityName } = req.params;
    if (!cityName) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "City name is required." });
    }

    // 2. Find the city in the database to get its ID.
    const cityRecord = await database.query.city.findFirst({
      where: ilike(city.name, cityName),
      columns: { id: true },
    });

    console.log(cityRecord);

    if (!cityRecord) {
      return res.status(status.NOT_FOUND).json({
        message: `City '${cityName}' not found.`,
      });
    }

    // 3. Fetch all branches that belong to this city.
    // We only select the 'areas' column for efficiency.
    const branchesInCity = await database.query.branch.findMany({
      where: eq(branch.cityId, cityRecord.id),
      columns: {
        areas: true,
      },
    });

    // 4. Process the results to get a unique, sorted list of areas.
    // - .flatMap() combines the 'areas' arrays from all branches into one.
    // - We use 'b.areas || []' to handle cases where a branch might not have any areas defined.
    // - new Set() automatically removes any duplicate area names.
    // - Array.from() or the spread operator '[...]' converts the Set back to an array.
    const allAreas = branchesInCity.flatMap((b) => b.areas || []);
    const uniqueAreas = [...new Set(allAreas)];
    uniqueAreas.sort(); // Sort the areas alphabetically for a consistent response.

    return res.status(status.OK).json({
      message: `Areas for ${cityName} fetched successfully`,
      data: uniqueAreas,
    });
  } catch (error) {
    logger.error(`Error fetching areas for city:`, error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Could not fetch areas." });
  }
};
