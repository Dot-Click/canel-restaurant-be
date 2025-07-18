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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAddonCategoryController = exports.getAddonsWithItemsController = exports.fetchController = exports.deleteController = exports.insertController = void 0;
const http_status_1 = require("http-status");
const logger_util_1 = require("../utils/logger.util");
const connection_config_1 = require("../configs/connection.config");
const schema_1 = require("../schema/schema");
const drizzle_orm_1 = require("drizzle-orm");
const insertController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = schema_1.addonInsertSchema.safeParse(req.body);
        console.log("This is request body of addon", req.body);
        if (!data) {
            logger_util_1.logger.error("Validation failed", error);
            return res.status(http_status_1.status.UNPROCESSABLE_ENTITY).json({
                message: "Validation error",
                error: error === null || error === void 0 ? void 0 : error.format(),
            });
        }
        const insertedAddon = yield connection_config_1.database.insert(schema_1.addon).values(data).returning();
        if (insertedAddon[0]) {
            return res.status(http_status_1.status.CREATED).json({
                message: "Addon inserted successfully",
                data: insertedAddon[0],
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
                .json({ message: "Addon ID is required" });
        }
        const deletedAddon = yield connection_config_1.database
            .delete(schema_1.addon)
            .where((0, drizzle_orm_1.eq)(schema_1.addon.id, id))
            .returning();
        if (deletedAddon.length === 0) {
            return res.status(http_status_1.status.NOT_FOUND).json({ message: "Addon not found" });
        }
        res.status(http_status_1.status.OK).json({
            message: "Addon deleted successfully",
            data: deletedAddon[0],
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
        let addons;
        if (id) {
            addons = yield connection_config_1.database.query.addon.findFirst({
                where: (addon, { eq }) => eq(addon.id, id),
            });
        }
        else {
            addons = yield connection_config_1.database.query.addon.findMany();
        }
        res.status(http_status_1.status.OK).json({
            message: "Addons fetched successfully",
            data: addons,
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
const getAddonsWithItemsController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const allItems = yield connection_config_1.database.query.addonItem.findMany({
            with: {
                addon: true,
            },
        });
        if (!allItems || allItems.length === 0) {
            return res.status(http_status_1.status.OK).json({
                message: "No addon items found.",
                data: [],
            });
        }
        const groupedData = new Map();
        for (const item of allItems) {
            if (!item.addon) {
                continue;
            }
            const { addon } = item, itemDetails = __rest(item, ["addon"]);
            if (!groupedData.has(addon.id)) {
                groupedData.set(addon.id, {
                    addonId: addon.id,
                    addonName: addon.name,
                    items: [],
                });
            }
            groupedData.get(addon.id).items.push({
                id: itemDetails.id,
                name: itemDetails.name,
                price: itemDetails.price,
                image: (_a = itemDetails.image) !== null && _a !== void 0 ? _a : "",
                discount: itemDetails.discount === null ? undefined : itemDetails.discount,
            });
        }
        const result = Array.from(groupedData.values());
        return res.status(http_status_1.status.OK).json({
            message: "Addons and their items fetched successfully.",
            data: result,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Error fetching grouped addon items:", error);
        return res.status(http_status_1.status.INTERNAL_SERVER_ERROR).json({
            message: "An error occurred while fetching addon items.",
        });
    }
});
exports.getAddonsWithItemsController = getAddonsWithItemsController;
const updateAddonCategoryController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "Addon Category ID is required in the URL." });
        }
        const validationResult = schema_1.addonUpdateSchema.safeParse(req.body);
        if (!validationResult.success) {
            logger_util_1.logger.error("Update validation failed", validationResult.error);
            return res.status(http_status_1.status.UNPROCESSABLE_ENTITY).json({
                message: "Validation error",
                error: validationResult.error.format(),
            });
        }
        const dataToUpdate = validationResult.data;
        if (Object.keys(dataToUpdate).length === 0) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "No fields provided to update." });
        }
        const updatedAddonCategory = yield connection_config_1.database
            .update(schema_1.addon)
            .set(dataToUpdate)
            .where((0, drizzle_orm_1.eq)(schema_1.addon.id, id))
            .returning();
        if (updatedAddonCategory.length === 0) {
            return res
                .status(http_status_1.status.NOT_FOUND)
                .json({ message: "Addon Category not found" });
        }
        res.status(http_status_1.status.OK).json({
            message: "Addon Category updated successfully",
            data: updatedAddonCategory[0],
        });
    }
    catch (error) {
        logger_util_1.logger.error("Failed to update addon category:", error);
        res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: "An internal server error occurred." });
    }
});
exports.updateAddonCategoryController = updateAddonCategoryController;
