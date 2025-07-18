"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prepareproductionstance_config_1 = require("./configs/prepareproductionstance.config");
const socket_middleware_1 = require("./middlewares/socket.middleware");
const preparemigration_util_1 = require("./utils/preparemigration.util");
const socket_middleware_2 = require("./middlewares/socket.middleware");
const registerevents_util_1 = require("./utils/registerevents.util");
const session_config_1 = require("./configs/session.config");
const product_route_1 = require("./routes/product.route");
const unknown_routes_1 = __importDefault(require("./routes/unknown.routes"));
const swagger_config_1 = require("./configs/swagger.config");
const node_1 = require("better-auth/node");
const logger_util_1 = require("./utils/logger.util");
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const auth_1 = require("./lib/auth");
const dotenv_1 = require("dotenv");
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const category_route_1 = require("./routes/category.route");
const cart_route_1 = require("./routes/cart.route");
const addonitem_route_1 = require("./routes/addonitem.route");
const addon_route_1 = require("./routes/addon.route");
const order_route_1 = require("./routes/order.route");
const branch_route_1 = __importDefault(require("./routes/branch.route"));
const branding_route_1 = __importDefault(require("./routes/branding.route"));
const schedule_route_1 = require("./routes/schedule.route");
const user_route_1 = require("./routes/user.route");
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const port = Number(process.env.PORT) || 3000;
console.log("[SERVER STARTUP] FRONTEND_DOMAIN is:", process.env.FRONTEND_DOMAIN);
const isProduction = app.get("env") === "production";
const corsOptions = {
    origin: process.env.FRONTEND_DOMAIN,
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use((req, _res, next) => {
    console.log(`[INCOMING REQUEST]: Method: ${req.method}, URL: ${req.originalUrl}`);
    next();
});
const io = new socket_io_1.Server(httpServer, {
    cors: corsOptions,
});
(0, swagger_config_1.swagger)(app);
(0, prepareproductionstance_config_1.prepareProductionStance)({ isProduction, app, sessionOptions: session_config_1.sessionOptions });
(0, preparemigration_util_1.prepareMigration)(isProduction);
app.use((0, helmet_1.default)());
io.on("connection", registerevents_util_1.registerEvents);
app.use(express_1.default.static("public"));
app.use((0, socket_middleware_1.assignSocketToReqIO)(io));
app.use(express_1.default.static("dist"));
app.use((0, cookie_parser_1.default)());
io.use(socket_middleware_2.authorizeUser);
app.use((0, morgan_1.default)("dev"));
app.all("/api/auth/*splat", (0, node_1.toNodeHandler)(auth_1.auth));
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.status(200).json({
        status: "online",
        message: "Welcome to the Canel Restaurant API!",
    });
});
app.use("/api/product/", product_route_1.productRoutes);
app.use("/api/category/", category_route_1.categoryRoutes);
app.use("/api/order/", order_route_1.orderRoutes);
app.use("/api/branch/", branch_route_1.default);
app.use("/api/addon-category/", addon_route_1.addonRoutes);
app.use("/api/cart/", cart_route_1.cartRoutes);
app.use("/api/addon/", addonitem_route_1.addonItemsRoutes);
app.use("/api/branding/", branding_route_1.default);
app.use("/api/schedule/", schedule_route_1.scheduleRoute);
app.use("/api/users/", user_route_1.userRoute);
app.use(unknown_routes_1.default);
httpServer.listen(port, () => {
    logger_util_1.logger.info(`server is running on port: ${port}`);
    logger_util_1.logger.info(`Docs are available at \n/api/docs and /api/docs-json`);
});
