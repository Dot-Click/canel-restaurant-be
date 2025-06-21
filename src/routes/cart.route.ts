// import { createCart, readCart } from "@/controllers/cart.controller";
import { addToCart, deleteFromCart } from "@/controllers/cart.controller";
import { Router } from "express";

const cartRoutes = Router();

cartRoutes.post("/create", addToCart);
cartRoutes.post("/delete", deleteFromCart);

export { cartRoutes };
