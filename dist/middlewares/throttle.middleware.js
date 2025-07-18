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
exports.throttle = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const connection_config_1 = require("../configs/connection.config");
const schema_1 = require("../schema/schema");
const http_status_1 = require("http-status");
const options = {
    dbName: process.env.database,
    storeClient: connection_config_1.connection,
    tableName: "throttle",
    blockDuration: 10,
    storeType: "pg",
    keyPrefix: "",
    duration: 60,
    points: 50,
};
const throttle = (overRideOptions) => {
    const limiter = new rate_limiter_flexible_1.RateLimiterPostgres(Object.assign(Object.assign({}, options), (overRideOptions === "default"
        ? {}
        : Object.assign(Object.assign({}, overRideOptions), { insuranceLimiter: new rate_limiter_flexible_1.RateLimiterMemory({
                blockDuration: overRideOptions.blockDuration,
                keyPrefix: overRideOptions.keyPrefix,
                duration: overRideOptions.duration,
                points: overRideOptions.points,
            }) }))));
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield limiter.consume(req.ip);
            next();
        }
        catch (error) {
            const afterConsumption = yield limiter.get(req.ip);
            if (afterConsumption) {
                const { msBeforeNext, consumedPoints, remainingPoints, isFirstInDuration, } = afterConsumption;
                const values = {
                    msBeforeNext,
                    consumedPoints,
                    remainingPoints,
                    isFirstInDuration,
                    endPoint: req.path,
                    waitTime: msBeforeNext / 1000,
                };
                yield connection_config_1.database
                    .insert(schema_1.throttleinsight)
                    .values(Object.assign({ key: req.ip, pointsAllotted: limiter.duration }, values))
                    .onConflictDoUpdate({
                    target: schema_1.throttleinsight.key,
                    set: values,
                });
            }
            const customErrorMessage = overRideOptions &&
                typeof overRideOptions === "object" &&
                "errorMessage" in overRideOptions
                ? overRideOptions === null || overRideOptions === void 0 ? void 0 : overRideOptions.errorMessage
                : undefined;
            res
                .status(http_status_1.status.TOO_MANY_REQUESTS)
                .json({ message: customErrorMessage !== null && customErrorMessage !== void 0 ? customErrorMessage : "Too many requests" });
        }
    });
};
exports.throttle = throttle;
