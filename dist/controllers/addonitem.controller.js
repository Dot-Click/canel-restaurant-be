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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAddonItemController = exports.fetchAddonItem = exports.deleteAddonItem = exports.createAddonItem = void 0;
const connection_config_1 = require("../configs/connection.config");
const schema_1 = require("../schema/schema");
const logger_util_1 = require("../utils/logger.util");
const drizzle_orm_1 = require("drizzle-orm");
const formidable_1 = __importDefault(require("formidable"));
const http_status_1 = __importDefault(require("http-status"));
const formdata_util_1 = require("../utils/formdata.util");
const cloudinary_config_1 = __importDefault(require("../configs/cloudinary.config"));
const createAddonItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const form = (0, formidable_1.default)();
        const [formData, files] = yield form.parse(req);
        const addonImage = (_a = files.addonImage) === null || _a === void 0 ? void 0 : _a[0];
        const fields = (0, formdata_util_1.extractFormFields)(formData);
        const { data, error } = schema_1.addonItemInsertSchema.safeParse(fields);
        console.log("This is fields", files);
        if (!data) {
            logger_util_1.logger.error("Validation failed", error);
            return res.status(http_status_1.default.UNPROCESSABLE_ENTITY).json({
                message: "Validation error",
                error: error === null || error === void 0 ? void 0 : error.format(),
            });
        }
        if (!addonImage) {
            return res
                .status(http_status_1.default.UNPROCESSABLE_ENTITY)
                .json({ message: "Image not provided" });
        }
        const cloudinaryResponse = yield cloudinary_config_1.default.uploader.upload(addonImage.filepath, {
            folder: "addon",
            use_filename: true,
            unique_filename: false,
        });
        if (!cloudinaryResponse) {
            return res
                .status(http_status_1.default.UNPROCESSABLE_ENTITY)
                .json({ message: "Problem with image" });
        }
        const insertedAddon = yield connection_config_1.database
            .insert(schema_1.addonItem)
            .values(Object.assign({ name: fields.name, description: fields.description, price: fields.price, image: cloudinaryResponse.secure_url, addonId: fields.addonId }, fields))
            .returning();
        console.log("this is Addon product", insertedAddon);
        if (insertedAddon[0]) {
            return res.status(http_status_1.default.CREATED).json({
                message: "Addon inserted successfully",
                data: insertedAddon[0],
            });
        }
    }
    catch (error) {
        logger_util_1.logger.error(error);
        res
            .status(http_status_1.default.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.createAddonItem = createAddonItem;
const deleteAddonItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        if (!id) {
            res
                .status(http_status_1.default.UNPROCESSABLE_ENTITY)
                .json({ message: "Addon doesn't exit" });
        }
        const db = yield connection_config_1.database.delete(schema_1.addon).where((0, drizzle_orm_1.eq)(schema_1.addon.id, id)).returning();
        res.status(http_status_1.default.OK).json(db);
    }
    catch (error) {
        logger_util_1.logger.error(error);
        res
            .status(http_status_1.default.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.deleteAddonItem = deleteAddonItem;
const fetchAddonItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        let addonItem;
        if (id) {
            addonItem = yield connection_config_1.database.query.addonItem.findFirst({
                with: { addon: true },
                where: (addonItem, { eq }) => eq(addonItem.id, id),
            });
        }
        else {
            addonItem = yield connection_config_1.database.query.addonItem.findMany({
                with: { addon: true },
            });
        }
        res.status(http_status_1.default.OK).json({
            message: "addon Item fetched successfully",
            data: addonItem,
        });
    }
    catch (error) {
        logger_util_1.logger.error(error);
        res
            .status(http_status_1.default.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.fetchAddonItem = fetchAddonItem;
const updateAddonItemController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        if (!id) {
            return res
                .status(http_status_1.default.BAD_REQUEST)
                .json({ message: "Addon Item ID is required." });
        }
        let validatedData = {};
        if (req.is("application/json")) {
            const { data, error } = schema_1.addonItemUpdateSchema.safeParse(req.body);
            if (error) {
                return res
                    .status(http_status_1.default.UNPROCESSABLE_ENTITY)
                    .json({ message: "Validation error", error: error.format() });
            }
            validatedData = Object.assign(Object.assign({}, data), { price: data.price !== undefined ? String(data.price) : undefined });
        }
        else if (req.is("multipart/form-data")) {
            const form = (0, formidable_1.default)();
            const [formData, files] = yield form.parse(req);
            const newAddonItemImage = (_a = files.addonItemImage) === null || _a === void 0 ? void 0 : _a[0];
            const fields = (0, formdata_util_1.extractFormFields)(formData);
            const { data, error } = schema_1.addonItemUpdateSchema.safeParse(fields);
            if (error) {
                return res
                    .status(http_status_1.default.UNPROCESSABLE_ENTITY)
                    .json({ message: "Validation error", error: error.format() });
            }
            validatedData = Object.assign(Object.assign({}, data), { price: data.price !== undefined ? String(data.price) : undefined });
            if (newAddonItemImage) {
                const existingItem = yield connection_config_1.database.query.addonItem.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema_1.addonItem.id, id),
                    columns: { image: true },
                });
                if (existingItem === null || existingItem === void 0 ? void 0 : existingItem.image) {
                    const publicId = (_b = existingItem.image.split("/").pop()) === null || _b === void 0 ? void 0 : _b.split(".")[0];
                    if (publicId)
                        yield cloudinary_config_1.default.uploader.destroy(`addon_items/${publicId}`);
                }
                const cloudinaryResponse = yield cloudinary_config_1.default.uploader.upload(newAddonItemImage.filepath, { folder: "addon_items" });
                validatedData.image = cloudinaryResponse.secure_url;
            }
        }
        else {
            return res
                .status(http_status_1.default.UNSUPPORTED_MEDIA_TYPE)
                .json({ message: "Content-Type not supported." });
        }
        if (Object.keys(validatedData).length === 0) {
            return res
                .status(http_status_1.default.BAD_REQUEST)
                .json({ message: "No fields provided to update." });
        }
        const updatedAddonItem = yield connection_config_1.database
            .update(schema_1.addonItem)
            .set(validatedData)
            .where((0, drizzle_orm_1.eq)(schema_1.addonItem.id, id))
            .returning();
        if (updatedAddonItem.length === 0) {
            return res
                .status(http_status_1.default.NOT_FOUND)
                .json({ message: "Addon Item not found" });
        }
        res.status(http_status_1.default.OK).json({
            message: "Addon Item updated successfully",
            data: updatedAddonItem[0],
        });
    }
    catch (error) {
        logger_util_1.logger.error("Failed to update addon item:", error);
        res
            .status(http_status_1.default.INTERNAL_SERVER_ERROR)
            .json({ message: "An internal server error occurred." });
    }
});
exports.updateAddonItemController = updateAddonItemController;
