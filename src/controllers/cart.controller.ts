import { database } from "@/configs/connection.config";
import { cart, cartItemAddons, cartItems, products } from "@/schema/schema";
import { addonItem } from "@/schema/schema";
import { and, eq, inArray } from "drizzle-orm";
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

    // --- Find or Create Cart (Your existing logic is perfect) ---
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

    // --- Check for product details first to get addon info ---
    const productDetails = await database.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!productDetails) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Product not found." });
    }

    // --- Add or Update Cart Item (Your existing logic is mostly fine) ---
    const existingItem = await database.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, productId)
      ),
    });

    let newCartItem;

    if (existingItem) {
      const [updatedItem] = await database
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + quantity,
          instructions: notes || existingItem.instructions,
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      newCartItem = updatedItem;
    } else {
      const [insertedItem] = await database
        .insert(cartItems)
        .values({
          cartId,
          productId,
          quantity,
          instructions: notes,
        })
        .returning();
      newCartItem = insertedItem;
    }

    // --- NEW LOGIC: Fetch available addons to return to the frontend ---
    let availableAddons: any[] = [];
    if (productDetails.addonItemIds && productDetails.addonItemIds.length > 0) {
      availableAddons = await database.query.addonItem.findMany({
        where: inArray(addonItem.id, productDetails.addonItemIds),
      });
    }

    return res.status(status.OK).json({
      message: "Item added to cart.",
      // Return the cart item ID and addons so the frontend knows what to do next
      cartItemId: newCartItem.id,
      availableAddons: availableAddons,
    });
  } catch (err) {
    console.error("Add to cart error:", err);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Something went wrong." });
  }
};

export const addAddonToCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId, addonItemId, quantity = 1 } = req.body;

    if (!productId || !addonItemId) {
      return res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "productId and addonItemId are required." });
    }

    // Step 1: Find the cartItem for this product & user
    const parentCartItem = await database.query.cartItems.findFirst({
      where: and(
        eq(cartItems.productId, productId),
        eq(
          cartItems.cartId,
          database
            .select({ id: cart.id })
            .from(cart)
            .where(eq(cart.userId, userId)) // ensure correct user’s cart
        )
      ),
      with: {
        cart: { columns: { userId: true } },
        product: { columns: { addonItemIds: true } },
      },
    });

    if (!parentCartItem) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Cart item not found for this product." });
    }

    if (!parentCartItem.product?.addonItemIds?.includes(addonItemId)) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "This addon is not valid for the selected product." });
    }

    const existingAddon = await database.query.cartItemAddons.findFirst({
      where: and(
        eq(cartItemAddons.cartItemId, parentCartItem.id),
        eq(cartItemAddons.addonItemId, addonItemId)
      ),
    });

    if (existingAddon) {
      // Update quantity instead of adding duplicate row
      await database
        .update(cartItemAddons)
        .set({ quantity: existingAddon.quantity + quantity })
        .where(eq(cartItemAddons.id, existingAddon.id));
    } else {
      // Insert new row
      await database.insert(cartItemAddons).values({
        cartItemId: parentCartItem.id,
        addonItemId,
        quantity,
      });
    }

    return res.status(status.OK).json({ message: "Addon added successfully." });
  } catch (err) {
    console.error("Add addon to cart error:", err);
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

export const deleteAddonFromCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { cartItemId, addonItemId } = req.params;

    if (!cartItemId || !addonItemId) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Both cartItemId and addonItemId are required." });
    }

    const [userCart] = await database
      .select({ id: cart.id })
      .from(cart)
      .where(eq(cart.userId, userId));

    if (!userCart) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Cart not found for this user." });
    }

    const [itemToModify] = await database
      .select()
      .from(cartItems)
      .where(eq(cartItems.productId, cartItemId));

    if (!itemToModify || itemToModify.cartId !== userCart.id) {
      return res.status(status.FORBIDDEN).json({
        message: "Access denied: This cart item does not belong to the user.",
      });
    }

    const deletedAddons = await database
      .delete(cartItemAddons)
      .where(
        and(
          eq(cartItemAddons.cartItemId, itemToModify.id),
          eq(cartItemAddons.addonItemId, addonItemId)
        )
      )
      .returning();

    if (deletedAddons.length === 0) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Addon not found for this cart item." });
    }

    return res.status(status.OK).json({
      message: "Addon removed from item successfully.",
      data: deletedAddons[0],
    });
  } catch (error) {
    console.error("Error removing addon from cart:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Something went wrong." });
  }
};

export const fetchController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const userCartWithItems = await database.query.cart.findFirst({
      where: eq(cart.userId, userId),
      with: {
        cartItems: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                description: true,
                price: true,
                discount: true,
                image: true,
                size: true,
                addonItemIds: true,
              },
            },
            selectedAddons: {
              columns: {
                quantity: true, // from cartItemAddon
              },
              with: {
                addonItem: {
                  columns: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    discount: true,
                    image: true,
                    size: true,
                  },
                  with: {
                    addon: {
                      columns: {
                        id: true,
                        name: true,
                        description: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const itemsToReturn = userCartWithItems?.cartItems || [];
    console.log("itemsToReturn", itemsToReturn);

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

export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId, quantity } = req.body;

    if (!productId || typeof quantity !== "number" || quantity < 0) {
      return res.status(status.BAD_REQUEST).json({
        message: "A valid productId and a non-negative quantity are required.",
      });
    }

    const userCart = await database.query.cart.findFirst({
      where: eq(cart.userId, userId),
      columns: { id: true },
    });

    if (!userCart) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Cart not found for this user." });
    }

    if (quantity === 0) {
      const deletedItems = await database
        .delete(cartItems)
        .where(
          and(
            eq(cartItems.cartId, userCart.id),
            eq(cartItems.productId, productId)
          )
        )
        .returning();

      if (deletedItems.length === 0) {
        return res
          .status(status.NOT_FOUND)
          .json({ message: "Item not found in cart to delete." });
      }

      return res.status(status.OK).json({
        message: "Item removed from cart as quantity was set to 0.",
      });
    }

    const updatedItems = await database
      .update(cartItems)
      .set({ quantity: quantity })
      .where(
        and(
          eq(cartItems.cartId, userCart.id),
          eq(cartItems.productId, productId)
        )
      )
      .returning();

    if (updatedItems.length === 0) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Item not found in cart to update." });
    }

    return res.status(status.OK).json({
      message: "Item quantity updated successfully.",
      data: updatedItems[0],
    });
  } catch (err) {
    console.error("Update cart item error:", err);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      error: "Something went wrong.",
    });
  }
};
