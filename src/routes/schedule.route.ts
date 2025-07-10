import {
  createOrUpdateBranchScheduleController,
  getSchedules,
  toggleSchedule,
} from "@/controllers/schedule.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { Router } from "express";

const scheduleRoute = Router();

scheduleRoute.post(
  "/create-schedule",
  protectRoute,
  createOrUpdateBranchScheduleController
);

scheduleRoute.get("/:id", protectRoute, getSchedules);
scheduleRoute.patch("/toggle", protectRoute, toggleSchedule);

export { scheduleRoute };
