import { Request, Response, NextFunction } from "express";
import { users } from "@/schema/schema";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/lib/auth";

type User = typeof users.$inferSelect;

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("authHeader", req.headers);
    console.log("cookies:", req.cookies);

    const headers = fromNodeHeaders(req.headers);

    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      console.log("session is missing user!", session);
      return res.status(401).json({ error: "NOT_AUTHENTICATED" });
    }

    req.user = session.user as unknown as User;
    next();
  } catch (err) {
    console.error("protectRoute error:", err);
    res.status(401).json({ error: "SESSION_VALIDATION_ERROR" });
  }
};
