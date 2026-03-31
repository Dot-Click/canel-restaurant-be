import { Request, Response } from "express";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { database } from "@/configs/connection.config";
import { logger } from "@/utils/logger.util";
import { orderItems, orders, productCategories, products, users } from "@/schema/schema";
import status from "http-status";
import { calculateDeliveryFee } from "@/helper/calculate";
import { distanceInKmBetweenCoordinates } from "@/helper/convertcord";
import axios from "axios";
import { env } from "@/utils/env.utils";
import { createId } from "@paralleldrive/cuid2";

type ProductRow = typeof products.$inferSelect;
// type CategoryRow = typeof category.$inferSelect;

const normalizePhone = (p: string) => p.replace(/\D/g, "");

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
    let menuText = "";
    allBranches.forEach((branch, index) => {
      // Format: "1. Branch Name - City"
      menuText += `${index + 1}. ${branch.name} - ${branch.city?.name}\n`;
    });
    menuText +=
      "\nResponda con el número de la sucursal de donde desea ordenar.";

    // 3. Send the formatted text back to Wati
    return res.status(200).json({ menu: menuText });
  } catch (error) {
    logger.error(`Error in getBranchesForWati: ${error}`);
    return res.status(500).json({
      message: "An internal server error occurred while fetching branches.",
    });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
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

export const getMenuForWati = async (req: Request, res: Response) => {
  try {
    const categoryName = req.params.categoryName;
    console.log(req.params);

    const cat = await database.query.category.findFirst({
      where: (c, { eq, and }) =>
        and(eq(c.name, categoryName), eq(c.visibility, true)),
      columns: { id: true, name: true },
      with: {
        products: {
          with: {
            product: {
              columns: { id: true, name: true, price: true },
            },
          },
        },
      },
    });

    if (!cat) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Category not found" });
    }

    const productsList = cat.products.map((pc) => pc.product).filter(Boolean);

    if (!productsList.length) {
      return res.status(status.BAD_REQUEST).json({
        message: "No menu for this category",
        data: "",
      });
    }

    const finalNameAndPrice = productsList
      .map((p, i) => {
        const price = typeof p.price === "string" ? p.price : String(p.price);
        return `${i + 1}. ${p.name} - $${price}`;
      })
      .join("\n");

    return res.status(status.OK).json({
      message: "Products fetched successfully",
      data: finalNameAndPrice,
    });
  } catch (error) {
    logger.error(`Error in getMenuForWati: ${error}`);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An internal server error occurred while fetching the menu.",
    });
  }
};

export const placeOrderForWati = async (req: Request, res: Response) => {
  try {
    console.log("req.body", req.body);

    const {
      branchNumber,
      itemCart, // e.g. "Burgers:1:2, Drinks:3:1"
      name,
      location,
      phoneNumber,
      phone,
      email,
      paymentType,
      paymentImageUrl,
    } = req.body;

    const rawType = req.body.type as string;
    let type = rawType?.toLowerCase() as "delivery" | "pickup";

    if (type !== "delivery" && type !== "pickup" && location) {
      type = "delivery";
    }

    if (
      !branchNumber ||
      !itemCart ||
      !name ||
      !phone ||
      !phoneNumber ||
      !email ||
      !type ||
      !location
    ) {
      return res.status(status.BAD_REQUEST).json({
        message: "Missing required information. Please provide all details.",
      });
    }

    if (paymentType === "online" && !paymentImageUrl) {
      return res.status(status.BAD_REQUEST).json({
        message: "Payment image is required for online payments.",
      });
    }

    const parseLocation = (loc: string) => {
      const [latStr, lngStr] = loc.split(",").map((s) => s.trim());
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new Error("Invalid customer location format");
      }
      return { latitude: lat, longitude: lng };
    };

    const customerCoords = parseLocation(location);

    const cleanPhone = normalizePhone(phoneNumber);

    const newOrder = await database.transaction(async (tx) => {

      let userRecord = await tx.query.users.findFirst({
        where: eq(users.phoneNumber, cleanPhone),
      });

      if (!userRecord) {
        // Create a new user if they don't exist
        const [newUser] = await tx.insert(users).values({
          id: createId(),
          fullName: name,
          email: email,
          phoneNumberVerified: true,
          phoneNumber: cleanPhone,
          role: "user",
        }).returning();
        userRecord = newUser;
      }


      // 0) Branch
      const allBranches = await tx.query.branch.findMany({
        orderBy: (b, { asc }) => [asc(b.name)],
      });
      const selectedBranch = allBranches[Number(branchNumber) - 1];
      if (!selectedBranch) throw new Error("Invalid branch data.");

      // 1) Parse itemCart -> ParsedItem[]
      type ParsedItem = {
        categoryName: string;
        itemNum: number;
        quantity: number;
      };

      const rawPairs = itemCart
        .split(",")
        .map((p: string) => p.trim())
        .filter((p: string) => !!p && !p.startsWith("@cart_items"));

      const parsedItems: ParsedItem[] = rawPairs.map((pair: string) => {
        const parts = pair.split(":").map((x) => x.trim());
        if (parts.length !== 3) {
          throw new Error(`Invalid item format in cart: ${pair}`);
        }
        const [categoryNamePart, itemNumStr, qtyStr] = parts;
        const itemNum = Number(itemNumStr);
        const quantity = Number(qtyStr);

        if (!categoryNamePart || !itemNum || !quantity) {
          throw new Error(`Invalid item data in cart: ${pair}`);
        }

        return {
          categoryName: categoryNamePart,
          itemNum,
          quantity,
        };
      });

      // 2) Cache: categoryName(lowercased) -> products[]
      const categoryCache = new Map<string, ProductRow[]>();

      // 3) Create order header
      const [order] = await tx
        .insert(orders)
        .values({
          userId: userRecord?.id,
          branchId: selectedBranch.id,
          status: "pending",
          source: "Wati Chatbot",
          name,
          type,
          phoneNumber: phone,
          email,
          paymentType,
          location,
          onlinePaymentProveImage:
            paymentType !== "cash" ? paymentImageUrl : null,
        })
        .returning();

      let totalPrice = 0;

      // 4) Resolve each cart line
      for (const item of parsedItems) {
        const { categoryName, itemNum, quantity } = item;
        const cacheKey = categoryName.toLowerCase();

        let categoryProducts: ProductRow[];

        const cached = categoryCache.get(cacheKey);
        if (cached) {
          categoryProducts = cached;
        } else {
          const categoryRow = await tx.query.category.findFirst({
            where: (c, { sql }) =>
              sql`LOWER(${c.name}) = LOWER(${categoryName})`,
          });
          if (!categoryRow) {
            throw new Error(`Category not found: ${categoryName}`);
          }

          const productLinks = await tx.query.productCategories.findMany({
            where: (pc, { eq }) => eq(pc.categoryId, categoryRow.id),
          });
          if (!productLinks.length) {
            throw new Error(`No products linked to category: ${categoryName}`);
          }
          const productIds = productLinks.map((pc) => pc.productId);

          const productsForCategory = await tx.query.products.findMany({
            where: (p, { and, or, eq, isNull, inArray }) =>
              and(
                inArray(p.id, productIds),
                or(eq(p.branchId, selectedBranch.id), isNull(p.branchId))
              ),
            orderBy: (p, { asc }) => [asc(p.name)],
          });

          if (!productsForCategory.length) {
            throw new Error(
              `No products found for category "${categoryName}" in this branch`
            );
          }

          categoryProducts = productsForCategory as ProductRow[];
          categoryCache.set(cacheKey, categoryProducts);
        }

        const selectedProduct = categoryProducts[itemNum - 1];
        if (!selectedProduct) {
          throw new Error(
            `Invalid item number in cart: ${itemNum} for category ${categoryName}`
          );
        }

        const productPrice = Number(selectedProduct.price ?? 0);
        if (Number.isNaN(productPrice)) {
          throw new Error(
            `Invalid price for item number: ${itemNum} in category ${categoryName}`
          );
        }

        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity,
          price: productPrice.toString(),
        });

        totalPrice += productPrice * quantity;
      }

      // 5) Delivery fee + total
      if (!selectedBranch.location) {
        throw new Error("Branch location is not configured");
      }

      const branchCoords = JSON.parse(selectedBranch.location) as [
        number,
        number
      ];
      const [branchLat, branchLng] = branchCoords;

      let deliveryFee = 0;

      if (type === "delivery") {
        const distanceKm = distanceInKmBetweenCoordinates(
          Number(branchLat),
          Number(branchLng),
          customerCoords.latitude,
          customerCoords.longitude
        );

        deliveryFee = await calculateDeliveryFee(selectedBranch.id, distanceKm);
      }

      totalPrice += deliveryFee;
      const roundedTotalPrice = Number(totalPrice.toFixed(2));

      return { ...order, totalPrice: roundedTotalPrice };
    });

    return res
      .status(200)
      .json({ message: "Order placed successfully", data: newOrder });
  } catch (error) {
    console.log("Place Order ERROR:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An internal server error occurred.";
    return res.status(500).json({ message: errorMessage });
  }
};

export const calculateCartPriceForWati = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("[INCOMING REQUEST]:", req.body);

    const { branchNumber, itemCart, location } = req.body as {
      branchNumber: string;
      itemCart: string;
      type: "delivery" | "pickup";
      location?: string;
    };

    const rawType = req.body.type as string;
    let type = rawType?.toLowerCase() as "delivery" | "pickup";

    if (type !== "delivery" && type !== "pickup" && location) {
      type = "delivery";
    }

    if (!branchNumber || !itemCart || !type) {
      return res.status(status.BAD_REQUEST).json({
        message: "Missing branchNumber, itemCart or type",
      });
    }

    const parseLocation = (loc: string) => {
      const [latStr, lngStr] = loc.split(",").map((s) => s.trim());
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new Error("Invalid customer location format");
      }
      return { latitude: lat, longitude: lng };
    };

    const result = await database.transaction(async (tx) => {
      // 1. Branch
      const allBranches = await tx.query.branch.findMany({
        orderBy: (branches, { asc }) => [asc(branches.name)],
      });
      const selectedBranch = allBranches[Number(branchNumber) - 1];
      if (!selectedBranch) throw new Error("Invalid branch data.");

      // 2. Parse cart: "CAT:1:2, OTHER:3:1, @cart_items"
      type ParsedItem = {
        categoryName: string;
        itemNum: number;
        quantity: number;
      };

      const rawPairs = itemCart
        .split(",")
        .map((pair: string) => pair.trim())
        .filter((pair: string) => pair && !pair.startsWith("@cart_items"));

      const parsedItems: ParsedItem[] = rawPairs.map((pair: string) => {
        const parts = pair.split(":").map((x) => x.trim());
        if (parts.length !== 3) {
          throw new Error(`Invalid item format in cart: ${pair}`);
        }

        const [categoryNamePart, itemNumStr, qtyStr] = parts;
        const itemNum = Number(itemNumStr);
        const quantity = Number(qtyStr);

        if (
          !categoryNamePart ||
          Number.isNaN(itemNum) ||
          Number.isNaN(quantity) ||
          itemNum <= 0 ||
          quantity <= 0
        ) {
          throw new Error(`Invalid item data in cart: ${pair}`);
        }

        return {
          categoryName: categoryNamePart,
          itemNum,
          quantity,
        };
      });

      // 3. Cache: categoryName -> product list for that category + branch
      const productsByCategory = new Map<string, ProductRow[]>();

      let subtotal = 0;
      const items: {
        categoryName: string;
        itemNumber: number;
        productId: string;
        name: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }[] = [];

      for (const item of parsedItems) {
        const { categoryName, itemNum, quantity } = item;
        const cacheKey = categoryName.toLowerCase();

        let categoryProducts: ProductRow[];

        const cached = productsByCategory.get(cacheKey);
        if (cached) {
          categoryProducts = cached;
        } else {
          const categoryRow = await tx.query.category.findFirst({
            where: (c, { sql }) =>
              sql`LOWER(${c.name}) = LOWER(${categoryName})`,
          });
          if (!categoryRow) {
            throw new Error(`Category not found: ${categoryName}`);
          }

          const productLinks = await tx.query.productCategories.findMany({
            where: (pc, { eq }) => eq(pc.categoryId, categoryRow.id),
          });

          if (!productLinks.length) {
            throw new Error(`No products linked to category: ${categoryName}`);
          }

          const productIds = productLinks.map((pc) => pc.productId);

          const rows = await tx.query.products.findMany({
            where: (p, { and, or, eq, isNull, inArray }) =>
              and(
                inArray(p.id, productIds),
                or(eq(p.branchId, selectedBranch.id), isNull(p.branchId))
              ),
            orderBy: (p, { asc }) => [asc(p.name)],
          });

          if (!rows.length) {
            throw new Error(
              `No products found for category "${categoryName}" in this branch`
            );
          }

          categoryProducts = rows as ProductRow[];
          productsByCategory.set(cacheKey, categoryProducts);
        }

        const selectedProduct = categoryProducts[itemNum - 1];
        if (!selectedProduct) {
          throw new Error(
            `Invalid item number in cart: ${itemNum} for category ${categoryName}`
          );
        }

        const unitPrice = Number(selectedProduct.price ?? 0);
        if (Number.isNaN(unitPrice)) {
          throw new Error(
            `Invalid price for item number: ${itemNum} in category ${categoryName}`
          );
        }

        const lineTotal = unitPrice * quantity;
        subtotal += lineTotal;

        items.push({
          categoryName,
          itemNumber: itemNum,
          productId: selectedProduct.id,
          name: selectedProduct.name,
          quantity,
          unitPrice,
          lineTotal,
        });
      }

      const roundedSubtotal = Number(subtotal.toFixed(2));

      // 4. Delivery fee
      let deliveryFee = 0;
      let distanceKm: number | null = null;

      if (type === "delivery") {
        if (!location) {
          throw new Error("Location is required for delivery");
        }
        if (!selectedBranch.location) {
          throw new Error("Branch location is not configured");
        }

        const customerCoords = parseLocation(location);
        const branchCoords = JSON.parse(selectedBranch.location) as [
          number,
          number
        ];
        const [branchLat, branchLng] = branchCoords;

        distanceKm = distanceInKmBetweenCoordinates(
          Number(branchLat),
          Number(branchLng),
          customerCoords.latitude,
          customerCoords.longitude
        );

        deliveryFee = await calculateDeliveryFee(selectedBranch.id, distanceKm);
      }

      const total = roundedSubtotal + deliveryFee;
      const roundedTotal = Number(total.toFixed(2));

      return {
        branchId: selectedBranch.id,
        subtotal: roundedSubtotal,
        deliveryFee,
        distanceKm,
        total: roundedTotal,
        items,
      };
    });

    return res.status(status.OK).json({
      message: "Cart price calculated successfully",
      data: result,
    });
  } catch (error) {
    console.error("calculateCartPriceForWati ERROR:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An internal server error occurred.";
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: errorMessage });
  }
};

export const fetchCategoryController = async (req: Request, res: Response) => {
  try {
    // const { id, page = 1, limit = 9 } = req.body;

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 9);

    // if (id) {
    //   const category = await database.query.category.findFirst({
    //     where: (category, { eq }) => eq(category.id, id),
    //     columns: { id: true, name: true },
    //   });

    //   return res.status(status.OK).json({
    //     message: "Category fetched successfully",
    //     data: category ? [category] : [],
    //     page: 1,
    //     limit: 1,
    //     hasMore: false,
    //   });
    // }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(9, Math.max(1, Number(limit))); // keep 9, reserve 10th for MORE
    const offset = (pageNum - 1) * limitNum;

    // Fetch one extra row to detect "hasMore"
    const fetched = await database.query.category.findMany({
      columns: { id: true, name: true },
      limit: limitNum + 1,
      offset,
      orderBy: (category, { asc }) => [asc(category.name)],
    });

    const hasMore = fetched.length > limitNum;
    const categories = fetched.slice(0, limitNum);

    // Add 10th "MORE" row if needed
    if (hasMore) {
      categories.push({
        id: `MORE_${pageNum + 1}`, // encode next page here
        name: "More",
      });
    }

    return res.status(status.OK).json({
      message: "Categories fetched successfully",
      data: categories, // will be 9 or 10 items
      page: pageNum,
      limit: limitNum,
      hasMore,
    });
  } catch (error) {
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: (error as Error).message });
  }
};

export const extractLocation = async (req: Request, res: Response) => {
  try {
    const body = req.body as any;

    const WATI_BASE_URL = env.WATI_WHATSAPP_ENDPOINT!;
    const WATI_API_KEY = env.WATI_WHATSAPP_ACCESS_TOKEN!;

    console.log("req.body LOCATION", body);

    const isLocation =
      body.messageType === "location" ||
      body.type === "location" ||
      !!body.location ||
      (typeof body.text === "string" && body.text.includes("google.com/maps"));

    if (!isLocation) {
      return res.status(status.OK).json({ ok: true });
    }

    let latitude: number | undefined =
      body.location?.latitude ??
      body.payload?.location?.latitude ??
      body.message?.location?.latitude;

    let longitude: number | undefined =
      body.location?.longitude ??
      body.payload?.location?.longitude ??
      body.message?.location?.longitude;

    console.log("LOCATION object", body.location);

    if (
      (typeof latitude !== "number" || typeof longitude !== "number") &&
      typeof body.text === "string"
    ) {
      const urlMatch = body.text.match(/(https?:\/\/[^\s]+)/);

      if (urlMatch) {
        try {
          const url = new URL(urlMatch[0]);

          const lastSegment = url.pathname.split("/").filter(Boolean).pop();

          if (lastSegment && lastSegment.includes(",")) {
            const [latStr, lngStr] = lastSegment.split(",");
            const lat = Number(latStr);
            const lng = Number(lngStr);

            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
              latitude = lat;
              longitude = lng;
            }
          }
        } catch (e) {
          console.warn("Failed to parse maps URL from text", e);
        }
      }
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res
        .status(status.BAD_REQUEST)
        .json({ error: "Location coordinates not found" });
    }

    const data: [number, number] = [latitude, longitude];

    const waId: string | undefined = body.waId || body.wa_id;

    if (!waId) {
      return res
        .status(status.BAD_REQUEST)
        .json({ error: "Contact waId not found" });
    }

    const payload = {
      customParams: [
        {
          name: "location",
          value: `${data}`,
        },
      ],
    };

    await axios.post(
      `${WATI_BASE_URL}/api/v1/updateContactAttributes/${waId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${WATI_API_KEY}`,
        },
      }
    );

    return res.status(status.OK).json({
      data,
    });
  } catch (err) {
    console.error("Location webhook error:", err);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal server error" });
  }
};

export const getRecentOrdersMenu = async (req: Request, res: Response) => {
  try {
    const cleanPhone = normalizePhone(req.params.phone);

    const userRecord = await database.query.users.findFirst({
      where: eq(users.phoneNumber, cleanPhone),
    });

    if (!userRecord) {
      return res.status(200).json({
        exists: false,
        menu: "No tienes un perfil registrado o pedidos anteriores."
      });
    }

    const lastOrders = await database.query.orders.findMany({
      where: eq(orders.userId, userRecord.id),
      orderBy: [desc(orders.createdAt)],
      limit: 3,
      with: { orderItems: true }
    });

    if (!lastOrders.length) {
      return res.status(200).json({
        exists: false,
        menu: "No tienes pedidos anteriores registrados en tu cuenta."
      });
    }

    let menuText = "Selecciona el pedido que deseas repetir (Responde 1, 2 o 3):\n\n";
    lastOrders.forEach((order, i) => {
      const itemsText = order.orderItems.map(oi => oi.productName).join(", ").substring(0, 50);
      menuText += `${i + 1}. Pedido del ${order.createdAt?.toLocaleDateString()}: ${itemsText}...\n`;
    });

    return res.status(200).json({ 
        exists: true, 
        menu: menuText 
    });
  } catch (error) {
    logger.error(`Error in getRecentOrdersMenu: ${error}`);
    return res.status(500).json({ exists: false, menu: "Error fetching orders" });
  }
};


export const selectRepeatOrder = async (req: Request, res: Response) => {
  try {
    const { phone, selection } = req.body;
    const cleanPhone = normalizePhone(phone);
    const orderIndex = Number(selection) - 1;

    const userRecord = await database.query.users.findFirst({
      where: eq(users.phoneNumber, cleanPhone),
    });

    if (!userRecord) return res.status(404).json({ message: "Usuario no encontrado" });

    const userOrders = await database.query.orders.findMany({
      where: eq(orders.userId, userRecord.id),
      orderBy: [desc(orders.createdAt)],
      limit: 3,
      with: { orderItems: true }
    });

    const targetOrder = userOrders[orderIndex];
    if (!targetOrder) return res.status(404).json({ message: "Pedido no encontrado" });

    const allBranches = await database.query.branch.findMany({
      orderBy: (b, { asc }) => [asc(b.name)],
    });
    
    const branchNumber = allBranches.findIndex(b => b.id === targetOrder.branchId) + 1;

    const cartParts: string[] = [];
    for (const item of targetOrder.orderItems) {
      const productLink = await database.query.productCategories.findFirst({
        where: eq(productCategories.productId, item.productId!),
        with: { category: true }
      });

      if (productLink && productLink.category) {
        const categoryId = productLink.categoryId;

        // Get IDs in category
        const allLinksInCategory = await database.query.productCategories.findMany({
            where: eq(productCategories.categoryId, categoryId)
        });
        const productIdsInCat = allLinksInCategory.map(l => l.productId);

        // Fetch products matching original branch or NULL
        const availableInBranch = await database.query.products.findMany({
          where: and(
            inArray(products.id, productIdsInCat),
            or(
              eq(products.branchId, targetOrder.branchId as string),
              isNull(products.branchId)
            )
          ),
          orderBy: [products.name] // THIS MUST MATCH getMenuForWati SORTING
        });

        const index = availableInBranch.findIndex(p => p.id === item.productId) + 1;

        if (index > 0) {
          cartParts.push(`${productLink.category.name}:${index}:${item.quantity}`);
        }
      }
    }

    return res.status(status.OK).json({
      itemCart: cartParts.join(", "),
      branchNumber: branchNumber.toString(),
      summary: targetOrder.orderItems.map(oi => `• ${oi.productName} x${oi.quantity}`).join("\n")
    });
  } catch (error) {
    logger.error(`Error in selectRepeatOrder: ${error}`);
    return res.status(status.INTERNAL_SERVER_ERROR).json({ message: "Error" });
  }
};