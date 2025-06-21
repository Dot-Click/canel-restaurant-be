import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

export const statement = {
  ...defaultStatements,
  project: ["create", "share", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
  project: ["create", "update"],
  ...adminAc.statements,
});

export const manager = ac.newRole({
  project: ["create", "share", "update", "delete"],
});

export const subadmin = ac.newRole({
  project: ["create", "share", "update", "delete"],
});

export const rider = ac.newRole({
  project: ["create", "share", "update", "delete"],
});
