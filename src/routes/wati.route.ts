import { Router } from "express";
import {
  getBranchesForWati,
  getMenuForWati,
  placeOrderForWati,
} from "@/controllers/wati.controller";

const watiRoute = Router();

watiRoute.get("/fetch-branches", getBranchesForWati);
watiRoute.post("/fetch-menu", getMenuForWati);
watiRoute.post("/place-order", placeOrderForWati);

export { watiRoute };
