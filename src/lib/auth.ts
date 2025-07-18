import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../configs/connection.config";
import { betterAuth } from "better-auth";
import { env } from "@/utils/env.utils";
import {
  admin as adminPlugin,
  emailOTP,
  phoneNumber,
} from "better-auth/plugins";
import * as schema from "@/schema/schema";
import { ac, admin, manager, rider } from "./permissions";
import dotenv from "dotenv";
import { brevoTransactionApi, brevoSmsApi } from "@/configs/brevo.config";
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
          await brevoTransactionApi.sendTransacEmail({
            subject: "Welcome! Please Verify Your Email",
            htmlContent: signupTemplate({
              verificationCode: otp,
              userName: email.split("@")[0],
              email: email,
            }),
            sender: {
              email: env.BREVO_SENDER_EMAIL,
              name: "Canel Restaurant",
            },
            to: [{ email, name: email.split("@")[0] }],
            replyTo: {
              email: env.BREVO_SENDER_EMAIL!,
              name: "Canel Restaurant",
            },
          });
        } catch (error) {
          console.error("Failed to send verification email:", error);
          throw new Error("Failed to send verification email.");
        }
      },
    }),
    phoneNumber({
      async sendOTP({ phoneNumber, code }) {
        try {
          console.log(`Sending OTP ${code} to phone number ${phoneNumber}`);

          await brevoSmsApi.sendTransacSms({
            sender: env.BREVO_SMS_SENDER as string,
            recipient: phoneNumber,
            content: `Your Canel Restaurant verification code is: ${code}`,
          });

          console.log("Successfully sent phone number OTP.");
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
