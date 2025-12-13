import { Request, Response, NextFunction } from "express";
import { auth } from "@/lib/auth";
import { users } from "@/schema/schema";
// import { fromNodeHeaders } from "better-auth/node";
// import { database } from "@/configs/connection.config";
// import { eq } from "drizzle-orm";

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
  // try {
  //   let user = null;

  //   // -----------------------------
  //   // 1) TRY COOKIE BASED SESSION
  //   // -----------------------------
  //   const cookieHeaders = new Headers();

  //   if (req.headers.cookie) {
  //     cookieHeaders.set("cookie", req.headers.cookie);
  //   }
  //   if (req.headers["user-agent"]) {
  //     cookieHeaders.set("user-agent", req.headers["user-agent"]);
  //   }

  //   try {
  //     const session = await auth.api.getSession({ headers: cookieHeaders });
  //     console.log(session);
  //     if (session?.user) {
  //       user = session.user;
  //     }
  //     console.log(user);
  //   } catch (err) {
  //     // ignore session errors, fallback to token
  //     console.log("err", err);
  //   }

  //   // -----------------------------
  //   // 2) IF NO USER, TRY TOKEN
  //   // -----------------------------
  //   if (!user) {
  //     const authHeader = req.headers.authorization;

  //     if (!authHeader || !authHeader.startsWith("Bearer ")) {
  //       return res.status(401).json({
  //         error: "UNAUTHORIZED",
  //         message: "No cookie session and no bearer token.",
  //       });
  //     }

  //     const token = authHeader.replace("Bearer ", "");

  //     const tokenHeaders = new Headers({
  //       Authorization: `Bearer ${token}`,
  //     });

  //     const sessionFromToken = await auth.api.getSession({
  //       headers: tokenHeaders,
  //     });

  //     if (!sessionFromToken?.user) {
  //       return res.status(401).json({
  //         error: "INVALID_TOKEN",
  //         message: "Token invalid or expired",
  //       });
  //     }

  //     user = sessionFromToken.user;
  //   }

  //   // -----------------------------
  //   // 3) ATTACH USER & CONTINUE
  //   // -----------------------------
  //   req.user = user as unknown as User;
  //   next();
  // } catch (error) {
  //   console.error("protectRoute error:", error);
  //   return res.status(401).json({
  //     error: "SESSION_VALIDATION_ERROR",
  //     message: "Failed to validate session",
  //   });
  // }

  let token;
  try {
    const tokenFromCookies =
      req.cookies.token ||
      req.headers.cookie?.split("better-auth.session_data=")[1]?.split(";")[0];
    token = tokenFromCookies;
    let tokenFromHeaders = req.headers.authorization;

    if (tokenFromHeaders && tokenFromHeaders.startsWith("Bearer ")) {
      token = tokenFromHeaders.substring(7);
    }

    console.log("token", token);
    console.log("tokenFromCookies", tokenFromCookies);
    console.log("tokenFromHeaders", tokenFromHeaders);

    if (!token) {
      return res.status(401).json({ message: "UNAUTHORIZED" });
    }

    const sessionFromToken = await auth.api.getSession({
      headers: token,
    });
    req.user = sessionFromToken?.user as unknown as User;

    next();
  } catch (error) {
    console.error("protectRoute error:", error);
    return res.status(401).json({
      error: "SESSION_VALIDATION_ERROR",
      message: "Failed to validate session",
    });
  }
};

// export const protectRoute = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const apiKeyHeader = req.headers["x-api-key"];
//     console.log("req.headers.cookie", req.headers.cookie);
//     console.log(
//       "req.headers.cookie",
//       req.headers.cookie?.split("better-auth.session_data=")[1]?.split(";")[0]
//     );
//     // 1️⃣ API Key auth (optional fast-path)
//     if (typeof apiKeyHeader === "string" && apiKeyHeader.length > 0) {
//       const [user] = await database
//         .select({
//           id: users.id,
//           name: users.fullName,
//           email: users.email,
//           role: users.role,
//         })
//         .from(users)
//         .where(eq(users.id, apiKeyHeader))
//         .limit(1);

//       if (user) {
//         req.user = user as unknown as User;
//         return next();
//       }
//     }

//     const session = await auth.api.getSession({
//       headers: fromNodeHeaders(req.headers),
//     });

//     if (session?.user) {
//       req.user = session.user as unknown as User;
//       return next();
//     }

//     return res.status(401).json({ message: "UNAUTHORIZED" });
//   } catch (error) {
//     console.error("Authentication error:", error);
//     console.error("protectRoute error:", error);
//     return res.status(401).json({
//       error: "SESSION_VALIDATION_ERROR",
//       message: "Failed to validate session",
//     });
//   }
// };
