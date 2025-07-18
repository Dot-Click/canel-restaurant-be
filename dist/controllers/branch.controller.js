"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAreasForCityController = exports.fetchCitiesController = exports.removeBranchController = exports.updateBranchController = exports.fetchSingleBranchController = exports.fetchAllBranchesController = exports.addBranchController = void 0;
const connection_config_1 = require("../configs/connection.config");
const schema_1 = require("../schema/schema");
const drizzle_orm_1 = require("drizzle-orm");
const http_status_1 = require("http-status");
const logger_util_1 = require("../utils/logger.util");
const zod_1 = require("zod");
const apiBranchAddPayloadSchema = schema_1.branchInsertSchema
    .omit({ cityId: true })
    .extend({
    cityName: zod_1.z.string({ required_error: "City name is required." }).min(1),
    areas: zod_1.z.array(zod_1.z.string()).optional(),
    email: zod_1.z.string().email("Invalid email format.").optional(),
});
const apiBranchUpdatePayloadSchema = schema_1.branchInsertSchema.partial().extend({
    areas: zod_1.z.array(zod_1.z.string()).optional(),
    email: zod_1.z.string().email("Invalid email format.").optional(),
    name: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    phoneNumber: zod_1.z.string().optional(),
    operatingHours: zod_1.z.string().optional(),
    status: zod_1.z.enum(["open", "closed"]).optional(),
    cityId: zod_1.z.string().optional(),
    manager: zod_1.z.string().optional(),
});
const addBranchController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validation = apiBranchAddPayloadSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(http_status_1.status.UNPROCESSABLE_ENTITY).json({
                message: "Validation error",
                error: validation.error.format(),
            });
        }
        console.log("Hello");
        const _a = validation.data, { cityName } = _a, branchData = __rest(_a, ["cityName"]);
        const newBranch = yield connection_config_1.database.transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            let existingCity = yield tx.query.city.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.city.name, cityName),
            });
            let cityId;
            if (existingCity) {
                cityId = existingCity.id;
            }
            else {
                const [newCity] = yield tx
                    .insert(schema_1.city)
                    .values({ name: cityName })
                    .returning();
                cityId = newCity.id;
            }
            const finalPayload = Object.assign(Object.assign({}, branchData), { cityId: cityId });
            const [insertedBranch] = yield tx
                .insert(schema_1.branch)
                .values(finalPayload)
                .returning({ id: schema_1.branch.id });
            return insertedBranch;
        }));
        return res.status(http_status_1.status.CREATED).json({
            message: "Branch added successfully",
            data: newBranch,
        });
    }
    catch (error) {
        logger_util_1.logger.error("Error adding branch:", error);
        if (error instanceof Error &&
            error.message.includes("branch_manager_unique")) {
            return res
                .status(http_status_1.status.CONFLICT)
                .json({ message: "This user is already managing another branch." });
        }
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: "Could not add branch." });
    }
});
exports.addBranchController = addBranchController;
const fetchAllBranchesController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branches = yield connection_config_1.database.query.branch.findMany({
            with: {
                city: true,
                manager: { columns: { id: true, fullName: true, email: true } },
            },
            orderBy: (branch, { asc }) => [asc(branch.name)],
        });
        return res
            .status(http_status_1.status.OK)
            .json({ message: "Branches fetched successfully", data: branches });
    }
    catch (error) {
        logger_util_1.logger.error("Error fetching branches:", error);
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: "Could not fetch branches." });
    }
});
exports.fetchAllBranchesController = fetchAllBranchesController;
const fetchSingleBranchController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const singleBranch = yield connection_config_1.database.query.branch.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.branch.id, id),
            with: {
                city: true,
                manager: { columns: { id: true, fullName: true, email: true } },
            },
        });
        if (!singleBranch) {
            return res.status(http_status_1.status.NOT_FOUND).json({ message: "Branch not found" });
        }
        return res
            .status(http_status_1.status.OK)
            .json({ message: "Branch fetched successfully", data: singleBranch });
    }
    catch (error) {
        logger_util_1.logger.error("Error fetching single branch:", error);
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: "Could not fetch branch." });
    }
});
exports.fetchSingleBranchController = fetchSingleBranchController;
const updateBranchController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const validation = apiBranchUpdatePayloadSchema.safeParse(req.body);
        console.log("THis is req.boyd", req.body);
        if (!validation.success) {
            return res.status(http_status_1.status.UNPROCESSABLE_ENTITY).json({
                message: "Validation error",
                error: validation.error.format(),
            });
        }
        if (Object.keys(validation.data).length === 0) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "No fields to update provided." });
        }
        console.log("This is validation data", validation.data);
        const [updatedBranch] = yield connection_config_1.database
            .update(schema_1.branch)
            .set(validation.data)
            .where((0, drizzle_orm_1.eq)(schema_1.branch.id, id))
            .returning();
        if (!updatedBranch) {
            return res.status(http_status_1.status.NOT_FOUND).json({ message: "Branch not found" });
        }
        return res
            .status(http_status_1.status.OK)
            .json({ message: "Branch updated successfully", data: updatedBranch });
    }
    catch (error) {
        logger_util_1.logger.error("Error updating branch:", error);
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: "Could not update branch." });
    }
});
exports.updateBranchController = updateBranchController;
const removeBranchController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const [deletedBranch] = yield connection_config_1.database
            .delete(schema_1.branch)
            .where((0, drizzle_orm_1.eq)(schema_1.branch.id, id))
            .returning();
        if (!deletedBranch) {
            return res.status(http_status_1.status.NOT_FOUND).json({ message: "Branch not found" });
        }
        return res
            .status(http_status_1.status.OK)
            .json({ message: "Branch removed successfully" });
    }
    catch (error) {
        logger_util_1.logger.error("Error removing branch:", error);
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: "Could not remove branch." });
    }
});
exports.removeBranchController = removeBranchController;
const fetchCitiesController = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allCities = yield connection_config_1.database.select().from(schema_1.city).orderBy(schema_1.city.name);
        return res
            .status(http_status_1.status.OK)
            .json({ message: "Cities fetched successfully", data: allCities });
    }
    catch (error) {
        logger_util_1.logger.error("Error fetching cities:", error);
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: "Could not fetch cities." });
    }
});
exports.fetchCitiesController = fetchCitiesController;
const fetchAreasForCityController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cityName } = req.params;
        if (!cityName) {
            return res
                .status(http_status_1.status.BAD_REQUEST)
                .json({ message: "City name is required." });
        }
        const cityRecord = yield connection_config_1.database.query.city.findFirst({
            where: (0, drizzle_orm_1.ilike)(schema_1.city.name, cityName),
            columns: { id: true },
        });
        console.log(cityRecord);
        if (!cityRecord) {
            return res.status(http_status_1.status.NOT_FOUND).json({
                message: `City '${cityName}' not found.`,
            });
        }
        const branchesInCity = yield connection_config_1.database.query.branch.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.branch.cityId, cityRecord.id),
            columns: {
                areas: true,
            },
        });
        const allAreas = branchesInCity.flatMap((b) => b.areas || []);
        const uniqueAreas = [...new Set(allAreas)];
        uniqueAreas.sort();
        return res.status(http_status_1.status.OK).json({
            message: `Areas for ${cityName} fetched successfully`,
            data: uniqueAreas,
        });
    }
    catch (error) {
        logger_util_1.logger.error(`Error fetching areas for city:`, error);
        return res
            .status(http_status_1.status.INTERNAL_SERVER_ERROR)
            .json({ message: "Could not fetch areas." });
    }
});
exports.fetchAreasForCityController = fetchAreasForCityController;
