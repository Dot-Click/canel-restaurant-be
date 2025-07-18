"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swagger = exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const dotenv_1 = require("dotenv");
const path_1 = __importDefault(require("path"));
(0, dotenv_1.config)();
const route = (routeFile) => path_1.default.join("./src/routes/", routeFile);
const options = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "NodeJS Starter",
            version: "1.0.0",
            description: "NodeJS starter with Better-Auth.",
        },
        basePath: "localhost:3000/",
        host: "localhost",
        consumes: ["application/json"],
        produces: ["application/json"],
        tags: [{ name: "Authentication" }],
    },
    apis: [route("auth.routes.ts"), route("example.routes.ts")],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
const swagger = (app) => {
    app.use("/api/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(exports.swaggerSpec));
    app.get("/api/docs-json", (_, res) => {
        res.send(exports.swaggerSpec);
    });
};
exports.swagger = swagger;
