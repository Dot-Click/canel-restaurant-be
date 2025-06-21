import {
  createAddonItem,
  deleteAddonItem,
  fetchAddonItem,
} from "@/controllers/addonitem.controller";
import { Router } from "express";

const addonItemsRoutes = Router();

addonItemsRoutes.post("/create-addonitem", createAddonItem);
addonItemsRoutes.post("/delete-addonitem", deleteAddonItem);
addonItemsRoutes.get("/fetch-addonitem", fetchAddonItem);

export { addonItemsRoutes };
