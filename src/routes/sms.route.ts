import { handler } from "@/controllers/sms.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { checkPermission } from "@/middlewares/checkpermission.middleware";
import { Router } from "express";

const smsRoute = Router();

smsRoute.post(
  "/sms",
  protectRoute,
  checkPermission("add bussiness hours"),
  handler
);

export { smsRoute };
