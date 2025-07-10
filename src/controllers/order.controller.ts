import { status } from "http-status";
import { Request, Response } from "express";
import { logger } from "@/utils/logger.util";
import { database } from "@/configs/connection.config";
import { eq } from "drizzle-orm";
import { cart, cartItems, orderItems, orders, users } from "@/schema/schema";
// import { auth } from "@/lib/auth";

export const insertController = async (req: Request, res: Response) => {
  const { cartId, ...formData } = req.body;
  console.log(req.body);
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
          instructions: item.instructions || "", // Ensure instructions are included
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
    const userId = req?.user?.id;
    const userRole = req.user?.role;
    console.log("This is user Role", userRole);
    if (!userId) {
      return res.status(401).json({ message: "User ID missing in session" });
    }

    let orderList = [];

    if (userRole === "admin") {
      orderList = await database.query.orders.findMany({
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        with: {
          orderItems: true,
        },
      });
    } else if (userRole === "manager") {
      const branch = await database.query.branch.findFirst({
        where: (branch, { eq }) => eq(branch.manager, userId),
      });
      console.log("This is branch", branch);
      if (!branch) {
        return res.status(status.FORBIDDEN).json({
          message: "No branch assigned to this manager.",
        });
      }

      orderList = await database.query.orders.findMany({
        where: (orders, { eq }) => eq(orders.branchId, branch.id),
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        with: {
          orderItems: true,
        },
      });
    } else {
      return res.status(status.FORBIDDEN).json({
        message: "Unauthorized user role.",
      });
    }

    res.status(status.OK).json({
      message: "Orders fetched successfully",
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

export const createPosOrderController = async (req: Request, res: Response) => {
  const { items, ...formData } = req.body;

  // 1. This is YOUR (the admin's) ID from the middleware.
  //    This is the ID associated with the temporary cart in the database.
  const adminUserId = req.user!.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(status.BAD_REQUEST)
      .json({ message: "Order must contain at least one item." });
  }

  try {
    const newOrder = await database.transaction(async (tx) => {
      // 2. Find the customer's user account to link to the order (if they exist).
      //    This part is for the permanent order record, NOT for finding the cart.
      let customerUserId: string | null = null;
      if (formData.email) {
        const customer = await tx.query.users.findFirst({
          where: eq(users.email, formData.email),
        });
        if (customer) {
          customerUserId = customer.id;
        } else {
          // Optional: Create a new customer if they don't exist
          // Generate a new UUID for the user ID (assuming you use UUIDs)
          const newUserId = crypto.randomUUID();
          const [newCustomer] = await tx
            .insert(users)
            .values({
              id: newUserId,
              email: formData.email,
              fullName: formData.name,
            })
            .returning({ id: users.id });
          customerUserId = newCustomer.id;
        }
      }

      // 3. Create the order and link it to the CUSTOMER's ID.
      const [insertedOrder] = await tx
        .insert(orders)
        .values({
          ...formData,
          userId: customerUserId, // The order belongs to the customer
        })
        .returning();

      // 4. Create the order items (no change here).
      const newOrderItems = items.map((item: any) => ({
        orderId: insertedOrder.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
      }));
      await tx.insert(orderItems).values(newOrderItems);

      // =================================================================
      //  THE GOD DAMN FIX IS HERE
      // =================================================================
      // 5. Find the cart belonging to YOU, THE ADMIN.
      const adminCart = await tx.query.cart.findFirst({
        where: eq(cart.userId, adminUserId), // Use YOUR ID from the middleware
      });

      // If YOU have a cart in the database...
      if (adminCart) {
        const cartIdToDelete = adminCart.id;
        logger.info(
          `POS order created. Clearing admin's (${adminUserId}) temporary cart: ${cartIdToDelete}.`
        );

        // ...delete all items inside that cart...
        await tx.delete(cartItems).where(eq(cartItems.cartId, cartIdToDelete));

        // ...and delete the main cart record itself.
        await tx.delete(cart).where(eq(cart.id, cartIdToDelete));
      } else {
        logger.warn(
          `Admin (${adminUserId}) placed a POS order but no corresponding cart was found to clear.`
        );
      }

      return insertedOrder;
    });

    return res.status(status.CREATED).json({
      message: "POS Order placed successfully!",
      data: newOrder,
    });
  } catch (error) {
    logger.error("Failed to create POS order:", error);

    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};
