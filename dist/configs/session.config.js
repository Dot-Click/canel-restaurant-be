"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionOptions = void 0;
exports.sessionOptions = {
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    secret: process.env.COOKIE_SECRET,
    saveUninitialized: false,
    resave: false,
};
