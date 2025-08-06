import {
  text,
  pgTable,
  integer,
  varchar,
  boolean,
  // numeric,
  timestamp,
  ReferenceConfig,
  numeric,
  json,
  time,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { permissionValues } from "@/lib/checkrole";

const timeStamps = {
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
};

type UUIDOptions = Exclude<Parameters<typeof varchar>[1], undefined>;

const uuid = (columnName?: string, options?: UUIDOptions) =>
  varchar(columnName ?? "id", options).$defaultFn(() => createId());

const foreignkeyRef = (
  columnName: string,
  refColumn: ReferenceConfig["ref"],
  actions?: ReferenceConfig["actions"]
) => varchar(columnName, { length: 128 }).references(refColumn, actions);

// TODO Schema & Relations of
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  profilePic: text("profile_pic"),
  phone: integer("phone"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role").default("user"),

  selectedCity: text("selected_city"),
  selectedBranch: text("selected_branch"),
  selectedDeliveryType: text("selected_delivery_type"),
  selectedArea: text("selected_area"),

  permissions: text("permissions").array(),
  banned: boolean("banned").default(false),
  password: varchar("password"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified"),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  orders: many(orders),
  branch: one(branch, {
    fields: [users.id],
    references: [branch.manager],
  }),
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

// TODO Schema & Relations of Products
export const products = pgTable("products", {
  id: uuid().primaryKey(),
  name: varchar("product").notNull(),
  description: varchar("description").notNull(),
  image: varchar("product_image"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  availability: boolean("availability").default(true),
  size: varchar("size", { enum: ["large", "medium", "small"] }).default(
    "medium"
  ),
  discount: integer("discount"),
  categoryId: foreignkeyRef("category_id", () => category.id, {
    onDelete: "cascade",
  }).notNull(),
  addonItemIds: json("addon_item_ids").$type<string[]>().default([]),
  branchId: foreignkeyRef("branch_id", () => branch.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { enum: ["publish", "pending"] }).default(
    "publish"
  ),
  ...timeStamps,
});

export const productsrelation = relations(products, ({ one }) => ({
  branch: one(branch, {
    fields: [products.branchId],
    references: [branch.id],
  }),
  category: one(category, {
    fields: [products.categoryId],
    references: [category.id],
  }),
}));

// TODO Schema & Relations of Category
export const category = pgTable("category", {
  id: uuid("id").primaryKey(),
  name: varchar("name").notNull(),
  description: varchar("description").notNull(),
  visibility: boolean("visibility").default(true),
  status: varchar("status", { enum: ["publish", "pending"] }),
  ...timeStamps,
});

export const categoryrelation = relations(category, ({ many }) => ({
  products: many(products),
}));

// TODO Schema & Relations of Orders
export const orders = pgTable("orders", {
  id: uuid().primaryKey(),
  status: varchar("status", {
    enum: ["pending", "accepted", "on_the_way", "delivered", "cancelled"],
  }).default("pending"),
  location: varchar("location").notNull(),
  name: varchar("name").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  rif: varchar("rif"),
  nearestLandmark: varchar("nearest_landmark"),
  email: varchar("email"),
  changeRequest: varchar("change_request"),
  type: varchar("type", { enum: ["delivery", "pickup"] }).default("delivery"),
  userId: foreignkeyRef("user_id", () => users.id, { onDelete: "cascade" }),
  branchId: foreignkeyRef("branch_id", () => branch.id, {
    onDelete: "set null",
  }),
  riderId: varchar("rider_id", { length: 255 }).references(() => users.id, {
    onDelete: "set null",
  }),
  source: text("source"),
  acceptedAt: timestamp("accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  cancelledAt: timestamp("cancelled_at"),
  ...timeStamps,
});

export const orderItems = pgTable("orderItems", {
  id: uuid().primaryKey(),
  orderId: foreignkeyRef("order_id", () => orders.id, {
    onDelete: "cascade",
  }).notNull(),
  productId: foreignkeyRef("product_id", () => products.id, {
    onDelete: "set null",
  }),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  productName: varchar("product_name").notNull(),
  instructions: varchar("instructions"),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  // The old 'cart' relation is gone. Now an order has many 'items'.
  orderItems: many(orderItems),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  branch: one(branch, {
    fields: [orders.branchId],
    references: [branch.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// TODO Global order status:
export const globalOrderStatus = pgTable("global_order_status", {
  id: uuid().primaryKey(),
  isPaused: boolean("is_paused").default(false).notNull(), // true = orders globally paused
  reason: text("reason"),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// TODO Schema & Relations of Carts
export const cart = pgTable("cart", {
  id: uuid().primaryKey(),
  userId: foreignkeyRef("user_id", () => users.id, { onDelete: "cascade" }),
  type: varchar("type", { enum: ["delivery", "pickup"] }).default("delivery"),
  ...timeStamps,
});

export const cartItems = pgTable("cartItem", {
  id: uuid().primaryKey(),
  productId: foreignkeyRef("product_id", () => products.id, {
    onDelete: "cascade",
  }),
  cartId: foreignkeyRef("cart_id", () => cart.id, {
    onDelete: "cascade",
  }),
  quantity: integer("quantity").default(1).notNull(),
  instructions: varchar("instructions"),
});

export const cartrelation = relations(cart, ({ many }) => ({
  cartItems: many(cartItems),
}));

export const cartItemRelations = relations(cartItems, ({ one }) => ({
  cart: one(cart, { fields: [cartItems.cartId], references: [cart.id] }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

// TODO Schema & Relations of Addon
export const addonItem = pgTable("addonItem", {
  id: uuid().primaryKey(),
  name: varchar("name").notNull(),
  description: varchar("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  size: varchar("size", { enum: ["larger", "medium", "small"] }).default(
    "medium"
  ),
  discount: integer("discount"),
  image: varchar("addon_image"),
  addonId: foreignkeyRef("addon_id", () => addon.id, {
    onDelete: "cascade",
  }).notNull(),
  status: varchar("status", { enum: ["publish", "pending"] }),
  ...timeStamps,
});

export const addon = pgTable("addon", {
  id: uuid().primaryKey(),
  name: varchar("name").notNull(),
  description: varchar("description").notNull(),
  visibility: boolean("visibility").default(true),
  status: varchar("status", { enum: ["publish", "pending"] }),
  ...timeStamps,
});

export const addonItemRelation = relations(addonItem, ({ one }) => ({
  addon: one(addon, {
    fields: [addonItem.addonId],
    references: [addon.id],
  }),
}));

// An addon (group) has many addonItems.
export const addonRelation = relations(addon, ({ many }) => ({
  addonItems: many(addonItem),
}));

// Throttle
export const throttleinsight = pgTable("throttle_insight", {
  waitTime: integer("wait_time").notNull(),
  msBeforeNext: integer("ms_before_next").notNull(),
  endPoint: varchar("end_point", { length: 225 }),
  pointsAllotted: integer("allotted_points").notNull(),
  consumedPoints: integer("consumed_points").notNull(),
  remainingPoints: integer("remaining_points").notNull(),
  key: varchar("key", { length: 225 }).primaryKey().notNull(),
  isFirstInDuration: boolean("is_first_in_duration").notNull(),
});

// TODO branch
export const branch = pgTable("branch", {
  id: uuid().primaryKey(),
  name: varchar("name").notNull(),
  address: varchar("address").notNull(),
  location: varchar("location"),
  phoneNumber: varchar("phon_number"),
  operatingHours: varchar("operating_hours"),
  manager: foreignkeyRef("manager_id", () => users.id, {
    onDelete: "set null",
  }).notNull(), // foregn key reference
  cityId: foreignkeyRef("city_id", () => city.id, {
    onDelete: "set null",
  }).notNull(), //separate city table
  // state: varchar("state"),
  areas: json("areas").$type<string[]>(),
  // status: varchar("status", {
  //   enum: ["open", "closed"],
  // }).default("open"),
  isPaused: boolean("is_paused").default(false).notNull(),
  pauseReason: text("pause_reason"),
  ...timeStamps,
});

export const city = pgTable("city", {
  id: uuid().primaryKey(),
  name: varchar("name").notNull(),
});

export const branchRelations = relations(branch, ({ many, one }) => ({
  products: many(products),
  manager: one(users, {
    fields: [branch.manager],
    references: [users.id],
  }),
  city: one(city, {
    fields: [branch.cityId],
    references: [city.id],
  }),
  orders: many(orders),
}));

export const cityRelations = relations(city, ({ many }) => ({
  // A city can have MANY branches
  branches: many(branch),
}));

// TODO LogosBanner
export const branding = pgTable("branding", {
  id: uuid("id").primaryKey(),
  logo: varchar("logo"),
  banner: varchar("banner"),
  mainSection: varchar("main_section"),
});

// Branch Schedules
export const branchSchedule = pgTable("branchSchedule", {
  id: uuid().primaryKey(),

  branchId: varchar("branch_id")
    .notNull()
    .references(() => branch.id, { onDelete: "cascade" }),

  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday

  isActive: boolean("is_active").default(true).notNull(),
});

export const branchScheduleRelations = relations(
  branchSchedule,
  ({ many }) => ({
    timeSlots: many(timeSlot),
  })
);

// Time Slot
export const timeSlot = pgTable("timeSlot", {
  id: uuid().primaryKey(),

  scheduleId: varchar("schedule_id")
    .notNull()
    .references(() => branchSchedule.id, { onDelete: "cascade" }),

  openTime: time("open_time").notNull(),
  closeTime: time("close_time").notNull(),
});

export const timeSlotRelations = relations(timeSlot, ({ one }) => ({
  schedule: one(branchSchedule, {
    fields: [timeSlot.scheduleId],
    references: [branchSchedule.id],
  }),
}));

// export const productInsertSchema = createInsertSchema(products);

// Zod validation
export const productInsertSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  categoryId: z.string().min(1, "Category is required"),
  price: z.coerce.number().positive("Price must be a positive number"),
  availability: z.coerce.boolean().optional(),
  discount: z.coerce.number().min(0, "Discount cannot be negative").optional(),
  addonItemIds: z.array(z.string()).optional(),
});
export const addonItemInsertSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  addonId: z.string().min(1, "Addon is required"),
  price: z.coerce.number().positive("Price must be a positive number"),
});

const permissionEnum = z.enum(permissionValues);

export const assignPermissionsSchema = z.object({
  permissions: z
    .array(permissionEnum)
    .min(1, { message: "At least one permission is required." })
    .default([]),
});

// Schema for the userId in the URL parameters
export const staffIdParamSchema = z.object({
  userId: z.string().min(1, { message: "User ID cannot be empty." }),
});

export const addonInsertSchema = createInsertSchema(addon);
export const categoryInsertSchema = createInsertSchema(category);
export const cartInsertSchema = createInsertSchema(cart);
export const branchInsertSchema = createInsertSchema(branch);
export const orderInsertSchema = createInsertSchema(orders);

// For updates
export const categoryUpdateSchema = categoryInsertSchema.partial();
export const productUpdateSchema = productInsertSchema.partial();
export const addonUpdateSchema = addonInsertSchema.partial();
export const addonItemUpdateSchema = addonItemInsertSchema.partial();
