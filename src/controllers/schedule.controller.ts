import { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { database } from "@/configs/connection.config";
import { branch, branchSchedule, timeSlot } from "@/schema/schema";
import { status } from "http-status";
import { logger } from "@/utils/logger.util";
import crypto from "crypto";

export const createOrUpdateBranchScheduleController = async (
  req: Request,
  res: Response
) => {
  try {
    const { branchId, dayOfWeek, timeSlots: slots } = req.body;
    console.log(req.body);
    if (
      !branchId ||
      dayOfWeek === undefined ||
      !Array.isArray(slots) ||
      slots.length === 0
    ) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    // 1. Check if schedule exists
    const [existingSchedule] = await database
      .select()
      .from(branchSchedule)
      .where(
        and(
          eq(branchSchedule.branchId, branchId),
          eq(branchSchedule.dayOfWeek, dayOfWeek)
        )
      );

    let scheduleId;

    if (existingSchedule) {
      scheduleId = existingSchedule.id;

      // Delete old time slots
      await database
        .delete(timeSlot)
        .where(eq(timeSlot.scheduleId, scheduleId));
    } else {
      // Insert new schedule
      const [newSchedule] = await database
        .insert(branchSchedule)
        .values({
          branchId,
          dayOfWeek,
          isActive: true,
        })
        .returning();

      scheduleId = newSchedule.id;
    }

    // Insert new time slots
    const timeSlotData = slots.map(
      (slot: { openTime: string; closeTime: string }) => ({
        id: crypto.randomUUID(),
        scheduleId,
        openTime: slot.openTime,
        closeTime: slot.closeTime,
      })
    );

    await database.insert(timeSlot).values(timeSlotData);

    res.status(200).json({
      message: "Branch schedule updated successfully",
      data: {
        scheduleId,
        timeSlots: timeSlotData,
      },
    });
  } catch (error) {
    console.error("Schedule error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSchedules = async (req: Request, res: Response) => {
  try {
    const { id: branchId } = req.params;

    if (!branchId) {
      return res.status(status.BAD_REQUEST).json({
        message: "Branch ID is required.",
      });
    }

    const branchExists = await database.query.branch.findFirst({
      where: eq(branch.id, branchId),
      columns: { id: true },
    });

    if (!branchExists) {
      return res.status(status.NOT_FOUND).json({
        message: `Branch with ID '${branchId}' not found.`,
      });
    }

    const schedules = await database.query.branchSchedule.findMany({
      where: eq(branchSchedule.branchId, branchId),
      with: { timeSlots: true },
      orderBy: (schedule, { asc }) => [asc(schedule.dayOfWeek)],
    });

    if (schedules.length === 0) {
      return res.status(status.OK).json({
        message: "Branch found, but no schedules have been configured yet.",
        data: [],
      });
    }

    return res.status(status.OK).json({
      message: "Schedules fetched successfully",
      data: schedules,
    });
  } catch (error) {
    logger.error("Error in getSchedules controller:", error);

    return res.status(status.INTERNAL_SERVER_ERROR).json({
      message: "An internal server error occurred while fetching schedules.",
    });
  }
};

export const toggleSchedule = async (req: Request, res: Response) => {
  const { branchId, dayOfWeek, isActive } = req.body;

  const existing = await database.query.branchSchedule.findFirst({
    where: and(
      eq(branchSchedule.branchId, branchId),
      eq(branchSchedule.dayOfWeek, dayOfWeek)
    ),
  });

  if (existing) {
    await database
      .update(branchSchedule)
      .set({ isActive })
      .where(eq(branchSchedule.id, existing.id));
  } else {
    const newSchedule = await database
      .insert(branchSchedule)
      .values({
        branchId,
        dayOfWeek,
        isActive: true,
      })
      .returning();

    // Optional: Add default time slot
    await database.insert(timeSlot).values({
      scheduleId: newSchedule[0].id,
      openTime: "10:00",
      closeTime: "14:00",
    });
  }

  res.json({ message: "Schedule toggled" });
};
