import {
  assignPermissionsController,
  deleteStaffController,
  fetchAllRidersController,
  fetchAllUsersController,
  fetchRidersController,
  fetchRiderTipsController,
  fetchStaffController,
  fetchUserController,
  getRolePermissions,
  // riderLogin,
  updateUserLocation,
} from "@/controllers/user.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { Router } from "express";
import { updateStaffController } from "../controllers/user.controller";

const userRoute = Router();

userRoute.get("/me", protectRoute, fetchUserController);
userRoute.get("/riders/branch/:branchId", fetchAllRidersController);
userRoute.get("/staff", fetchStaffController);
userRoute.put("/staff/:userId/permissions", assignPermissionsController);
userRoute.get("/all-users", fetchAllUsersController);
userRoute.get("/roles-permissions", getRolePermissions);
userRoute.put("/update-location", protectRoute, updateUserLocation);
userRoute.get("/rider-tips", fetchRiderTipsController);
userRoute.get("/fetch-riders", fetchRidersController);

userRoute.put("/staff/:id", updateStaffController);
userRoute.delete("/staff/:id", deleteStaffController);
// Rider routes
// userRoute.post("/rider-login", riderLogin)

export { userRoute };
