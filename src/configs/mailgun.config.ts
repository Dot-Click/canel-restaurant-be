// src/configs/twilio.config.ts

import { env } from "@/utils/env.utils";
import { config } from "dotenv";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";

config();

// --- Twilio SMS Client Initialization ---
export const twilioClient = twilio(
  env.TWILIO_ACCOUNT_SSID!,
  env.TWILIO_AUTH_TOKEN!
);

// --- Twilio SendGrid Email Client Initialization ---
sgMail.setApiKey(env.SENDGRID_API_KEY!);
export const sendgridClient = sgMail;
