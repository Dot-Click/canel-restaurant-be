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
exports.getCategoriesWithProducts = exports.assignProductToBranch = exports.getProductsForBranch = exports.updateController = exports.fetchController = exports.deleteController = exports.insertController = void 0;
const http_status_1 = require("http-status");
const logger_util_1 = require("../utils/logger.util");
const connection_config_1 = require("../configs/connection.config");
const schema_1 = require("../schema/schema");
const formidable_1 = __importDefault(require("formidable"));
const formdata_util_1 = require("../utils/formdata.util");
const cloudinary_config_1 = __importDefault(require("../configs/cloudinary.config"));
const drizzle_orm_1 = require("drizzle-orm");
const insertController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const form = (0, formidable_1.default)();
        const [formData, files] = yield form.parse(req);
        const productImage = (_a = files.productImage) === null || _a === void 0 ? void 0 : _a[0];
        console.log(formData);
        let addonItemIds = [];
        if (formData.addonItemIds) {
            addonItemIds = Array.isArray(formData.addonItemIds)
                ? formData.addonItemIds
                : [formData.addonItemIds];
        }
        const otherFields = (0, formdata_util_1.extractFormFields)(formData);
        const payloadToValidate = Object.assign(Object.assign({}, otherFields), { addonItemIds });
        const { data, error } = schema_1.productInsertSchema.safeParse(payloadToValidate);
        console.log("This is the data", data);
        console.log("This is the request body", otherFields);
        if (!data) {
            logger_util_1.logger.error("Validation failed", error);
            return res.status(http_status_1.status.UNPROCESSABLE_ENTITY).json({
                message: "Validation error",
                error: error === null || error === void 0 ? void 0 : error.format(),
            });
        }
        if (!productImage) {
            return res
                .status(http_status_1.status.UNPROCESSABLE_ENTITY)
                .json({ message: "Image not provided" });
        }
        const cloudinaryResponse = yield cloudinary_config_1.default.uploader.upload(productImage.filepath, { folder: "products" });
        if (!cloudinaryResponse) {
            return res
                .status(http_status_1.status.UNPROCESSABLE_ENTITY)
                .json({ message: "Problem with image" });
        }
        const insertedProduct = yield connection_config_1.database
            .insert(schema_1.products)
            .values({
            name: data.name,
            description: data.description,
            price: String(data.price),
            image: cloudinaryResponse.secure_url,
            categoryId: data.categoryId,
            discount: data.discount,
            addonItemIds: data.addonItemIds || [],
        })
            .returning();
        if (insertedProduct[0]) {
            return res.status(http_status_1.status.CREATED).json({
                message: "Product inserted successfully",
                data: insertedProduct[0],
            });
        }
        else {
            throw new Error("Product could not be created.");
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
    var _a;
    try {
        const { id } = req.body;
        if (!id) {
            return res
                .status(http_status_1.status.UNPROCESSABLE_ENTITY)
                .json({ message: "Product ID is required" });
        }
        const productsToDelete = yield connection_config_1.database
            .select({
            image: schema_1.products.image,
        })
            .from(schema_1.products)
            .where((0, drizzle_orm_1.eq)(schema_1.products.id, id));
        const product = productsToDelete[0];
        if (!product) {
            return res
                .status(http_status_1.status.NOT_FOUND)
                .json({ message: "Product not found" });
        }
        if (product.image) {
            const publicId = (_a = product.image.split("/").pop()) === null || _a === void 0 ? void 0 : _a.split(".")[0];
            const folder = "products";
            if (publicId) {
                yield cloudinary_config_1.default.uploader.destroy(`${folder}/${publicId}`);
            }
        }
        const deletedProduct = yield connection_config_1.database
            .delete(schema_1.products)
            .where((0, drizzle_orm_1.eq)(schema_1.products.id, id))
            .returning();
        if (deletedProduct.length === 0) {
            return res.status(http_status_1.status.NOT_FOUND).json({
                message: "Product not found, it may have already been deleted.",
            });
        }
        res.status(http_status_1.status.OK).json({
            message: "Product deleted successfully",
            data: deletedProduct[0],
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
        const { id } = req.params;
        let productData;
        if (id) {
            productData = yield connection_config_1.database.query.products.findFirst({
                with: {
                    category: true,
                },
                where: (0, drizzle_orm_1.eq)(schema_1.products.id, id),
            });
        }
        else {
            productData = yield connection_config_1.database.query.products.findMany({
                with: {
                    category: true,
                },
                orderBy: (products, { desc }) => [desc(products.createdAt)],
            });
        }
        if (!productData ||
            (Array.isArray(productData) && productData.length === 0)) {
            return res.status(http_status_1.status.OK).json({
                message: "No products found",
                data: Array.isArray(productData) ? [] : null,
            });
        }
        res.status(http_status_1.status.OK).json({
            message: "Product(s) fetched successfully",
            data: productData,
        });
    }
    catch (error) {
        logger_util_1.logger.error(error);
        res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.fetchController = fetchController;
const updateController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        if (!id) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "Product ID is required." });
        }
        let validatedData = {};
        if (req.is("application/json")) {
            const { data, error } = schema_1.productUpdateSchema.safeParse(req.body);
            if (error) {
                return res
                    .status(http_status_1.status.UNPROCESSABLE_ENTITY)
                    .json({ message: "Validation error", error: error.format() });
            }
            validatedData = Object.assign(Object.assign({}, data), { price: data.price !== undefined ? String(data.price) : undefined });
        }
        else if (req.is("multipart/form-data")) {
            const form = (0, formidable_1.default)();
            const [formData, files] = yield form.parse(req);
            const newProductImage = (_a = files.productImage) === null || _a === void 0 ? void 0 : _a[0];
            const fields = (0, formdata_util_1.extractFormFields)(formData);
            const { data, error } = schema_1.productUpdateSchema.safeParse(fields);
            if (error) {
                return res
                    .status(http_status_1.status.UNPROCESSABLE_ENTITY)
                    .json({ message: "Validation error", error: error.format() });
            }
            validatedData = Object.assign(Object.assign({}, data), { price: data.price !== undefined ? String(data.price) : undefined });
            if (newProductImage) {
                const existingProduct = yield connection_config_1.database.query.products.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema_1.products.id, id),
                    columns: { image: true },
                });
                if (existingProduct === null || existingProduct === void 0 ? void 0 : existingProduct.image) {
                    const publicId = (_b = existingProduct.image
                        .split("/")
                        .pop()) === null || _b === void 0 ? void 0 : _b.split(".")[0];
                    if (publicId)
                        yield cloudinary_config_1.default.uploader.destroy(`products/${publicId}`);
                }
                const cloudinaryResponse = yield cloudinary_config_1.default.uploader.upload(newProductImage.filepath, { folder: "products" });
                validatedData.image = cloudinaryResponse.secure_url;
            }
        }
        else {
            return res
                .status(http_status_1.status.UNSUPPORTED_MEDIA_TYPE)
                .json({ message: "Content-Type not supported." });
        }
        if (Object.keys(validatedData).length === 0) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "No fields provided to update." });
        }
        const updatedProduct = yield connection_config_1.database
            .update(schema_1.products)
            .set(validatedData)
            .where((0, drizzle_orm_1.eq)(schema_1.products.id, id))
            .returning();
        if (updatedProduct.length === 0) {
            return res
                .status(http_status_1.status.NOT_FOUND)
                .json({ message: "Product not found" });
        }
        res.status(http_status_1.status.OK).json({
            message: "Product updated successfully",
            data: updatedProduct[0],
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
const getProductsForBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { branchId } = req.params;
        if (!branchId) {
            return res.status(400).json({ error: "Branch ID is required." });
        }
        const availableProductsCTE = connection_config_1.database.$with("available_products").as(connection_config_1.database
            .select({
            id: schema_1.products.id,
            name: schema_1.products.name,
            description: schema_1.products.description,
            image: schema_1.products.image,
            price: schema_1.products.price,
            availability: schema_1.products.availability,
            status: schema_1.products.status,
            categoryId: schema_1.products.categoryId,
        })
            .from(schema_1.products)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.products.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.products.branchId))));
        const result = yield connection_config_1.database
            .with(availableProductsCTE)
            .select({
            product: {
                id: availableProductsCTE.id,
                name: availableProductsCTE.name,
                description: availableProductsCTE.description,
                image: availableProductsCTE.image,
                price: availableProductsCTE.price,
                availability: availableProductsCTE.availability,
                status: availableProductsCTE.status,
            },
            category: {
                id: schema_1.category.id,
                name: schema_1.category.name,
            },
        })
            .from(availableProductsCTE)
            .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(availableProductsCTE.categoryId, schema_1.category.id))
            .where((0, drizzle_orm_1.eq)(availableProductsCTE.status, "publish"));
        return res.status(200).json(result);
    }
    catch (error) {
        console.error("Failed to fetch products for branch:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getProductsForBranch = getProductsForBranch;
const assignProductToBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("This is the request body: ", req.body);
    console.log("This is the request params: ", req.params);
    try {
        const { productId } = req.params;
        const { branchId } = req.body;
        if (!productId) {
            return res.status(400).json({ error: "Product ID is required." });
        }
        const updatedProduct = yield connection_config_1.database
            .update(schema_1.products)
            .set({
            branchId: branchId,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.products.id, productId))
            .returning({
            updatedId: schema_1.products.id,
            name: schema_1.products.name,
            assignedBranchId: schema_1.products.branchId,
        });
        if (updatedProduct.length === 0) {
            return res.status(404).json({ error: "Product not found." });
        }
        return res.status(200).json({
            message: "Product branch assignment updated successfully.",
            product: updatedProduct[0],
        });
    }
    catch (error) {
        console.error("Failed to assign product to branch:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.assignProductToBranch = assignProductToBranch;
const getCategoriesWithProducts = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoriesWithProducts = yield connection_config_1.database.query.category.findMany({
            where: (categories, { eq }) => eq(categories.visibility, true),
            with: {
                products: {
                    where: (products, { eq }) => eq(products.availability, true),
                },
            },
        });
        const result = categoriesWithProducts.filter((category) => category.products.length > 0);
        return res.status(http_status_1.status.OK).json({
            message: "Categories and products fetched successfully.",
            data: result,
        });
    }
    catch (error) {
        console.error("Error fetching categories with products:", error);
        return res.status(http_status_1.status.INTERNAL_SERVER_ERROR).json({
            error: "An unexpected error occurred.",
        });
    }
});
exports.getCategoriesWithProducts = getCategoriesWithProducts;
