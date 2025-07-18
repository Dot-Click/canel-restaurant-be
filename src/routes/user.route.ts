import {
  assignPermissionsController,
  fetchAllRidersController,
  fetchAllUsersController,
  fetchStaffController,
  fetchUserController,
  getRolePermissions,
} from "@/controllers/user.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { Router } from "express";

const userRoute = Router();

userRoute.get("/me", protectRoute, fetchUserController);
userRoute.get("/riders/branch/:branchId", fetchAllRidersController);
userRoute.get("/staff", fetchStaffController);
userRoute.put("/staff/:userId/permissions", assignPermissionsController);
userRoute.get("/all-users", fetchAllUsersController);
userRoute.get("/roles-permissions", getRolePermissions);

export { userRoute };
