/**
 * GET /api/health — liveness for the container host.
 *
 * Deliberately the dumbest route in the app: it answers from this process and
 * touches nothing else. No upstream call, no config read, no cookie.
 *
 * That is the whole point. A health check that reaches the commerce API turns
 * *their* outage into *our* restart loop: the platform kills a perfectly healthy
 * container, the replacement fails the same check, and the storefront is 502
 * instead of showing its "temporarily closed" page. Whether upstream is reachable
 * is a monitoring question (watch the `[upstream]` log lines), not a liveness one.
 *
 * So: 200 means "this process is up and serving HTTP". Nothing more is claimed.
 */

// Never prerender, never cache — an answer from build time proves nothing.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Response {
  return new Response(JSON.stringify({ status: "ok", uptime: Math.round(process.uptime()) }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
