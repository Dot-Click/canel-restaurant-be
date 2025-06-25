import {
  assignProductToBranch,
  deleteController,
  fetchController,
  getBranchesForProduct,
  getProductsForBranch,
  insertController,
  removeProductFromBranch,
} from "@/controllers/product.controller";
import { Router } from "express";

const productRoutes = Router();

productRoutes.post("/product-create", insertController);
productRoutes.get("/product-fetch", fetchController);
productRoutes.post("/product-delete", deleteController);
productRoutes.post("/assign-product", assignProductToBranch);
productRoutes.post("/remove-product", removeProductFromBranch);
productRoutes.get("/branch/:branchId/products", getProductsForBranch);
productRoutes.get("/product/:productId/branches", getBranchesForProduct);
// router.get("/products/global", getGlobalProducts);

export { productRoutes };
