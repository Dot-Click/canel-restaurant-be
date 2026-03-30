import { Router } from "express";
import {
  calculateCartPriceForWati,
  extractLocation,
  fetchCategoryController,
  getBranchesForWati,
  getMenuForWati,
  placeOrderForWati,
  getRecentOrdersMenu,
  selectRepeatOrder,
  // watiIncomingWebhook,
} from "@/controllers/wati.controller";
import { downloadWatiMedia } from "@/utils/watiService";
import { uploadBufferToCloudinary } from "@/configs/cloudinary.config";
import bodyParser from "body-parser";
import status from "http-status";

const watiRoute = Router();
const uniqueRoute = Router();

watiRoute.get("/fetch-branches", getBranchesForWati);
watiRoute.post("/fetch-menu/:categoryName", getMenuForWati);
watiRoute.post("/place-order", placeOrderForWati);
watiRoute.get("/recent-orders/:phone", getRecentOrdersMenu);
watiRoute.post("/select-repeat-order", selectRepeatOrder);
watiRoute.get("/fetch-category", fetchCategoryController);

uniqueRoute.post(
  "/incoming-image",
  bodyParser.text({ type: "*/*" }),
  async (req, res) => {
    try {
      console.log("IMAGE req.body", req.body);
      if (!req.body || req.body.trim() === "" || req.body === "null") {
        return res.status(status.BAD_REQUEST).json({ received: true });
      }

      const body = JSON.parse(req.body);

      console.log("body", body);

      const fileName = body.fileName || body.image;

      console.log("fileName", fileName);

      if (!fileName) {
        return res.status(status.BAD_REQUEST).json({ received: true });
      }

      const mediaBuffer = await downloadWatiMedia(fileName);
      const paymentImageUrl = await uploadBufferToCloudinary(mediaBuffer);

      return res.status(200).json({
        received: true,
        paymentImageUrl,
      });
    } catch (err) {
      console.error("incoming-image error", err);
      return res.status(status.INTERNAL_SERVER_ERROR).json({ received: false });
    }
  }
);

watiRoute.post("/extract-location", extractLocation);

watiRoute.post("/calculate", calculateCartPriceForWati);

export { watiRoute, uniqueRoute };
