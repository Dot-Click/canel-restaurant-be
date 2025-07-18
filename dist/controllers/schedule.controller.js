"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleSchedule = exports.getSchedules = exports.createOrUpdateBranchScheduleController = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const connection_config_1 = require("../configs/connection.config");
const schema_1 = require("../schema/schema");
const http_status_1 = require("http-status");
const logger_util_1 = require("../utils/logger.util");
const createOrUpdateBranchScheduleController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { branchId, dayOfWeek, timeSlots: slots } = req.body;
        console.log(req.body);
        if (!branchId ||
            dayOfWeek === undefined ||
            !Array.isArray(slots) ||
            slots.length === 0) {
            return res.status(400).json({ message: "Invalid payload" });
        }
        const [existingSchedule] = yield connection_config_1.database
            .select()
            .from(schema_1.branchSchedule)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branchSchedule.branchId, branchId), (0, drizzle_orm_1.eq)(schema_1.branchSchedule.dayOfWeek, dayOfWeek)));
        let scheduleId;
        if (existingSchedule) {
            scheduleId = existingSchedule.id;
            yield connection_config_1.database
                .delete(schema_1.timeSlot)
                .where((0, drizzle_orm_1.eq)(schema_1.timeSlot.scheduleId, scheduleId));
        }
        else {
            const [newSchedule] = yield connection_config_1.database
                .insert(schema_1.branchSchedule)
                .values({
                branchId,
                dayOfWeek,
                isActive: true,
            })
                .returning();
            scheduleId = newSchedule.id;
        }
        const timeSlotData = slots.map((slot) => ({
            id: crypto.randomUUID(),
            scheduleId,
            openTime: slot.openTime,
            closeTime: slot.closeTime,
        }));
        yield connection_config_1.database.insert(schema_1.timeSlot).values(timeSlotData);
        res.status(200).json({
            message: "Branch schedule updated successfully",
            data: {
                scheduleId,
                timeSlots: timeSlotData,
            },
        });
    }
    catch (error) {
        console.error("Schedule error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.createOrUpdateBranchScheduleController = createOrUpdateBranchScheduleController;
const getSchedules = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: branchId } = req.params;
        if (!branchId) {
            return res.status(http_status_1.status.BAD_REQUEST).json({
                message: "Branch ID is required.",
            });
        }
        const branchExists = yield connection_config_1.database.query.branch.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.branch.id, branchId),
            columns: { id: true },
        });
        if (!branchExists) {
            return res.status(http_status_1.status.NOT_FOUND).json({
                message: `Branch with ID '${branchId}' not found.`,
            });
        }
        const schedules = yield connection_config_1.database.query.branchSchedule.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.branchSchedule.branchId, branchId),
            with: { timeSlots: true },
            orderBy: (schedule, { asc }) => [asc(schedule.dayOfWeek)],
        });
        if (schedules.length === 0) {
            return res.status(http_status_1.status.OK).json({
                message: "Branch found, but no schedules have been configured yet.",
                data: [],
            });
        }
        return res.status(http_status_1.status.OK).json({
            message: "Schedules fetched successfully",
            data: schedules,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Error in getSchedules controller:", error);
        return res.status(http_status_1.status.INTERNAL_SERVER_ERROR).json({
            message: "An internal server error occurred while fetching schedules.",
        });
    }
});
exports.getSchedules = getSchedules;
const toggleSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { branchId, dayOfWeek, isActive } = req.body;
    const existing = yield connection_config_1.database.query.branchSchedule.findFirst({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branchSchedule.branchId, branchId), (0, drizzle_orm_1.eq)(schema_1.branchSchedule.dayOfWeek, dayOfWeek)),
    });
    if (existing) {
        yield connection_config_1.database
            .update(schema_1.branchSchedule)
            .set({ isActive })
            .where((0, drizzle_orm_1.eq)(schema_1.branchSchedule.id, existing.id));
    }
    else {
        const newSchedule = yield connection_config_1.database
            .insert(schema_1.branchSchedule)
            .values({
            branchId,
            dayOfWeek,
            isActive: true,
        })
            .returning();
        yield connection_config_1.database.insert(schema_1.timeSlot).values({
            scheduleId: newSchedule[0].id,
            openTime: "10:00",
            closeTime: "14:00",
        });
    }
    res.json({ message: "Schedule toggled" });
});
exports.toggleSchedule = toggleSchedule;
