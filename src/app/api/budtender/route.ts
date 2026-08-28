import { isSameOriginRequest } from "@/lib/csrf";
import { getUpstreamConfig, isUpstreamConfigured } from "@/lib/kamui/env";
import { fail } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/budtender — the AI budtender, proxied.
 *
 * The browser talks to us; we talk to the commerce API's budtender with the
 * store key and pipe the SSE stream straight back. Same custody rule as every
 * other route here: the key and the upstream host never reach the browser.
 *
 * The per-visitor daily limit lives HERE (the upstream is a pure capability
 * behind the key and cannot tell visitors apart). In-memory per instance —
 * a redeploy resets it, which for a free chat limit is fine.
 */

export const dynamic = "force-dynamic";

const DAILY_LIMIT = 20;
const MAX_MESSAGES = 40;
const MAX_CONTENT = 4000;

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");
  if (!isUpstreamConfigured()) return fail(503, "unavailable");

  const limited = rateLimit(clientKey(req, "budtender"), DAILY_LIMIT, 24 * 60 * 60_000);
  if (!limited.ok) {
    return new Response(
      JSON.stringify({
        error: "You've reached today's limit of 20 messages. Come back tomorrow!",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: { messages?: unknown } | null = null;
  try {
    body = (await req.json()) as { messages?: unknown };
  } catch {
    body = null;
  }
  const raw = body?.messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    return fail(400, "invalid_request", { message: "Say something first." });
  }
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of raw) {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return fail(400, "invalid_request", { message: "Malformed message." });
    }
    messages.push({ role, content: content.slice(0, MAX_CONTENT) });
  }

  const cfg = getUpstreamConfig();
  const upstream = await fetch(`${cfg.baseUrl}/api/store/v1/budtender`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ messages }),
    // Streams run longer than the JSON timeout; no AbortSignal here on purpose.
  });

  if (!upstream.ok || !upstream.body) {
    // Upstream error bodies can name internals; the browser gets our words.
    const status = upstream.status === 403 ? 403 : 502;
    return new Response(
      JSON.stringify({
        error:
          status === 403
            ? "The AI budtender isn't available on this store."
            : "The budtender is having a moment. Try again shortly.",
      }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
