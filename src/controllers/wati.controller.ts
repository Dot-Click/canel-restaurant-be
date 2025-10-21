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
    console.log("Final Branch Name&Price:-", finalBranchNameAndPrice);
    return res
      .status(200)
      .json({ message: "Menu is presented", data: finalBranchNameAndPrice });
  } catch (error) {
    logger.error(`Error in getMenuForWati: ${error}`);
    return res.status(500).json({
      message: "An internal server error occurred while fetching the menu.",
    });
  }
};

export const placeOrderForWati = async (req: Request, res: Response) => {
  try {
    const { branchNumber, itemCart, name, location, phone, email, type } =
      req.body;

    console.log("This is req.body", req.body);

    if (
      !branchNumber ||
      !itemCart ||
      !name ||
      !phone ||
      !email ||
      !type ||
      !location
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

      const [order] = await tx
        .insert(orders)
        .values({
          branchId: selectedBranch.id,
          status: "pending",
          source: "Wati Chatbot",
          name: name,
          type: type,
          phoneNumber: phone,
          email: email,
          location: location,
        })
        .returning();

      let totalPrice = 0;
      const itemPairs = itemCart
        .split(",")
        .map((pair: string) => pair.trim())
        .filter((pair: string) => pair && !pair.includes("@cart_items"));

      for (const pair of itemPairs) {
        if (!pair) continue;

        const [itemNum, quantity] = pair.split(":");
        if (!itemNum || !quantity)
          throw new Error(`Invalid item format in cart: ${pair}`);

        const selectedProduct = branchProducts[Number(itemNum) - 1];
        if (!selectedProduct)
          throw new Error(`Invalid item number in cart: ${itemNum}`);

        // Ensure price is a number and handle potential null/undefined
        const productPrice = Number(selectedProduct.price) || 0;
        if (isNaN(productPrice)) {
          throw new Error(`Invalid price for item number: ${itemNum}`);
        }

        await tx.insert(orderItems).values({
          orderId: order.id,

          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: Number(quantity),
          price: productPrice.toString(),
        });

        totalPrice += productPrice * Number(quantity);
      }

      if (type === "delivery") {
        totalPrice += 3.99;
      }

      const roundedTotalPrice = Number(totalPrice.toFixed(2));

      return { ...order, totalPrice: roundedTotalPrice };
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
