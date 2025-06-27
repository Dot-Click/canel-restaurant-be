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
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

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

// Schemas
// export const users = pgTable("users", {
//   id: text("id").primaryKey(),
//   fullName: text("full_name").notNull(),
//   email: text("email").notNull().unique(),
//   emailVerified: boolean("email_verified")
//     .$defaultFn(() => false)
//     .notNull(),
//   profilePic: text("profile_pic"),
//   createdAt: timestamp("created_at")
//     .$defaultFn(() => new Date())
//     .notNull(),
//   updatedAt: timestamp("updated_at")
//     .$defaultFn(() => new Date())
//     .notNull(),
// });

// TODO Schema & Relations of Users
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
  banned: boolean("banned"),
  password: varchar("password"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  orders: many(orders),
  managedBranch: one(branch, {
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
  instruction: varchar("instruction"),
  availability: boolean("availability").default(true),
  size: varchar("size", { enum: ["large", "medium", "small"] }).default(
    "medium"
  ),
  discount: integer("discount"),
  categoryId: foreignkeyRef("category_id", () => category.id, {
    onDelete: "cascade",
  }).notNull(),
  addonId: foreignkeyRef("addon_id", () => addon.id, {
    onDelete: "no action",
  }),
  branchId: foreignkeyRef("branch_id", () => branch.id, {
    onDelete: "cascade",
  }), // utility foregn key
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
  ...timeStamps,
});

export const categoryrelation = relations(category, ({ many }) => ({
  products: many(products),
}));

// TODO Schema & Relations of Orders
export const orders = pgTable("orders", {
  id: uuid().primaryKey(),
  status: varchar("status", { enum: ["pending", "completed"] }).default(
    "pending"
  ),
  location: varchar("location").notNull(),
  name: varchar("name").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  rif: varchar("rif"),
  nearestLandmark: varchar("nearest_landmark"),
  email: varchar("email"),
  changeRequest: varchar("change_request"),
  type: varchar("type", { enum: ["delivery", "pickup"] }).default("delivery"),
  userId: foreignkeyRef("user_id", () => users.id, { onDelete: "cascade" }),
  // cartId: foreignkeyRef("cart_id", () => cart.id, { onDelete: "cascade" }),
  ...timestamp,
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
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  // The old 'cart' relation is gone. Now an order has many 'items'.
  orderItems: many(orderItems),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
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

// TODO Schema & Relations of Carts
export const cart = pgTable("cart", {
  id: uuid().primaryKey(),
  userId: foreignkeyRef("user_id", () => users.id, { onDelete: "cascade" }),
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
  ...timeStamps,
});

export const addon = pgTable("addon", {
  id: uuid().primaryKey(),
  name: varchar("name").notNull(),
  description: varchar("description").notNull(),
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
  status: varchar("status", {
    enum: ["open", "closed"],
  }).default("open"),
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
  // A branch is located in ONE city
  city: one(city, {
    fields: [branch.cityId],
    references: [city.id],
  }),
}));

export const cityRelations = relations(city, ({ many }) => ({
  // A city can have MANY branches
  branches: many(branch),
}));

// export const productInsertSchema = createInsertSchema(products);

// Zod validation
export const productInsertSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  categoryId: z.string().min(1, "Category is required"),
  price: z.coerce.number().positive("Price must be a positive number"),

  discount: z.coerce.number().min(0, "Discount cannot be negative").optional(),
});
export const addonItemInsertSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  addonId: z.string().min(1, "Addon is required"),
  price: z.coerce.number().positive("Price must be a positive number"),
});
export const addonInsertSchema = createInsertSchema(addon);
export const categoryInsertSchema = createInsertSchema(category);
export const cartInsertSchema = createInsertSchema(cart);
export const branchInsertSchema = createInsertSchema(branch);
export const orderInsertSchema = createInsertSchema(orders);
