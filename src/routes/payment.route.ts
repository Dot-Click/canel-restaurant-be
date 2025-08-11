import payTDC from "@/controllers/payment.controller";
// import { protectRoute } from "@/middlewares/auth.middleware";
import { env } from "@/utils/env.utils";
import { Router } from "express";

const paymentRoutes = Router();

paymentRoutes.post("/create-payment", async (req, res) => {
  try {
    console.log(req.body);
    const result = await payTDC({
      data: req.body,
      merchantId: env.MERCANTILE_MERCHANT_ID,
      integratorId: env.MERCANTILE_INTEGRATOR_ID,
      terminalId: env.MERCANTILE_TERMINAL_ID,
      clientId: env.MERCANTILE_CLIENT_ID,
    });

    console.log("This is the result", result);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Payment failed" });
  }
});

export { paymentRoutes };
