import admin from "firebase-admin";
import { database } from "@/configs/connection.config";
import { fcmTokens } from "@/schema/schema";
import { eq, inArray } from "drizzle-orm";
import { logger } from "./logger.util";

// This should be initialized once in your server entry point with a service account
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

/**
 * Sends a notification to a specific user.
 */
export const sendPushNotificationToUser = async (userId: string, title: string, body: string, data?: any) => {
  try {
    const tokens = await database.query.fcmTokens.findMany({
      where: eq(fcmTokens.userId, userId),
    });

    if (tokens.length === 0) {
      logger.info(`No FCM tokens found for user ${userId}`);
      return;
    }

    const tokenStrings = tokens.map((t) => t.token);

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      tokens: tokenStrings,
      data: data || {},
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Filter out tokens that are invalid and delete them from DB
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error as any;
          if (error?.code === "messaging/invalid-registration-token" || error?.code === "messaging/registration-token-not-registered") {
            invalidTokens.push(tokenStrings[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await database.delete(fcmTokens).where(inArray(fcmTokens.token, invalidTokens));
      }
    }

    return response;
  } catch (error) {
    logger.error("Error sending push notification:", error);
    throw error;
  }
};
