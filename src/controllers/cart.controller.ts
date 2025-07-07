import { database } from "@/configs/connection.config";
import { cart, cartItems } from "@/schema/schema";
import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";
import status from "http-status";

export const addToCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { productId, quantity = 1, notes } = req.body;

    if (!productId) {
      return res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "Product Id is required" });
    }

    let cartId: string;

    const existingCart = await database.query.cart.findFirst({
      where: eq(cart.userId, userId),
    });

    if (existingCart) {
      cartId = existingCart.id;
    } else {
      const [newCart] = await database
        .insert(cart)
        .values({ userId })
        .returning({ id: cart.id });
      cartId = newCart.id;
    }

    const existingItem = await database.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, productId)
      ),
    });

    if (existingItem) {
      await database
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + quantity,
          instructions: notes || existingItem.instructions,
        })
        .where(eq(cartItems.id, existingItem.id));
    } else {
      await database.insert(cartItems).values({
        cartId,
        productId,
        quantity,
        instructions: notes,
      });
    }

    return res.status(status.OK).json({ message: "Item added to cart." });
  } catch (err) {
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Something went wrong." });
  }
};

export const deleteFromCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { id } = req.params;
    console.log(req.params);
    if (!userId || !id) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Both userId and productId are required." });
    }

    const [userCart] = await database
      .select()
      .from(cart)
      .where(eq(cart.userId, userId));

    if (!userCart) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Cart not found for this user." });
    }
    const deletedItems = await database
      .delete(cartItems)
      .where(
        and(eq(cartItems.cartId, userCart.id), eq(cartItems.productId, id))
      )
      .returning();

    if (deletedItems.length === 0) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Item not found in cart." });
    }

    return res.status(status.OK).json({
      message: "Item removed from cart successfully.",
      data: deletedItems[0],
    });
  } catch (error) {
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Something went wrong." });
  }
};

export const fetchController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const userCartWithItems = await database.query.cart.findFirst({
      where: (cart, { eq }) => eq(cart.userId, userId),
      with: {
        cartItems: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                description: true,
                image: true,
                price: true,
                discount: true,
                addonItemIds: true,
              },
            },
          },
        },
      },
    });

    const itemsToReturn = userCartWithItems?.cartItems || [];
    console.log(itemsToReturn);
    // 4. Send the array of items back to the frontend.
    return res.status(status.OK).json({
      message: "Cart fetched successfully",
      data: itemsToReturn,
    });
  } catch (error) {
    console.error("Fetch cart error:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Something went wrong." });
  }
};
