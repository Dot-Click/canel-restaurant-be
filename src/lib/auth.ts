import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../configs/connection.config";
import { betterAuth } from "better-auth";
import { env } from "@/utils/env.utils";
import {
  admin as adminPlugin,
  bearer,
  createAuthMiddleware,
  emailOTP,
  phoneNumber,
  // phoneNumber,
} from "better-auth/plugins";
import * as schema from "@/schema/schema";
import { ac, admin, manager, rider, subadmin, marketing } from "./permissions";
import dotenv from "dotenv";
import { mailgunClient } from "@/configs/mailgun.config";
import { resetPasswordTemplate, signupTemplate } from "@/utils/brevo";
import { sendWatiTemplateMessage } from "@/utils/watiService";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: drizzleAdapter(database, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: [
    env.FRONTEND_DOMAIN,
    "http://localhost:5173",
    "http://localhost:5000",
    "https://canel-restaurant-fe-production.up.railway.app",
  ].filter((domain): domain is string => !!domain),
  secret: env.COOKIE_SECRET,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,

    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // console.log("ctx.path", ctx.path);
      if (ctx.path.includes("/callback")) {
        console.log("ctx", ctx);
      }
    }),
  },
  advanced: {
    useSecureCookies: isProduction,
    // crossSubDomainCookies: {
    //   enabled: true,
    //   domain: env.FRONTEND_DOMAIN,
    // },
    cookies: {
      session_token: {
        attributes: {
          httpOnly: true,
          sameSite: "none",
          secure: true,
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ token, user }: any) => {
      try {
        const resetLink = `${env.FRONTEND_DOMAIN}/reset-password?token=${token}`;

        console.log(user);
        await mailgunClient.messages.create(env.MAILGUN_DOMAIN, {
          from: `${env.SENDGRID_SENDER_NAME} <${env.MAILGUN_SENDER_EMAIL}>`,
          to: [user.email],
          subject: "Your Password Reset Request",
          html: resetPasswordTemplate({
            resetLink: resetLink,
            userName:
              user.name || (user.email ? user.email.split("@")[0] : "user"),
          }),
        });
        console.log("Successfully sent password reset email via Mailgun.");
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        throw new Error("Failed to send password reset email.");
      }
    },
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: env.GOOGLE_CLIENT_ID as string,
      clientSecret: env.GOOGLE_CLIENT_SECRET as string,
      enabled: true,
      accessType: "offline",
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles: {
        admin,
        manager,
        rider,
        subadmin,
        marketing,
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        try {
          await mailgunClient.messages.create(env.MAILGUN_DOMAIN, {
            from: `${env.SENDGRID_SENDER_NAME} <${env.MAILGUN_SENDER_EMAIL}>`,
            to: [email],
            subject: "Welcome! Please Verify Your Email",
            html: signupTemplate({
              verificationCode: otp,
              userName: email.split("@")[0],
              email: email,
            }),
          });
          console.log("Successfully sent verification email via Mailgun.");
        } catch (error) {
          console.error("Failed to send verification email:", error);
          throw new Error("Failed to send verification email.");
        }
      },
    }),
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        try {
          const sanitizedPhoneNumber = phoneNumber.replace(/\D/g, "");

          console.log(
            `Sending OTP ${code} to WhatsApp number ${sanitizedPhoneNumber} via WATI.`
          );

          await sendWatiTemplateMessage({
            recipientPhoneNumber: sanitizedPhoneNumber,
            templateName: "canel_phone_verification",
            parameters: [
              {
                name: "1",
                value: code,
              },
            ],
          });

          console.log("Successfully sent phone number OTP via WATI.");
        } catch (error) {
          console.error("Failed to send phone number OTP via WATI:", error);
          throw new Error("Failed to send phone number OTP.");
        }
      },
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber}@delivercanel.com`,
        getTempName: (phoneNumber) => phoneNumber,
      },
    }),
    bearer(),
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
