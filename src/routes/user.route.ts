import {
  assignPermissionsController,
  fetchAllRidersController,
  fetchStaffController,
  fetchUserController,
} from "@/controllers/user.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { Router } from "express";

const userRoute = Router();

userRoute.get("/me", protectRoute, fetchUserController);
userRoute.get("/riders/branch/:branchId", fetchAllRidersController);
userRoute.get("/staff", fetchStaffController);
userRoute.put("/staff/:userId/permissions", assignPermissionsController);

export { userRoute };
