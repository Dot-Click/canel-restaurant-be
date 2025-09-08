import {
  assignRiderController,
  createPosOrderController,
  deleteController,
  fetchController,
  getOrderByIdController,
  getRiderOrdersController,
  insertController,
  updateController,
  updateStatusOrderController,
  getOrdersByRiderIdController,
  deliveryRiderImageUpload,
  riderWeeklyMoneyAndHour,
  addTipToOrderController,
  fetchNewVsRecurringOrdersController,
  getRiderDeliveredOrdersController,
  // fetchRidersEarnedMoney,
  fetchRiderEarnedMoneyById,
  // updateRiderOrderDelivery,
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
  protectRoute,
  checkPermission("update order"),
  assignRiderController
);

orderRoutes.patch("/pause/branch/:id", setBranchPauseStatus);

orderRoutes.get("/fetch-order", protectRoute, fetchController);
orderRoutes.get("/user-orders/:id", protectRoute, getOrderByIdController);

orderRoutes.patch("/pause/global", protectRoute, setGlobalPauseStatus);

orderRoutes.patch(
  "/pause/branch/:branchId",
  protectRoute,
  setBranchPauseStatus
);

// orderRoutes.get("/fetch-earned-money", protectRoute, fetchRidersEarnedMoney)

orderRoutes.get("/fetch-earned-money/:id", protectRoute, fetchRiderEarnedMoneyById)

orderRoutes.get("/:riderId/orders", protectRoute, getOrdersByRiderIdController);

// For RIDERS:-
// This is to get orders for rider.
orderRoutes.get("/orders", protectRoute, getRiderOrdersController);
// This is for accepting the order.
orderRoutes.patch(
  "/:orderId/update-order-status",
  protectRoute,
  updateStatusOrderController
);
// This is for marking order as delivered.
// orderRoutes.patch("/update-delivery-status", protectRoute, updateRiderOrderDelivery)
orderRoutes.patch(
  "/:orderId/upload-delivery-image",
  protectRoute,
  deliveryRiderImageUpload
);

orderRoutes.get("/fetch-hours-earning", protectRoute, riderWeeklyMoneyAndHour);

orderRoutes.get(
  "/fetch-delivered-orders",
  protectRoute,
  getRiderDeliveredOrdersController
);

// This route should be protected, only accessible by a logged-in rider.
orderRoutes.patch("/:orderId/add-tip", protectRoute, addTipToOrderController);

orderRoutes.get(
  "/new-vs-recurring",
  protectRoute,
  fetchNewVsRecurringOrdersController
);

export { orderRoutes };
