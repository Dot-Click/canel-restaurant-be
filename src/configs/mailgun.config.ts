// src/configs/mailgun.config.ts

import { env } from "@/utils/env.utils";
import { config } from "dotenv";
import twilio from "twilio";
import Mailgun from "mailgun.js";
import formData from "form-data";
// import sgMail from "@sendgrid/mail";

config();

// --- Twilio SMS Client Initialization ---
export const twilioClient = twilio(
  env.TWILIO_ACCOUNT_SSID!,
  env.TWILIO_AUTH_TOKEN!
);

// --- Mailgun Email Client Initialization ---
const mailgun = new Mailgun(formData);
export const mailgunClient = mailgun.client({
  username: "api",
  key: env.MAILGUN_API_KEY!,
});

// --- Twilio SendGrid Email Client Initialization ---
// sgMail.setApiKey(env.SENDGRID_API_KEY!);
// export const sendgridClient = sgMail;

