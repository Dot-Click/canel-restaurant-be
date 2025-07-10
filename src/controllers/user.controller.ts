import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { status } from "http-status";
import { database } from "@/configs/connection.config";
import { users } from "@/schema/schema";
import { eq } from "drizzle-orm";

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
