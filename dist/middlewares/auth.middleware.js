"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureAuthenticated = exports.getCurrentUserId = exports.protectRoute = void 0;
const auth_1 = require("../lib/auth");
const protectRoute = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const headers = new Headers(req.headers);
        const session = yield auth_1.auth.api.getSession({ headers });
        if (!session || !session.user) {
            return res.status(401).json({
                error: "UNAUTHORIZED",
                message: "You must be logged in to access this resource.",
            });
        }
        req.user = session.user;
        next();
    }
    catch (error) {
        console.error("Session validation error:", error);
        return res.status(401).json({
            error: "SESSION_VALIDATION_ERROR",
            message: "Failed to validate session",
        });
    }
});
exports.protectRoute = protectRoute;
const getCurrentUserId = (req) => {
    var _a;
    return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null;
};
exports.getCurrentUserId = getCurrentUserId;
const ensureAuthenticated = (req) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const headers = new Headers(req.headers);
        const session = yield auth_1.auth.api.getSession({ headers });
        return !!(session && session.user);
    }
    catch (error) {
        return false;
    }
});
exports.ensureAuthenticated = ensureAuthenticated;
