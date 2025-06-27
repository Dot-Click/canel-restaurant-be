import {
  deleteController,
  fetchController,
  insertController,
} from "@/controllers/product.controller";
import { Router } from "express";

const productRoutes = Router();

productRoutes.post("/product-create", insertController);
productRoutes.get("/product-fetch", fetchController);
productRoutes.post("/product-delete", deleteController);
// router.get("/products/global", getGlobalProducts);

export { productRoutes };
