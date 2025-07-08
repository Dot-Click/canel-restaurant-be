import {
  assignProductToBranch,
  deleteController,
  fetchController,
  getProductsForBranch,
  insertController,
  updateController,
  getCategoriesWithProducts
} from "@/controllers/product.controller";
import { Router } from "express";

const productRoutes = Router();

productRoutes.post("/product-create", insertController);
productRoutes.get("/product-fetch", fetchController);
productRoutes.post("/product-delete", deleteController);
productRoutes.patch("/products-update/:id", updateController);
productRoutes.get("/product-branch/:branchId", getProductsForBranch);
productRoutes.patch("/assign-branch/:productId", assignProductToBranch);
productRoutes.get("/categories-with-products", getCategoriesWithProducts);
// router.get("/products/global", getGlobalProducts);

export { productRoutes };
