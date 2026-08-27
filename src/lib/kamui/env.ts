import "server-only";

/**
 * Upstream API configuration. SERVER ONLY.
 *
 * `server-only` above is a build-time tripwire: if any module in a "use client"
 * graph ever imports this file (directly or transitively), the build FAILS
 * instead of quietly bundling the API key into browser JavaScript.
 *
 * None of these vars may be renamed to NEXT_PUBLIC_*. See README.md.
 */

export interface UpstreamConfig {
  /** Origin of the upstream API, no trailing slash. */
  baseUrl: string;
  /** Full-privilege store-scoped key for one tenant. NEVER logged, never echoed. */
  apiKey: string;
  /** Per-request timeout in ms. */
  timeoutMs: number;
}

/**
 * Thrown when the server is not configured to talk upstream at all. Callers turn
 * this into a plain "store unavailable" page — the message here is safe to log
 * but is never rendered, because even a var name is more than the browser needs.
 */
export class UpstreamConfigError extends Error {
  readonly name = "UpstreamConfigError";
}

let cached: UpstreamConfig | null = null;

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new UpstreamConfigError("KAMUI_API_BASE_URL is not a valid absolute URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new UpstreamConfigError("KAMUI_API_BASE_URL must be http(s)");
  }
  const loopback =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]" ||
    parsed.hostname === "::1";
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:" && !loopback) {
    // The API key rides in an Authorization header on every call. Over plain
    // http that is a credential on the wire — refused, rather than quietly
    // shipped. Loopback is exempt: it never leaves the machine, and it is how a
    // production build gets smoke-tested against a stub.
    throw new UpstreamConfigError("KAMUI_API_BASE_URL must be https in production");
  }
  return trimmed;
}

export function getUpstreamConfig(): UpstreamConfig {
  if (cached) return cached;

  const baseUrl = process.env.KAMUI_API_BASE_URL;
  const apiKey = process.env.KAMUI_STORE_API_KEY;

  if (!baseUrl) throw new UpstreamConfigError("KAMUI_API_BASE_URL is not set");
  if (!apiKey) throw new UpstreamConfigError("KAMUI_STORE_API_KEY is not set");

  const timeoutRaw = Number(process.env.KAMUI_API_TIMEOUT_MS ?? "");
  const timeoutMs =
    Number.isFinite(timeoutRaw) && timeoutRaw >= 1000 && timeoutRaw <= 60_000
      ? timeoutRaw
      : 10_000;

  cached = { baseUrl: normalizeBaseUrl(baseUrl), apiKey: apiKey.trim(), timeoutMs };
  return cached;
}

/** True when the server can reach upstream at all. Used to route to /unavailable. */
export function isUpstreamConfigured(): boolean {
  try {
    getUpstreamConfig();
    return true;
  } catch {
    return false;
  }
}

/** The upstream origin, for same-origin checks inside the image proxy. */
export function upstreamOrigin(): string {
  return new URL(getUpstreamConfig().baseUrl).origin;
}
