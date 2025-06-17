// import { createCart, readCart } from "@/controllers/cart.controller";
import { addToCart } from "@/controllers/cart.controller";
import { Router } from "express";

const cartRoutes = Router();

cartRoutes.post("/create-cart", addToCart);
// cartRoutes.get("/read-cart", readCart);

export { cartRoutes };
