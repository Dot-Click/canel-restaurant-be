"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFormFields = void 0;
const extractFormFields = (fields) => {
    const entries = Object.entries(fields);
    const from = entries.map(([key, value]) => [key, value[0]]);
    const data = Object.fromEntries(from);
    return data;
};
exports.extractFormFields = extractFormFields;
