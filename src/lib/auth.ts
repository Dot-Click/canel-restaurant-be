import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../configs/connection.config";
import { betterAuth } from "better-auth";
import { env } from "@/utils/env.utils";
import {
  admin as adminPlugin,
  emailOTP,
  phoneNumber,
  // phoneNumber,
} from "better-auth/plugins";
import * as schema from "@/schema/schema";
import { ac, admin, manager, rider } from "./permissions";
import dotenv from "dotenv";
import { sendgridClient, twilioClient } from "@/configs/mailgun.config";
import { signupTemplate } from "@/utils/brevo";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: drizzleAdapter(database, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: [env.FRONTEND_DOMAIN],
  secret: env.COOKIE_SECRET,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    useSecureCookies: isProduction,
    cookies: {
      session_token: {
        attributes: {
          sameSite: isProduction ? "none" : "lax",
          httpOnly: isProduction,
          secure: isProduction,
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: env.GOOGLE_CLIENT_ID as string,
      clientSecret: env.GOOGLE_CLIENT_SECRET as string,
      enabled: true,
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles: {
        admin,
        manager,
        rider,
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        try {
          const msg = {
            to: email,
            from: {
              email: env.SENDGRID_SENDER_EMAIL!,
              name: env.SENDGRID_SENDER_NAME!,
            },
            subject: "Welcome! Please Verify Your Email",
            html: signupTemplate({
              verificationCode: otp,
              userName: email.split("@")[0],
              email: email,
            }),
            replyTo: env.SENDGRID_SENDER_EMAIL!,
          };

          await sendgridClient.send(msg);
          console.log("Successfully sent verification email via SendGrid.");
        } catch (error) {
          console.error("Failed to send verification email:", error);
          // if (error?.response) {
          //   console.error(error.response.body);
          // }
          throw new Error("Failed to send verification email.");
        }
      },
    }),
    // auth.ts -> plugins: [ ... phoneNumber({ ... }) ]

    phoneNumber({
      async sendOTP({ phoneNumber, code }) {
        try {
          // ADD THIS LINE to remove any spaces or weird characters
          const sanitizedPhoneNumber = phoneNumber
            .replace(/\s+/g, "")
            .replace(/[^0-9+]/g, "");

          console.log(
            `Sending OTP ${code} to sanitized phone number ${sanitizedPhoneNumber}`
          );

          await twilioClient.messages.create({
            body: `Your Canel Restaurant verification code is: ${code}`,
            from: env.TWILIO_PHONE_NUMBER!,
            // USE THE SANITIZED VARIABLE HERE
            to: sanitizedPhoneNumber,
          });

          console.log("Successfully sent phone number OTP via Twilio.");
        } catch (error) {
          console.error("Failed to send phone number OTP:", error);
          throw new Error("Failed to send phone number OTP.");
        }
      },
    }),
  ],
  user: {
    modelName: "users",
    fields: {
      image: "profilePic",
      name: "fullName",
    },
    additionalFields: {
      permissions: {
        type: "string[]",
        fieldName: "permissions",
      },
    },
  },
});
