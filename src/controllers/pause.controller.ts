import { Request, Response } from "express";
import { database } from "@/configs/connection.config";
import { globalOrderStatus, branch } from "@/schema/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/utils/logger.util";
import status from "http-status";

export const setGlobalPauseStatus = async (req: Request, res: Response) => {
  const { isPaused, reason, duration } = req.body; // duration in minutes

  if (typeof isPaused !== "boolean") {
    return res
      .status(status.BAD_REQUEST)
      .json({ message: "The 'isPaused' field must be a boolean." });
  }

  try {
    const [currentStatus] = await database
      .select()
      .from(globalOrderStatus)
      .limit(1);

    let updatedStatus;
    const updateData = {
      isPaused,
      reason: isPaused ? reason : null,
      updatedAt: new Date(),
    };

    if (currentStatus) {
      [updatedStatus] = await database
        .update(globalOrderStatus)
        .set(updateData)
        .where(eq(globalOrderStatus.id, currentStatus.id))
        .returning();
    } else {
      [updatedStatus] = await database
        .insert(globalOrderStatus)
        .values(updateData)
        .returning();
    }

    if (isPaused && duration && duration > 0) {
      setTimeout(async () => {
        try {
          await database
            .update(globalOrderStatus)
            .set({ isPaused: false, reason: "Auto-resumed after timed pause." })
            .where(eq(globalOrderStatus.id, updatedStatus.id));
          logger.info("Global ordering has been automatically resumed.");
        } catch (error) {
          logger.error("Failed to auto-resume global ordering:", error);
        }
      }, duration * 60 * 1000); // Convert minutes to milliseconds
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
  const { id } = req.params;
  const { isPaused, reason, duration } = req.body; // duration in minutes

  if (typeof isPaused !== "boolean") {
    return res
      .status(status.BAD_REQUEST)
      .json({ message: "The 'isPaused' field must be a boolean." });
  }

  try {
    const [targetBranch] = await database
      .select({ id: branch.id })
      .from(branch)
      .where(eq(branch.id, id))
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
      .where(eq(branch.id, id))
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

    if (isPaused && duration && duration > 0) {
      setTimeout(async () => {
        try {
          await database
            .update(branch)
            .set({ isPaused: false, pauseReason: "Auto-resumed after timed pause." })
            .where(eq(branch.id, id));
          logger.info(`Branch '${updatedBranch.name}' has been automatically resumed.`);
        } catch (error) {
          logger.error(`Failed to auto-resume branch '${updatedBranch.name}':`, error);
        }
      }, duration * 60 * 1000); // Convert minutes to milliseconds
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