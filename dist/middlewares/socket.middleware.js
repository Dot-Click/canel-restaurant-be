"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeUser = exports.assignSocketToReqIO = void 0;
const assignSocketToReqIO = (io) => {
    return (req, _, next) => {
        req.io = io;
        next();
    };
};
exports.assignSocketToReqIO = assignSocketToReqIO;
const authorizeUser = (socket, next) => {
    var _a;
    const request = socket.request;
    const passport = (_a = request.session) === null || _a === void 0 ? void 0 : _a.passport;
    (passport === null || passport === void 0 ? void 0 : passport.user) && next();
};
exports.authorizeUser = authorizeUser;
