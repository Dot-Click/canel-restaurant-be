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
exports.getOrdersByRiderIdController = exports.getRiderOrdersController = exports.acceptOrderController = exports.assignRiderController = exports.createPosOrderController = exports.getOrderByIdController = exports.updateController = exports.fetchController = exports.deleteController = exports.insertController = void 0;
const http_status_1 = require("http-status");
const logger_util_1 = require("../utils/logger.util");
const connection_config_1 = require("../configs/connection.config");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../schema/schema");
const insertController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _a = req.body, { cartId } = _a, formData = __rest(_a, ["cartId"]);
    console.log(req.body);
    const userId = req.user.id;
    console.log("This is the request body", req.body);
    if (!cartId) {
        return res
            .status(http_status_1.status.BAD_REQUEST)
            .json({ message: "Cart ID is required." });
    }
    try {
        const newOrder = yield connection_config_1.database.transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const itemsInCart = yield tx.query.cartItems.findMany({
                where: (0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId),
                with: {
                    product: true,
                },
            });
            if (itemsInCart.length === 0) {
                throw new Error("Cannot place an order with an empty cart.");
            }
            const [insertedOrder] = yield tx
                .insert(schema_1.orders)
                .values(Object.assign(Object.assign({}, formData), { userId }))
                .returning();
            const newOrderItems = itemsInCart.map((item) => {
                if (!item.product) {
                    throw new Error(`Product with ID ${item.productId} not found for an item in the cart. Order cannot be placed.`);
                }
                return {
                    orderId: insertedOrder.id,
                    productId: item.productId,
                    productName: item.product.name,
                    quantity: item.quantity,
                    price: item.product.price,
                    instructions: item.instructions || "",
                };
            });
            yield tx.insert(schema_1.orderItems).values(newOrderItems);
            yield tx.delete(schema_1.cartItems).where((0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartId));
            return insertedOrder;
        }));
        return res.status(http_status_1.status.CREATED).json({
            message: "Order placed successfully!",
            data: newOrder,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Failed to create order:", error);
        return res
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
                .json({ message: "Order ID is required" });
        }
        const deletedOrder = yield connection_config_1.database
            .delete(schema_1.orders)
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id))
            .returning();
        if (deletedOrder.length === 0) {
            return res.status(http_status_1.status.NOT_FOUND).json({ message: "Order not found" });
        }
        res.status(http_status_1.status.OK).json({
            message: "Order deleted successfully",
            data: deletedOrder[0],
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
    var _a, _b;
    try {
        const userId = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        console.log("This is user Role", userRole);
        if (!userId) {
            return res.status(401).json({ message: "User ID missing in session" });
        }
        let orderList = [];
        if (userRole === "admin") {
            orderList = yield connection_config_1.database.query.orders.findMany({
                orderBy: (orders, { desc }) => [desc(orders.createdAt)],
                with: {
                    orderItems: true,
                },
            });
        }
        else if (userRole === "manager") {
            const branch = yield connection_config_1.database.query.branch.findFirst({
                where: (branch, { eq }) => eq(branch.manager, userId),
            });
            console.log("This is branch", branch);
            if (!branch) {
                return res.status(http_status_1.status.FORBIDDEN).json({
                    message: "No branch assigned to this manager.",
                });
            }
            orderList = yield connection_config_1.database.query.orders.findMany({
                where: (orders, { eq }) => eq(orders.branchId, branch.id),
                orderBy: (orders, { desc }) => [desc(orders.createdAt)],
                with: {
                    orderItems: true,
                },
            });
        }
        else {
            return res.status(http_status_1.status.FORBIDDEN).json({
                message: "Unauthorized user role.",
            });
        }
        res.status(http_status_1.status.OK).json({
            message: "Orders fetched successfully",
            data: orderList,
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
        const updateData = req.body;
        console.log("This is the updated data", updateData);
        console.log("This is the ID:", id);
        if (!id) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "Order ID is required." });
        }
        if (updateData.id) {
            delete updateData.id;
        }
        if (Object.keys(updateData).length === 0) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "No update data provided." });
        }
        const updatedOrder = yield connection_config_1.database
            .update(schema_1.orders)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id))
            .returning();
        if (updatedOrder.length === 0) {
            return res.status(http_status_1.status.NOT_FOUND).json({ message: "Order not found" });
        }
        res.status(http_status_1.status.OK).json({
            message: "Order updated successfully",
            data: updatedOrder[0],
        });
    }
    catch (error) {
        logger_util_1.logger.error("Failed to update order:", error);
        res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.updateController = updateController;
const getOrderByIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const orderDetails = yield connection_config_1.database.query.orders.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.orders.id, id),
            with: {
                orderItems: true,
            },
        });
        if (!orderDetails) {
            return res.status(http_status_1.status.NOT_FOUND).json({ message: "Order not found" });
        }
        return res.status(http_status_1.status.OK).json({
            message: "Order fetched successfully",
            data: orderDetails,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Failed to create order:", error);
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.getOrderByIdController = getOrderByIdController;
const createPosOrderController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _a = req.body, { items } = _a, formData = __rest(_a, ["items"]);
    const adminUserId = req.user.id;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res
            .status(http_status_1.status.BAD_REQUEST)
            .json({ message: "Order must contain at least one item." });
    }
    try {
        const newOrder = yield connection_config_1.database.transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            let customerUserId = null;
            if (formData.email) {
                const customer = yield tx.query.users.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema_1.users.email, formData.email),
                });
                if (customer) {
                    customerUserId = customer.id;
                }
                else {
                    const newUserId = crypto.randomUUID();
                    const [newCustomer] = yield tx
                        .insert(schema_1.users)
                        .values({
                        id: newUserId,
                        email: formData.email,
                        fullName: formData.name,
                    })
                        .returning({ id: schema_1.users.id });
                    customerUserId = newCustomer.id;
                }
            }
            const [insertedOrder] = yield tx
                .insert(schema_1.orders)
                .values(Object.assign(Object.assign({}, formData), { userId: customerUserId }))
                .returning();
            const newOrderItems = items.map((item) => ({
                orderId: insertedOrder.id,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                notes: item.notes,
            }));
            yield tx.insert(schema_1.orderItems).values(newOrderItems);
            const adminCart = yield tx.query.cart.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.cart.userId, adminUserId),
            });
            if (adminCart) {
                const cartIdToDelete = adminCart.id;
                logger_util_1.logger.info(`POS order created. Clearing admin's (${adminUserId}) temporary cart: ${cartIdToDelete}.`);
                yield tx.delete(schema_1.cartItems).where((0, drizzle_orm_1.eq)(schema_1.cartItems.cartId, cartIdToDelete));
                yield tx.delete(schema_1.cart).where((0, drizzle_orm_1.eq)(schema_1.cart.id, cartIdToDelete));
            }
            else {
                logger_util_1.logger.warn(`Admin (${adminUserId}) placed a POS order but no corresponding cart was found to clear.`);
            }
            return insertedOrder;
        }));
        return res.status(http_status_1.status.CREATED).json({
            message: "POS Order placed successfully!",
            data: newOrder,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Failed to create POS order:", error);
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.createPosOrderController = createPosOrderController;
const assignRiderController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { riderId } = req.body;
        if (!id) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "Order ID is required." });
        }
        if (!riderId) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "Rider ID is required." });
        }
        const riderExists = yield connection_config_1.database.query.users.findFirst({
            where: (users, { and, eq }) => and(eq(users.id, riderId), eq(users.role, "rider")),
        });
        if (!riderExists) {
            return res
                .status(http_status_1.status.NOT_FOUND)
                .json({ message: "A valid rider with that ID was not found." });
        }
        const updatedOrder = yield connection_config_1.database
            .update(schema_1.orders)
            .set({ riderId: riderId })
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id))
            .returning();
        if (updatedOrder.length === 0) {
            return res.status(http_status_1.status.NOT_FOUND).json({ message: "Order not found." });
        }
        res.status(http_status_1.status.OK).json({
            message: "Order successfully assigned to rider.",
            data: updatedOrder[0],
        });
    }
    catch (error) {
        logger_util_1.logger.error("Failed to assign rider to order:", error);
        res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
});
exports.assignRiderController = assignRiderController;
const acceptOrderController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { orderId } = req.params;
        const currentUser = req.user;
        if (!(currentUser === null || currentUser === void 0 ? void 0 : currentUser.role)) {
            return res
                .status(http_status_1.status.FORBIDDEN)
                .json({ message: "Forbidden. Access denied." });
        }
        const role = currentUser.role.toLowerCase();
        if (!["admin", "manager", "rider"].includes(role)) {
            return res
                .status(http_status_1.status.FORBIDDEN)
                .json({ message: "Forbidden. Insufficient privileges." });
        }
        let riderToAssignId;
        if (((_a = currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "admin") {
            const { riderId } = req.body;
            if (!riderId) {
                return res
                    .status(http_status_1.status.BAD_REQUEST)
                    .json({ message: "Rider ID is required for admin assignment." });
            }
            const riderExists = yield connection_config_1.database.query.users.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, riderId), (0, drizzle_orm_1.eq)(schema_1.users.role, "rider")),
            });
            if (!riderExists) {
                return res
                    .status(http_status_1.status.NOT_FOUND)
                    .json({ message: "The specified rider was not found." });
            }
            riderToAssignId = riderId;
        }
        else {
            riderToAssignId = currentUser.id;
        }
        const [orderToUpdate] = yield connection_config_1.database
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId));
        if (!orderToUpdate) {
            return res.status(http_status_1.status.NOT_FOUND).json({ message: "Order not found." });
        }
        if (orderToUpdate.status !== "pending") {
            return res.status(http_status_1.status.CONFLICT).json({
                message: `This order cannot be accepted. Its current status is "${orderToUpdate.status}".`,
            });
        }
        const [updatedOrder] = yield connection_config_1.database
            .update(schema_1.orders)
            .set({
            status: "accepted",
            riderId: riderToAssignId,
            acceptedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId))
            .returning();
        return res.status(http_status_1.status.OK).json({
            message: "Order accepted and assigned successfully!",
            data: updatedOrder,
        });
    }
    catch (error) {
        console.error("Error in acceptOrderController:", error);
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: "An internal server error occurred." });
    }
});
exports.acceptOrderController = acceptOrderController;
const getRiderOrdersController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const rider = req.user;
        if (!rider) {
            return res
                .status(http_status_1.status.UNAUTHORIZED)
                .json({ message: "Unauthorized. Please log in." });
        }
        if (((_a = rider === null || rider === void 0 ? void 0 : rider.role) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== "rider") {
            return res
                .status(http_status_1.status.FORBIDDEN)
                .json({ message: "Forbidden. This action is for riders only." });
        }
        const riderOrders = yield connection_config_1.database.query.orders.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.riderId, rider.id), (0, drizzle_orm_1.inArray)(schema_1.orders.status, ["accepted", "on_the_way"])),
            with: {
                branch: true,
                user: true,
                orderItems: {
                    with: {
                        product: true,
                    },
                },
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.orders.createdAt)],
        });
        return res.status(http_status_1.status.OK).json({
            message: "Rider's active orders fetched successfully.",
            data: riderOrders,
        });
    }
    catch (error) {
        console.error("Error fetching rider's orders:", error);
        return res.status(http_status_1.status.INTERNAL_SERVER_ERROR).json({
            message: "An internal server error occurred while fetching orders.",
        });
    }
});
exports.getRiderOrdersController = getRiderOrdersController;
const getOrdersByRiderIdController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { riderId } = req.params;
        if (!riderId) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "Rider ID is required." });
        }
        const riderExists = yield connection_config_1.database.query.users.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, riderId), (0, drizzle_orm_1.eq)(schema_1.users.role, "rider")),
        });
        if (!riderExists) {
            return res.status(http_status_1.status.NOT_FOUND).json({ message: "Rider not found." });
        }
        const assignedOrders = yield connection_config_1.database.query.orders.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.riderId, riderId), (0, drizzle_orm_1.inArray)(schema_1.orders.status, ["accepted", "on_the_way"])),
            with: {
                branch: true,
                user: true,
                orderItems: {
                    with: {
                        product: true,
                    },
                },
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.orders.acceptedAt)],
        });
        return res.status(http_status_1.status.OK).json({
            message: "Orders for the specified rider fetched successfully.",
            data: assignedOrders,
        });
    }
    catch (error) {
        console.error("Error fetching orders for rider:", error);
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: "An internal server error occurred." });
    }
});
exports.getOrdersByRiderIdController = getOrdersByRiderIdController;
