import { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { database } from "@/configs/connection.config";
import { currencyRates } from "@/schema/schema";
import status from "http-status";

export const setUsdToVesRate = async (req: Request, res: Response) => {
  try {
    const { rate } = req.body as { rate: number | string };

    if (rate == null || Number(rate) <= 0) {
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Valid rate is required" });
    }

    const baseCurrency = "USD";
    const quoteCurrency = "VES";

    const [row] = await database
      .update(currencyRates)
      .set({
        rate: rate.toString(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(currencyRates.baseCurrency, baseCurrency),
          eq(currencyRates.quoteCurrency, quoteCurrency)
        )
      )
      .returning();

    const result =
      row ??
      (
        await database
          .insert(currencyRates)
          .values({
            baseCurrency,
            quoteCurrency,
            rate: rate.toString(),
          })
          .returning()
      )[0];

    return res
      .status(status.OK)
      .json({ message: "Rate updated", data: result });
  } catch (err) {
    console.error("setUsdToVesRate error", err);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error" });
  }
};

export const getUsdToVesRate = async (_req: Request, res: Response) => {
  try {
    const [row] = await database
      .select()
      .from(currencyRates)
      .orderBy(desc(currencyRates.createdAt))
      .limit(1);

    if (!row) {
      return res.status(status.OK).json({ promedio: 54.0, source: "fallback" });
    }

    const currentPrice = Number(row.rate);

    return res.status(status.OK).json({
      promedio: currentPrice,
    });
  } catch (err) {
    console.error("getUsdToVesRate error", err);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ source: "error-fallback" });
  }
};

export const convertPrice = async (req: Request, res: Response) => {
  try {
    const { price } = req.body;

    if (!price) {
      res.status(status.BAD_REQUEST).json({ message: "Kindly provide price" });
      return;
    }

    const [currentRate] = await database.select().from(currencyRates);

    const convertedPrice = price * Number(currentRate.rate);

    res.status(status.OK).json({ convertedPrice });
  } catch (error) {
    console.log(error);
    res.status(status.INTERNAL_SERVER_ERROR).json({ message: error });
  }
};
