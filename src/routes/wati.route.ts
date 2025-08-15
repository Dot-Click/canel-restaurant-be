import { Router } from "express";
import {
  getBranchesForWati,
  getMenuForWati,
} from "@/controllers/wati.controller";

const watiRoute = Router();

watiRoute.get("/fetch-branches/wati", getBranchesForWati);
watiRoute.get("/fetch-menu/wati", getMenuForWati);

export { watiRoute };
