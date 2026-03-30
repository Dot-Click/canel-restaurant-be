import type { users } from "@/schema/schema";

export type Permissions =
  | "add product"
  | "add category"
  | "add staff"
  | "add bussiness hours"
  | "add branch"
  | "add addon"
  | "add addon item"
  | "add order"
  | "add pos"
  //
  | "view product"
  | "view category"
  | "view staff"
  | "view bussiness hours"
  | "view branch"
  | "view addon"
  | "view addon item"
  | "view order"
  //
  | "update product"
  | "update category"
  | "update staff"
  | "update bussiness hours"
  | "update branch"
  | "update addon"
  | "update addon item"
  | "update order"
  //
  | "delete product"
  | "delete category"
  | "delete staff"
  | "delete bussiness hours"
  | "delete branch"
  | "delete addon"
  | "delete addon item"
  | "delete order";

export const permissionValues = [
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
] as const;

type User = typeof users.$inferSelect;

export const hasPermission = (permission: Permissions, user: User) => {
  if (user.role === "admin") return true;

  const userRole = user.role?.toLowerCase();

  // Subadmin: Full visibility only
  if (userRole === "subadmin") {
    if (permission.startsWith("view")) return true;
    return false;
  }

  // Manager: View everything + specific updates
  if (userRole === "manager") {
    if (permission.startsWith("view")) return true;
    if (permission === "update order") return true;
    if (permission === "update product") return true; // logic in controller will restrict fields
    return false;
  }

  // Marketing: Product management visibility and updates
  if (userRole === "marketing") {
    if (permission.startsWith("view")) return true;
    if (permission.includes("product") && (permission.startsWith("view") || permission.startsWith("update"))) return true;
    return false;
  }

  return user?.permissions?.includes(permission);
};

// in add product.controller.ts
// const testPermission = hasPermission("add product", "" as any);

// if(!testPermission){
//     return res.json({message: "you donot have permission to perform this action."})
// }
