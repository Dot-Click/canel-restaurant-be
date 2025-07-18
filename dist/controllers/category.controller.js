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
exports.updateController = exports.fetchController = exports.deleteController = exports.insertController = void 0;
const http_status_1 = require("http-status");
const logger_util_1 = require("../utils/logger.util");
const connection_config_1 = require("../configs/connection.config");
const schema_1 = require("../schema/schema");
const drizzle_orm_1 = require("drizzle-orm");
const insertController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = schema_1.categoryInsertSchema.safeParse(req.body);
        console.log("This is request body of category", req.body);
        if (!data) {
            logger_util_1.logger.error("Validation failed", error);
            return res.status(http_status_1.status.UNPROCESSABLE_ENTITY).json({
                message: "Validation error",
                error: error === null || error === void 0 ? void 0 : error.format(),
            });
        }
        const insertedCategory = yield connection_config_1.database
            .insert(schema_1.category)
            .values(data)
            .returning();
        if (insertedCategory[0]) {
            return res.status(http_status_1.status.CREATED).json({
                message: "category inserted successfully",
                data: insertedCategory[0],
            });
        }
    }
    catch (error) {
        logger_util_1.logger.error(error);
        res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.insertController = insertController;
const deleteController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "Category ID is required" });
        }
        const deletedCategory = yield connection_config_1.database
            .delete(schema_1.category)
            .where((0, drizzle_orm_1.eq)(schema_1.category.id, id))
            .returning();
        if (deletedCategory.length === 0) {
            return res
                .status(http_status_1.status.NOT_FOUND)
                .json({ message: "Category not found" });
        }
        res.status(http_status_1.status.OK).json({
            message: "Category deleted successfully",
            data: deletedCategory[0],
        });
    }
    catch (error) {
        logger_util_1.logger.error(error);
        res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.deleteController = deleteController;
const fetchController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        let categories;
        if (id) {
            categories = yield connection_config_1.database.query.category.findFirst({
                where: (category, { eq }) => eq(category.id, id),
            });
        }
        else {
            categories = yield connection_config_1.database.query.category.findMany();
        }
        res.status(http_status_1.status.OK).json({
            message: "Categories fetched successfully",
            data: categories,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Internal Server Error in fetchController:", error);
        res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.fetchController = fetchController;
const updateController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "Category ID is required in the URL." });
        }
        const { data, error } = schema_1.categoryUpdateSchema.safeParse(req.body);
        if (error) {
            logger_util_1.logger.error("Update validation failed", error);
            return res.status(http_status_1.status.UNPROCESSABLE_ENTITY).json({
                message: "Validation error",
                error: error.format(),
            });
        }
        if (Object.keys(data).length === 0) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "No fields provided to update." });
        }
        const updatedCategory = yield connection_config_1.database
            .update(schema_1.category)
            .set(data)
            .where((0, drizzle_orm_1.eq)(schema_1.category.id, id))
            .returning();
        console.log("This is the updated category", updatedCategory);
        if (updatedCategory.length === 0) {
            return res
                .status(http_status_1.status.NOT_FOUND)
                .json({ message: "Category not found" });
        }
        res.status(http_status_1.status.OK).json({
            message: "Category updated successfully",
            data: updatedCategory[0],
        });
    }
    catch (error) {
        logger_util_1.logger.error(error);
        res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.updateController = updateController;
