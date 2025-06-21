import {
  deleteController,
  fetchController,
  insertController,
} from "@/controllers/category.controller";
import { Router } from "express";

const categoryRoutes = Router();

categoryRoutes.post("/create-category", insertController);
categoryRoutes.post("/delete-category/:id", deleteController);
categoryRoutes.get("/fetch-category", fetchController);

export { categoryRoutes };
