CREATE TABLE "report_intervals" (
	"id" varchar PRIMARY KEY NOT NULL,
	"label" varchar NOT NULL,
	"value" varchar NOT NULL,
	"days" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
