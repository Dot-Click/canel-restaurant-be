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
    // 1. Get the number the user replied with from the request body
    const { branchNumber } = req.body;

    // 2. Validate the input
    if (!branchNumber) {
      return res.status(400).json({ message: "Branch number is required." });
    }

    // 3. Fetch branches again using the IDENTICAL sorting order
    const allBranches = await database.query.branch.findMany({
      orderBy: (branches, { asc }) => [asc(branches.name)],
    });

    // 4. Find the selected branch using the number as an index
    const selectedBranch = allBranches[Number(branchNumber) - 1];

    // 5. Validate that the number was valid
    if (!selectedBranch) {
      return res
        .status(404)
        .json({ message: "Invalid branch number provided." });
    }

    // 6. Fetch all products associated with the selected branch ID
    const branchProducts = await database.query.products.findMany({
      where: eq(products.branchId, selectedBranch.id),
      with: {
        category: true, // Include category details for grouping
      },
    });

    // 7. Group products by category to create sections for the Wati list
    const groupedProducts: { [key: string]: any[] } = {};
    branchProducts.forEach((product) => {
      const categoryName = product.category?.name || "Miscellaneous";

      // If we haven't seen this category yet, initialize its array
      if (!groupedProducts[categoryName]) {
        groupedProducts[categoryName] = [];
      }

      // Create the row object Wati expects
      // The 'id' here MUST be the unique product ID for ordering later
      groupedProducts[categoryName].push({
        id: product.id,
        title: product.name,
        description: `Price: $${product.price}`,
      });
    });

    // 8. Transform the grouped products into Wati's "sections" format
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

    // 10. Send the complete JSON object back to Wati
    return res.status(200).json(interactiveMenu);
  } catch (error) {
    logger.error(`Error in getMenuForWati: ${error}`);
    return res.status(500).json({
      message: "An internal server error occurred while fetching the menu.",
    });
  }
};
