"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { renderSessionGate } from "@/components/shared/session-gate";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useSession } from "@/hooks/use-session";
import { apiGet, apiPost, apiPostForm, apiPut } from "@/lib/api";
import type { BulkUserUploadResult, CRMUser, Department, UserRole } from "@/types/crm";

type PaginatedResponse<T> = { items: T[]; total: number; hasMore: boolean; nextOffset: number };

const baseRoles: UserRole[] = ["EMPLOYEE", "INTERN", "MANAGER", "ADMIN"];
const bulkUploadTemplate = [
  "name,email,password,role,designation,department,managerEmail",
  "Aarav Sharma,aarav@planitt.com,TempPass@123,EMPLOYEE,Frontend Engineer,Engineering,manager@planitt.com",
  "Meera Singh,meera@planitt.com,TempPass@123,INTERN,Design Intern,Design,manager@planitt.com",
].join("\n");

function Surface({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 ${className}`}
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-soft)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function StatusBanner({ message, variant }: { message: string; variant: "success" | "error" }) {
  const isError = variant === "error";
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium sm:px-5"
      style={{
        borderColor: isError ? "rgba(225,29,72,0.35)" : "rgba(16,185,129,0.35)",
        background: isError ? "rgba(225,29,72,0.06)" : "rgba(16,185,129,0.08)",
        color: isError ? "#be123c" : "#047857",
      }}
    >
      <span className="mt-0.5 shrink-0 text-base" aria-hidden>
        {isError ? "!" : "✓"}
      </span>
      <span>{message}</span>
    </div>
  );
}

export default function EmployeesPage() {
  const { user, loading: sessionLoading, error: sessionError, retry: retrySession } = useSession({
    allowedRoles: ["SUPERADMIN", "ADMIN", "MANAGER"],
  });
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [allUsers, setAllUsers] = useState<CRMUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as UserRole,
    designation: "",
    departmentId: "",
    managerId: "",
  });
  const [creating, setCreating] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUserUploadResult | null>(null);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [nextUserOffset, setNextUserOffset] = useState(0);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [emailUpdatingId, setEmailUpdatingId] = useState("");
  const availableRoles: UserRole[] =
    user?.role === "SUPERADMIN" ? ["SUPERADMIN", ...baseRoles] : baseRoles;

  const fieldStyle = {
    borderColor: "var(--border)",
    background: "var(--surface-soft)",
    color: "var(--text-main)",
  } as const;

  const loadTeam = async (append = false) => {
    const offset = append ? nextUserOffset : 0;
    const [membersPage, allMembers, departmentData] = await Promise.all([
      apiGet<PaginatedResponse<CRMUser>>(`/users?paginate=true&limit=25&offset=${offset}`),
      apiGet<CRMUser[]>("/users"),
      apiGet<Department[]>("/departments"),
    ]);
    setUsers((current) => (append ? [...current, ...membersPage.items] : membersPage.items));
    setAllUsers(allMembers);
    setHasMoreUsers(membersPage.hasMore);
    setNextUserOffset(membersPage.nextOffset);
    setDepartments(departmentData);
    setEmailDrafts(
      allMembers.reduce<Record<string, string>>((acc, member) => {
        acc[member.id] = member.email;
        return acc;
      }, {})
    );
  };

  useEffect(() => {
    async function fetchUsers() {
      try {
        await loadTeam();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load employees");
      } finally {
        setDataLoading(false);
      }
    }

    if (user) {
      void fetchUsers();
    }
  }, [user]);

  useRealtimeRefresh(user, ["org:updated"], async () => {
    await loadTeam();
  });

  const createEmployee = async () => {
    if (!user) {
      return;
    }

    try {
      setCreating(true);
      setError("");
      setNotice("");
      await apiPost("/users", { ...form });
      setForm({
        name: "",
        email: "",
        password: "",
        role: "EMPLOYEE",
        designation: "",
        departmentId: "",
        managerId: "",
      });
      setNotice("Team member created successfully.");
      await loadTeam(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team member");
    } finally {
      setCreating(false);
    }
  };

  const downloadBulkTemplate = () => {
    const blob = new Blob([bulkUploadTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "team-bulk-upload-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetBulkFileInput = () => {
    setBulkFile(null);
    if (bulkInputRef.current) {
      bulkInputRef.current.value = "";
    }
  };

  const uploadBulkUsers = async () => {
    if (!bulkFile) {
      setError("Choose a CSV file before uploading.");
      return;
    }

    try {
      setBulkUploading(true);
      setError("");
      setNotice("");
      setBulkResult(null);
      const formData = new FormData();
      formData.append("file", bulkFile);
      const result = await apiPostForm<BulkUserUploadResult>("/users/bulk-upload", formData);
      setBulkResult(result);
      setNotice(
        result.failedCount
          ? `Created ${result.createdCount} members. ${result.failedCount} rows need attention.`
          : `Created ${result.createdCount} team members successfully.`
      );
      resetBulkFileInput();
      await loadTeam(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to bulk upload team members");
    } finally {
      setBulkUploading(false);
    }
  };

  const assignEmployee = async (
    member: CRMUser,
    field: "managerId" | "departmentId" | "role",
    value: string
  ) => {
    try {
      setUpdatingId(member.id);
      setError("");
      setNotice("");
      const body: Record<string, string> = {
        designation: member.designation ?? "",
      };
      if (field === "role") {
        body.role = value;
      }
      if (field === "departmentId") {
        body.departmentId = value;
      }
      if (field === "managerId") {
        body.managerId = value;
      }
      await apiPut(`/users/${member.id}/assignment`, body);
      await loadTeam(false);
      setNotice("Assignment updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignment");
    } finally {
      setUpdatingId("");
    }
  };

  const updateMemberEmail = async (member: CRMUser) => {
    const nextEmail = emailDrafts[member.id]?.trim();
    if (!nextEmail || nextEmail === member.email) {
      return;
    }

    try {
      setEmailUpdatingId(member.id);
      setError("");
      setNotice("");
      await apiPut(`/users/${member.id}/profile`, {
        email: nextEmail,
      });
      await loadTeam(false);
      setNotice("Email updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email");
    } finally {
      setEmailUpdatingId("");
    }
  };

  const managers = allUsers.filter((member) =>
    ["SUPERADMIN", "ADMIN", "MANAGER"].includes(member.role)
  );
  const peopleAnalytics = useMemo(() => {
    const total = allUsers.length;
    const employees = allUsers.filter((member) => member.role === "EMPLOYEE").length;
    const interns = allUsers.filter((member) => member.role === "INTERN").length;
    const leadership = allUsers.filter((member) => ["SUPERADMIN", "ADMIN", "MANAGER"].includes(member.role)).length;
    const assignedDepartment = allUsers.filter((member) => Boolean(member.department?.id)).length;
    const departmentCoverage = total ? Math.round((assignedDepartment / total) * 100) : 0;
    return { total, employees, interns, leadership, departmentCoverage };
  }, [allUsers]);

  const hasAssignedLeadershipLinks = (member: CRMUser) => {
    if (!["EMPLOYEE", "INTERN"].includes(member.role)) {
      return false;
    }
    return member.manager?.role === "ADMIN" || member.manager?.role === "MANAGER";
  };

  const canEditDirectory = user?.role === "SUPERADMIN" || user?.role === "ADMIN";
  const canCreateUsers = user?.role === "SUPERADMIN" || user?.role === "ADMIN";

  const sessionGate = renderSessionGate({
    loading: sessionLoading,
    user,
    error: sessionError,
    retry: retrySession,
    loadingTitle: "Loading team workspace",
    loadingDescription: "Fetching access and employee data.",
  });
  if (sessionGate) {
    return sessionGate;
  }

  if (!user) {
    return null;
  }

  return (
    <CRMShell user={user}>
      <div className="mx-auto max-w-6xl space-y-5 pb-8">
        <Surface
          className="relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--surface) 88%, var(--accent-strong)), var(--surface))",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
            Team control
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-main)] sm:text-3xl">
            Employees & interns
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-soft)]">
            Create members, assign departments, and connect people to their reporting managers. Edits save
            immediately.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
            {[
              { label: "Total members", value: peopleAnalytics.total },
              { label: "Employees", value: peopleAnalytics.employees },
              { label: "Interns", value: peopleAnalytics.interns },
              { label: "Leadership", value: peopleAnalytics.leadership },
              { label: "Dept coverage", value: `${peopleAnalytics.departmentCoverage}%` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3"
                style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 70%, white)" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)] sm:text-[11px]">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--text-main)] sm:text-xl">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Surface>

        {error ? <StatusBanner variant="error" message={error} /> : null}
        {notice ? <StatusBanner variant="success" message={notice} /> : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)] xl:items-start xl:gap-6">
          <div className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-4">
            <Surface>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                    Create team member
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-[var(--text-main)] sm:text-xl">
                    Add employee or intern
                  </h2>
                </div>
                {canCreateUsers ? (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white sm:text-xs"
                    style={{ background: "var(--accent-strong)" }}
                  >
                    Admin only
                  </span>
                ) : null}
              </div>

              {user.role === "MANAGER" ? (
                <div
                  className="mt-5 rounded-2xl border border-dashed p-4 text-sm leading-relaxed"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-soft)",
                    color: "var(--text-soft)",
                  }}
                >
                  Managers can view their team here. Only admins and the CEO can create accounts or run bulk
                  import.
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-3">
                  <input
                    className="h-11 w-full min-w-0 rounded-xl border px-3 text-sm outline-none sm:h-12 sm:rounded-2xl sm:px-4"
                    style={fieldStyle}
                    placeholder="Full name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                  <input
                    className="h-11 w-full min-w-0 rounded-xl border px-3 text-sm outline-none sm:h-12 sm:rounded-2xl sm:px-4"
                    style={fieldStyle}
                    placeholder="Work email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                  <input
                    className="h-11 w-full min-w-0 rounded-xl border px-3 text-sm outline-none sm:h-12 sm:rounded-2xl sm:px-4"
                    style={fieldStyle}
                    placeholder="Temporary password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                  <select
                    className="h-11 w-full min-w-0 rounded-xl border px-3 text-sm outline-none sm:h-12 sm:rounded-2xl sm:px-4"
                    style={fieldStyle}
                    value={form.role}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, role: event.target.value as UserRole }))
                    }
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <input
                    className="h-11 w-full min-w-0 rounded-xl border px-3 text-sm outline-none sm:h-12 sm:rounded-2xl sm:px-4"
                    style={fieldStyle}
                    placeholder="Designation"
                    value={form.designation}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, designation: event.target.value }))
                    }
                  />
                  <select
                    className="h-11 w-full min-w-0 rounded-xl border px-3 text-sm outline-none sm:h-12 sm:rounded-2xl sm:px-4"
                    style={fieldStyle}
                    value={form.departmentId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, departmentId: event.target.value }))
                    }
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-11 w-full min-w-0 rounded-xl border px-3 text-sm outline-none sm:h-12 sm:rounded-2xl sm:px-4"
                    style={fieldStyle}
                    value={form.managerId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, managerId: event.target.value }))
                    }
                  >
                    <option value="">Select manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name} — {manager.role}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => void createEmployee()}
                    className="h-11 w-full rounded-xl text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-wait disabled:opacity-70 sm:h-12 sm:rounded-2xl"
                    style={{ background: "var(--accent-strong)" }}
                  >
                    {creating ? "Creating…" : "Create team member"}
                  </button>

                  <div
                    className="mt-2 rounded-2xl border p-4 sm:rounded-3xl sm:p-5"
                    style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                          Bulk upload
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-[var(--text-main)] sm:text-lg">
                          Import from CSV
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-[var(--text-soft)] sm:text-sm">
                          Roles in CSV must be <code className="rounded bg-black/5 px-1">EMPLOYEE</code> or{" "}
                          <code className="rounded bg-black/5 px-1">INTERN</code>.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={downloadBulkTemplate}
                        className="shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold sm:text-sm"
                        style={{ borderColor: "var(--border)", color: "var(--text-main)" }}
                      >
                        Sample CSV
                      </button>
                    </div>

                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[var(--accent-strong)]">
                        View column format
                      </summary>
                      <pre className="mt-2 max-h-40 overflow-auto rounded-xl border p-3 text-[10px] leading-relaxed text-[var(--text-soft)] sm:text-xs">
                        {bulkUploadTemplate}
                      </pre>
                    </details>

                    <label
                      className="mt-4 flex cursor-pointer flex-col gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition hover:border-blue-400/50 sm:rounded-2xl"
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const file = event.dataTransfer.files?.[0];
                        if (file && (file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv"))) {
                          setBulkFile(file);
                        } else if (event.dataTransfer.files?.[0]) {
                          setError("Please drop a .csv file.");
                        }
                      }}
                    >
                      <span className="text-sm font-semibold text-[var(--text-main)]">Drop a file or browse</span>
                      <span className="text-xs text-[var(--text-soft)]">
                        {bulkFile ? bulkFile.name : "No file selected — .csv up to 2MB"}
                      </span>
                      <input
                        ref={bulkInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="sr-only"
                        onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={bulkUploading || !bulkFile}
                      onClick={() => void uploadBulkUsers()}
                      className="mt-3 h-11 w-full rounded-xl text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-2xl"
                      style={{ background: "var(--accent-strong)" }}
                    >
                      {bulkUploading ? "Uploading…" : "Upload CSV"}
                    </button>

                    {bulkResult ? (
                      <div
                        className="mt-4 rounded-xl border p-3 text-sm"
                        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                      >
                        <p className="font-semibold text-[var(--text-main)]">
                          {bulkResult.createdCount} created · {bulkResult.failedCount} failed
                        </p>
                        {bulkResult.errors.length ? (
                          <ul className="mt-2 max-h-36 list-inside list-disc space-y-1 overflow-y-auto text-xs text-rose-600">
                            {bulkResult.errors.slice(0, 8).map((item) => (
                              <li key={`${item.row}-${item.email ?? "row"}`}>
                                Row {item.row}
                                {item.email ? ` (${item.email})` : ""}: {item.message}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </Surface>
          </div>

          <Surface className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                  Directory
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text-main)] sm:text-xl">Current team</h2>
              </div>
              <span className="text-sm text-[var(--text-soft)]">{users.length} shown</span>
            </div>

            {dataLoading ? (
              <p className="mt-6 text-sm text-[var(--text-soft)]">Loading team…</p>
            ) : users.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-[var(--text-soft)]">
                No team members yet.
              </p>
            ) : (
              <ul className="mt-5 grid list-none gap-4 p-0 sm:grid-cols-1">
                {users.map((member) => (
                  <li
                    key={member.id}
                    className="rounded-2xl border p-4 sm:p-5"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-strong)",
                      boxShadow: "0 1px 0 color-mix(in srgb, var(--border) 60%, transparent)",
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-main)]">{member.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                          {member.designation?.trim() || "No designation"}
                        </p>
                      </div>
                      {user.role === "MANAGER" || member.role === "SUPERADMIN" ? (
                        <span
                          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs"
                          style={{ background: "var(--surface-soft)", color: "var(--text-soft)" }}
                        >
                          {member.role}
                        </span>
                      ) : (
                        <select
                          className="min-w-[8rem] max-w-full rounded-xl border px-2 py-1.5 text-xs font-semibold sm:min-w-[9rem]"
                          style={fieldStyle}
                          value={member.role}
                          disabled={updatingId === member.id}
                          onChange={(event) => void assignEmployee(member, "role", event.target.value)}
                        >
                          {availableRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                          Email
                        </label>
                        {canEditDirectory ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                            <input
                              className="min-h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm outline-none"
                              style={fieldStyle}
                              value={emailDrafts[member.id] ?? member.email}
                              disabled={
                                emailUpdatingId === member.id ||
                                (member.role === "SUPERADMIN" && user.role !== "SUPERADMIN")
                              }
                              onChange={(event) =>
                                setEmailDrafts((current) => ({
                                  ...current,
                                  [member.id]: event.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="h-11 shrink-0 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
                              style={{ background: "var(--accent-strong)" }}
                              disabled={
                                emailUpdatingId === member.id ||
                                (member.role === "SUPERADMIN" && user.role !== "SUPERADMIN") ||
                                (emailDrafts[member.id] ?? member.email).trim() === member.email
                              }
                              onClick={() => void updateMemberEmail(member)}
                            >
                              {emailUpdatingId === member.id ? "Saving…" : "Save email"}
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--text-soft)]">{member.email}</p>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                            Department
                          </label>
                          {user.role === "MANAGER" ? (
                            <p className="text-sm text-[var(--text-soft)]">{member.department?.name || "—"}</p>
                          ) : (
                            <select
                              className="h-11 w-full min-w-0 rounded-xl border px-3 text-sm outline-none"
                              style={fieldStyle}
                              value={member.department?.id ?? ""}
                              disabled={updatingId === member.id || member.role === "SUPERADMIN"}
                              onChange={(event) =>
                                void assignEmployee(member, "departmentId", event.target.value)
                              }
                            >
                              <option value="">Unassigned</option>
                              {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                  {department.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                            Manager
                          </label>
                          {user.role === "MANAGER" ? (
                            <p className="text-sm text-[var(--text-soft)]">{member.manager?.name || "—"}</p>
                          ) : (
                            <select
                              className="h-11 w-full min-w-0 rounded-xl border px-3 text-sm outline-none"
                              style={fieldStyle}
                              value={member.manager?.id ?? ""}
                              disabled={updatingId === member.id || member.role === "SUPERADMIN"}
                              onChange={(event) =>
                                void assignEmployee(member, "managerId", event.target.value)
                              }
                            >
                              <option value="">Unassigned</option>
                              {managers
                                .filter((manager) => manager.id !== member.id)
                                .map((manager) => (
                                  <option key={manager.id} value={manager.id}>
                                    {manager.name}
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {hasAssignedLeadershipLinks(member) ? (
                        <div className="flex flex-wrap gap-3 border-t pt-3 text-xs font-semibold" style={{ borderColor: "var(--border)" }}>
                          <a
                            href="https://meet.google.com/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
                          >
                            Google Meet
                          </a>
                          <a
                            href="https://drive.google.com/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--accent-strong)] underline-offset-2 hover:underline"
                          >
                            Google Drive
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {hasMoreUsers ? (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMoreUsers}
                  onClick={() => {
                    setLoadingMoreUsers(true);
                    void loadTeam(true).finally(() => setLoadingMoreUsers(false));
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-60"
                  style={{ borderColor: "var(--border)", color: "var(--text-main)" }}
                >
                  {loadingMoreUsers ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </Surface>
        </div>
      </div>
    </CRMShell>
  );
}
