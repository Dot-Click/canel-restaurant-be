import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { status } from "http-status";
import { database } from "@/configs/connection.config";
import { fcmTokens } from "@/schema/schema";
import { eq, and } from "drizzle-orm";

export const saveFcmTokenController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token, deviceType } = req.body;

    if (!userId) {
      return res.status(status.UNAUTHORIZED).json({
        message: "Authentication failed: No user ID provided.",
      });
    }

    if (!token) {
      return res.status(status.BAD_REQUEST).json({
        message: "FCM token is required.",
      });
    }

    // Check if the token already exists for THIS user
    const existingToken = await database.query.fcmTokens.findFirst({
      where: and(eq(fcmTokens.token, token), eq(fcmTokens.userId, userId)),
    });

    if (existingToken) {
      return res.status(status.OK).json({
        message: "FCM token already exists for this user.",
        data: existingToken,
      });
    }

    // A token should belong to only one user at a time (device specific)
    // If it exists for another user, move it to this user
    await database.delete(fcmTokens).where(eq(fcmTokens.token, token));

    const newToken = await database
      .insert(fcmTokens)
      .values({
        userId,
        token,
        deviceType: deviceType || "web",
      })
      .returning();

    return res.status(status.CREATED).json({
      message: "FCM token saved successfully",
      data: newToken[0],
    });
  } catch (error: any) {
    logger.error("Error in saveFcmTokenController:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while saving FCM token.",
      error: error.message,
    });
  }
};

export const removeFcmTokenController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;

    if (!userId) {
      return res.status(status.UNAUTHORIZED).json({
        message: "Authentication failed",
      });
    }

    if (!token) {
       return res.status(status.BAD_REQUEST).json({
        message: "FCM token is required for removal.",
      });
    }

    await database
      .delete(fcmTokens)
      .where(and(eq(fcmTokens.token, token), eq(fcmTokens.userId, userId)));

    return res.status(status.OK).json({
      message: "FCM token removed successfully",
    });
  } catch (error: any) {
    logger.error("Error in removeFcmTokenController:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while removing FCM token.",
      error: error.message,
    });
  }
};
