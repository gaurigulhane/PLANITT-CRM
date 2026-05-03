import type { CRMUser, UserRole } from "@/types/crm";

export function isAdminRole(role: UserRole) {
  return role === "SUPERADMIN" || role === "ADMIN" || role === "MANAGER";
}

/** Roles that can appear in task assignee pickers for the acting user. */
export function getTaskAssignableRoles(actorRole: UserRole): UserRole[] {
  if (actorRole === "SUPERADMIN") {
    return ["SUPERADMIN", "ADMIN", "MANAGER", "EMPLOYEE", "INTERN"];
  }
  return ["EMPLOYEE", "INTERN"];
}

export function getRoleLabel(user: CRMUser) {
  return user.role.toLowerCase();
}
