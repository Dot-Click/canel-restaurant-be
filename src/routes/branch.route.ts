import { Router } from "express";
import {
  addBranchController,
  removeBranchController,
  fetchBranchController,
  fetchCitiesController,
  fetchAreasController,
} from "../controllers/branch.controller";

const branchRouter = Router();

// Add a new branch
branchRouter.post("/create-branch", addBranchController);

// Remove a branch by ID
branchRouter.delete("delete-branch/:id", removeBranchController);

// Fetch all branches
branchRouter.get("/fetch-branch", fetchBranchController);

branchRouter.get("/cities", fetchCitiesController);

branchRouter.get("/:city/areas", fetchAreasController);

export default branchRouter;
