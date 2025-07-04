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

const branchRouter = Router();

// Add a new branch
branchRouter.post("/create-branch", addBranchController);
branchRouter.patch("/update-branch/:id", updateBranchController);

// Remove a branch by ID
branchRouter.delete("/delete-branch/:id", removeBranchController);

// Fetch all branches
branchRouter.get("/fetch-all-branch", fetchAllBranchesController);

branchRouter.get("/fetch-branch", fetchSingleBranchController);

branchRouter.get("/cities", fetchCitiesController);
branchRouter.get("/areas/:cityName", fetchAreasForCityController);

// branchRouter.get("/:city/areas", fetchAreasController);

export default branchRouter;
