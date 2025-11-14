import { protectRoute } from "@/middlewares/auth.middleware";
import {
  createAddonItem,
  deleteAddonItem,
  fetchAddonItem,
  insertBulkAddonItemController,
  updateAddonItemController,
} from "@/controllers/addonitem.controller";
import { checkPermission } from "@/middlewares/checkpermission.middleware";
import { Router } from "express";

const addonItemsRoutes = Router();
// For deployment only
addonItemsRoutes.post(
  "/create-addonitem",
  protectRoute,
  checkPermission("add addon item"),
  createAddonItem
);
addonItemsRoutes.post(
  "/delete-addonitem/:id",
  protectRoute,
  checkPermission("delete addon item"),
  deleteAddonItem
);

addonItemsRoutes.patch(
  "/update-addon-item/:id",
  protectRoute,
  checkPermission("update addon item"),
  updateAddonItemController
);

addonItemsRoutes.get("/fetch-addonitem", fetchAddonItem);

addonItemsRoutes.post("/add-bulk", protectRoute, insertBulkAddonItemController);

export { addonItemsRoutes };
