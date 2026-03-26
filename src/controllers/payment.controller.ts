import fetch from "node-fetch";
import { encrypt } from "../lib/crypto";
import { Request, Response } from "express";
import { env } from "@/utils/env.utils";
import { database } from "@/configs/connection.config";
import { orders, currencyRates } from "@/schema/schema";
import { eq, desc } from "drizzle-orm";

const GETAUTH_URL =
  "https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/payment/getauth";

export const payTDC = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // const required = ["cardNumber", "expirationDate", "cvv"];

    // for (let field of required) {
    //   if (!data[field]) {
    //     return res.status(400).json({ error: `Missing field: ${field}` });
    //   }
    // }

    const encryptCvv = encrypt(data.cvv, env.MERCANTILE_SECRET_KEY);
    const body = {
      merchant_identify: {
        integratorId: env.MERCANTILE_INTEGRATOR_ID,
        merchantId: env.MERCANTILE_MERCHANT_ID,
        terminalId: env.MERCANTILE_TERMINAL_ID,
      },
      client_identify: {
        ipaddress: "10.0.0.1",
        browser_agent: "Chrome 18.1.3",
        mobile: {
          manufacturer: "Samsung",
        },
      },
      transaction: {
        trx_type: "compra",
        payment_method: "tdc",
        customer_id: data.customerId || "",
        card_number: data.cardNumber,
        expiration_date: data.expirationDate,
        cvv: encryptCvv,
        invoice_number: data.invoiceNumber,
        currency: data.currency || "ves",
        amount: data.amount,
      },
    };

    // Headers
    const headers = {
      "Content-Type": "application/json",
      "X-IBM-Client-Id": env.MERCANTILE_CLIENT_ID,
    };

    console.log("______________XXXXXX____________", body);

    const resp = await fetch(
      "https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/payment/pay",
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }
    );

    const result = await resp.json();

    if (!resp.ok) {
      console.log("API ERROR:-", result);
      return res.status(resp.status).json({ error: result });
    }

    return res.json(result);
  } catch (error: any) {
    console.error("Sandbox payment error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

export const getAuthTDC = async (req: Request, res: Response) => {
  try {
    const { cardNumber, customerId } = req.body;
    if (!cardNumber) {
      return res.status(400).json({ error: "Missing cardNumber" });
    }

    const body = {
      merchant_identify: {
        integratorId: env.MERCANTILE_INTEGRATOR_ID,
        merchantId: env.MERCANTILE_MERCHANT_ID,
        terminalId: env.MERCANTILE_TERMINAL_ID,
      },
      client_identify: {
        ipaddress: "127.0.0.1",
        browser_agent: "Chrome 18.1.3",
        mobile: {
          manufacturer: "Samsung",
        },
      },
      transaction_authInfo: {
        trx_type: "solaut",
        payment_method: "tdd",
        customer_id: customerId || "",
        card_number: cardNumber,
      },
    };

    const headers = {
      "Content-Type": "application/json",
      "X-IBM-Client-Id": env.MERCANTILE_CLIENT_ID,
    };

    const resp = await fetch(GETAUTH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const result = await resp.json();

    if (!resp.ok) {
      console.error("getauth returned error:", result);
      return res.status(resp.status).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    console.error("getAuth error:", err);
    return res
      .status(500)
      .json({ error: "Internal error", details: err.message });
  }
};

export const createMercantilButton = async (req: Request, res: Response) => {
  try {
    const { orderId, shippingFee } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const order = await database.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        orderItems: {
          with: {
            orderAddons: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Calculate total in USD (REF)
    let totalUsd = 0;
    for (const item of order.orderItems) {
      const itemPrice = parseFloat(item.price as string);
      totalUsd += itemPrice * item.quantity;

      if (item.orderAddons) {
        for (const addon of item.orderAddons) {
          const addonPrice = parseFloat(addon.price as string);
          totalUsd += addonPrice * addon.quantity;
        }
      }
    }

    // Add shipping fee
    const finalShippingFee = shippingFee !== undefined ? parseFloat(shippingFee) : 0;
    totalUsd += finalShippingFee;

    // Get current VES rate
    const [rateRow] = await database
      .select()
      .from(currencyRates)
      .orderBy(desc(currencyRates.createdAt))
      .limit(1);

    const rate = rateRow ? parseFloat(rateRow.rate) : 54.0; // Fallback rate
    const totalVes = totalUsd * rate;

    const today = new Date().toISOString().split("T")[0];
    const payload = {
      amount: parseFloat(totalVes.toFixed(2)),
      customerName: order.name || "Cliente",
      returnUrl: `${env.FRONTEND_DOMAIN}/place-order/${order.id}`,
      merchantId: env.MERCANTILE_MERCHANT_ID,
      invoiceNumber: {
        number: order.id.slice(0, 8),
        invoiceCreationDate: today,
        invoiceCancelledDate: today,
      },
      contract: {
        contractNumber: order.id.slice(0, 8),
        contractDate: today,
      },
      trxType: "compra",
      paymentConcepts: ["tdd", "tdc", "c2p"],
      currency: "ves",
    };

    const encryptedData = encrypt(
      JSON.stringify(payload),
      env.MERCANTILE_SECRET_KEY // Still using secret key for now, but I'll try 31 first
    );

    // Using the domain that responded to probing (botondepagos.mercantilbanco.com)
    // apimbu triggers WAF errors for web redirection.
    const baseUrl = "https://botondepagos.mercantilbanco.com/mercantil/botondepagos";

    return res.json({
      url: baseUrl,
      merchantid: env.MERCANTILE_MERCHANT_ID,
      integratorid: "31", // Testing with 31 as per documentation
      transactiondata: encryptedData,
    });
  } catch (error: any) {
    console.error("createMercantilButton error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
