"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareProductionStance = void 0;
const prepareProductionStance = ({ app, isProduction, sessionOptions, }) => {
    if (isProduction) {
        app.set("trust proxy", 1);
        sessionOptions.cookie.secure = true;
        sessionOptions.cookie.sameSite = "none";
    }
};
exports.prepareProductionStance = prepareProductionStance;
