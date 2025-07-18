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
exports.updateCartItem = exports.fetchController = exports.deleteFromCart = exports.addToCart = void 0;
const connection_config_1 = require("../configs/connection.config");
const schema_1 = require("../schema/schema");
const drizzle_orm_1 = require("drizzle-orm");
const http_status_1 = __importDefault(require("http-status"));
const addToCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { productId, quantity = 1, notes } = req.body;
        if (!productId) {
            return res
                .status(http_status_1.default.UNPROCESSABLE_ENTITY)
                .json({ message: "Product Id is required" });
        }
        let cartId;
        const existingCart = yield connection_config_1.database.query.cart.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.cart.userId, userId),
        });
        if (existingCart) {
            cartId = existingCart.id;
        }
        else {
            const [newCart] = yield connection_config_1.database
                .insert(schema_1.cart)
                .values({ userId })
                .returning({ id: schema_1.cart.id });
            cartId = newCart.id;
        }
        const existingItem = yield connection_config_1.database.query.cartItems.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId), (0, drizzle_orm_1.eq)(schema_1.cartItems.productId, productId)),
        });
        if (existingItem) {
            yield connection_config_1.database
                .update(schema_1.cartItems)
                .set({
                quantity: existingItem.quantity + quantity,
                instructions: notes || existingItem.instructions,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.cartItems.id, existingItem.id));
        }
        else {
            yield connection_config_1.database.insert(schema_1.cartItems).values({
                cartId,
                productId,
                quantity,
                instructions: notes,
            });
        }
        return res.status(http_status_1.default.OK).json({ message: "Item added to cart." });
    }
    catch (err) {
        return res
            .status(http_status_1.default.INTERNAL_SERVER_ERROR)
            .json({ error: "Something went wrong." });
    }
});
exports.addToCart = addToCart;
const deleteFromCart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        console.log(req.params);
        if (!userId || !id) {
            return res
                .status(http_status_1.default.BAD_REQUEST)
                .json({ message: "Both userId and productId are required." });
        }
        const [userCart] = yield connection_config_1.database
            .select()
            .from(schema_1.cart)
            .where((0, drizzle_orm_1.eq)(schema_1.cart.userId, userId));
        if (!userCart) {
            return res
                .status(http_status_1.default.NOT_FOUND)
                .json({ message: "Cart not found for this user." });
        }
        const deletedItems = yield connection_config_1.database
            .delete(schema_1.cartItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, userCart.id), (0, drizzle_orm_1.eq)(schema_1.cartItems.productId, id)))
            .returning();
        if (deletedItems.length === 0) {
            return res
                .status(http_status_1.default.NOT_FOUND)
                .json({ message: "Item not found in cart." });
        }
        return res.status(http_status_1.default.OK).json({
            message: "Item removed from cart successfully.",
            data: deletedItems[0],
        });
    }
    catch (error) {
        return res
            .status(http_status_1.default.INTERNAL_SERVER_ERROR)
            .json({ error: "Something went wrong." });
    }
});
exports.deleteFromCart = deleteFromCart;
const fetchController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const userCartWithItems = yield connection_config_1.database.query.cart.findFirst({
            where: (cart, { eq }) => eq(cart.userId, userId),
            with: {
                cartItems: {
                    with: {
                        product: {
                            columns: {
                                id: true,
                                name: true,
                                description: true,
                                image: true,
                                price: true,
                                discount: true,
                                addonItemIds: true,
                            },
                        },
                    },
                },
            },
        });
        const itemsToReturn = (userCartWithItems === null || userCartWithItems === void 0 ? void 0 : userCartWithItems.cartItems) || [];
        console.log(itemsToReturn);
        return res.status(http_status_1.default.OK).json({
            message: "Cart fetched successfully",
            data: itemsToReturn,
        });
    }
    catch (error) {
        console.error("Fetch cart error:", error);
        return res
            .status(http_status_1.default.INTERNAL_SERVER_ERROR)
            .json({ error: "Something went wrong." });
    }
});
exports.fetchController = fetchController;
const updateCartItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;
        if (!productId || typeof quantity !== 'number' || quantity < 0) {
            return res.status(http_status_1.default.BAD_REQUEST).json({
                message: "A valid productId and a non-negative quantity are required.",
            });
        }
        const userCart = yield connection_config_1.database.query.cart.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.cart.userId, userId),
            columns: { id: true },
        });
        if (!userCart) {
            return res.status(http_status_1.default.NOT_FOUND).json({ message: "Cart not found for this user." });
        }
        if (quantity === 0) {
            const deletedItems = yield connection_config_1.database
                .delete(schema_1.cartItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, userCart.id), (0, drizzle_orm_1.eq)(schema_1.cartItems.productId, productId)))
                .returning();
            if (deletedItems.length === 0) {
                return res.status(http_status_1.default.NOT_FOUND).json({ message: "Item not found in cart to delete." });
            }
            return res.status(http_status_1.default.OK).json({
                message: "Item removed from cart as quantity was set to 0.",
            });
        }
        const updatedItems = yield connection_config_1.database
            .update(schema_1.cartItems)
            .set({ quantity: quantity })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, userCart.id), (0, drizzle_orm_1.eq)(schema_1.cartItems.productId, productId)))
            .returning();
        if (updatedItems.length === 0) {
            return res.status(http_status_1.default.NOT_FOUND).json({ message: "Item not found in cart to update." });
        }
        return res.status(http_status_1.default.OK).json({
            message: "Item quantity updated successfully.",
            data: updatedItems[0],
        });
    }
    catch (err) {
        console.error("Update cart item error:", err);
        return res.status(http_status_1.default.INTERNAL_SERVER_ERROR).json({
            error: "Something went wrong."
        });
    }
});
exports.updateCartItem = updateCartItem;
