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
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareMigration = void 0;
const connection_config_1 = require("../configs/connection.config");
const logger_util_1 = require("./logger.util");
const prepareMigration = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (enableMigration = false) {
    if (!enableMigration)
        return null;
    try {
        yield (0, connection_config_1.migrateSchema)(connection_config_1.database);
        logger_util_1.logger.info("migration successful.");
    }
    catch (e) {
        const error = e;
        logger_util_1.logger.error(`migration failure: ${error.message}`);
        logger_util_1.logger.warn('make sure to run the command "npm run dbgenerate".');
    }
});
exports.prepareMigration = prepareMigration;
