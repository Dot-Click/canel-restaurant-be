import { Router } from "express";
import { protectRoute } from "@/middlewares/auth.middleware";
import { saveFcmTokenController, removeFcmTokenController } from "@/controllers/fcm.controller";

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: FCM Push Notification Management
 */

const fcmRoutes = Router();

/**
 * @swagger
 * /api/fcm/token:
 *   post:
 *     summary: Save or update an FCM token for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: The FCM registration token from the client.
 *               deviceType:
 *                 type: string
 *                 description: Type of device (e.g., web, android, ios).
 *                 default: web
 *     responses:
 *       201:
 *         description: FCM token saved successfully
 *       200:
 *         description: FCM token already exists for this user
 *       400:
 *         description: FCM token is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
fcmRoutes.post("/token", protectRoute, saveFcmTokenController);

/**
 * @swagger
 * /api/fcm/token:
 *   delete:
 *     summary: Remove an FCM token for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: The FCM token to remove.
 *     responses:
 *       200:
 *         description: FCM token removed successfully
 *       400:
 *         description: FCM token is required for removal
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
fcmRoutes.delete("/token", protectRoute, removeFcmTokenController);

export { fcmRoutes };
