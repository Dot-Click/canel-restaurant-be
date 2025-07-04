import {
  deleteController,
  insertController,
  fetchController,
  getAddonsWithItemsController,
} from "@/controllers/addon.controller";
import { Router } from "express";

const addonRoutes = Router();

addonRoutes.post("/create-addon", insertController);
addonRoutes.post("/delete-addon/:id", deleteController);
addonRoutes.get("/fetch-addon", fetchController);
addonRoutes.get("/fetch-grouped-addons", getAddonsWithItemsController);

export { addonRoutes };
