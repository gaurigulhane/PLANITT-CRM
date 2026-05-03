import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { sendSafeError } from "../middleware/error.middleware.js";
import { getJwtSecret, normalizeOrigin } from "../config/security.js";
import { verifyGoogleIdToken } from "../utils/google-token.js";

const GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const GOOGLE_SHEETS_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";

const SERVICE_SCOPE_MAP = {
  meet: "https://www.googleapis.com/auth/calendar.events",
  sheets: "https://www.googleapis.com/auth/spreadsheets",
  drive: "https://www.googleapis.com/auth/drive.file",
};

const DEFAULT_SERVICES = ["meet", "sheets", "drive"];
const BASE_SCOPES = ["openid", "email", "profile"];

function getEnvConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    clientUrl: normalizeOrigin(process.env.CLIENT_URL || "https://planitt-crm-client.vercel.app"),
    workspaceOwnerUserId: process.env.GOOGLE_WORKSPACE_OWNER_USER_ID || "",
    driveRootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "",
  };
}

function createError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function hasGoogleWorkspaceDelegate() {
  return Boolean(prisma.googleWorkspaceConnection?.findUnique);
}

function isMissingGoogleConnectionTable(error) {
  return (
    error?.code === "P2021" ||
    error?.message?.includes("googleworkspaceconnection") ||
    error?.message?.toLowerCase().includes("relation") && error?.message?.toLowerCase().includes("does not exist")
  );
}

function parseRequestedServices(rawServices) {
  if (!rawServices) {
    return DEFAULT_SERVICES;
  }

  return rawServices
    .split(",")
    .map((service) => service.trim().toLowerCase())
    .filter((service) => service in SERVICE_SCOPE_MAP);
}

function buildScopes(services) {
  const dynamicScopes = services.map((service) => SERVICE_SCOPE_MAP[service]);
  return Array.from(new Set([...BASE_SCOPES, ...dynamicScopes]));
}

function signState(payload) {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn: "10m" });
}

function verifyState(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}

async function refreshGoogleAccessToken(connection, config) {
  if (!connection.refreshToken) {
    throw createError("Google Workspace needs to be reconnected to refresh access.", 401);
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw createError("Failed to refresh Google Workspace access token.", 401);
  }

  return prisma.googleWorkspaceConnection.update({
    where: { userId: connection.userId },
    data: {
      accessToken: tokenPayload.access_token,
      expiryDate: tokenPayload.expires_in
        ? new Date(Date.now() + Number(tokenPayload.expires_in) * 1000)
        : null,
      ...(tokenPayload.refresh_token ? { refreshToken: tokenPayload.refresh_token } : {}),
    },
  });
}

async function getActiveGoogleConnection(userId) {
  const config = getEnvConfig();
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw createError("Google OAuth is not fully configured in server environment.", 400);
  }

  if (!hasGoogleWorkspaceDelegate()) {
    throw createError(
      "Google integration model is unavailable in Prisma client. Run Prisma generate and restart server.",
      500
    );
  }

  const connection = await prisma.googleWorkspaceConnection.findUnique({
    where: { userId },
  });

  if (!connection?.accessToken) {
    throw createError("Google Workspace is not connected for this account.", 400);
  }

  const expiresAt = connection.expiryDate ? new Date(connection.expiryDate).getTime() : 0;
  const needsRefresh = Boolean(connection.refreshToken) && expiresAt && expiresAt <= Date.now() + 60 * 1000;
  if (needsRefresh) {
    return refreshGoogleAccessToken(connection, config);
  }

  return connection;
}

async function getWorkspaceConnectionOwnerUserId(requiredService = "drive") {
  const config = getEnvConfig();

  if (config.workspaceOwnerUserId) {
    return config.workspaceOwnerUserId;
  }

  if (!hasGoogleWorkspaceDelegate()) {
    throw createError(
      "Google integration model is unavailable in Prisma client. Run Prisma generate and restart server.",
      500
    );
  }

  const whereByService =
    requiredService === "meet"
      ? { connectedMeet: true }
      : requiredService === "sheets"
        ? { connectedSheets: true }
        : { connectedDrive: true };

  const connection = await prisma.googleWorkspaceConnection.findFirst({
    where: {
      accessToken: { not: null },
      ...whereByService,
    },
    orderBy: { updatedAt: "desc" },
    select: { userId: true },
  });

  if (!connection?.userId) {
    throw createError(
      "Universal Google Workspace connection not found. Connect one admin account first.",
      400
    );
  }

  return connection.userId;
}

async function getUniversalGoogleConnection(requiredService = "drive") {
  const ownerUserId = await getWorkspaceConnectionOwnerUserId(requiredService);
  return getActiveGoogleConnection(ownerUserId);
}

async function googleApiRequest(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message ||
      payload?.error_description ||
      `Google API request failed with status ${response.status}`;
    throw createError(apiMessage, response.status);
  }

  return payload;
}

async function getProjectWorkspaceContext(projectId) {
  if (!projectId) {
    throw createError("Project is required for this Google Workspace action.", 400);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    throw createError("Project not found.", 404);
  }

  return project;
}

function getProjectProgress(tasks) {
  if (!tasks.length) {
    return 0;
  }

  return Math.round(tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / tasks.length);
}

function buildTaskRows(project) {
  return project.tasks.map((task) => [
    task.title,
    task.status,
    `${task.progress}%`,
    task.assignments.map((assignment) => assignment.user.name).join(", ") || "Unassigned",
    task.description || "",
  ]);
}

function buildProjectSummaryText(project) {
  const openTasks = project.tasks.filter((task) => task.status !== "DONE").length;
  return [
    `Project: ${project.name}`,
    `Department: ${project.department?.name || "Unassigned"}`,
    `Owner: ${project.owner?.name || "Not assigned"}`,
    `Progress: ${getProjectProgress(project.tasks)}%`,
    `Open tasks: ${openTasks}`,
    "",
    "Recent tasks:",
    ...project.tasks.slice(0, 8).map((task) => `- ${task.title} [${task.status}] ${task.progress}%`),
  ].join("\n");
}

function buildWorkspaceRecommendations() {
  return [
    {
      id: "meeting-velocity",
      title: "Meeting velocity",
      description: "Track number of customer or internal project meetings by department and week.",
      source: "Google Calendar + Meet links",
      crmUseCase: "Helps leadership compare planning cadence with delivery speed.",
    },
    {
      id: "sheet-activity",
      title: "Pipeline sheet activity",
      description: "Monitor frequently updated shared Sheets related to leads, projects, and revenue.",
      source: "Google Sheets revision history",
      crmUseCase: "Highlights active versus stale planning pipelines.",
    },
    {
      id: "drive-collaboration",
      title: "Drive collaboration depth",
      description: "Measure shared file count and active collaborators per account, project, or department.",
      source: "Google Drive files + permissions",
      crmUseCase: "Shows collaboration intensity around key deals and projects.",
    },
    {
      id: "response-time",
      title: "Follow-up response time",
      description: "Calculate average time between CRM task creation and first Google Workspace artifact update.",
      source: "CRM events + Sheets/Drive timestamps",
      crmUseCase: "Improves operational responsiveness tracking.",
    },
  ];
}

async function getCRMWorkspaceSignals() {
  const [totalTasks, openTasks, totalProjects, totalDepartments] = await Promise.all([
    prisma.task.count(),
    prisma.task.count({
      where: {
        status: { in: ["TODO", "IN_PROGRESS"] },
      },
    }),
    prisma.project.count(),
    prisma.department.count(),
  ]);

  return {
    totalTasks,
    openTasks,
    totalProjects,
    totalDepartments,
  };
}

export async function getGoogleWorkspaceStatus(req, res) {
  try {
    if (!hasGoogleWorkspaceDelegate()) {
      const config = getEnvConfig();
      return res.status(200).json({
        connected: false,
        oauthConfigured: Boolean(config.clientId && config.clientSecret && config.redirectUri),
        workspaceEmail: null,
        services: {
          meet: false,
          sheets: false,
          drive: false,
        },
        grantedScopes: [],
        lastSyncedAt: null,
        crmSignals: {
          totalTasks: 0,
          openTasks: 0,
          totalProjects: 0,
          totalDepartments: 0,
        },
        recommendations: buildWorkspaceRecommendations(),
        setupRequired: true,
        setupMessage: "Google integration model is unavailable in Prisma client. Run Prisma generate and restart server.",
      });
    }

    const config = getEnvConfig();
    const oauthConfigured = Boolean(config.clientId && config.clientSecret && config.redirectUri);

    const ownerUserId = await getWorkspaceConnectionOwnerUserId("drive").catch(() => null);
    const [connection, crmSignals] = await Promise.all([
      ownerUserId
        ? prisma.googleWorkspaceConnection.findUnique({
            where: { userId: ownerUserId },
            select: {
              workspaceEmail: true,
              grantedScopes: true,
              connectedMeet: true,
              connectedSheets: true,
              connectedDrive: true,
              updatedAt: true,
            },
          })
        : Promise.resolve(null),
      getCRMWorkspaceSignals(),
    ]);

    return res.json({
      connected: Boolean(connection),
      oauthConfigured,
      workspaceEmail: connection?.workspaceEmail ?? null,
      services: {
        meet: connection?.connectedMeet ?? false,
        sheets: connection?.connectedSheets ?? false,
        drive: connection?.connectedDrive ?? false,
      },
      grantedScopes: connection?.grantedScopes ?? [],
      lastSyncedAt: connection?.updatedAt ?? null,
      crmSignals,
      recommendations: buildWorkspaceRecommendations(),
    });
  } catch (err) {
    if (isMissingGoogleConnectionTable(err)) {
      const config = getEnvConfig();
      return res.status(200).json({
        connected: false,
        oauthConfigured: Boolean(config.clientId && config.clientSecret && config.redirectUri),
        workspaceEmail: null,
        services: {
          meet: false,
          sheets: false,
          drive: false,
        },
        grantedScopes: [],
        lastSyncedAt: null,
        crmSignals: {
          totalTasks: 0,
          openTasks: 0,
          totalProjects: 0,
          totalDepartments: 0,
        },
        recommendations: buildWorkspaceRecommendations(),
        setupRequired: true,
        setupMessage: "Google integration tables are not ready yet. Run Prisma migrations and retry.",
      });
    }

    return sendSafeError(res, err, "Unable to fetch workspace status");
  }
}

export async function getGoogleAuthUrl(req, res) {
  try {
    const config = getEnvConfig();
    if (!config.clientId || !config.redirectUri) {
      return res.status(400).json({
        error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.",
      });
    }

    const requestedServices = parseRequestedServices(req.query.services);
    const scopes = buildScopes(requestedServices);
    const state = signState({
      userId: req.user.userId,
      role: req.user.role,
      services: requestedServices,
      nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: scopes.join(" "),
      state,
    });

    return res.json({
      authUrl: `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`,
      services: requestedServices,
      scopes,
    });
  } catch (err) {
    return sendSafeError(res, err, "Unable to create Google auth URL");
  }
}

export async function handleGoogleCallback(req, res) {
  const config = getEnvConfig();
  const dashboardUrl = `${config.clientUrl}/dashboard?tab=workspace`;

  try {
    if (!hasGoogleWorkspaceDelegate()) {
      return res.redirect(`${dashboardUrl}&google=setup_required`);
    }

    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(`${dashboardUrl}&google=denied`);
    }

    if (!code || !state) {
      return res.redirect(`${dashboardUrl}&google=missing_code`);
    }

    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      return res.redirect(`${dashboardUrl}&google=missing_config`);
    }

    const parsedState = verifyState(state);
    const targetUserId = parsedState.userId;
    const services = Array.isArray(parsedState.services) ? parsedState.services : DEFAULT_SERVICES;

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res.redirect(`${dashboardUrl}&google=token_failed`);
    }

    const idTokenPayload = await verifyGoogleIdToken(tokenPayload.id_token, config.clientId);
    const grantedScopes = (tokenPayload.scope || "")
      .split(" ")
      .map((scope) => scope.trim())
      .filter(Boolean);

    await prisma.googleWorkspaceConnection.upsert({
      where: {
        userId: targetUserId,
      },
      update: {
        workspaceEmail: idTokenPayload.email || null,
        accessToken: tokenPayload.access_token || null,
        refreshToken: tokenPayload.refresh_token || undefined,
        expiryDate: tokenPayload.expires_in
          ? new Date(Date.now() + Number(tokenPayload.expires_in) * 1000)
          : null,
        grantedScopes,
        connectedMeet: services.includes("meet"),
        connectedSheets: services.includes("sheets"),
        connectedDrive: services.includes("drive"),
      },
      create: {
        userId: targetUserId,
        workspaceEmail: idTokenPayload.email || null,
        accessToken: tokenPayload.access_token || null,
        refreshToken: tokenPayload.refresh_token || null,
        expiryDate: tokenPayload.expires_in
          ? new Date(Date.now() + Number(tokenPayload.expires_in) * 1000)
          : null,
        grantedScopes,
        connectedMeet: services.includes("meet"),
        connectedSheets: services.includes("sheets"),
        connectedDrive: services.includes("drive"),
      },
    });

    return res.redirect(`${dashboardUrl}&google=connected`);
  } catch (_err) {
    return res.redirect(`${dashboardUrl}&google=failed`);
  }
}

export async function disconnectGoogleWorkspace(req, res) {
  try {
    if (!hasGoogleWorkspaceDelegate()) {
      return res.status(204).send();
    }

    await prisma.googleWorkspaceConnection.deleteMany({
      where: { userId: req.user.userId },
    });
    return res.status(204).send();
  } catch (err) {
    return sendSafeError(res, err, "Unable to disconnect Google Workspace");
  }
}

export async function createGoogleMeetSession(req, res) {
  try {
    const connection = await getUniversalGoogleConnection("meet");
    const projectId = typeof req.body.projectId === "string" ? req.body.projectId.trim() : "";
    const project = projectId ? await getProjectWorkspaceContext(projectId) : null;

    const attendeeIds = Array.isArray(req.body.attendeeUserIds)
      ? req.body.attendeeUserIds.filter(Boolean)
      : [];

    const attendees = attendeeIds.length
      ? await prisma.user.findMany({
          where: { id: { in: attendeeIds } },
          select: { email: true, name: true },
        })
      : [];

    const startAt = req.body.startAt ? new Date(req.body.startAt) : new Date(Date.now() + 30 * 60 * 1000);
    const durationMinutes = Math.max(15, Math.min(240, Number(req.body.durationMinutes) || 45));
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    const payload = await googleApiRequest(
      `${GOOGLE_CALENDAR_EVENTS_URL}?conferenceDataVersion=1`,
      connection.accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          summary: req.body.title?.trim() || `${project?.name || "Department"} CRM sync`,
          description:
            req.body.description?.trim() ||
            `CRM workspace sync${project ? ` for ${project.name} (${project.department?.name || "No department"})` : " for department/team collaboration"}.`,
          start: { dateTime: startAt.toISOString() },
          end: { dateTime: endAt.toISOString() },
          attendees: attendees.map((attendee) => ({ email: attendee.email, displayName: attendee.name })),
          conferenceData: {
            createRequest: {
              requestId: `crm-${project?.id || "department"}-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      }
    );

    return res.status(201).json({
      service: "meet",
      title: payload.summary,
      eventId: payload.id,
      eventUrl: payload.htmlLink,
      meetUrl:
        payload.hangoutLink ||
        payload.conferenceData?.entryPoints?.find((entryPoint) => entryPoint.entryPointType === "video")?.uri ||
        null,
      startAt: payload.start?.dateTime || startAt.toISOString(),
      endAt: payload.end?.dateTime || endAt.toISOString(),
      attendeeCount: attendees.length,
      project: project
        ? {
            id: project.id,
            name: project.name,
          }
        : null,
    });
  } catch (err) {
    return sendSafeError(res, err, "Unable to create Google Meet session");
  }
}

export async function createGoogleProjectSheet(req, res) {
  try {
    const connection = await getUniversalGoogleConnection("sheets");
    const project = await getProjectWorkspaceContext(req.body.projectId);

    const spreadsheet = await googleApiRequest(GOOGLE_SHEETS_URL, connection.accessToken, {
      method: "POST",
      body: JSON.stringify({
        properties: {
          title: `${project.name} CRM report`,
        },
        sheets: [{ properties: { title: "CRM Export" } }],
      }),
    });

    const progress = getProjectProgress(project.tasks);
    const rows = [
      ["Project", project.name],
      ["Department", project.department?.name || "Unassigned"],
      ["Owner", project.owner?.name || "Not assigned"],
      ["Progress", `${progress}%`],
      ["Total tasks", String(project.tasks.length)],
      ["Open tasks", String(project.tasks.filter((task) => task.status !== "DONE").length)],
      [],
      ["Task", "Status", "Progress", "Assignees", "Description"],
      ...buildTaskRows(project),
    ];

    await googleApiRequest(
      `${GOOGLE_SHEETS_URL}/${spreadsheet.spreadsheetId}/values/CRM%20Export!A1:append?valueInputOption=RAW`,
      connection.accessToken,
      {
        method: "POST",
        body: JSON.stringify({ values: rows }),
      }
    );

    return res.status(201).json({
      service: "sheets",
      title: spreadsheet.properties?.title || `${project.name} CRM report`,
      spreadsheetId: spreadsheet.spreadsheetId,
      spreadsheetUrl: spreadsheet.spreadsheetUrl,
      rowCount: rows.length,
      project: {
        id: project.id,
        name: project.name,
      },
    });
  } catch (err) {
    return sendSafeError(res, err, "Unable to create Google project sheet");
  }
}

export async function createGoogleDriveProjectFolder(req, res) {
  try {
    const connection = await getUniversalGoogleConnection("drive");
    const config = getEnvConfig();
    const rootFolderId = config.driveRootFolderId.trim();

    if (!rootFolderId) {
      throw createError("GOOGLE_DRIVE_ROOT_FOLDER_ID is required for universal Drive mode.", 400);
    }

    const project = await getProjectWorkspaceContext(req.body.projectId);

    const folder = await googleApiRequest(
      `${GOOGLE_DRIVE_FILES_URL}?fields=id,name,webViewLink`,
      connection.accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          name: `${project.name} CRM Workspace`,
          mimeType: "application/vnd.google-apps.folder",
          parents: [rootFolderId],
        }),
      }
    );

    const summaryFile = await googleApiRequest(
      `${GOOGLE_DRIVE_FILES_URL}?fields=id,name,webViewLink`,
      connection.accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          name: "crm-summary.txt",
          parents: [folder.id],
          mimeType: "text/plain",
        }),
      }
    );

    await googleApiRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${summaryFile.id}?uploadType=media`,
      connection.accessToken,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "text/plain",
        },
        body: buildProjectSummaryText(project),
      }
    );

    return res.status(201).json({
      service: "drive",
      title: folder.name,
      folderId: folder.id,
      folderUrl: folder.webViewLink,
      summaryFileId: summaryFile.id,
      summaryFileUrl: summaryFile.webViewLink,
      project: {
        id: project.id,
        name: project.name,
      },
    });
  } catch (err) {
    return sendSafeError(res, err, "Unable to create Google Drive folder");
  }
}

export async function uploadGoogleDriveFile(req, res) {
  try {
    const connection = await getUniversalGoogleConnection("drive");
    const folderId = typeof req.body.folderId === "string" ? req.body.folderId.trim() : "";
    const projectId = typeof req.body.projectId === "string" ? req.body.projectId.trim() : "";

    if (!folderId) {
      throw createError("Drive folder is required.", 400);
    }

    if (!req.file) {
      throw createError("No file uploaded.", 400);
    }

    const providedName = typeof req.body.fileName === "string" ? req.body.fileName.trim() : "";
    const fileName = providedName || req.file.originalname || `upload-${Date.now()}`;
    const mimeType = req.file.mimetype || "application/octet-stream";

    const fileMeta = await googleApiRequest(
      `${GOOGLE_DRIVE_FILES_URL}?fields=id,name,mimeType,webViewLink,webContentLink,size`,
      connection.accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
          mimeType,
        }),
      }
    );

    await googleApiRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${fileMeta.id}?uploadType=media`,
      connection.accessToken,
      {
        method: "PATCH",
        headers: {
          "Content-Type": mimeType,
        },
        body: req.file.buffer,
      }
    );

    const uploadedFile = await googleApiRequest(
      `${GOOGLE_DRIVE_FILES_URL}/${fileMeta.id}?fields=id,name,mimeType,webViewLink,webContentLink,size`,
      connection.accessToken,
      {
        method: "GET",
      }
    );

    const project = projectId ? await getProjectWorkspaceContext(projectId) : null;

    return res.status(201).json({
      service: "drive-upload",
      folderId,
      fileId: uploadedFile.id,
      fileName: uploadedFile.name,
      mimeType: uploadedFile.mimeType,
      fileUrl: uploadedFile.webViewLink || uploadedFile.webContentLink || null,
      size: uploadedFile.size ? Number(uploadedFile.size) : req.file.size,
      project: project
        ? {
            id: project.id,
            name: project.name,
          }
        : null,
    });
  } catch (err) {
    return sendSafeError(res, err, "Unable to upload file to Google Drive");
  }
}
