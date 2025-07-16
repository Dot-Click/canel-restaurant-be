import { protectRoute } from "@/middlewares/auth.middleware";
import { Router } from "express";
import {
  addBranchController,
  removeBranchController,
  fetchAllBranchesController,
  fetchCitiesController,
  // fetchAreasController,
  fetchSingleBranchController,
  updateBranchController,
  fetchAreasForCityController,
} from "../controllers/branch.controller";
import { checkPermission } from "@/middlewares/checkpermission.middleware";

const branchRouter = Router();

// Add a new branch
branchRouter.post(
  "/create-branch",
  protectRoute,
  checkPermission("add branch"),
  addBranchController
);
branchRouter.patch(
  "/update-branch/:id",
  protectRoute,
  checkPermission("update branch"),
  updateBranchController
);

// Remove a branch by ID
branchRouter.delete(
  "/delete-branch/:id",
  protectRoute,
  checkPermission("delete branch"),
  removeBranchController
);

// Fetch all branches
branchRouter.get("/fetch-all-branch", fetchAllBranchesController);

branchRouter.get("/fetch-branch", fetchSingleBranchController);

branchRouter.get("/cities", fetchCitiesController);
branchRouter.get("/areas/:cityName", fetchAreasForCityController);

// branchRouter.get("/:city/areas", fetchAreasController);

export default branchRouter;
