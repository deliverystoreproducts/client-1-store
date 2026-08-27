import "server-only";

import { UpstreamError } from "@/lib/kamui/errors";
import { publicStatusFor } from "@/lib/kamui/errors";
import type { ApiErrorBody } from "@/lib/public-types";

/**
 * The single exit point for our own /api routes.
 *
 * Rule: an upstream failure becomes a CODE and, at most, a short message we
 * wrote ourselves. Upstream text, statuses and URLs stop here. Errors are the
 * classic leak channel — nobody audits a 500 body.
 */

export function json<T>(data: T, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // BFF answers are per-session and must never sit in a shared cache.
      "Cache-Control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

export function fail(
  status: number,
  error: string,
  extra: Omit<ApiErrorBody, "error"> = {},
): Response {
  return json<ApiErrorBody>({ error, ...extra }, { status });
}

/** Copy for each upstream failure code. Written here, not echoed from upstream. */
const MESSAGES: Record<string, string> = {
  not_configured: "The store is temporarily unavailable.",
  unauthorized: "The store is temporarily unavailable.",
  forbidden: "The store is temporarily unavailable.",
  customer_unauthorized: "Please sign in again.",
  not_found: "Not found.",
  conflict: "Something in your cart is no longer available.",
  rejected: "We couldn't process that request.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  timeout: "The store is taking too long to respond. Please try again.",
  network: "The store is temporarily unavailable.",
  upstream_error: "The store is temporarily unavailable.",
};

/**
 * Codes where the caller's own wording is the better answer, because the
 * failure is about what the visitor did. For everything else — a dead backend,
 * a rejected API key — the caller's message would be a lie ("that code didn't
 * work" when in truth nothing was even asked), so the canned infrastructure
 * message wins.
 */
const CALLER_MAY_PHRASE = new Set([
  "customer_unauthorized",
  "rejected",
  "conflict",
  "not_found",
]);

export function failFromUpstream(e: unknown, callerMessage?: string): Response {
  if (e instanceof UpstreamError) {
    const message =
      callerMessage && CALLER_MAY_PHRASE.has(e.code)
        ? callerMessage
        : (MESSAGES[e.code] ?? "Something went wrong.");
    return fail(publicStatusFor(e.code), e.code, { message });
  }
  console.error("[bff] unexpected error", e);
  return fail(500, "internal_error", { message: "Something went wrong." });
}

/** Reads a JSON body, or null when it is absent/unparseable. */
export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
