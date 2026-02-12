import { database } from "@/configs/connection.config";

type DeliveryRate = { min: number; max: number; price: number };

export async function calculateDeliveryFee(
  branchId: string,
  distanceKm: number
): Promise<number> {
  const b = await database.query.branch.findFirst({
    where: (br, { eq }) => eq(br.id, branchId),
    columns: { id: true, deliveryRates: true },
  });

  if (!b) throw new Error("Branch not found");

  let rates: DeliveryRate[] = [];

  const rawRates = b.deliveryRates;

  // Mirror frontend parsing
  if (typeof rawRates === "string") {
    rates = JSON.parse(rawRates);
  } else if (Array.isArray(rawRates)) {
    rates = rawRates as DeliveryRate[];
  } else if (typeof rawRates === "number") {
    return Math.ceil(distanceKm * rawRates);
  }

  if (!rates.length) {
    throw new Error("No delivery rates configured for this branch");
  }

  // Sort by min like frontend
  rates.sort((a, b) => a.min - b.min);

  // Strict match: >= min AND <= max (note the <=)
  const match =
    rates.find((r) => distanceKm >= r.min && distanceKm <= r.max) ??
    // Fallback: if distance > highest max, use last tier
    (() => {
      const lastTier = rates[rates.length - 1];
      if (distanceKm > lastTier.max) return lastTier;
      return undefined;
    })();

  if (!match) {
    console.error(`No delivery rate found for distance ${distanceKm} km`, {
      distanceKm,
      rates,
    });

    throw new Error(`No delivery rate found for distance ${distanceKm} km`);
  }

  return match.price;
}
