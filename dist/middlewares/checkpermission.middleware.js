"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermission = void 0;
const checkrole_1 = require("../lib/checkrole");
const http_status_1 = require("http-status");
const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(http_status_1.status.UNAUTHORIZED).json({
                message: "Authentication error. No user found on request.",
            });
        }
        const isAllowed = (0, checkrole_1.hasPermission)(requiredPermission, user);
        if (isAllowed) {
            return next();
        }
        else {
            return res.status(http_status_1.status.FORBIDDEN).json({
                message: "You do not have permission to perform this action.",
            });
        }
    };
};
exports.checkPermission = checkPermission;
