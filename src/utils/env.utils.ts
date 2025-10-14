import { logger } from "./logger.util";
import { config } from "dotenv";
import { z } from "zod";
config();

const schemaObject = z.object({
  CLOUDINARY_API_SECRET: z.string(),
  CLOUDINARY_CLOUD_NAME: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  LOGO_IMAGE_URL: z.string(),
  MAILGUN_API_KEY: z.string(),
  MAILGUN_SMS_SENDER: z.string(),
  MAILGUN_SENDER_EMAIL: z.string(),
  MAILGUN_DOMAIN: z.string(),
  TWILIO_ACCOUNT_SSID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),
  SENDGRID_API_KEY: z.string(),
  SENDGRID_SENDER_EMAIL: z.string(),
  SENDGRID_SENDER_NAME: z.string(),
  BETTER_AUTH_SECRET: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  FRONTEND_DOMAIN: z.string(),
  CONNECTION_URL: z.string(),
  COOKIE_SECRET: z.string(),
  JWT_SECRET: z.string(),
  database: z.string(),
  MERCANTILE_SECRET_KEY: z.string(),
  MERCANTILE_API_KEY: z.string(),
  MERCANTILE_INTEGRATOR_ID: z.string(),
  MERCANTILE_MERCHANT_ID: z.string(),
  MERCANTILE_TERMINAL_ID: z.string(),
  MERCANTILE_CLIENT_ID: z.string(),
  MERCANTILE_ENCRYPTION_KEY: z.string(),
  WATI_WHATSAPP_ENDPOINT: z.string(),
  WATI_WHATSAPP_ACCESS_TOKEN: z.string(),
});

const envSchema = schemaObject.safeParse(process.env);

if (!envSchema.success) {
  const message = `Invalid environment variables: ${JSON.stringify(
    envSchema.error.format(),
    null,
    4
  )}`;

  logger.error(message);
  throw new Error(message);
}

export const env = envSchema.data;
