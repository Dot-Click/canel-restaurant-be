import {
  deleteController,
  fetchController,
  insertController,
  updateController,
} from "@/controllers/category.controller";
import { Router } from "express";

const categoryRoutes = Router();

categoryRoutes.post("/create-category", insertController);
categoryRoutes.post("/delete-category/:id", deleteController);
categoryRoutes.get("/fetch-category", fetchController);
categoryRoutes.patch("/update-category/:id", updateController);

export { categoryRoutes };
