import { insertController } from "@/controllers/product.controller";
import { Router } from "express";

const productRoutes = Router();

productRoutes.post("/create", insertController);

export { productRoutes };
