import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import { eq } from "drizzle-orm";
import { cartItems, orderItems, orders } from "@/schema/schema";

export const insertController = async (req: Request, res: Response) => {
  const { cartId, ...formData } = req.body;
  const userId = req.user!.id;
  console.log("This is the request body", req.body);
  if (!cartId) {
    return res
      .status(status.BAD_REQUEST)
      .json({ message: "Cart ID is required." });
  }

  try {
    const newOrder = await database.transaction(async (tx) => {
      const itemsInCart = await tx.query.cartItems.findMany({
        where: eq(cartItems.cartId, cartId),
        with: {
          product: true,
        },
      });

      if (itemsInCart.length === 0) {
        throw new Error("Cannot place an order with an empty cart.");
      }

      const [insertedOrder] = await tx
        .insert(orders)
        .values({
          ...formData,
          userId,
        })
        .returning();

      const newOrderItems = itemsInCart.map((item) => {
        if (!item.product) {
          throw new Error(
            `Product with ID ${item.productId} not found for an item in the cart. Order cannot be placed.`
          );
        }

        return {
          orderId: insertedOrder.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        };
      });

      await tx.insert(orderItems).values(newOrderItems);

      await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));

      return insertedOrder;
    });

    return res.status(status.CREATED).json({
      message: "Order placed successfully!",
      data: newOrder,
    });
  } catch (error) {
    logger.error("Failed to create order:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const deleteController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Order ID is required" });
    }

    const deletedOrder = await database
      .delete(orders)
      .where(eq(orders.id, id))
      .returning();

    if (deletedOrder.length === 0) {
      return res.status(status.NOT_FOUND).json({ message: "Order not found" });
    }

    res.status(status.OK).json({
      message: "Order deleted successfully",
      data: deletedOrder[0],
    });
  } catch (error) {
    logger.error(error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const fetchController = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;

    let orderList;

    if (id) {
      orderList = await database.query.orders.findFirst({
        where: (orders, { eq }) => eq(orders.id, id),
      });
    } else {
      orderList = await database.query.orders.findMany();
    }

    res.status(status.OK).json({
      message: "Order fetched successfully",
      data: orderList,
    });
  } catch (error) {
    logger.error("Internal Server Error in fetchController:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const getOrderByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const orderDetails = await database.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        orderItems: true,
      },
    });

    if (!orderDetails) {
      return res.status(status.NOT_FOUND).json({ message: "Order not found" });
    }

    return res.status(status.OK).json({
      message: "Order fetched successfully",
      data: orderDetails,
    });
  } catch (error) {
    logger.error("Failed to create order:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};
