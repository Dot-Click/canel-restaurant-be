import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { status } from "http-status";
import { database } from "@/configs/connection.config";
import { users } from "@/schema/schema";
import { eq, not, like } from "drizzle-orm";
import { assignPermissionsSchema, staffIdParamSchema } from "@/schema/schema";
import { z } from "zod";

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

export const fetchAllRidersController = async (
  _req: Request,
  res: Response
) => {
  try {
    // No need to get anything from req.params since we're fetching all riders.

    const riders = await database
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        role: users.role,
      })
      .from(users)
      .where(eq(users.role, "rider"));

    return res.status(status.OK).json({
      message: "All riders fetched successfully",
      data: riders,
    });
  } catch (error) {
    logger.error("Error fetching all riders", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch riders.",
    });
  }
};

export const fetchStaffController = async (req: Request, res: Response) => {
  try {
    const searchQuery = req.query.search as string | undefined;

    console.log("This is the search query", searchQuery);

    const query = database
      .select({
        label: users.fullName,
        value: users.id,
      })
      .from(users)
      .where(not(eq(users.role, "user")))
      .$dynamic();

    console.log("This is the query", query);

    if (searchQuery) {
      query.where(like(users.fullName, `%${searchQuery}%`));
    }

    const staffMembers = await query;

    console.log("This is the staff members", staffMembers);

    return res.status(status.OK).json({
      message: "Staff fetched successfully",
      data: staffMembers,
    });
  } catch (error) {
    logger.error("Error fetching staff members", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "Failed to fetch staff members.",
    });
  }
};

export const assignPermissionsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = staffIdParamSchema.parse(req.params);
    const { permissions } = assignPermissionsSchema.parse(req.body);

    // 2. Perform the database update
    const result = await database
      .update(users)
      .set({
        permissions: permissions,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ updatedId: users.id });

    if (result.length === 0) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Staff member not found." });
    }

    return res.status(status.OK).json({
      message: "Permissions updated successfully",
      data: { userId: result[0].updatedId, assignedPermissions: permissions },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Invalid input data", errors: error.errors });
    }
    logger.error("Error assigning permissions", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "Failed to assign permissions.",
    });
  }
};
