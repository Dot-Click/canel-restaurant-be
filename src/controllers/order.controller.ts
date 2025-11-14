import { Request, Response } from "express";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
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
  orderAddons,
} from "@/schema/schema";
import { logger } from "@/utils/logger.util";
import status from "http-status";
import formidable from "formidable";
import cloudinary from "@/configs/cloudinary.config";
import { endOfWeek, startOfWeek } from "date-fns";
import crypto from "crypto";

export const insertController = async (req: Request, res: Response) => {
  const { cartId, branchId, ...formData } = req.body;
  const userId = req.user!.id;

  if (!cartId || !branchId) {
    return res
      .status(status.BAD_REQUEST)
      .json({ message: "Cart ID and Branch ID are required." });
  }

  try {
    // 1. Check for global pause
    const [globalSetting] = await database
      .select()
      .from(globalOrderStatus)
      .limit(1);

    if (globalSetting?.isPaused) {
      return res.status(status.FORBIDDEN).json({
        message:
          globalSetting.reason ||
          "Ordering is temporarily paused. Please try again later.",
      });
    }

    // 2. Check for branch pause
    const results = await database
      .select({
        isPaused: branch.isPaused,
        pauseReason: branch.pauseReason,
      })
      .from(branch)
      .where(eq(branch.id, branchId))
      .limit(1);

    const selectedBranch = results[0];
    if (!selectedBranch) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Branch not found." });
    }
    if (selectedBranch.isPaused) {
      return res.status(status.FORBIDDEN).json({
        message:
          selectedBranch.pauseReason ||
          "This branch is not accepting orders right now.",
      });
    }

    // 3. Fetch cart items with addons
    const itemsInCart = await database.query.cartItems.findMany({
      where: eq(cartItems.cartId, cartId),
      with: {
        product: true,
        selectedAddons: {
          with: {
            addonItem: true,
          },
        },
      },
    });

    if (itemsInCart.length === 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Cannot place an order with an empty cart." });
    }

    // 4. Create order
    const [insertedOrder] = await database
      .insert(orders)
      .values({
        ...formData, // name, phoneNumber, location, type, etc.
        userId,
        branchId,
      })
      .returning();

    // 5. Insert order items + addons
    for (const item of itemsInCart) {
      if (!item.product) {
        return res.status(status.BAD_REQUEST).json({
          message: `Product with ID ${item.productId} not found. Order cannot be placed.`,
        });
      }

      // Insert main order item
      const [insertedItem] = await database
        .insert(orderItems)
        .values({
          orderId: insertedOrder.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: String(item.product.price),
          instructions: item.instructions || "",
          discount: Number(item.product.discount) || 0,
        })
        .returning();

      // Insert addons if any
      if (item.selectedAddons?.length > 0) {
        const addonsToInsert = item.selectedAddons.map((addon) => ({
          orderItemId: insertedItem.id, // ✅ correct relation
          addonItemId: addon.addonItemId,
          quantity: addon.quantity,
          price: String(addon.addonItem?.price ?? 0),
        }));

        await database.insert(orderAddons).values(addonsToInsert);
      }
    }

    // 6. Clear cart
    await database.delete(cartItems).where(eq(cartItems.cartId, cartId));

    return res.status(status.CREATED).json({
      message: "Order placed successfully!",
      data: insertedOrder,
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

    if (!userId) {
      return res.status(401).json({ message: "User ID missing in session" });
    }

    let orderList = [];

    if (userRole === "admin") {
      orderList = await database.query.orders.findMany({
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        with: {
          orderItems: {
            with: {
              orderAddons: {
                with: {
                  addonItem: true,
                },
              },
            },
          },
        },
      });
    } else if (userRole === "manager") {
      const branchData = await database.query.branch.findFirst({
        where: (branch, { eq }) => eq(branch.manager, userId),
      });

      if (!branchData) {
        return res.status(status.FORBIDDEN).json({
          message: "No branch assigned to this manager.",
        });
      }

      orderList = await database.query.orders.findMany({
        where: (orders, { eq }) => eq(orders.branchId, branchData.id),
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
        with: {
          orderItems: {
            with: {
              orderAddons: {
                with: {
                  addonItem: true, // ✅ fetch addon details
                },
              },
            },
          },
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
        orderItems: {
          with: {
            product: true,
            orderAddons: {
              with: {
                addonItem: true,
              },
            },
          },
        },
        user: true, // optional: agar order ke user ka data bhi chahiye
        branch: true, // optional: agar branch ka data bhi chahiye
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
    logger.error("Failed to fetch order:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const createPosOrderController = async (req: Request, res: Response) => {
  const { items, ...formData } = req.body;

  const adminUserId = req.user!.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(status.BAD_REQUEST)
      .json({ message: "Order must contain at least one item." });
  }

  try {
    const newOrder = await database.transaction(async (tx) => {
      let customerUserId: string | null = null;

      if (formData.email) {
        const customer = await tx.query.users.findFirst({
          where: eq(users.email, formData.email),
        });
        if (customer) {
          customerUserId = customer.id;
        } else {
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
          userId: customerUserId,
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

      const adminCart = await tx.query.cart.findFirst({
        where: eq(cart.userId, adminUserId), // Use YOUR ID from the middleware
      });

      if (adminCart) {
        const cartIdToDelete = adminCart.id;
        logger.info(
          `POS order created. Clearing admin's (${adminUserId}) temporary cart: ${cartIdToDelete}.`
        );

        await tx.delete(cartItems).where(eq(cartItems.cartId, cartIdToDelete));

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

export const fetchRidersEarnedMoney = async (_req: Request, res: Response) => {
  try {
    // Step 1: Create a subquery to calculate the total value of addons for each order item.
    // This pre-aggregation prevents row duplication issues in the main query.
    const addonTotalsSq = database
      .select({
        orderItemId: orderAddons.orderItemId,
        total:
          sql<string>`sum(${orderAddons.price} * ${orderAddons.quantity})`.as(
            "total"
          ),
      })
      .from(orderAddons)
      .groupBy(orderAddons.orderItemId)
      .as("addon_totals_sq");

    const orderItemsTotalSq = database
      .select({
        orderId: orderItems.orderId,
        total: sql<string>`sum(
          (${orderItems.price} * ${orderItems.quantity}) +
          coalesce(${addonTotalsSq.total}::numeric, 0)
        )`.as("total"),
      })
      .from(orderItems)
      .leftJoin(addonTotalsSq, eq(orderItems.id, addonTotalsSq.orderItemId))
      .groupBy(orderItems.orderId)
      .as("order_items_total_sq");

    // Step 3: Main query to aggregate delivered orders and earnings for each rider.
    const ridersData = await database
      .select({
        riderId: users.id,
        riderName: users.fullName,
        profilePic: users.profilePic,
        phoneNumber: users.phoneNumber,
        deliveredOrdersCount: sql<number>`count(${orders.id})`.mapWith(Number),
        totalEarned: sql<string>`
          COALESCE(SUM(${orderItemsTotalSq.total}), 0) + 
          COALESCE(SUM(${orders.tip}), 0)
        `.mapWith(Number), // SQL handles the sum of items/addons + tips
      })
      .from(users)
      // Use LEFT JOIN to include riders with zero delivered orders
      .leftJoin(
        orders,
        and(eq(users.id, orders.riderId), eq(orders.status, "delivered"))
      )
      .leftJoin(orderItemsTotalSq, eq(orders.id, orderItemsTotalSq.orderId))
      .where(eq(users.role, "rider"))
      // Group by all non-aggregated columns from the 'users' table
      .groupBy(users.id, users.fullName, users.profilePic, users.phoneNumber)
      // Order by the highest earners first for a more useful admin view
      .orderBy(
        desc(sql`
          COALESCE(SUM(${orderItemsTotalSq.total}), 0) + 
          COALESCE(SUM(${orders.tip}), 0)
      `)
      );

    return res.status(200).json({
      success: true,
      message: "Rider earnings data fetched successfully.",
      data: ridersData,
    });
  } catch (error) {
    console.error("Error fetching rider earnings:", error);

    // Provide a structured error response
    if (error instanceof Error) {
      return res.status(500).json({
        success: false,
        message: "An internal server error occurred while fetching rider data.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "An unknown internal server error occurred.",
    });
  }
};

export const fetchRiderEarnedMoneyById = async (
  req: Request,
  res: Response
) => {
  try {
    const { id: riderId } = req.params;
    console.log(req.params);
    if (!riderId) {
      return res
        .status(400)
        .json({ success: false, message: "Rider ID is required." });
    }

    // The subqueries are the same as before, calculating order totals
    const addonTotalsSq = database
      .select({
        orderItemId: orderAddons.orderItemId,
        total:
          sql<string>`sum(${orderAddons.price} * ${orderAddons.quantity})`.as(
            "total"
          ),
      })
      .from(orderAddons)
      .groupBy(orderAddons.orderItemId)
      .as("addon_totals_sq");

    const orderItemsTotalSq = database
      .select({
        orderId: orderItems.orderId,
        total: sql<string>`sum(
          (${orderItems.price} * ${orderItems.quantity}) +
          coalesce(${addonTotalsSq.total}::numeric, 0)
        )`.as("total"),
      })
      .from(orderItems)
      .leftJoin(addonTotalsSq, eq(orderItems.id, addonTotalsSq.orderItemId))
      .groupBy(orderItems.orderId)
      .as("order_items_total_sq");

    const riderData = await database
      .select({
        riderId: users.id,
        riderName: users.fullName,
        profilePic: users.profilePic,
        deliveredOrdersCount: sql<number>`count(${orders.id})`.mapWith(Number),
        totalEarned: sql<string>`
          COALESCE(SUM(${orderItemsTotalSq.total}), 0) + 
          COALESCE(SUM(${orders.tip}), 0)
        `.mapWith(Number),
      })
      .from(users)
      .leftJoin(
        orders,
        and(eq(users.id, orders.riderId), eq(orders.status, "delivered"))
      )
      .leftJoin(orderItemsTotalSq, eq(orders.id, orderItemsTotalSq.orderId))
      .where(and(eq(users.role, "rider"), eq(users.id, riderId)))
      .groupBy(users.id, users.fullName, users.profilePic);

    const performanceData = riderData[0];

    if (!performanceData) {
      const riderInfo = await database.query.users.findFirst({
        where: eq(users.id, riderId),
      });
      if (!riderInfo)
        return res
          .status(404)
          .json({ success: false, message: "Rider not found." });

      return res.status(200).json({
        success: true,
        data: {
          riderId: riderInfo.id,
          riderName: riderInfo.fullName,
          profilePic: riderInfo.profilePic,
          deliveredOrdersCount: 0,
          totalEarned: 0,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: performanceData,
    });
  } catch (error) {
    console.error("Error fetching rider earnings by ID:", error);
    return res
      .status(500)
      .json({ success: false, message: "An internal server error occurred." });
  }
};
// Riders related orders.....

/**
 *
 * It will be used to update the status
 */
export const updateStatusOrderController = async (
  req: Request,
  res: Response
) => {
  try {
    const { orderId } = req.params;
    const { accept, deliver } = req.query;
    const currentUser = req.user;

    if (!currentUser?.role || currentUser.role !== "rider") {
      return res
        .status(status.FORBIDDEN)
        .json({ message: "Access denied. You are not rider." });
    }

    let riderToAssignId = currentUser.id;

    const [orderToUpdate] = await database
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!orderToUpdate) {
      return res.status(status.NOT_FOUND).json({ message: "Order not found." });
    }

    // OG logic starts here

    switch (true) {
      case !!accept:
        if (orderToUpdate.status === "accepted_by_rider") {
          return res.status(status.CONFLICT).json({
            message: `This order cannot be accepted. Its current status is "${orderToUpdate.status}".`,
          });
        }

        const [updatedOrder] = await database
          .update(orders)
          .set({
            status: "accepted_by_rider",
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

      case !!deliver:
        if (orderToUpdate.status !== "accepted_by_rider") {
          return res.status(status.CONFLICT).json({
            message: `Order cannot be marked as delivered. Its current status is "${orderToUpdate.status}".`,
          });
        }

        const [deliveredOrder] = await database
          .update(orders)
          .set({
            status: "delivered",
            deliveredAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId))
          .returning();

        return res.status(status.OK).json({
          message: "Order marked as delivered successfully!",
          data: deliveredOrder,
        });

      default:
        return res.status(status.BAD_REQUEST).json({
          message:
            "No valid action specified. Use '?accept=true' or '?deliver=true'.",
        });
    }
  } catch (error) {
    console.error("Error in acceptOrderController:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};

/**
 *
 * This for rider to upload image of delivery as prove apperently
 */
export const deliveryRiderImageUpload = async (req: Request, res: Response) => {
  try {
    const form = formidable();

    const { orderId } = req.params;

    const [_formData, files] = await form.parse<any, "deliveryImage">(req);

    console.log(files);

    const image = files.deliveryImage?.[0];

    if (!image) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Please provide the image." });
    }

    const cloudinaryResponse = await cloudinary.uploader.upload(
      image.filepath,
      { folder: "products" }
    );

    if (!cloudinaryResponse) {
      return res
        .status(status.UNPROCESSABLE_ENTITY)
        .json({ message: "Problem with image" });
    }

    const insertdeliveryImage = await database
      .update(orders)
      .set({ deliveryImage: cloudinaryResponse.secure_url })
      .where(eq(orders.id, orderId))
      .returning();

    return res.status(status.OK).json({
      data: insertdeliveryImage,
      message: "Image added successfully.",
    });
  } catch (error) {
    console.error("Error in acceptOrderController:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};

/**
 *
 * this is to fetch weekly earning and hours driven of the rider
 */
export const riderWeeklyMoneyAndHour = async (req: Request, res: Response) => {
  try {
    const riderId = req?.user?.id;

    if (!riderId) {
      return res
        .status(status.UNAUTHORIZED)
        .json({ message: "You are not authorized. Kindly Login" });
    }

    const today = new Date();

    const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 });
    const endOfWeekDate = endOfWeek(today, { weekStartsOn: 1 });

    const weeklyOrders = await database.query.orders.findMany({
      where: and(
        eq(orders.riderId, riderId),
        eq(orders.status, "delivered"),
        gte(orders.deliveredAt, startOfWeekDate),
        lte(orders.deliveredAt, endOfWeekDate)
      ),
      columns: {
        acceptedAt: true,
        deliveredAt: true,
        tip: true,
      },
      with: {
        orderItems: {
          columns: {
            price: true,
            quantity: true,
          },
        },
      },
    });
    console.log("This is weekly order", weeklyOrders);

    if (!weeklyOrders || weeklyOrders.length === 0) {
      return res.status(status.OK).json({
        message: "No delivered orders found for this week.",
        data: {
          weeklyEarnings: 0,
          hoursDriven: 0,
        },
      });
    }

    const totals = weeklyOrders.reduce(
      (acc, order) => {
        const orderTotal = order.orderItems.reduce((itemSum, item) => {
          const itemTotal = parseFloat(item.price) * item.quantity;
          return itemSum + (itemTotal || 0);
        }, 0);
        const orderTip = parseFloat(order.tip || "0.00"); // Safely parse the tip
        acc.earnings += orderTotal + orderTip;

        // Calculate time duration (remains the same)
        if (order.acceptedAt && order.deliveredAt) {
          const durationMs =
            order.deliveredAt.getTime() - order.acceptedAt.getTime();
          acc.milliseconds += durationMs;
        }

        return acc;
      },
      { earnings: 0, milliseconds: 0 }
    );

    const hoursDriven = (totals.milliseconds / (1000 * 60 * 60)).toFixed(2);

    return res.status(status.OK).json({
      message: "Weekly stats fetched successfully!",
      data: {
        weeklyEarnings: parseFloat(totals.earnings.toFixed(2)),
        hoursDriven: parseFloat(hoursDriven),
      },
    });
  } catch (error) {
    console.error("Error in acceptOrderController:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};

/**
 *
 * this is to add tip
 */

export const addTipToOrderController = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { tipAmount } = req.body;
    const currentUser = req.user;

    if (tipAmount === undefined || tipAmount === null) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "tipAmount is required in the body." });
    }

    const tipValue = parseFloat(tipAmount);

    if (isNaN(tipValue) || tipValue < 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "tipAmount must be a valid, non-negative number." });
    }

    const [order] = await database
      .select()
      .from(orders)
      .where(eq(orders.id, orderId as string));

    if (!order) {
      return res.status(status.NOT_FOUND).json({ message: "Order not found." });
    }

    if (order.riderId !== currentUser?.id) {
      return res
        .status(status.FORBIDDEN)
        .json({ message: "Forbidden. You are not the rider for this order." });
    }

    if (order.status !== "delivered") {
      return res.status(status.CONFLICT).json({
        message: `Cannot add tip. Order status is '${order.status}', not 'delivered'.`,
      });
    }

    // 3. Perform the update
    const [updatedOrder] = await database
      .update(orders)
      .set({
        tip: tipValue.toFixed(2), // Store as a formatted string
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId as string))
      .returning();

    return res.status(status.OK).json({
      message: "Tip added successfully!",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error in addTipToOrderController:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
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

        inArray(orders.status, ["confirmed", "accepted_by_rider", "on_the_way"])
      ),
      with: {
        branch: true,
        user: true,
        orderItems: {
          with: {
            product: true,
            orderAddons: {
              with: {
                addonItem: true,
              },
            },
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

// This is for RIDER APP
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
        inArray(orders.status, ["confirmed", "accepted_by_rider", "on_the_way"])
      ),
      with: {
        branch: true,
        orderItems: {
          columns: {
            productName: true,
            quantity: true,
            price: true,
            instructions: true,
          },
          with: {
            product: true,
            orderAddons: {
              with: {
                addonItem: true,
              },
            },
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

/**
 * This is to fetch orders with the delivered status for rider, also for the admin.
 */
export const getRiderDeliveredOrdersController = async (
  req: Request,
  res: Response
) => {
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

    const deliveredOrders = await database.query.orders.findMany({
      where: and(eq(orders.riderId, rider.id), eq(orders.status, "delivered")),
      with: {
        branch: true,
        user: true,
        orderItems: {
          columns: {
            productName: true,
            quantity: true,
            price: true,
            instructions: true,
          },
          with: {
            product: true,
            orderAddons: {
              with: {
                addonItem: true,
              },
            },
          },
        },
      },
      orderBy: [desc(orders.deliveredAt)],
    });

    return res.status(status.OK).json({
      message: "Delivered orders fetched successfully.",
      data: deliveredOrders,
    });
  } catch (error) {
    console.error("Error fetching delivered orders for rider:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message:
        "An internal server error occurred while fetching delivered orders.",
    });
  }
};

/**
 * This to fetch new customers vs old customers
 */
export const fetchNewVsRecurringOrdersController = async (
  _req: Request,
  res: Response
) => {
  try {
    // Step 1: Get all users with their order count
    const userOrderCounts = await database
      .select({
        userId: orders.userId,
        orderCount: sql<number>`COUNT(${orders.id})`,
      })
      .from(orders)
      .groupBy(orders.userId);

    // Step 2: Split into new vs recurring
    let newUsers = 0;
    let recurringUsers = 0;

    userOrderCounts.forEach((record) => {
      if (record.orderCount === 1) {
        newUsers++;
      } else if (record.orderCount > 1) {
        recurringUsers++;
      }
    });

    return res.status(status.OK).json({
      message: "New vs Recurring users fetched successfully",
      data: {
        total: newUsers + recurringUsers,
        newUsers,
        recurringUsers,
      },
    });
  } catch (error) {
    logger.error("Error fetching new vs recurring orders:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while fetching new vs recurring orders.",
    });
  }
};
