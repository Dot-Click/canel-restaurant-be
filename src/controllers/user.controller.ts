import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { status } from "http-status";
import { database } from "@/configs/connection.config";
import { orders, users } from "@/schema/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export const fetchUserController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(status.UNAUTHORIZED).json({
        message: "Authentication failed: No user ID provided.",
      });
    }

    const userProfile = await database.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    if (!userProfile) {
      return res.status(status.NOT_FOUND).json({
        message: "User not found.",
      });
    }

    return res.status(status.OK).json({
      message: "User fetched successfully",
      data: userProfile,
    });
  } catch (error) {
    logger.error("Error in fetchUserController:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while fetching user details.",
    });
  }
};

export const fetchAllUsersController = async (_req: Request, res: Response) => {
  try {
    const allUsers = await database.query.users.findMany({
      columns: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    });

    return res.status(status.OK).json({
      message: "All users fetched successfully",
      data: allUsers,
    });
  } catch (error) {
    logger.error("Error in fetchAllUsersController:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while fetching all users.",
    });
  }
};

export const fetchRidersByBranchController = async (
  req: Request,
  res: Response
) => {
  try {
    const branchId = req.params.id;

    if (!branchId) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Branch ID is required." });
    }

    const riders = await database
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phoneNumber: users.phoneNumber,
      })
      .from(orders)
      .innerJoin(users, eq(orders.riderId, users.id))
      .where(
        and(
          eq(orders.branchId, branchId),
          eq(users.role, "rider"),
          isNotNull(orders.riderId)
        )
      )
      .groupBy(users.id); // unique riders only

    return res.status(status.OK).json({
      message: "Riders fetched successfully",
      data: riders,
    });
  } catch (error) {
    logger.error("Error fetching riders by branch", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch riders.",
    });
  }
};
