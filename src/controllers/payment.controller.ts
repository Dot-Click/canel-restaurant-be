import fetch from "node-fetch";
import { encrypt } from "../lib/crypto";
import { Request, Response } from "express";
import { env } from "@/utils/env.utils";

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
