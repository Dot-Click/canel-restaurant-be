CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addon" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" varchar NOT NULL,
	"visibility" boolean DEFAULT true,
	"status" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "addonItem" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" varchar NOT NULL,
	"price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"size" varchar DEFAULT 'medium',
	"discount" integer,
	"addon_image" varchar,
	"addon_id" varchar(128) NOT NULL,
	"status" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "branch" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"address" varchar NOT NULL,
	"location" varchar,
	"phon_number" varchar,
	"operating_hours" varchar,
	"manager_id" varchar(128),
	"city_id" varchar(128) NOT NULL,
	"areas" json,
	"delivery_rates" json,
	"order_type" varchar DEFAULT 'both',
	"is_paused" boolean DEFAULT false NOT NULL,
	"pause_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "branchSchedule" (
	"id" varchar PRIMARY KEY NOT NULL,
	"branch_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branding" (
	"id" varchar PRIMARY KEY NOT NULL,
	"logo" varchar,
	"banner" varchar,
	"name" varchar,
	"email" varchar,
	"phone_number" varchar,
	"instagram" varchar,
	"facebook" varchar,
	"main_section" varchar
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar(128),
	"type" varchar DEFAULT 'delivery',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cartItemAddon" (
	"id" varchar PRIMARY KEY NOT NULL,
	"cart_item_id" varchar(128) NOT NULL,
	"addon_item_id" varchar(128) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cartItem" (
	"id" varchar PRIMARY KEY NOT NULL,
	"product_id" varchar(128),
	"cart_id" varchar(128),
	"quantity" integer DEFAULT 1 NOT NULL,
	"instructions" varchar,
	"variant_name" varchar,
	"variant_price" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" varchar NOT NULL,
	"visibility" boolean DEFAULT true,
	"status" varchar,
	"volume_discount_rules" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "city" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_order_status" (
	"id" varchar PRIMARY KEY NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"reason" text,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_addons" (
	"id" varchar PRIMARY KEY NOT NULL,
	"order_item_id" varchar NOT NULL,
	"addon_item_id" varchar NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orderItems" (
	"id" varchar PRIMARY KEY NOT NULL,
	"order_id" varchar(128) NOT NULL,
	"product_id" varchar(128),
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"product_name" varchar NOT NULL,
	"discount" integer,
	"instructions" varchar
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY NOT NULL,
	"status" varchar DEFAULT 'pending',
	"location" varchar NOT NULL,
	"name" varchar NOT NULL,
	"phone_number" varchar NOT NULL,
	"rif" varchar,
	"nearest_landmark" varchar,
	"email" varchar,
	"change_request" varchar,
	"type" varchar DEFAULT 'delivery',
	"delivery_image" varchar,
	"tip" numeric(10, 2) DEFAULT '0.00',
	"user_id" varchar(128),
	"branch_id" varchar(128),
	"rider_id" varchar(255),
	"online_payment_prove_image" varchar,
	"source" text,
	"accepted_at" timestamp,
	"picked_up_at" timestamp,
	"delivered_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY NOT NULL,
	"product" varchar NOT NULL,
	"description" varchar NOT NULL,
	"product_image" varchar,
	"price" numeric(10, 2) NOT NULL,
	"availability" boolean DEFAULT true,
	"size" varchar DEFAULT 'medium',
	"discount" integer,
	"category_id" varchar(128) NOT NULL,
	"addon_item_ids" json DEFAULT '[]'::json,
	"branch_id" varchar(128),
	"tax" integer,
	"status" varchar DEFAULT 'publish',
	"variants" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "throttle_insight" (
	"wait_time" integer NOT NULL,
	"ms_before_next" integer NOT NULL,
	"end_point" varchar(225),
	"allotted_points" integer NOT NULL,
	"consumed_points" integer NOT NULL,
	"remaining_points" integer NOT NULL,
	"key" varchar(225) PRIMARY KEY NOT NULL,
	"is_first_in_duration" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeSlot" (
	"id" varchar PRIMARY KEY NOT NULL,
	"schedule_id" varchar NOT NULL,
	"open_time" time NOT NULL,
	"close_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"profile_pic" text,
	"phone" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text DEFAULT 'user',
	"selected_city" text,
	"selected_branch" text,
	"selected_delivery_type" text,
	"selected_area" text,
	"permissions" text[],
	"banned" boolean DEFAULT false,
	"password" varchar,
	"ban_reason" text,
	"ban_expires" timestamp,
	"phone_number" text,
	"phone_number_verified" boolean,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addonItem" ADD CONSTRAINT "addonItem_addon_id_addon_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."addon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch" ADD CONSTRAINT "branch_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch" ADD CONSTRAINT "branch_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branchSchedule" ADD CONSTRAINT "branchSchedule_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartItemAddon" ADD CONSTRAINT "cartItemAddon_cart_item_id_cartItem_id_fk" FOREIGN KEY ("cart_item_id") REFERENCES "public"."cartItem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartItemAddon" ADD CONSTRAINT "cartItemAddon_addon_item_id_addonItem_id_fk" FOREIGN KEY ("addon_item_id") REFERENCES "public"."addonItem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartItem" ADD CONSTRAINT "cartItem_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartItem" ADD CONSTRAINT "cartItem_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_addons" ADD CONSTRAINT "order_addons_order_item_id_orderItems_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."orderItems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_addons" ADD CONSTRAINT "order_addons_addon_item_id_addonItem_id_fk" FOREIGN KEY ("addon_item_id") REFERENCES "public"."addonItem"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orderItems" ADD CONSTRAINT "orderItems_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orderItems" ADD CONSTRAINT "orderItems_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_branch_id_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeSlot" ADD CONSTRAINT "timeSlot_schedule_id_branchSchedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."branchSchedule"("id") ON DELETE cascade ON UPDATE no action;