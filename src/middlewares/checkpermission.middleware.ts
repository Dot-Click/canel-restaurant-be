import { type Request, type Response, type NextFunction } from "express";
import { hasPermission, type Permissions } from "@/lib/checkrole";
import { status } from "http-status";

export const checkPermission = (requiredPermission: Permissions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(status.UNAUTHORIZED).json({
        message: "Authentication error. No user found on request.",
      });
    }

    const isAllowed = hasPermission(requiredPermission, user);

    if (isAllowed) {
      return next();
    } else {
      return res.status(status.FORBIDDEN).json({
        message: "You do not have permission to perform this action.",
      });
    }
  };
};
