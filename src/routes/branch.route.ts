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

branchRouter.get("/fetch-branch/:id", fetchSingleBranchController);

branchRouter.get("/cities", fetchCitiesController);
branchRouter.get("/areas/:cityName", fetchAreasForCityController);

branchRouter.get("/distance", async (req, res) => {
  const { origin, destination } = req.query;

  console.log("origin", origin);
  console.log("destination", destination);
  const API_KEY = process.env.GOOGLE_MAPS_KEY;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=metric&origins=${origin}&destinations=${destination}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Distance API failed" });
  }
});
// branchRouter.get("/:city/areas", fetchAreasController);

export default branchRouter;
