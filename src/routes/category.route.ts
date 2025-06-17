import { insertController } from "@/controllers/category.controller";
import { Router } from "express";

const categoryRoutes = Router();

categoryRoutes.post("/create", insertController);

export { categoryRoutes };
