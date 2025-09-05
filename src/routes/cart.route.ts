import {
  addToCart,
  addAddonToCartItem,
  deleteFromCart,
  fetchController,
  updateCartItem,
  deleteAddonFromCart,
} from "@/controllers/cart.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { Router } from "express";

const cartRoutes = Router();

cartRoutes.post("/create", protectRoute, addToCart);
cartRoutes.post("/addon/create", protectRoute, addAddonToCartItem);
cartRoutes.post("/delete/:id", protectRoute, deleteFromCart);
cartRoutes.get("/fetch", protectRoute, fetchController);
cartRoutes.patch("/update", protectRoute, updateCartItem);

cartRoutes.delete(
  "/:cartItemId/delete-addon/:addonItemId",
  protectRoute,
  deleteAddonFromCart
);

export { cartRoutes };
