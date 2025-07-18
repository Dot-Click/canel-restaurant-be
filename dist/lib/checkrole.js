"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = exports.permissionValues = void 0;
exports.permissionValues = [
    "add product",
    "add category",
    "add staff",
    "add bussiness hours",
    "add branch",
    "add addon",
    "add addon item",
    "add pos",
    "view product",
    "view category",
    "view staff",
    "view bussiness hours",
    "view branch",
    "view addon",
    "view addon item",
    "view order",
    "update product",
    "update category",
    "update staff",
    "update bussiness hours",
    "update branch",
    "update addon",
    "update addon item",
    "update order",
    "delete product",
    "delete category",
    "delete staff",
    "delete bussiness hours",
    "delete branch",
    "delete addon",
    "delete addon item",
    "delete order",
];
const hasPermission = (permission, user) => {
    var _a, _b;
    if (user.role === "admin")
        return true;
    console.log((_a = user === null || user === void 0 ? void 0 : user.permissions) === null || _a === void 0 ? void 0 : _a.includes(permission));
    return (_b = user === null || user === void 0 ? void 0 : user.permissions) === null || _b === void 0 ? void 0 : _b.includes(permission);
};
exports.hasPermission = hasPermission;
