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
import { ac, admin, manager, rider, subadmin } from "./permissions";
import dotenv from "dotenv";
import { brevoTransactionApi, brevoSmsApi } from "@/configs/brevo.config";
import { signupTemplate } from "@/utils/brevo";

dotenv.config();

export const auth = betterAuth({
  database: drizzleAdapter(database, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: [process.env.FRONTEND_DOMAIN || "http://localhost:5000"],
  secret: env.COOKIE_SECRET,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      enabled: true,
    },
  },
  // emailVerification: {
  //   enabled: true,
  //   async sendVerificationEmail({ token, user }) {
  //     try {
  //       console.log("EMail verification has been hit:::"),
  //         await brevoTransactionApi.sendTransacEmail({
  //           subject: "Welcome! Please Verify Your Email",
  //           // Use the correct template for signing up
  //           htmlContent: signupTemplate({
  //             verificationCode: token,
  //             userName: user.name!,
  //             email: user.email
  //           }),
  //           sender: {
  //             email: process.env.BREVO_SENDER_EMAIL,
  //             name: "Canel Restaurant",
  //           },
  //           to: [{ email: user.email, name: user.name! }],
  //           replyTo: {
  //             email: process.env.BREVO_SENDER_EMAIL!,
  //             name: "Canel Restaurant",
  //           },
  //         });
  //     } catch (error) {
  //       console.error("Failed to send verification email:", error);
  //       // It's good practice to re-throw the error so better-auth can handle it if needed
  //       throw new Error("Failed to send verification email.");
  //     }
  //   },
  // },
  plugins: [
    adminPlugin({
      ac,
      roles: {
        admin,
        manager,
        subadmin,
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
              email: process.env.BREVO_SENDER_EMAIL,
              name: "Canel Restaurant",
            },
            to: [{ email, name: email.split("@")[0] }],
            replyTo: {
              email: process.env.BREVO_SENDER_EMAIL!,
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
            sender: process.env.BREVO_SMS_SENDER as string,
            recipient: phoneNumber,
            content: `Your Canel Restaurant verification code is: ${code}`,
          });

          console.log("Successfully sent phone number OTP.");
        } catch (error) {
          console.error("Failed to send phone number OTP:", error);
          // Re-throw the error so better-auth can handle the failure
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
  },
});
