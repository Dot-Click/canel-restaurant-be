CREATE TABLE "currency_rates" (
	"id" varchar PRIMARY KEY NOT NULL,
	"base_currency" varchar(3) NOT NULL,
	"quote_currency" varchar(3) NOT NULL,
	"rate" numeric(18, 6) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" varchar(128) NOT NULL,
	"category_id" varchar(128) NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_category_id_fk";
--> statement-breakpoint
ALTER TABLE "branch" ADD COLUMN "type" varchar DEFAULT 'restaurant';--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "show_on_bakery" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paymentType" varchar;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "distance" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "category_id";