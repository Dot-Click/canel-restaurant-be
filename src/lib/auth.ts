import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../configs/connection.config";
import { betterAuth } from "better-auth";
import { env } from "@/utils/env.utils";
import {
  admin as adminPlugin,
  bearer,
  emailOTP,
  phoneNumber,
  // phoneNumber,
} from "better-auth/plugins";
import * as schema from "@/schema/schema";
import { ac, admin, manager, rider } from "./permissions";
import dotenv from "dotenv";
import { sendgridClient } from "@/configs/mailgun.config";
import { resetPasswordTemplate, signupTemplate } from "@/utils/brevo";
import { sendWatiTemplateMessage } from "@/utils/watiService";

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
    // crossSubDomainCookies: {
    //   enabled: true,
    //   domain: env.FRONTEND_DOMAIN,
    // },
    cookies: {
      session_token: {
        attributes: {
          sameSite: "none",
          httpOnly: true,
          secure: true,
          domain: env.FRONTEND_DOMAIN,
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
        const msg = {
          to: user.email,
          from: {
            email: env.SENDGRID_SENDER_EMAIL!,
            name: env.SENDGRID_SENDER_NAME!,
          },
          subject: "Your Password Reset Request",
          html: resetPasswordTemplate({
            resetLink: resetLink,
            userName:
              user.name || (user.email ? user.email.split("@")[0] : "user"),
          }),
          replyTo: env.SENDGRID_SENDER_EMAIL!,
        };

        await sendgridClient.send(msg);
        console.log("Successfully sent password reset email via SendGrid.");
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
