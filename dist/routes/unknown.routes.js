"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_status_1 = __importDefault(require("http-status"));
const routes = (0, express_1.Router)();
routes.use((req, res) => {
    const isRequestSentFromAxios = req.headers["user-agent"] && req.headers.referer;
    if (isRequestSentFromAxios) {
        res.status(http_status_1.default.NOT_FOUND).json({ message: "Not Found" });
    }
    else {
        res.send(`<div style="display: flex; height: 95vh">
      <img style="margin: auto; border-radius: 2rem; height: 90vh;" src="/monkey.jpg" />
      </div>`);
    }
});
exports.default = routes;
