// import { Request, Response, NextFunction } from "express";
// import { auth } from "@/lib/auth"; // Your Better Auth instance
// import { fromNodeHeaders } from "better-auth/node"; // Converts Node headers for getSession
// import { users } from "@/schema/schema";
// import status from "http-status";

// type User = typeof users.$inferSelect;

// declare global {
//   namespace Express {
//     interface Request {
//       user?: User;
//     }
//   }
// }

// export const protectRoute = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const headers = fromNodeHeaders(req.headers);

//     let session = await auth.api.getSession({ headers });

//     console.log("session", session);

//     if (!session?.user) {
//       session = await auth.api.getSession({ headers });
//     }

//     if (!session?.user) {
//       return res.status(status.UNAUTHORIZED).json({
//         error: "UNAUTHORIZED",
//         message: "You must be logged in to access this resource.",
//       });
//     }

//     // Attach user to request
//     (req as any).user = session.user;
//     return next();
//   } catch (error) {
//     console.error("Authentication error:", error);
//     return res.status(status.UNAUTHORIZED).json({
//       error: "AUTH_ERROR",
//       message: "Failed to authenticate request.",
//     });
//   }
// };

import { Request, Response, NextFunction } from "express";
import { auth } from "@/lib/auth";
import { users } from "@/schema/schema";
// import { Headers } from "node-fetch";

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
    // const headers = new Headers(req.headers as HeadersInit);
    const headers = new Headers();

    if (req.headers.cookie) {
      headers.set("cookie", req.headers.cookie);
    }
    if (req.headers["user-agent"]) {
      headers.set("user-agent", req.headers["user-agent"]);
    }

    const session = await auth.api.getSession({ headers });
    console.log("session", session);
    if (!session || !session.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "You must be logged in to access this resource.",
      });
    }

    req.user = session.user as unknown as User;
    next();
  } catch (error) {
    console.error("Session validation error:", error);
    return res.status(401).json({
      error: "SESSION_VALIDATION_ERROR",
      message: "Failed to validate session",
    });
  }
};

export const getCurrentUserId = (req: Request): string | null => {
  return req.user?.id || null;
};

export const ensureAuthenticated = async (req: Request): Promise<boolean> => {
  try {
    const headers = new Headers(req.headers as HeadersInit);
    const session = await auth.api.getSession({ headers });
    return !!(session && session.user);
  } catch (error) {
    return false;
  }
};
