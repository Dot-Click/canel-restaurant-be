import {
  createOrUpdateBranchScheduleController,
  getSchedules,
  toggleSchedule,
} from "@/controllers/schedule.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { checkPermission } from "@/middlewares/checkpermission.middleware";
import { Router } from "express";

const scheduleRoute = Router();

scheduleRoute.post(
  "/create-schedule",
  protectRoute,
  checkPermission("add bussiness hours"),
  createOrUpdateBranchScheduleController
);

scheduleRoute.patch("/toggle", protectRoute, toggleSchedule);

scheduleRoute.get("/:id", protectRoute, getSchedules);

export { scheduleRoute };
