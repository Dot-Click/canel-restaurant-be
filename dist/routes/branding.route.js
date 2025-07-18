"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const branding_controller_1 = require("../controllers/branding.controller");
const express_1 = require("express");
const brandingRoute = (0, express_1.Router)();
brandingRoute.post("/create-branding", branding_controller_1.updateBrandingController);
exports.default = brandingRoute;
