"use client";

import { useMemo, useRef, useState } from "react";
import { Surface, formatRole } from "./chart-widgets";
import { MemberPickerToolbar, filterMembersForPicker, sortedUniqueRoles, type MemberRoleFilter } from "@/components/shared/member-picker-toolbar";
import { StatePanel } from "@/components/shared/state-panel";
import { apiPost, apiPostForm } from "@/lib/api";
import { normalizeErrorMessage } from "@/lib/error-message";
import type { CRMUser, DashboardSummary, GoogleDriveFolderResult, GoogleDriveUploadResult, GoogleMeetSessionResult, GoogleProjectSheetResult, GoogleWorkspaceStatus, Project } from "@/types/crm";

type WorkspaceActionLoading = "" | "meet" | "sheets" | "drive";

type AssetsCardProps = {
  meetResult: GoogleMeetSessionResult | null;
  sheetResult: GoogleProjectSheetResult | null;
  driveResult: GoogleDriveFolderResult | null;
  sharingAsset: "" | "meet" | "drive";
  uploadingDriveFile: boolean;
  driveFileInputRef: React.RefObject<HTMLInputElement | null>;
  onClearMeetResult: () => void;
  onClearSheetResult: () => void;
  onClearDriveResult: () => void;
  onShareToChat: (service: "meet" | "drive") => void;
};

function WorkspaceAssetsCard({ meetResult, sheetResult, driveResult, sharingAsset, uploadingDriveFile, driveFileInputRef, onClearMeetResult, onClearSheetResult, onClearDriveResult, onShareToChat }: AssetsCardProps) {
  return (
    <Surface className="p-5">
      <p className="text-sm font-semibold text-[var(--text-main)]">Latest generated assets</p>
      <div className="mt-4 space-y-3">
        {meetResult && (
          <article className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
            <p className="text-sm font-semibold text-[var(--text-main)]">Meet session ready</p>
            <p className="mt-1 text-sm text-[var(--text-soft)]">{meetResult.project?.name || "Department meeting"} | {new Date(meetResult.startAt).toLocaleString()}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {meetResult.meetUrl && <a href={meetResult.meetUrl} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>Open Meet</a>}
              {meetResult.eventUrl && <a href={meetResult.eventUrl} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2 text-sm font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-main)" }}>Open Calendar event</a>}
              <button type="button" onClick={() => onShareToChat("meet")} disabled={sharingAsset === "meet"} className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60" style={{ borderColor: "var(--border)", color: "var(--text-main)" }}>{sharingAsset === "meet" ? "Sharing..." : "Share to chat"}</button>
              <button type="button" onClick={onClearMeetResult} className="rounded-xl border px-3 py-2 text-sm font-semibold text-rose-600" style={{ borderColor: "var(--border)" }}>Delete</button>
            </div>
          </article>
        )}
        {sheetResult && (
          <article className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
            <p className="text-sm font-semibold text-[var(--text-main)]">Sheet exported</p>
            <p className="mt-1 text-sm text-[var(--text-soft)]">{sheetResult.project.name} | {sheetResult.rowCount} rows written</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={sheetResult.spreadsheetUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>Open Sheet</a>
              <button type="button" onClick={onClearSheetResult} className="rounded-xl border px-3 py-2 text-sm font-semibold text-rose-600" style={{ borderColor: "var(--border)" }}>Delete</button>
            </div>
          </article>
        )}
        {driveResult && (
          <article className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
            <p className="text-sm font-semibold text-[var(--text-main)]">Drive workspace created</p>
            <p className="mt-1 text-sm text-[var(--text-soft)]">{driveResult.project.name}</p>
            <input ref={driveFileInputRef} type="file" className="hidden" />
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={driveResult.folderUrl || `https://drive.google.com/drive/folders/${driveResult.folderId}`} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{ background: "var(--accent-strong)" }}>Open Drive</a>
              {driveResult.folderUrl && <a href={driveResult.folderUrl} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>Open folder</a>}
              {driveResult.summaryFileUrl && <a href={driveResult.summaryFileUrl} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2 text-sm font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-main)" }}>Open summary file</a>}
              <button type="button" onClick={() => driveFileInputRef.current?.click()} disabled={uploadingDriveFile} className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60" style={{ borderColor: "var(--border)", color: "var(--text-main)" }}>{uploadingDriveFile ? "Uploading..." : "Upload file"}</button>
              <button type="button" onClick={() => onShareToChat("drive")} disabled={sharingAsset === "drive"} className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60" style={{ borderColor: "var(--border)", color: "var(--text-main)" }}>{sharingAsset === "drive" ? "Sharing..." : "Share to chat"}</button>
              <button type="button" onClick={onClearDriveResult} className="rounded-xl border px-3 py-2 text-sm font-semibold text-rose-600" style={{ borderColor: "var(--border)" }}>Delete</button>
            </div>
          </article>
        )}
        {!meetResult && !sheetResult && !driveResult && <p className="text-sm text-[var(--text-soft)]">Generated Google assets will appear here after you run a Workspace action.</p>}
      </div>
    </Surface>
  );
}

export function GoogleWorkspacePanel({ scope, status, loading, message, projects, users, selectedProjectId, actionLoading, meetResult, sheetResult, driveResult, onClearMeetResult, onClearSheetResult, onClearDriveResult, onSelectProject, onConnect, onDisconnect, onCreateMeet, onCreateSheet, onCreateDriveFolder, onSetMessage }: {
  scope: DashboardSummary["scope"]; status: GoogleWorkspaceStatus | null; loading: boolean; message: string; projects: Project[]; users: CRMUser[]; selectedProjectId: string; actionLoading: WorkspaceActionLoading; meetResult: GoogleMeetSessionResult | null; sheetResult: GoogleProjectSheetResult | null; driveResult: GoogleDriveFolderResult | null;
  onClearMeetResult: () => void; onClearSheetResult: () => void; onClearDriveResult: () => void; onSelectProject: (id: string) => void; onConnect: () => void; onDisconnect: () => void; onCreateMeet: (ids: string[]) => void; onCreateSheet: () => void; onCreateDriveFolder: () => void; onSetMessage: (v: string) => void;
}) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const [sharingAsset, setSharingAsset] = useState<"" | "meet" | "drive">("");
  const [uploadingDriveFile, setUploadingDriveFile] = useState(false);
  const driveFileInputRef = useRef<HTMLInputElement | null>(null);
  const [meetTargetMode, setMeetTargetMode] = useState<"project" | "department" | "all_departments">("project");
  const [selectedMeetDeptId, setSelectedMeetDeptId] = useState("");
  const [meetAttendeeQuery, setMeetAttendeeQuery] = useState("");
  const [meetAttendeeRole, setMeetAttendeeRole] = useState<MemberRoleFilter>("ALL");
  const workspaceReady = Boolean(status?.connected);

  const departmentChoices = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of users) { if (m.department?.id && m.department?.name) map.set(m.department.id, m.department.name); }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const computedAudienceIds = useMemo(() => {
    if (meetTargetMode === "project") return selectedProject?.departmentId ? users.filter((m) => m.departmentId === selectedProject.departmentId).map((m) => m.id) : [];
    if (meetTargetMode === "department") return selectedMeetDeptId ? users.filter((m) => m.departmentId === selectedMeetDeptId).map((m) => m.id) : [];
    return users.filter((m) => Boolean(m.departmentId)).map((m) => m.id);
  }, [meetTargetMode, selectedMeetDeptId, selectedProject?.departmentId, users]);

  const meetAudienceMembers = useMemo(() => users.filter((m) => computedAudienceIds.includes(m.id)), [users, computedAudienceIds]);
  const meetAttendeeRoleOptions = useMemo(() => sortedUniqueRoles(meetAudienceMembers), [meetAudienceMembers]);
  const filteredMeetAudience = useMemo(() => filterMembersForPicker(meetAudienceMembers, { searchQuery: meetAttendeeQuery, roleFilter: meetAttendeeRole }), [meetAudienceMembers, meetAttendeeQuery, meetAttendeeRole]);
  const selectedMeetDeptName = departmentChoices.find((d) => d.id === selectedMeetDeptId)?.name || "";

  const badgeLabel = status?.connected ? "Connected" : status?.setupRequired ? "Setup Required" : (status && status.oauthConfigured === false) ? "OAuth Not Configured" : "Not Connected";
  const badgeStyle = status?.connected ? { background: "color-mix(in srgb, var(--success) 16%, var(--surface))", color: "var(--success)" } : status?.setupRequired ? { background: "color-mix(in srgb, #f59e0b 16%, var(--surface))", color: "#b45309" } : (status && status.oauthConfigured === false) ? { background: "color-mix(in srgb, #ef4444 16%, var(--surface))", color: "#b91c1c" } : { background: "var(--surface-soft)", color: "var(--text-soft)" };

  const shareAssetToChat = async (service: "meet" | "drive") => {
    const pid = service === "meet" ? meetResult?.project?.id : driveResult?.project?.id;
    if (!pid) { onSetMessage("Generate the asset first before sharing to chat."); return; }
    const content = service === "meet"
      ? [`Google Meet session created for ${meetResult?.project?.name ?? "the project"}.`, meetResult?.meetUrl ? `Meet: ${meetResult.meetUrl}` : null, meetResult?.eventUrl ? `Calendar event: ${meetResult.eventUrl}` : null].filter(Boolean).join("\n")
      : [`Google Drive workspace created for ${driveResult?.project?.name ?? "the project"}.`, driveResult?.folderUrl ? `Folder: ${driveResult.folderUrl}` : null, driveResult?.summaryFileUrl ? `Summary file: ${driveResult.summaryFileUrl}` : null].filter(Boolean).join("\n");
    try {
      setSharingAsset(service);
      await apiPost("/chat/messages", { channelType: "PROJECT", channelId: pid, content, messageType: "TEXT" });
      onSetMessage(`Shared ${service === "meet" ? "Meet link" : "Drive links"} to project chat.`);
    } catch (err) { onSetMessage(normalizeErrorMessage(err, "Failed to share asset to chat.")); } finally { setSharingAsset(""); }
  };

  const onDriveFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !driveResult?.folderId || !driveResult?.project?.id) { onSetMessage("Create a Drive workspace first before uploading files."); return; }
    try {
      setUploadingDriveFile(true);
      const fd = new FormData(); fd.append("file", file); fd.append("folderId", driveResult.folderId); fd.append("projectId", driveResult.project.id);
      const uploaded = await apiPostForm<GoogleDriveUploadResult>("/integrations/google/drive/upload", fd);
      onSetMessage(`Uploaded ${uploaded.fileName} to ${driveResult.project.name}${uploaded.fileUrl ? `. Open: ${uploaded.fileUrl}` : "."}`);
    } catch (err) { onSetMessage(normalizeErrorMessage(err, "Failed to upload file to Drive workspace.")); } finally { setUploadingDriveFile(false); }
  };

  if (loading) return <StatePanel title="Loading Google Workspace" description="Checking Google Meet, Sheets, and Drive connection status." />;

  return (
    <div className="space-y-4">
      {message ? <StatePanel title="Workspace update" description={message} /> : null}
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface className="p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--text-main)]">Google Workspace connection</p>
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={badgeStyle}>{badgeLabel}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-soft)]">Connect once with Google Auth and manage Meet, Sheets, and Drive directly from CRM workflows.</p>
          {status?.setupRequired && <p className="mt-2 text-xs font-medium text-amber-700">{status.setupMessage || "Workspace setup is incomplete."}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[["meet","Google Meet"],["sheets","Google Sheets"],["drive","Google Drive"]].map(([key,label]) => (
              <div key={key} className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">{label}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">{status?.services[key as keyof typeof status.services] ? "Connected" : "Not connected"}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onConnect} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>Connect with Google Auth</button>
            <button type="button" onClick={onDisconnect} className="rounded-xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-soft)" }}>Disconnect</button>
          </div>
          <p className="mt-3 text-xs text-[var(--text-faint)]">{status?.connected ? `Connected as ${status.workspaceEmail || "Google account"}` : "No workspace account connected yet."}</p>
        </Surface>
        <Surface className="p-5">
          <p className="text-sm font-semibold text-[var(--text-main)]">Workspace + CRM quick signals</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[["Total tasks", status?.crmSignals.totalTasks ?? 0],["Open tasks", status?.crmSignals.openTasks ?? 0],["Projects", status?.crmSignals.totalProjects ?? 0],["Departments", status?.crmSignals.totalDepartments ?? 0]].map(([label,val]) => (
              <div key={String(label)} className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-faint)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--text-main)]">{val}</p>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-semibold text-[var(--text-main)]">Workspace actions</p><p className="mt-1 text-sm text-[var(--text-soft)]">Launch Google Meet, Sheets, and Drive from CRM data.</p></div>
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ background: workspaceReady ? "color-mix(in srgb, var(--success) 14%, var(--surface))" : "var(--surface-soft)", color: workspaceReady ? "var(--success)" : "var(--text-soft)" }}>{workspaceReady ? "Ready" : "Connect first"}</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">Project</label>
                <select value={selectedProjectId} onChange={(e) => onSelectProject(e.target.value)} className="mt-2 h-12 w-full rounded-2xl border px-4 text-sm outline-none" style={{ borderColor: "var(--border)", background: "var(--surface-soft)", color: "var(--text-main)" }}>
                  <option value="">Select a project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid gap-3">
                <button type="button" onClick={() => onCreateMeet(computedAudienceIds)} disabled={!workspaceReady || actionLoading === "meet" || (meetTargetMode === "project" && !selectedProjectId)} className="rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" style={{ background: "var(--accent)" }}>{actionLoading === "meet" ? "Creating Meet session..." : "Create Meet session"}</button>
                <button type="button" onClick={onCreateSheet} disabled={!workspaceReady || !selectedProjectId || actionLoading === "sheets"} className="rounded-2xl border px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60" style={{ borderColor: "var(--border)", color: "var(--text-main)" }}>{actionLoading === "sheets" ? "Exporting Sheet..." : "Export project to Sheets"}</button>
                <button type="button" onClick={onCreateDriveFolder} disabled={!workspaceReady || !selectedProjectId || actionLoading === "drive"} className="rounded-2xl border px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60" style={{ borderColor: "var(--border)", color: "var(--text-main)" }}>{actionLoading === "drive" ? "Creating Drive folder..." : "Create Drive workspace"}</button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">Selected project snapshot</p>
                {selectedProject ? (
                  <><p className="mt-3 text-lg font-semibold text-[var(--text-main)]">{selectedProject.name}</p><p className="mt-1 text-sm text-[var(--text-soft)]">{selectedProject.department?.name || "No department"} | Owner: {selectedProject.owner?.name || "Not assigned"}</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Progress", `${selectedProject.progress}%`],["Tasks", selectedProject.taskCounts.total],["Open", selectedProject.taskCounts.todo + selectedProject.taskCounts.inProgress]].map(([l,v]) => (<div key={String(l)}><p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-faint)]">{l}</p><p className="mt-1 text-base font-semibold text-[var(--text-main)]">{v}</p></div>))}</div></>
                ) : <p className="mt-3 text-sm text-[var(--text-soft)]">Choose a project to generate Google Workspace assets around it.</p>}
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">Meet attendees</p><span className="text-xs text-[var(--text-soft)]">{filteredMeetAudience.length === meetAudienceMembers.length ? `${meetAudienceMembers.length} members` : `${filteredMeetAudience.length} of ${meetAudienceMembers.length} shown`}</span></div>
                <div className="mt-3 grid gap-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">Meet for</label>
                  <select value={meetTargetMode} onChange={(e) => setMeetTargetMode(e.target.value as typeof meetTargetMode)} className="h-11 w-full rounded-2xl border px-3 text-sm outline-none" style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-main)" }}>
                    <option value="project">Selected project department</option>
                    <option value="department">Single department</option>
                    <option value="all_departments">All departments</option>
                  </select>
                  {meetTargetMode === "department" && <select value={selectedMeetDeptId} onChange={(e) => setSelectedMeetDeptId(e.target.value)} className="h-11 w-full rounded-2xl border px-3 text-sm outline-none" style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-main)" }}><option value="">Select department</option>{departmentChoices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
                </div>
                <p className="mt-2 text-xs text-[var(--text-soft)]">{meetTargetMode === "project" ? (selectedProject?.department?.name ? `Will invite all members in ${selectedProject.department.name}.` : "This project has no department. You can still create a Meet link.") : meetTargetMode === "department" ? (selectedMeetDeptName ? `Will invite all members in ${selectedMeetDeptName}.` : "Select a department.") : "Will invite all members from all departments."}</p>
                <div className="mt-3"><MemberPickerToolbar searchQuery={meetAttendeeQuery} onSearchChange={setMeetAttendeeQuery} roleFilter={meetAttendeeRole} onRoleFilterChange={setMeetAttendeeRole} roleOptions={meetAttendeeRoleOptions} /></div>
                <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1">
                  {filteredMeetAudience.length === 0 ? <p className="rounded-2xl border px-3 py-4 text-sm text-[var(--text-soft)]" style={{ borderColor: "var(--border)" }}>No people match this search.</p> : filteredMeetAudience.map((m) => (
                    <label key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                      <div className="min-w-0"><p className="truncate font-medium text-[var(--text-main)]">{m.name}</p><p className="truncate text-xs text-[var(--text-soft)]">{m.email}</p></div>
                      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">{formatRole(m.role)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Surface>

        <WorkspaceAssetsCard
          meetResult={meetResult} sheetResult={sheetResult} driveResult={driveResult}
          sharingAsset={sharingAsset} uploadingDriveFile={uploadingDriveFile} driveFileInputRef={driveFileInputRef}
          onClearMeetResult={onClearMeetResult} onClearSheetResult={onClearSheetResult} onClearDriveResult={onClearDriveResult}
          onShareToChat={(s) => void shareAssetToChat(s)}
        />
      </div>

      <Surface className="p-5">
        <p className="text-sm font-semibold text-[var(--text-main)]">Recommended Google Workspace analytics for CRM</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(status?.recommendations ?? []).map((item) => (
            <article key={item.id} className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
              <p className="text-sm font-semibold text-[var(--text-main)]">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">{item.description}</p>
              <p className="mt-2 text-xs text-[var(--text-faint)]">Source: {item.source} | CRM value: {item.crmUseCase}</p>
            </article>
          ))}
        </div>
      </Surface>
    </div>
  );
}
