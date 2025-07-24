import { database } from "@/configs/connection.config";
import { eq } from "drizzle-orm";
import { globalOrderStatus, branch } from "@/schema/schema";

export const canPlaceOrder = async (branchId: string) => {
  const [globalPause] = await database
    .select()
    .from(globalOrderStatus)
    .limit(1);

  if (globalPause?.isPaused) {
    return {
      allowed: false,
      reason: globalPause.reason || "Orders are temporarily paused globally.",
    };
  }

  const [branchStatus] = await database
    .select()
    .from(branch)
    .where(eq(branch.id, branchId));

  if (!branchStatus) {
    return {
      allowed: false,
      reason: "Branch not found.",
    };
  }

  if (branchStatus.isPaused == true) {
    return {
      allowed: false,
      reason: branchStatus.pauseReason || "Orders are paused for this branch.",
    };
  }

  return {
    allowed: true,
  };
};
