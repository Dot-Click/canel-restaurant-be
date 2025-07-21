import { Request, Response } from "express";
import { database } from "@/configs/connection.config";
import { globalOrderStatus, branch } from "@/schema/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/utils/logger.util";
import status from "http-status";

export const setGlobalPauseStatus = async (req: Request, res: Response) => {
  const { isPaused, reason } = req.body;

  if (typeof isPaused !== "boolean") {
    return res
      .status(status.BAD_REQUEST)
      .json({ message: "The 'isPaused' field must be a boolean." });
  }

  try {
    // There should only be one row in this table. We'll update it or create it if it doesn't exist.
    const [currentStatus] = await database
      .select()
      .from(globalOrderStatus)
      .limit(1);

    let updatedStatus;
    const updateData = {
      isPaused,
      reason: isPaused ? reason : null, // Clear the reason when resuming
      updatedAt: new Date(),
    };

    if (currentStatus) {
      // If a record exists, update it
      [updatedStatus] = await database
        .update(globalOrderStatus)
        .set(updateData)
        .where(eq(globalOrderStatus.id, currentStatus.id))
        .returning();
    } else {
      // If no record exists, create one
      [updatedStatus] = await database
        .insert(globalOrderStatus)
        .values(updateData)
        .returning();
    }

    const message = updatedStatus.isPaused
      ? "Orders have been globally paused."
      : "Global ordering has been resumed.";

    return res.status(status.OK).json({ message, data: updatedStatus });
  } catch (error) {
    logger.error("Failed to set global order status:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An error occurred while updating the global order status.",
    });
  }
};

export const setBranchPauseStatus = async (req: Request, res: Response) => {
  const { branchId } = req.params;
  const { isPaused, reason } = req.body;
  //   const managerId = req.user!.id;

  if (typeof isPaused !== "boolean") {
    return res
      .status(status.BAD_REQUEST)
      .json({ message: "The 'isPaused' field must be a boolean." });
  }

  try {
    const [targetBranch] = await database
      .select({ id: branch.id })
      .from(branch)
      .where(eq(branch.id, branchId))
      .limit(1);

    if (!targetBranch) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Branch not found." });
    }

    const [updatedBranch] = await database
      .update(branch)
      .set({
        isPaused,
        pauseReason: isPaused ? reason : null,
      })
      .where(eq(branch.id, branchId))
      .returning({
        id: branch.id,
        name: branch.name,
        isPaused: branch.isPaused,
        pauseReason: branch.pauseReason,
      });

    if (!updatedBranch) {
      return res
        .status(status.NOT_FOUND)
        .json({ message: "Branch not found or could not be updated." });
    }

    const message = updatedBranch.isPaused
      ? `Branch '${updatedBranch.name}' is now paused.`
      : `Branch '${updatedBranch.name}' is now accepting orders.`;

    return res.status(status.OK).json({ message, data: updatedBranch });
  } catch (error) {
    logger.error("Failed to set branch pause status:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ message: "An error occurred while updating the branch status." });
  }
};
