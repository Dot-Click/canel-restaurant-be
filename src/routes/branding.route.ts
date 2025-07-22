import {
  fetchBannerController,
  fetchLogoController,
  fetchMainSectionController,
  updateBrandingController,
} from "@/controllers/branding.controller";
import { Router } from "express";

const brandingRoute = Router();

brandingRoute.get("/logo", fetchLogoController);
brandingRoute.get("/banner", fetchBannerController);
brandingRoute.get("/main-section", fetchMainSectionController);
brandingRoute.post("/create-branding", updateBrandingController);

export default brandingRoute;
