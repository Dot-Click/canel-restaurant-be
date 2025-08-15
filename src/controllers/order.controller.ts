import { Request, Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { database } from "@/configs/connection.config";
import {
  cartItems,
  globalOrderStatus,
  orders,
  orderItems,
  branch,
  // products,
  users,
  cart,
  products,
} from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import status from "http-status";

export const insertController = async (req: Request, res: Response) => {
  const { cartId, branchId, ...formData } = req.body;
  const userId = req.user!.id;

  console.log("THis is the request body:-", req.body);

  if (!cartId || !branchId) {
    return res
      .status(status.BAD_REQUEST)
      .json({ message: "Cart ID and Branch ID are required." });
  }

  try {
    const newOrder = await database.transaction(async (tx) => {
      // 1. Check for global pause
      const [globalSetting] = await tx
        .select()
        .from(globalOrderStatus)
        .limit(1);
      if (globalSetting?.isPaused) {
        throw new Error(
          globalSetting.reason ||
            "Ordering is temporarily paused. Please try again later."
        );
      }

      // 2. Check for branch-specific pause
      const results = await tx
        .select({
          isPaused: branch.isPaused,
          pauseReason: branch.pauseReason,
        })
        .from(branch)
        .where(eq(branch.id, branchId))
        .limit(1);

      // Get the first element from the array
      const selectedBranch = results[0];

      if (!selectedBranch) {
        throw new Error("Branch not found.");
      }

      if (!selectedBranch) {
        throw new Error("Branch not found.");
      }

      if (selectedBranch.isPaused) {
        throw new Error(
          selectedBranch.pauseReason ||
            "This branch is not accepting orders right now."
        );
      }
      console.log("hello bruhhh");
      // 3. Check for items in the cart
      const itemsInCart = await tx.query.cartItems.findMany({
        where: eq(cartItems.cartId, cartId),
        with: {
          product: true,
        },
      });

      if (itemsInCart.length === 0) {
        throw new Error("Cannot place an order with an empty cart.");
      }

      // 4. Create the order
      const [insertedOrder] = await tx
        .insert(orders)
        .values({
          ...formData,
          userId,
          branchId,
        })
        .returning();

      const newOrderItems = itemsInCart.map((item) => {
        if (!item.product) {
          throw new Error(
            `Product with ID ${item.productId} not found. Order cannot be placed.`
          );
        }
        return {
          orderId: insertedOrder.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          instructions: item.instructions || "",
        };
      });

      await tx.insert(orderItems).values(newOrderItems);

      // 5. Clear the cart
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

export const updateController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    console.log("This is the updated data", updateData);
    console.log("This is the ID:", id);
    if (!id) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Order ID is required." });
    }

    if (updateData.id) {
      delete updateData.id;
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "No update data provided." });
    }

    const updatedOrder = await database
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();

    if (updatedOrder.length === 0) {
      return res.status(status.NOT_FOUND).json({ message: "Order not found" });
    }

    res.status(status.OK).json({
      message: "Order updated successfully",
      data: updatedOrder[0],
    });
  } catch (error) {
    logger.error("Failed to update order:", error);
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

// For Wati
export const createWatiOrderController = async (
  req: Request,
  res: Response
) => {
  try {
    const { productId, quantity, name, phone, email, location } = req.body;

    if (!productId || !quantity) {
      return res
        .status(400)
        .json({ message: "Product ID and quantity are required." });
    }

    // 1. Fetch product details from DB
    const product = await database.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // 2. Find or create customer
    let customerUserId: string | null = null;
    if (email) {
      const customer = await database.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (customer) {
        customerUserId = customer.id;
      } else {
        const newUserId = crypto.randomUUID();
        const [newCustomer] = await database
          .insert(users)
          .values({
            id: newUserId,
            email,
            fullName: name || "WhatsApp Customer",
            phone,
          })
          .returning({ id: users.id });

        customerUserId = newCustomer.id;
      }
    }

    // 3. Create the order
    const [order] = await database
      .insert(orders)
      .values({
        name,
        phoneNumber: phone,
        location,
        userId: customerUserId,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    // 4. Create order item
    await database.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      quantity,
      price: product.price,
    });

    // 5. Respond with Wati-friendly message
    return res.status(201).json({
      message: `Order placed successfully!\n\n🛍 Item: ${
        product.name
      }\n📦 Qty: ${quantity}\n💰 Total: $${(
        Number(product.price) * quantity
      ).toFixed(2)}\n\nWe will contact you soon for confirmation.`,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Failed to create Wati order:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Riders related orders.....
export const assignRiderController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // The Order ID
    const { riderId } = req.body; // The Rider's User ID

    if (!id) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Order ID is required." });
    }
    if (!riderId) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Rider ID is required." });
    }

    // Optional but recommended: Check if the rider actually exists and has the 'rider' role
    const riderExists = await database.query.users.findFirst({
      where: (users, { and, eq }) =>
        and(eq(users.id, riderId), eq(users.role, "rider")),
    });

    if (!riderExists) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "A valid rider with that ID was not found." });
    }

    // Update the order, setting the new riderId
    const updatedOrder = await database
      .update(orders)
      .set({ riderId: riderId }) // The core logic is here
      .where(eq(orders.id, id))
      .returning();

    if (updatedOrder.length === 0) {
      return res.status(status.NOT_FOUND).json({ message: "Order not found." });
    }

    res.status(status.OK).json({
      message: "Order successfully assigned to rider.",
      data: updatedOrder[0],
    });
  } catch (error) {
    logger.error("Failed to assign rider to order:", error);
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const acceptOrderController = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const currentUser = req.user;

    if (!currentUser?.role) {
      return res
        .status(status.FORBIDDEN)
        .json({ message: "Forbidden. Access denied." });
    }

    const role = currentUser.role.toLowerCase();

    if (!["admin", "manager", "rider"].includes(role)) {
      return res
        .status(status.FORBIDDEN)
        .json({ message: "Forbidden. Insufficient privileges." });
    }

    let riderToAssignId: string;

    if (currentUser?.role?.toLowerCase() === "admin") {
      const { riderId } = req.body;
      if (!riderId) {
        return res
          .status(status.BAD_REQUEST)
          .json({ message: "Rider ID is required for admin assignment." });
      }

      const riderExists = await database.query.users.findFirst({
        where: and(eq(users.id, riderId), eq(users.role, "rider")),
      });
      if (!riderExists) {
        return res
          .status(status.NOT_FOUND)
          .json({ message: "The specified rider was not found." });
      }

      riderToAssignId = riderId;
    } else {
      riderToAssignId = currentUser.id;
    }

    const [orderToUpdate] = await database
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!orderToUpdate) {
      return res.status(status.NOT_FOUND).json({ message: "Order not found." });
    }

    if (orderToUpdate.status !== "pending") {
      return res.status(status.CONFLICT).json({
        message: `This order cannot be accepted. Its current status is "${orderToUpdate.status}".`,
      });
    }

    const [updatedOrder] = await database
      .update(orders)
      .set({
        status: "accepted",
        riderId: riderToAssignId,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    return res.status(status.OK).json({
      message: "Order accepted and assigned successfully!",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error in acceptOrderController:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};

export const getRiderOrdersController = async (req: Request, res: Response) => {
  try {
    const rider = req.user;

    if (!rider) {
      return res
        .status(status.UNAUTHORIZED)
        .json({ message: "Unauthorized. Please log in." });
    }

    if (rider?.role?.toLowerCase() !== "rider") {
      return res
        .status(status.FORBIDDEN)
        .json({ message: "Forbidden. This action is for riders only." });
    }

    const riderOrders = await database.query.orders.findMany({
      where: and(
        eq(orders.riderId, rider.id),

        inArray(orders.status, ["accepted", "on_the_way"])
      ),

      with: {
        branch: true,
        user: true,
        orderItems: {
          with: {
            product: true,
          },
        },
      },

      orderBy: [desc(orders.createdAt)],
    });

    return res.status(status.OK).json({
      message: "Rider's active orders fetched successfully.",
      data: riderOrders,
    });
  } catch (error) {
    console.error("Error fetching rider's orders:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An internal server error occurred while fetching orders.",
    });
  }
};

export const getOrdersByRiderIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const { riderId } = req.params;

    if (!riderId) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Rider ID is required." });
    }

    const riderExists = await database.query.users.findFirst({
      where: and(eq(users.id, riderId), eq(users.role, "rider")),
    });

    if (!riderExists) {
      return res.status(status.NOT_FOUND).json({ message: "Rider not found." });
    }

    const assignedOrders = await database.query.orders.findMany({
      where: and(
        eq(orders.riderId, riderId),

        inArray(orders.status, ["accepted", "on_the_way"])
      ),
      with: {
        branch: true,
        user: true,
        orderItems: {
          with: {
            product: true,
          },
        },
      },
      orderBy: [desc(orders.acceptedAt)],
    });

    return res.status(status.OK).json({
      message: "Orders for the specified rider fetched successfully.",
      data: assignedOrders,
    });
  } catch (error) {
    console.error("Error fetching orders for rider:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};
