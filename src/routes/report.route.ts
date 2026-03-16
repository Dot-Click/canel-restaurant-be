import { Router } from "express";
import { 
    getIntervalsController, 
    createIntervalController, 
    updateIntervalController, 
    deleteIntervalController 
} from "@/controllers/report.controller";
import { protectRoute } from "@/middlewares/auth.middleware";
import { checkPermission } from "@/middlewares/checkpermission.middleware";

const reportRoutes = Router();

reportRoutes.get("/intervals", protectRoute, getIntervalsController);
reportRoutes.post("/intervals", protectRoute, checkPermission("view staff"), createIntervalController);
reportRoutes.patch("/intervals/:id", protectRoute, checkPermission("view staff"), updateIntervalController);
reportRoutes.delete("/intervals/:id", protectRoute, checkPermission("view staff"), deleteIntervalController);

export { reportRoutes };
