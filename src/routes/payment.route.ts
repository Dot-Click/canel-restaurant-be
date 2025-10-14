import { getAuthTDC, payTDC } from "@/controllers/payment.controller";
import { Router } from "express";
import { executeC2PPayment } from "../controllers/c2ppayment.controller";

const paymentRoutes = Router();

paymentRoutes.post("/create-payment", payTDC);
paymentRoutes.post("/getauth-tdc", getAuthTDC);

paymentRoutes.post("/c2p", executeC2PPayment);

export { paymentRoutes };
