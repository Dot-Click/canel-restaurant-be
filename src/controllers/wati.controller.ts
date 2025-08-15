import { Request, Response } from "express";
import { eq, isNull, or } from "drizzle-orm";
import { database } from "@/configs/connection.config";
import { logger } from "@/utils/logger.util";
import { orderItems, orders, products } from "@/schema/schema";

export const getBranchesForWati = async (_req: Request, res: Response) => {
  try {
    // 1. Fetch all branches from the database
    const allBranches = await database.query.branch.findMany({
      with: {
        city: { columns: { name: true } },
      },
      orderBy: (branches, { asc }) => [asc(branches.name)],
    });

    // 2. Build the text menu for the user
    let menuText = "🏢 Available Branches:\n";
    allBranches.forEach((branch, index) => {
      // Format: "1. Branch Name - City"
      menuText += `${index + 1}. ${branch.name} - ${branch.city?.name}\n`;
    });
    menuText += "\nReply with the branch number to view the menu.";

    // 3. Send the formatted text back to Wati
    return res.status(200).json({ menu: menuText });
  } catch (error) {
    logger.error(`Error in getBranchesForWati: ${error}`);
    return res.status(500).json({
      message: "An internal server error occurred while fetching branches.",
    });
  }
};

export const getMenuForWati = async (req: Request, res: Response) => {
  try {
    const { branchNumber } = req.body;

    if (!branchNumber) {
      return res.status(400).json({ message: "Branch number is required." });
    }

    const allBranches = await database.query.branch.findMany({
      orderBy: (branches, { asc }) => [asc(branches.name)],
    });

    const selectedBranch = allBranches[Number(branchNumber) - 1];

    if (!selectedBranch) {
      return res
        .status(404)
        .json({ message: "Invalid branch number provided." });
    }

    const branchProducts = await database.query.products.findMany({
      where: or(
        eq(products.branchId, selectedBranch.id),
        isNull(products.branchId)
      ),
    });

    const finalBranchNameAndPrice = branchProducts
      .map((p, i) => `${i + 1}. ${p.name} - $${p.price}`)
      .join("\n");

    return res.status(200).json(finalBranchNameAndPrice);
  } catch (error) {
    logger.error(`Error in getMenuForWati: ${error}`);
    return res.status(500).json({
      message: "An internal server error occurred while fetching the menu.",
    });
  }
};

export const placeOrderForWati = async (req: Request, res: Response) => {
  try {
    const {
      branchNumber,
      itemNumber,
      name,
      location,
      phone,
      email,
      type,
      quantity,
    } = req.body;

    if (
      !branchNumber ||
      !itemNumber ||
      !name ||
      !phone ||
      !email ||
      !type ||
      !quantity
    ) {
      return res.status(400).json({
        message: "Missing required information. Please provide all details.",
      });
    }

    const newOrder = await database.transaction(async (tx) => {
      const allBranches = await tx.query.branch.findMany({
        orderBy: (branches, { asc }) => [asc(branches.name)],
      });

      const selectedBranch = allBranches[Number(branchNumber) - 1];

      if (!selectedBranch) throw new Error("Invalid branch data.");

      const branchProducts = await tx.query.products.findMany({
        where: or(
          eq(products.branchId, selectedBranch.id),
          isNull(products.branchId)
        ),
      });

      const selectedProduct = branchProducts[Number(itemNumber) - 1];

      if (!selectedProduct) throw new Error("Invalid item number selected.");

      const [order] = await tx
        .insert(orders)
        .values({
          branchId: selectedBranch.id,
          status: "pending",
          //   source: "Wati Chatbot",
          name: name,
          type: type,
          phoneNumber: phone,
          location: location,
        })
        .returning();

      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: Number(quantity),
        price: selectedProduct.price,
      });

      return order;
    });

    return res
      .status(200)
      .json({ message: "Order placed successfully", data: newOrder });
  } catch (error) {
    logger.error(`Error in placeOrderForWati: ${error}`);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An internal server error occurred.";
    return res.status(500).json({ message: errorMessage });
  }
};
