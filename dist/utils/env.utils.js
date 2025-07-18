"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const logger_util_1 = require("./logger.util");
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
(0, dotenv_1.config)();
const schemaObject = zod_1.z.object({
    UPSTASH_REDIS_REST_TOKEN: zod_1.z.string(),
    UPSTASH_REDIS_REST_URL: zod_1.z.string(),
    BETTER_AUTH_SECRET: zod_1.z.string(),
    CLOUDINARY_API_KEY: zod_1.z.string(),
    BETTER_AUTH_URL: zod_1.z.string(),
    FRONTEND_DOMAIN: zod_1.z.string(),
    CONNECTION_URL: zod_1.z.string(),
    BACKEND_DOMAIN: zod_1.z.string(),
    COOKIE_SECRET: zod_1.z.string(),
    JWT_SECRET: zod_1.z.string(),
    database: zod_1.z.string(),
});
const envSchema = schemaObject.safeParse(process.env);
if (!envSchema.success) {
    const message = `Invalid environment variables: ${JSON.stringify(envSchema.error.format(), null, 4)}`;
    logger_util_1.logger.error(message);
    throw new Error(message);
}
exports.env = envSchema.data;
