import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { database } from "@/configs/connection.config";
import { logger } from "@/utils/logger.util";
import { products } from "@/schema/schema";

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
      where: eq(products.branchId, selectedBranch.id),
      with: {
        category: true, // Include category details for grouping
      },
    });

    const groupedProducts: { [key: string]: any[] } = {};
    branchProducts.forEach((product) => {
      const categoryName = product.category?.name || "Miscellaneous";

      if (!groupedProducts[categoryName]) {
        groupedProducts[categoryName] = [];
      }

      groupedProducts[categoryName].push({
        id: product.id,
        title: product.name,
        description: `Price: $${product.price}`,
      });
    });

    const sections = Object.keys(groupedProducts).map((categoryName) => {
      return {
        title: categoryName,
        rows: groupedProducts[categoryName],
      };
    });

    // 9. Assemble the final, complete Interactive List Message JSON
    const interactiveMenu = {
      header: {
        type: "text",
        text: `Menu for ${selectedBranch.name}`,
      },
      body: {
        text: "Please select an item from the list below to proceed.",
      },
      action: {
        button: "View Menu", // This is the button text the user first sees
        sections: sections,
      },
    };

    console.log(sections);
    console.log(interactiveMenu);

    // 10. Send the complete JSON object back to Wati
    return res.status(200).json(interactiveMenu);
  } catch (error) {
    logger.error(`Error in getMenuForWati: ${error}`);
    return res.status(500).json({
      message: "An internal server error occurred while fetching the menu.",
    });
  }
};
