import {
  assignRiderController,
  createPosOrderController,
  deleteController,
  fetchController,
  getOrderByIdController,
  insertController,
  updateController,
} from "@/controllers/order.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { checkPermission } from "@/middlewares/checkpermission.middleware";
import { Router } from "express";

const orderRoutes = Router();

orderRoutes.post(
  "/create-order",
  protectRoute,
  checkPermission("add order"),
  insertController
);
orderRoutes.post(
  "/delete-order/:id",
  protectRoute,
  checkPermission("delete order"),
  deleteController
);
orderRoutes.post(
  "/create-pos-order",
  protectRoute,
  checkPermission("add pos"),
  createPosOrderController
);

orderRoutes.patch(
  "/:id",
  protectRoute,
  checkPermission("update order"),
  updateController
);
orderRoutes.patch(
  "/:id/assign-rider",
  checkPermission("update order"),
  assignRiderController
);

orderRoutes.get("/fetch-order", protectRoute, fetchController);
orderRoutes.get("/user-orders/:id", protectRoute, getOrderByIdController);

export { orderRoutes };
