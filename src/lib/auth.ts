import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../configs/connection.config";
import { betterAuth } from "better-auth";
import { env } from "@/utils/env.utils";
import { admin as adminPlugin } from "better-auth/plugins";
import * as schema from "@/schema/schema";
import { ac, admin, manager, rider, subadmin } from "./permissions";
// import { generalVerificationTemplate, signupTemplate } from "@/utils/brevo";
// import { brevoTransactionApi } from "@/configs/brevo.config";
import dotenv from "dotenv";

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
  emailVerification: {
    // enable: true,
    // sendVerificationEmail(data, request) {
    // },
    // sendVerificationEmail: async ({
    //   email,
    //   code,
    //   user,
    // }: {
    //   email: string;
    //   code: string;
    //   user: { name?: string };
    // }) => {
    //   try {
    //     await brevoTransactionApi.sendTransacEmail({
    //       subject: "Welcome! Please Verify Your Email",
    //       // Use the correct template for signing up
    //       htmlContent: signupTemplate({
    //         verificationCode: code, // Use the 'code' provided by better-auth
    //         userName: user.name!, // Use the 'user' object provided by better-auth
    //       }),
    //       sender: {
    //         email: "farasatkhan687@gmail.com",
    //         name: "Canel Restaurant",
    //       },
    //       to: [{ email: email, name: user.name! }], // Use 'email' and 'user.name' from the arguments
    //       replyTo: {
    //         email: "farasatkhan687@gmail.com",
    //         name: "Canel Restaurant",
    //       },
    //     });
    //   } catch (error) {
    //     console.error("Failed to send verification email:", error);
    //     // It's good practice to re-throw the error so better-auth can handle it if needed
    //     throw new Error("Failed to send verification email.");
    //   }
    // },
  },
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
  ],
  user: {
    modelName: "users",
    fields: {
      image: "profilePic",
      name: "fullName",
    },
  },
});
