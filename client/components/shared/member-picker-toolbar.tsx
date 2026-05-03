"use client";

import type { CRMUser, UserRole } from "@/types/crm";

export type MemberRoleFilter = UserRole | "ALL";

function formatRoleLabel(role: UserRole) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  roleFilter: MemberRoleFilter;
  onRoleFilterChange: (value: MemberRoleFilter) => void;
  roleOptions: UserRole[];
  className?: string;
};

export function MemberPickerToolbar({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  roleOptions,
  className = "",
}: Props) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
      <label className="relative min-w-0 flex-1 sm:min-w-[200px]">
        <span className="sr-only">Search people</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name, email, role, department…"
          className="crm-input h-10 w-full rounded-md px-3 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
        <span className="whitespace-nowrap">Filter by role</span>
        <select
          value={roleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value as MemberRoleFilter)}
          className="crm-input h-10 min-w-[148px] rounded-md px-2 text-sm"
        >
          <option value="ALL">All roles</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {formatRoleLabel(role)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function filterMembersForPicker(
  members: CRMUser[],
  opts: {
    searchQuery: string;
    roleFilter: MemberRoleFilter;
    restrictToRoles?: UserRole[] | null;
  }
): CRMUser[] {
  let list = opts.restrictToRoles?.length
    ? members.filter((m) => opts.restrictToRoles!.includes(m.role))
    : members;

  if (opts.roleFilter !== "ALL") {
    list = list.filter((m) => m.role === opts.roleFilter);
  }

  const q = opts.searchQuery.trim().toLowerCase();
  if (!q) {
    return list;
  }

  return list.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      (m.email?.toLowerCase().includes(q) ?? false) ||
      m.role.toLowerCase().includes(q) ||
      (m.department?.name?.toLowerCase().includes(q) ?? false) ||
      (m.designation?.toLowerCase().includes(q) ?? false)
  );
}

export function sortedUniqueRoles(members: CRMUser[]): UserRole[] {
  const set = new Set<UserRole>();
  for (const m of members) {
    set.add(m.role);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
