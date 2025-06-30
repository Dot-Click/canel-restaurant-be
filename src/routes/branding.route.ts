import { updateBrandingController } from "@/controllers/branding.controller";
import { Router } from "express";

const brandingRoute = Router();

brandingRoute.post("/create-branding", updateBrandingController);

export default brandingRoute;
