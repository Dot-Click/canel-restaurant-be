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
exports.assignPermissionsController = exports.fetchStaffController = exports.fetchAllRidersController = exports.fetchAllUsersController = exports.fetchUserController = void 0;
const logger_util_1 = require("../utils/logger.util");
const http_status_1 = require("http-status");
const connection_config_1 = require("../configs/connection.config");
const schema_1 = require("../schema/schema");
const drizzle_orm_1 = require("drizzle-orm");
const schema_2 = require("../schema/schema");
const zod_1 = require("zod");
const fetchUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(http_status_1.status.UNAUTHORIZED).json({
                message: "Authentication failed: No user ID provided.",
            });
        }
        const userProfile = yield connection_config_1.database.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, userId),
            columns: {
                id: true,
                fullName: true,
                email: true,
                role: true,
            },
        });
        if (!userProfile) {
            return res.status(http_status_1.status.NOT_FOUND).json({
                message: "User not found.",
            });
        }
        return res.status(http_status_1.status.OK).json({
            message: "User fetched successfully",
            data: userProfile,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Error in fetchUserController:", error);
        return res.status(http_status_1.status.INTERNAL_SERVER_ERROR).json({
            message: "An error occurred while fetching user details.",
        });
    }
});
exports.fetchUserController = fetchUserController;
const fetchAllUsersController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allUsers = yield connection_config_1.database.query.users.findMany({
            columns: {
                id: true,
                fullName: true,
                email: true,
                role: true,
            },
        });
        return res.status(http_status_1.status.OK).json({
            message: "All users fetched successfully",
            data: allUsers,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Error in fetchAllUsersController:", error);
        return res.status(http_status_1.status.INTERNAL_SERVER_ERROR).json({
            message: "An error occurred while fetching all users.",
        });
    }
});
exports.fetchAllUsersController = fetchAllUsersController;
const fetchAllRidersController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const riders = yield connection_config_1.database
            .select({
            id: schema_1.users.id,
            fullName: schema_1.users.fullName,
            email: schema_1.users.email,
            phoneNumber: schema_1.users.phoneNumber,
            role: schema_1.users.role,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.role, "rider"));
        return res.status(http_status_1.status.OK).json({
            message: "All riders fetched successfully",
            data: riders,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Error fetching all riders", error);
        return res.status(http_status_1.status.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch riders.",
        });
    }
});
exports.fetchAllRidersController = fetchAllRidersController;
const fetchStaffController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const searchQuery = req.query.search;
        console.log("This is the search query", searchQuery);
        const query = connection_config_1.database
            .select({
            label: schema_1.users.fullName,
            value: schema_1.users.id,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(schema_1.users.role, "user")))
            .$dynamic();
        console.log("This is the query", query);
        if (searchQuery) {
            query.where((0, drizzle_orm_1.like)(schema_1.users.fullName, `%${searchQuery}%`));
        }
        const staffMembers = yield query;
        console.log("This is the staff members", staffMembers);
        return res.status(http_status_1.status.OK).json({
            message: "Staff fetched successfully",
            data: staffMembers,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Error fetching staff members", error);
        return res.status(http_status_1.status.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch staff members.",
        });
    }
});
exports.fetchStaffController = fetchStaffController;
const assignPermissionsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = schema_2.staffIdParamSchema.parse(req.params);
        const { permissions } = schema_2.assignPermissionsSchema.parse(req.body);
        const result = yield connection_config_1.database
            .update(schema_1.users)
            .set({
            permissions: permissions,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .returning({ updatedId: schema_1.users.id });
        if (result.length === 0) {
            return res
                .status(http_status_1.status.NOT_FOUND)
                .json({ message: "Staff member not found." });
        }
        return res.status(http_status_1.status.OK).json({
            message: "Permissions updated successfully",
            data: { userId: result[0].updatedId, assignedPermissions: permissions },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "Invalid input data", errors: error.errors });
        }
        logger_util_1.logger.error("Error assigning permissions", error);
        return res.status(http_status_1.status.INTERNAL_SERVER_ERROR).json({
            message: "Failed to assign permissions.",
        });
    }
});
exports.assignPermissionsController = assignPermissionsController;
