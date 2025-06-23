// import { createCart, readCart } from "@/controllers/cart.controller";
import {
  addToCart,
  deleteFromCart,
  fetchController,
} from "@/controllers/cart.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { Router } from "express";

const cartRoutes = Router();

cartRoutes.post("/create", protectRoute, addToCart);
cartRoutes.post("/delete/:id", protectRoute, deleteFromCart);
cartRoutes.get("/fetch", protectRoute, fetchController);

export { cartRoutes };
