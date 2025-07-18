"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwt = exports.generateJwt = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const generateJwt = (payload, expiresIn) => {
    return (0, jsonwebtoken_1.sign)(payload, process.env.JWT_SECRET, {
        expiresIn: expiresIn !== null && expiresIn !== void 0 ? expiresIn : 5 * 60,
    });
};
exports.generateJwt = generateJwt;
const verifyJwt = (token) => {
    return (0, jsonwebtoken_1.verify)(token, process.env.JWT_SECRET);
};
exports.verifyJwt = verifyJwt;
