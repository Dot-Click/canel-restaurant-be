import {
  convertPrice,
  getUsdToVesRate,
  setUsdToVesRate,
} from "@/controllers/currency.controller";
import { Router } from "express";

const currencyRoutes = Router();

currencyRoutes.post("/set", setUsdToVesRate);
currencyRoutes.get("/get", getUsdToVesRate);
currencyRoutes.post("/convert", convertPrice);

export { currencyRoutes };
