import {
  assignRiderController,
  createPosOrderController,
  deleteController,
  fetchController,
  getOrderByIdController,
  getRiderOrdersController,
  insertController,
  updateController,
  acceptOrderController,
  getOrdersByRiderIdController,
} from "@/controllers/order.controller";
import {
  setBranchPauseStatus,
  setGlobalPauseStatus,
} from "@/controllers/pause.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { checkPermission } from "@/middlewares/checkpermission.middleware";
import { Router } from "express";

const orderRoutes = Router();

orderRoutes.post("/create-order", protectRoute, insertController);

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

orderRoutes.patch("/pause/branch/:id", setBranchPauseStatus);

orderRoutes.patch("/:orderId/accept", protectRoute, acceptOrderController);

orderRoutes.get("/:riderId/orders", protectRoute, getOrdersByRiderIdController);

orderRoutes.get("/me/orders", protectRoute, getRiderOrdersController);
orderRoutes.get("/fetch-order", protectRoute, fetchController);
orderRoutes.get("/user-orders/:id", protectRoute, getOrderByIdController);

orderRoutes.patch("/pause/global", protectRoute, setGlobalPauseStatus);

orderRoutes.patch(
  "/pause/branch/:branchId",
  protectRoute,
  setBranchPauseStatus
);

export { orderRoutes };
