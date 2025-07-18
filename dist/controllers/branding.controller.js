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
exports.updateBrandingController = void 0;
const formidable_1 = __importDefault(require("formidable"));
const http_status_1 = __importDefault(require("http-status"));
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../schema/schema");
const logger_util_1 = require("../utils/logger.util");
const connection_config_1 = require("../configs/connection.config");
const cloudinary_config_1 = __importDefault(require("../configs/cloudinary.config"));
const updateBrandingController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const form = (0, formidable_1.default)();
        const [formData, files] = yield form.parse(req);
        const logoFile = (_a = files.logo) === null || _a === void 0 ? void 0 : _a[0];
        const bannerFile = (_b = files.banner) === null || _b === void 0 ? void 0 : _b[0];
        const mainSection = (_c = formData.mainSection) === null || _c === void 0 ? void 0 : _c[0];
        const dataToUpdate = {};
        if (logoFile) {
            const response = yield cloudinary_config_1.default.uploader.upload(logoFile.filepath, {
                folder: "branding",
            });
            dataToUpdate.logo = response.secure_url;
        }
        if (bannerFile) {
            const response = yield cloudinary_config_1.default.uploader.upload(bannerFile.filepath, {
                folder: "branding",
            });
            dataToUpdate.banner = response.secure_url;
        }
        if (mainSection) {
            dataToUpdate.mainSection = mainSection;
        }
        if (Object.keys(dataToUpdate).length === 0) {
            return res
                .status(http_status_1.default.BAD_REQUEST)
                .json({ message: "No data provided for update." });
        }
        dataToUpdate.updatedAt = new Date();
        const globalBranding = yield connection_config_1.database.query.branding.findFirst();
        let updatedRecord;
        if (globalBranding) {
            [updatedRecord] = yield connection_config_1.database
                .update(schema_1.branding)
                .set(dataToUpdate)
                .where((0, drizzle_orm_1.eq)(schema_1.branding.id, globalBranding.id))
                .returning();
        }
        else {
            [updatedRecord] = yield connection_config_1.database
                .insert(schema_1.branding)
                .values(dataToUpdate)
                .returning();
        }
        return res.status(http_status_1.default.OK).json({
            message: "Global branding updated successfully",
            data: updatedRecord,
        });
    }
    catch (error) {
        logger_util_1.logger.error(error);
        res
            .status(http_status_1.default.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.updateBrandingController = updateBrandingController;
