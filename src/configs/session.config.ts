import { env } from "@/utils/env.utils";
import { SessionOptions } from "express-session";
// import { store } from "./store.config";

export const sessionOptions: SessionOptions = {
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
  secret: env.COOKIE_SECRET!,
  saveUninitialized: false,
  resave: false,
  // store: store,
};
