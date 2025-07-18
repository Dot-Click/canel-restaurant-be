"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const drizzle_1 = require("better-auth/adapters/drizzle");
const connection_config_1 = require("../configs/connection.config");
const better_auth_1 = require("better-auth");
const env_utils_1 = require("../utils/env.utils");
const plugins_1 = require("better-auth/plugins");
const schema = __importStar(require("../schema/schema"));
const permissions_1 = require("./permissions");
const dotenv_1 = __importDefault(require("dotenv"));
const brevo_config_1 = require("../configs/brevo.config");
const brevo_1 = require("../utils/brevo");
dotenv_1.default.config();
const isProduction = process.env.NODE_ENV === "production";
exports.auth = (0, better_auth_1.betterAuth)({
    database: (0, drizzle_1.drizzleAdapter)(connection_config_1.database, {
        provider: "pg",
        schema,
    }),
    trustedOrigins: [process.env.FRONTEND_DOMAIN || "http://localhost:5000"],
    secret: env_utils_1.env.COOKIE_SECRET,
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
        },
    },
    advanced: {
        useSecureCookies: isProduction,
        cookies: {
            session_token: {
                attributes: {
                    sameSite: isProduction ? "none" : "lax",
                    httpOnly: isProduction,
                    secure: isProduction,
                },
            },
        },
    },
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            prompt: "select_account",
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            enabled: true,
        },
    },
    plugins: [
        (0, plugins_1.admin)({
            ac: permissions_1.ac,
            roles: {
                admin: permissions_1.admin,
                manager: permissions_1.manager,
                rider: permissions_1.rider,
            },
        }),
        (0, plugins_1.emailOTP)({
            sendVerificationOTP(_a) {
                return __awaiter(this, arguments, void 0, function* ({ email, otp }) {
                    try {
                        yield brevo_config_1.brevoTransactionApi.sendTransacEmail({
                            subject: "Welcome! Please Verify Your Email",
                            htmlContent: (0, brevo_1.signupTemplate)({
                                verificationCode: otp,
                                userName: email.split("@")[0],
                                email: email,
                            }),
                            sender: {
                                email: process.env.BREVO_SENDER_EMAIL,
                                name: "Canel Restaurant",
                            },
                            to: [{ email, name: email.split("@")[0] }],
                            replyTo: {
                                email: process.env.BREVO_SENDER_EMAIL,
                                name: "Canel Restaurant",
                            },
                        });
                    }
                    catch (error) {
                        console.error("Failed to send verification email:", error);
                        throw new Error("Failed to send verification email.");
                    }
                });
            },
        }),
        (0, plugins_1.phoneNumber)({
            sendOTP(_a) {
                return __awaiter(this, arguments, void 0, function* ({ phoneNumber, code }) {
                    try {
                        console.log(`Sending OTP ${code} to phone number ${phoneNumber}`);
                        yield brevo_config_1.brevoSmsApi.sendTransacSms({
                            sender: process.env.BREVO_SMS_SENDER,
                            recipient: phoneNumber,
                            content: `Your Canel Restaurant verification code is: ${code}`,
                        });
                        console.log("Successfully sent phone number OTP.");
                    }
                    catch (error) {
                        console.error("Failed to send phone number OTP:", error);
                        throw new Error("Failed to send phone number OTP.");
                    }
                });
            },
        }),
    ],
    user: {
        modelName: "users",
        fields: {
            image: "profilePic",
            name: "fullName",
        },
        additionalFields: {
            permissions: {
                type: "string[]",
                fieldName: "permissions",
            },
        },
    },
});
