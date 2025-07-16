import {
  deleteController,
  fetchController,
  insertController,
  updateController,
} from "@/controllers/category.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { checkPermission } from "@/middlewares/checkpermission.middleware";
import { Router } from "express";

const categoryRoutes = Router();

categoryRoutes.post(
  "/create-category",
  protectRoute,
  checkPermission("add category"),
  insertController
);
categoryRoutes.post(
  "/delete-category/:id",
  protectRoute,
  checkPermission("delete category"),
  deleteController
);
categoryRoutes.patch(
  "/update-category/:id",
  protectRoute,
  checkPermission("update category"),
  updateController
);

categoryRoutes.get("/fetch-category", fetchController);

export { categoryRoutes };
