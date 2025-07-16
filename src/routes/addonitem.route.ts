import { protectRoute } from "@/middlewares/auth.middleware";
import {
  createAddonItem,
  deleteAddonItem,
  fetchAddonItem,
  updateAddonItemController,
} from "@/controllers/addonitem.controller";
import { checkPermission } from "@/middlewares/checkpermission.middleware";
import { Router } from "express";

const addonItemsRoutes = Router();

addonItemsRoutes.post(
  "/create-addonitem",
  protectRoute,
  checkPermission("add addon item"),
  createAddonItem
);
addonItemsRoutes.post(
  "/delete-addonitem",
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

export { addonItemsRoutes };
