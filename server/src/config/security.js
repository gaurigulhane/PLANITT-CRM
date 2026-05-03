/** Browser Origin header never includes a trailing slash — entries here must match exactly. */
export function normalizeOrigin(origin) {
  return origin.trim().replace(/\/+$/, "");
}

const DEFAULT_LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://planitt-crm-client.vercel.app",
].map((o) => normalizeOrigin(o));

export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function getJwtSecret() {
  return getRequiredEnv("JWT_SECRET");
}

export function getAllowedCorsOrigins() {
  const raw = process.env.CORS_ORIGINS ?? "";
  const configured = raw
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  const clientUrl = normalizeOrigin(process.env.CLIENT_URL ?? "");
  if (clientUrl) {
    return [clientUrl];
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_LOCAL_ORIGINS;
  }

  throw new Error("CORS_ORIGINS or CLIENT_URL must be configured in production.");
}

/**
 * When true, allows any https://*.vercel.app origin (production + preview deploys).
 * Set on Render if browser shows "Failed to fetch" / connection errors only from preview URLs.
 */
export function corsAllowsAllVercelAppHosts() {
  return String(process.env.CORS_ALLOW_VERCEL_APP ?? "").toLowerCase() === "true";
}

export function isCorsOriginAllowed(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (!corsAllowsAllVercelAppHosts()) {
    return false;
  }

  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
