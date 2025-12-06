import { Request, Response, NextFunction } from "express";
import { auth } from "@/lib/auth";
import { users } from "@/schema/schema";

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
    let user = null;

    // -----------------------------
    // 1) TRY COOKIE BASED SESSION
    // -----------------------------
    const cookieHeaders = new Headers();

    if (req.headers.cookie) {
      cookieHeaders.set("cookie", req.headers.cookie);
    }
    if (req.headers["user-agent"]) {
      cookieHeaders.set("user-agent", req.headers["user-agent"]);
    }

    try {
      const session = await auth.api.getSession({ headers: cookieHeaders });

      if (session?.user) {
        user = session.user;
      }
    } catch (err) {
      // ignore session errors, fallback to token
    }

    // -----------------------------
    // 2) IF NO USER, TRY TOKEN
    // -----------------------------
    if (!user) {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "No cookie session and no bearer token.",
        });
      }

      const token = authHeader.replace("Bearer ", "");

      const tokenHeaders = new Headers({
        Authorization: `Bearer ${token}`,
      });

      const sessionFromToken = await auth.api.getSession({
        headers: tokenHeaders,
      });

      if (!sessionFromToken?.user) {
        return res.status(401).json({
          error: "INVALID_TOKEN",
          message: "Token invalid or expired",
        });
      }

      user = sessionFromToken.user;
    }

    // -----------------------------
    // 3) ATTACH USER & CONTINUE
    // -----------------------------
    req.user = user as unknown as User;
    next();
  } catch (error) {
    console.error("protectRoute error:", error);
    return res.status(401).json({
      error: "SESSION_VALIDATION_ERROR",
      message: "Failed to validate session",
    });
  }
};
