import { prepareProductionStance } from "./configs/prepareproductionstance.config";
import { assignSocketToReqIO } from "@/middlewares/socket.middleware";
import { prepareMigration } from "./utils/preparemigration.util";
import { authorizeUser } from "@/middlewares/socket.middleware";
import { throttle } from "./middlewares/throttle.middleware";
import { registerEvents } from "@/utils/registerevents.util";
import { sessionOptions } from "./configs/session.config";
import { productRoutes } from "./routes/product.route";
import unknownRoutes from "@/routes/unknown.routes";
import { swagger } from "@/configs/swagger.config";
import { toNodeHandler } from "better-auth/node";
import { logger } from "@/utils/logger.util";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
// import session from "express-session";
import { createServer } from "http";
import { Server } from "socket.io";
import { auth } from "./lib/auth";
import { config } from "dotenv";
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import { categoryRoutes } from "./routes/category.route";
import { cartRoutes } from "./routes/cart.route";
import { addonItemsRoutes } from "./routes/addonitem.route";
import { addonRoutes } from "./routes/addon.route";
config();

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT) || 3000;
// const sessionMiddleware = session(sessionOptions);
const isProduction = app.get("env") === "production";
const corsOptions: CorsOptions = {
  origin: process.env.FRONTEND_DOMAIN,
  credentials: true,
};
const io = new Server(httpServer, {
  cors: corsOptions,
});

swagger(app);
prepareProductionStance({ isProduction, app, sessionOptions });
prepareMigration(isProduction);

app.use(helmet());
io.on("connection", registerEvents);
app.use(express.static("public"));
// io.engine.use(sessionMiddleware);
app.use(assignSocketToReqIO(io));
app.use(express.static("dist"));
// app.use(sessionMiddleware);
app.use(cors(corsOptions));
app.use(cookieParser());
io.use(authorizeUser);

app.use(morgan("dev"));
app.all("/api/auth/*", toNodeHandler(auth));
app.use(express.json());

app.use(throttle("default"));
app.use("/api/product/", productRoutes);
app.use("/api/category/", categoryRoutes);
app.use("/api/addon-category/", addonRoutes);
app.use("/api/cart/", cartRoutes);
app.use("/api/addon/", addonItemsRoutes);
app.use(unknownRoutes);

httpServer.listen(port as number, () => {
  logger.info(`server is running on port: ${port}`);
  logger.info(`Docs are available at \n/api/docs and /api/docs-json`);
});
