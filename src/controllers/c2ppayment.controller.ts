import fetch from "node-fetch";
import { Request, Response } from "express";
import { env } from "@/utils/env.utils";

const C2P_KEY_REQUEST_URL =
  "https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/payment/c2p";

function buildMerchantIdentify() {
  return {
    integratorId: env.MERCANTILE_INTEGRATOR_ID,
    merchantId: env.MERCANTILE_MERCHANT_ID,
    terminalId: env.MERCANTILE_TERMINAL_ID,
  };
}

function buildClientIdentify(req: Request) {
  let ua = req.headers["user-agent"] || "unknown";
  const MAX = 80;
  if (ua.length > MAX) ua = ua.substring(0, MAX);
  return {
    ipaddress: req.ip || "127.0.0.1",
    browser_agent: ua,
    mobile: { manufacturer: "Web" },
  };
}

export async function requestC2PKey(req: Request, res: Response) {
  try {
    const {
      destination_bank_id,
      destination_id,
      destination_mobile_number,
      origin_mobile_number,
      amount,
      invoice_number,
      customerId,
    } = req.body;

    // Validate required fields
    const required = [
      "destination_bank_id",
      "destination_id",
      "destination_mobile_number",
      "origin_mobile_number",
      "amount",
    ];
    for (let f of required) {
      if (!req.body[f]) {
        return res.status(400).json({ error: `Missing field: ${f}` });
      }
    }

    const body: any = {
      merchant_identify: buildMerchantIdentify(),
      client_identify: buildClientIdentify(req),
      transaction_c2p: {
        trx_type: "compra",
        payment_method: "c2p",
        destination_bank_id,
        destination_id, // encrypted? spec says “oid / destino_id (encrypt)” :contentReference[oaicite:3]{index=3}
        destination_mobile_number,
        origin_mobile_number,
        invoice_number: invoice_number || "",
        payment_reference: "", // optional or empty
        amount,
        currency: "ves",
        customer_id: customerId || "",
      },
    };

    const headers = {
      "Content-Type": "application/json",
      "X-IBM-Client-Id": env.MERCANTILE_CLIENT_ID,
    };

    const resp = await fetch(C2P_KEY_REQUEST_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const result = await resp.json();

    if (!resp.ok) {
      console.error("C2P key request error:", result);
      return res.status(resp.status).json(result);
    }
    return res.json(result);
  } catch (err: any) {
    console.error("requestC2PKey error:", err);
    return res
      .status(500)
      .json({ error: "Internal error", details: err.message });
  }
}

export async function executeC2PPayment(req: Request, res: Response) {
  try {
    const {
      origin_mobile_number,
      destination_mobile_number,
      destination_id,
      payment_reference,
      amount,
      customerId,
    } = req.body;

    const body: any = {
      merchant_identify: buildMerchantIdentify(),
      client_identify: buildClientIdentify(req),
      transaction_c2p: {
        trx_type: "compra",
        payment_method: "c2p",
        origin_mobile_number,
        destination_mobile_number,
        destination_id,
        payment_reference,
        amount,
        currency: "ves",
        customer_id: customerId || "",
      },
    };

    const headers = {
      "Content-Type": "application/json",
      "X-IBM-Client-Id": env.MERCANTILE_CLIENT_ID,
    };

    const resp = await fetch(C2P_KEY_REQUEST_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const result = await resp.json();

    if (!resp.ok) {
      console.error("C2P pay error:", result);
      return res.status(resp.status).json(result);
    }
    return res.json(result);
  } catch (err: any) {
    console.error("C2P execution error:", err);
    return res.status(500).json({ error: err.message });
  }
}
