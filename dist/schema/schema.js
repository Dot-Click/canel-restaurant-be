"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addonItemUpdateSchema = exports.addonUpdateSchema = exports.productUpdateSchema = exports.categoryUpdateSchema = exports.orderInsertSchema = exports.branchInsertSchema = exports.cartInsertSchema = exports.categoryInsertSchema = exports.addonInsertSchema = exports.staffIdParamSchema = exports.assignPermissionsSchema = exports.addonItemInsertSchema = exports.productInsertSchema = exports.timeSlotRelations = exports.timeSlot = exports.branchScheduleRelations = exports.branchSchedule = exports.branding = exports.cityRelations = exports.branchRelations = exports.city = exports.branch = exports.throttleinsight = exports.addonRelation = exports.addonItemRelation = exports.addon = exports.addonItem = exports.cartItemRelations = exports.cartrelation = exports.cartItems = exports.cart = exports.orderItemsRelations = exports.ordersRelations = exports.orderItems = exports.orders = exports.categoryrelation = exports.category = exports.productsrelation = exports.products = exports.verification = exports.account = exports.session = exports.usersRelations = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const cuid2_1 = require("@paralleldrive/cuid2");
const drizzle_zod_1 = require("drizzle-zod");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const checkrole_1 = require("../lib/checkrole");
const timeStamps = {
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$onUpdateFn(() => new Date()),
};
const uuid = (columnName, options) => (0, pg_core_1.varchar)(columnName !== null && columnName !== void 0 ? columnName : "id", options).$defaultFn(() => (0, cuid2_1.createId)());
const foreignkeyRef = (columnName, refColumn, actions) => (0, pg_core_1.varchar)(columnName, { length: 128 }).references(refColumn, actions);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    fullName: (0, pg_core_1.text)("full_name").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    emailVerified: (0, pg_core_1.boolean)("email_verified")
        .$defaultFn(() => false)
        .notNull(),
    profilePic: (0, pg_core_1.text)("profile_pic"),
    phone: (0, pg_core_1.integer)("phone"),
    createdAt: (0, pg_core_1.timestamp)("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
    role: (0, pg_core_1.text)("role").default("user"),
    permissions: (0, pg_core_1.text)("permissions").array(),
    banned: (0, pg_core_1.boolean)("banned").default(false),
    password: (0, pg_core_1.varchar)("password"),
    banReason: (0, pg_core_1.text)("ban_reason"),
    banExpires: (0, pg_core_1.timestamp)("ban_expires"),
    phoneNumber: (0, pg_core_1.text)("phone_number").unique(),
    phoneNumberVerified: (0, pg_core_1.boolean)("phone_number_verified"),
});
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many, one }) => ({
    orders: many(exports.orders),
    branch: one(exports.branch, {
        fields: [exports.users.id],
        references: [exports.branch.manager],
    }),
}));
exports.session = (0, pg_core_1.pgTable)("session", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    token: (0, pg_core_1.text)("token").notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull(),
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    impersonatedBy: (0, pg_core_1.text)("impersonated_by"),
});
exports.account = (0, pg_core_1.pgTable)("account", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    accountId: (0, pg_core_1.text)("account_id").notNull(),
    providerId: (0, pg_core_1.text)("provider_id").notNull(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    accessToken: (0, pg_core_1.text)("access_token"),
    refreshToken: (0, pg_core_1.text)("refresh_token"),
    idToken: (0, pg_core_1.text)("id_token"),
    accessTokenExpiresAt: (0, pg_core_1.timestamp)("access_token_expires_at"),
    refreshTokenExpiresAt: (0, pg_core_1.timestamp)("refresh_token_expires_at"),
    scope: (0, pg_core_1.text)("scope"),
    password: (0, pg_core_1.text)("password"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull(),
});
exports.verification = (0, pg_core_1.pgTable)("verification", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    identifier: (0, pg_core_1.text)("identifier").notNull(),
    value: (0, pg_core_1.text)("value").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").$defaultFn(() => new Date()),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").$defaultFn(() => new Date()),
});
exports.products = (0, pg_core_1.pgTable)("products", Object.assign({ id: uuid().primaryKey(), name: (0, pg_core_1.varchar)("product").notNull(), description: (0, pg_core_1.varchar)("description").notNull(), image: (0, pg_core_1.varchar)("product_image"), price: (0, pg_core_1.numeric)("price", { precision: 10, scale: 2 }).notNull(), availability: (0, pg_core_1.boolean)("availability").default(true), size: (0, pg_core_1.varchar)("size", { enum: ["large", "medium", "small"] }).default("medium"), discount: (0, pg_core_1.integer)("discount"), categoryId: foreignkeyRef("category_id", () => exports.category.id, {
        onDelete: "cascade",
    }).notNull(), addonItemIds: (0, pg_core_1.json)("addon_item_ids").$type().default([]), branchId: foreignkeyRef("branch_id", () => exports.branch.id, {
        onDelete: "set null",
    }), status: (0, pg_core_1.varchar)("status", { enum: ["publish", "pending"] }).default("publish") }, timeStamps));
exports.productsrelation = (0, drizzle_orm_1.relations)(exports.products, ({ one }) => ({
    branch: one(exports.branch, {
        fields: [exports.products.branchId],
        references: [exports.branch.id],
    }),
    category: one(exports.category, {
        fields: [exports.products.categoryId],
        references: [exports.category.id],
    }),
}));
exports.category = (0, pg_core_1.pgTable)("category", Object.assign({ id: uuid("id").primaryKey(), name: (0, pg_core_1.varchar)("name").notNull(), description: (0, pg_core_1.varchar)("description").notNull(), visibility: (0, pg_core_1.boolean)("visibility").default(true), status: (0, pg_core_1.varchar)("status", { enum: ["publish", "pending"] }) }, timeStamps));
exports.categoryrelation = (0, drizzle_orm_1.relations)(exports.category, ({ many }) => ({
    products: many(exports.products),
}));
exports.orders = (0, pg_core_1.pgTable)("orders", Object.assign({ id: uuid().primaryKey(), status: (0, pg_core_1.varchar)("status", {
        enum: ["pending", "accepted", "on_the_way", "delivered", "cancelled"],
    }).default("pending"), location: (0, pg_core_1.varchar)("location").notNull(), name: (0, pg_core_1.varchar)("name").notNull(), phoneNumber: (0, pg_core_1.varchar)("phone_number").notNull(), rif: (0, pg_core_1.varchar)("rif"), nearestLandmark: (0, pg_core_1.varchar)("nearest_landmark"), email: (0, pg_core_1.varchar)("email"), changeRequest: (0, pg_core_1.varchar)("change_request"), type: (0, pg_core_1.varchar)("type", { enum: ["delivery", "pickup"] }).default("delivery"), userId: foreignkeyRef("user_id", () => exports.users.id, { onDelete: "cascade" }), branchId: foreignkeyRef("branch_id", () => exports.branch.id, {
        onDelete: "set null",
    }), riderId: (0, pg_core_1.varchar)("rider_id", { length: 255 }).references(() => exports.users.id, {
        onDelete: "set null",
    }), acceptedAt: (0, pg_core_1.timestamp)("accepted_at"), pickedUpAt: (0, pg_core_1.timestamp)("picked_up_at"), deliveredAt: (0, pg_core_1.timestamp)("delivered_at"), cancelledAt: (0, pg_core_1.timestamp)("cancelled_at") }, timeStamps));
exports.orderItems = (0, pg_core_1.pgTable)("orderItems", {
    id: uuid().primaryKey(),
    orderId: foreignkeyRef("order_id", () => exports.orders.id, {
        onDelete: "cascade",
    }).notNull(),
    productId: foreignkeyRef("product_id", () => exports.products.id, {
        onDelete: "set null",
    }),
    quantity: (0, pg_core_1.integer)("quantity").notNull(),
    price: (0, pg_core_1.numeric)("price", { precision: 10, scale: 2 }).notNull(),
    productName: (0, pg_core_1.varchar)("product_name").notNull(),
    instructions: (0, pg_core_1.varchar)("instructions"),
});
exports.ordersRelations = (0, drizzle_orm_1.relations)(exports.orders, ({ one, many }) => ({
    orderItems: many(exports.orderItems),
    user: one(exports.users, {
        fields: [exports.orders.userId],
        references: [exports.users.id],
    }),
    branch: one(exports.branch, {
        fields: [exports.orders.branchId],
        references: [exports.branch.id],
    }),
}));
exports.orderItemsRelations = (0, drizzle_orm_1.relations)(exports.orderItems, ({ one }) => ({
    order: one(exports.orders, {
        fields: [exports.orderItems.orderId],
        references: [exports.orders.id],
    }),
    product: one(exports.products, {
        fields: [exports.orderItems.productId],
        references: [exports.products.id],
    }),
}));
exports.cart = (0, pg_core_1.pgTable)("cart", Object.assign({ id: uuid().primaryKey(), userId: foreignkeyRef("user_id", () => exports.users.id, { onDelete: "cascade" }), type: (0, pg_core_1.varchar)("type", { enum: ["delivery", "pickup"] }).default("delivery") }, timeStamps));
exports.cartItems = (0, pg_core_1.pgTable)("cartItem", {
    id: uuid().primaryKey(),
    productId: foreignkeyRef("product_id", () => exports.products.id, {
        onDelete: "cascade",
    }),
    cartId: foreignkeyRef("cart_id", () => exports.cart.id, {
        onDelete: "cascade",
    }),
    quantity: (0, pg_core_1.integer)("quantity").default(1).notNull(),
    instructions: (0, pg_core_1.varchar)("instructions"),
});
exports.cartrelation = (0, drizzle_orm_1.relations)(exports.cart, ({ many }) => ({
    cartItems: many(exports.cartItems),
}));
exports.cartItemRelations = (0, drizzle_orm_1.relations)(exports.cartItems, ({ one }) => ({
    cart: one(exports.cart, { fields: [exports.cartItems.cartId], references: [exports.cart.id] }),
    product: one(exports.products, {
        fields: [exports.cartItems.productId],
        references: [exports.products.id],
    }),
}));
exports.addonItem = (0, pg_core_1.pgTable)("addonItem", Object.assign({ id: uuid().primaryKey(), name: (0, pg_core_1.varchar)("name").notNull(), description: (0, pg_core_1.varchar)("description").notNull(), price: (0, pg_core_1.numeric)("price", { precision: 10, scale: 2 })
        .notNull()
        .default("0.00"), size: (0, pg_core_1.varchar)("size", { enum: ["larger", "medium", "small"] }).default("medium"), discount: (0, pg_core_1.integer)("discount"), image: (0, pg_core_1.varchar)("addon_image"), addonId: foreignkeyRef("addon_id", () => exports.addon.id, {
        onDelete: "cascade",
    }).notNull(), status: (0, pg_core_1.varchar)("status", { enum: ["publish", "pending"] }) }, timeStamps));
exports.addon = (0, pg_core_1.pgTable)("addon", Object.assign({ id: uuid().primaryKey(), name: (0, pg_core_1.varchar)("name").notNull(), description: (0, pg_core_1.varchar)("description").notNull(), visibility: (0, pg_core_1.boolean)("visibility").default(true), status: (0, pg_core_1.varchar)("status", { enum: ["publish", "pending"] }) }, timeStamps));
exports.addonItemRelation = (0, drizzle_orm_1.relations)(exports.addonItem, ({ one }) => ({
    addon: one(exports.addon, {
        fields: [exports.addonItem.addonId],
        references: [exports.addon.id],
    }),
}));
exports.addonRelation = (0, drizzle_orm_1.relations)(exports.addon, ({ many }) => ({
    addonItems: many(exports.addonItem),
}));
exports.throttleinsight = (0, pg_core_1.pgTable)("throttle_insight", {
    waitTime: (0, pg_core_1.integer)("wait_time").notNull(),
    msBeforeNext: (0, pg_core_1.integer)("ms_before_next").notNull(),
    endPoint: (0, pg_core_1.varchar)("end_point", { length: 225 }),
    pointsAllotted: (0, pg_core_1.integer)("allotted_points").notNull(),
    consumedPoints: (0, pg_core_1.integer)("consumed_points").notNull(),
    remainingPoints: (0, pg_core_1.integer)("remaining_points").notNull(),
    key: (0, pg_core_1.varchar)("key", { length: 225 }).primaryKey().notNull(),
    isFirstInDuration: (0, pg_core_1.boolean)("is_first_in_duration").notNull(),
});
exports.branch = (0, pg_core_1.pgTable)("branch", Object.assign({ id: uuid().primaryKey(), name: (0, pg_core_1.varchar)("name").notNull(), address: (0, pg_core_1.varchar)("address").notNull(), location: (0, pg_core_1.varchar)("location"), phoneNumber: (0, pg_core_1.varchar)("phon_number"), operatingHours: (0, pg_core_1.varchar)("operating_hours"), manager: foreignkeyRef("manager_id", () => exports.users.id, {
        onDelete: "set null",
    }).notNull(), cityId: foreignkeyRef("city_id", () => exports.city.id, {
        onDelete: "set null",
    }).notNull(), areas: (0, pg_core_1.json)("areas").$type(), status: (0, pg_core_1.varchar)("status", {
        enum: ["open", "closed"],
    }).default("open") }, timeStamps));
exports.city = (0, pg_core_1.pgTable)("city", {
    id: uuid().primaryKey(),
    name: (0, pg_core_1.varchar)("name").notNull(),
});
exports.branchRelations = (0, drizzle_orm_1.relations)(exports.branch, ({ many, one }) => ({
    products: many(exports.products),
    manager: one(exports.users, {
        fields: [exports.branch.manager],
        references: [exports.users.id],
    }),
    city: one(exports.city, {
        fields: [exports.branch.cityId],
        references: [exports.city.id],
    }),
    orders: many(exports.orders),
}));
exports.cityRelations = (0, drizzle_orm_1.relations)(exports.city, ({ many }) => ({
    branches: many(exports.branch),
}));
exports.branding = (0, pg_core_1.pgTable)("branding", {
    id: uuid("id").primaryKey(),
    logo: (0, pg_core_1.varchar)("logo"),
    banner: (0, pg_core_1.varchar)("banner"),
    mainSection: (0, pg_core_1.varchar)("main_section"),
});
exports.branchSchedule = (0, pg_core_1.pgTable)("branchSchedule", {
    id: uuid().primaryKey(),
    branchId: (0, pg_core_1.varchar)("branch_id")
        .notNull()
        .references(() => exports.branch.id, { onDelete: "cascade" }),
    dayOfWeek: (0, pg_core_1.integer)("day_of_week").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
});
exports.branchScheduleRelations = (0, drizzle_orm_1.relations)(exports.branchSchedule, ({ many }) => ({
    timeSlots: many(exports.timeSlot),
}));
exports.timeSlot = (0, pg_core_1.pgTable)("timeSlot", {
    id: uuid().primaryKey(),
    scheduleId: (0, pg_core_1.varchar)("schedule_id")
        .notNull()
        .references(() => exports.branchSchedule.id, { onDelete: "cascade" }),
    openTime: (0, pg_core_1.time)("open_time").notNull(),
    closeTime: (0, pg_core_1.time)("close_time").notNull(),
});
exports.timeSlotRelations = (0, drizzle_orm_1.relations)(exports.timeSlot, ({ one }) => ({
    schedule: one(exports.branchSchedule, {
        fields: [exports.timeSlot.scheduleId],
        references: [exports.branchSchedule.id],
    }),
}));
exports.productInsertSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Product name is required"),
    description: zod_1.z.string().min(1, "Description is required"),
    categoryId: zod_1.z.string().min(1, "Category is required"),
    price: zod_1.z.coerce.number().positive("Price must be a positive number"),
    availability: zod_1.z.coerce.boolean().optional(),
    discount: zod_1.z.coerce.number().min(0, "Discount cannot be negative").optional(),
    addonItemIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.addonItemInsertSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Product name is required"),
    description: zod_1.z.string().min(1, "Description is required"),
    addonId: zod_1.z.string().min(1, "Addon is required"),
    price: zod_1.z.coerce.number().positive("Price must be a positive number"),
});
const permissionEnum = zod_1.z.enum(checkrole_1.permissionValues);
exports.assignPermissionsSchema = zod_1.z.object({
    permissions: zod_1.z
        .array(permissionEnum)
        .min(1, { message: "At least one permission is required." })
        .default([]),
});
exports.staffIdParamSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, { message: "User ID cannot be empty." }),
});
exports.addonInsertSchema = (0, drizzle_zod_1.createInsertSchema)(exports.addon);
exports.categoryInsertSchema = (0, drizzle_zod_1.createInsertSchema)(exports.category);
exports.cartInsertSchema = (0, drizzle_zod_1.createInsertSchema)(exports.cart);
exports.branchInsertSchema = (0, drizzle_zod_1.createInsertSchema)(exports.branch);
exports.orderInsertSchema = (0, drizzle_zod_1.createInsertSchema)(exports.orders);
exports.categoryUpdateSchema = exports.categoryInsertSchema.partial();
exports.productUpdateSchema = exports.productInsertSchema.partial();
exports.addonUpdateSchema = exports.addonInsertSchema.partial();
exports.addonItemUpdateSchema = exports.addonItemInsertSchema.partial();
