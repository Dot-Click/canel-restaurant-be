import {
  deleteController,
  insertController,
  fetchController,
  getAddonsWithItemsController,
  updateAddonCategoryController,
  insertBulkAddonCategoriesController,
} from "@/controllers/addon.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { checkPermission } from "@/middlewares/checkpermission.middleware";
import { Router } from "express";

const addonRoutes = Router();

addonRoutes.post(
  "/create-addon",
  protectRoute,
  checkPermission("add addon"),
  insertController
);
addonRoutes.post(
  "/delete-addon/:id",
  protectRoute,
  checkPermission("delete addon"),
  deleteController
);
addonRoutes.patch(
  "/update-addon-category/:id",
  protectRoute,
  checkPermission("update addon"),
  updateAddonCategoryController
);
addonRoutes.get("/fetch-addon", fetchController);
addonRoutes.get("/fetch-grouped-addons", getAddonsWithItemsController);

addonRoutes.post(
  "/add-bulk",
  protectRoute,
  insertBulkAddonCategoriesController
);

export { addonRoutes };
