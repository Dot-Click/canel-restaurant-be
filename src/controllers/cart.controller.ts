import { database } from "@/configs/connection.config";
import { cart, cartItems } from "@/schema/schema";
import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import status from "http-status";

export const addToCart = async (req: Request, res: Response) => {
  try {
    const { userId, productId, quantity = 1 } = req.body;

    // Find or create a cart for the user
    let [existingCart] = await database
      .select()
      .from(cart)
      .where(eq(cart.userId, userId));

    if (!existingCart) {
      await database.insert(cart).values({ userId });
      [existingCart] = await database
        .select()
        .from(cart)
        .where(eq(cart.userId, userId));
    }

    const cartId = existingCart.id;

    // Check if item already exists in cart
    const [existingItem] = await database
      .select()
      .from(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId))
      );

    if (existingItem) {
      // Update quantity
      await database
        .update(cartItems)
        .set({ quantity: existingItem.quantity + quantity })
        .where(
          and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId))
        );
    } else {
      // Insert new item
      await database.insert(cartItems).values({
        cartId,
        productId,
        quantity,
      });
    }

    return res.status(status.OK).json({ message: "Item added to cart." });
  } catch (err) {
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Something went wrong." });
  }
};
