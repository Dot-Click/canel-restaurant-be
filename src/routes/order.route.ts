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
import { Router } from "express";

const orderRoutes = Router();

orderRoutes.post("/create-order", protectRoute, insertController);
orderRoutes.post("/delete-order/:id", protectRoute, deleteController);
orderRoutes.get("/fetch-order", protectRoute, fetchController);
orderRoutes.get("/user-orders/:id", protectRoute, getOrderByIdController);
orderRoutes.post("/create-pos-order", protectRoute, createPosOrderController);
orderRoutes.patch("/:id", protectRoute, updateController);
orderRoutes.patch("/:id/assign-rider", assignRiderController);

export { orderRoutes };
