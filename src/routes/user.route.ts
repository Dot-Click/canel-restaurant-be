import {
  fetchRidersByBranchController,
  fetchUserController,
} from "@/controllers/user.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { Router } from "express";

const userRoute = Router();

userRoute.get("/me", protectRoute, fetchUserController);
userRoute.get("/riders/branch/:branchId", fetchRidersByBranchController);

export { userRoute };
