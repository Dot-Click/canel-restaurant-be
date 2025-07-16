import {
  assignProductToBranch,
  deleteController,
  fetchController,
  getProductsForBranch,
  insertController,
  updateController,
  getCategoriesWithProducts,
} from "@/controllers/product.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { checkPermission } from "@/middlewares/checkpermission.middleware";
import { Router } from "express";

const productRoutes = Router();

productRoutes.post(
  "/product-create",
  protectRoute,
  checkPermission("add product"),
  insertController
);
productRoutes.post(
  "/product-delete",
  protectRoute,
  checkPermission("delete product"),
  deleteController
);
productRoutes.patch(
  "/products-update/:id",
  protectRoute,
  checkPermission("update product"),
  updateController
);
productRoutes.patch(
  "/assign-branch/:productId",
  protectRoute,
  checkPermission("update product"),
  assignProductToBranch
);

productRoutes.get("/product-fetch", fetchController);
productRoutes.get("/product-branch/:branchId", getProductsForBranch);
productRoutes.get("/categories-with-products", getCategoriesWithProducts);
// router.get("/products/global", getGlobalProducts);

export { productRoutes };
