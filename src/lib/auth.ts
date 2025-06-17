import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "../configs/connection.config";
import { betterAuth } from "better-auth";
import { env } from "@/utils/env.utils";
import { admin } from "better-auth/plugins";
import * as schema from "@/schema/schema";

export const auth = betterAuth({
  database: drizzleAdapter(database, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: [env.FRONTEND_DOMAIN],
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
  //   onEmailVerification: async () => {
  //     // user.id
  //   },
  // },
  plugins: [admin()],
  user: {
    modelName: "users",
    fields: {
      image: "profilePic",
      name: "fullName",
    },
  },
});
