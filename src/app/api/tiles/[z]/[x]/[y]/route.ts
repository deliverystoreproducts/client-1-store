import { checkRate } from "@/lib/tile-budget";
import { tileAllowed } from "@/lib/geo/tiles";

/**
 * MAP-01 — GET /api/tiles/<z>/<x>/<y>: OpenStreetMap tiles for the delivery map, relayed through this store.
 *
 * Why a relay and not a direct <img> to openstreetmap.org: the security policy allows images from this origin
 * only (next.config.ts), and the privacy page says a visitor's browsing is not shared with third parties. Through
 * here, OpenStreetMap sees this server, not the visitor.
 *
 * OpenStreetMap's tile policy asks of a proxy exactly what this does: identify yourself in the User-Agent, cache
 * for at least a week, and do not be a heavy user. The allow-list (lib/geo/tiles) keeps it to California at the
 * zooms the map uses, so it cannot be used as somebody else's tile server; the memory cache means a tile is
 * fetched upstream once, however many customers look at the map.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = "https://tile.openstreetmap.org";
const UA = "yb-storefront/1.0 (delivery-area map; contact via https://yb13.online/contact)";
const CACHE = "public, max-age=604800, stale-while-revalidate=2592000";
const MAX_CACHED = 800; // ~20 KB each: a few MB, and far more than one state's worth of views needs

const cache = new Map<string, { body: ArrayBuffer; at: number }>();

const miss = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, ctx: { params: Promise<{ z: string; x: string; y: string }> }) {
  const p = await ctx.params;
  if (![p.z, p.x, p.y.replace(/\.png$/, "")].every((s) => /^\d{1,7}$/.test(s))) return miss(404);
  const z = Number(p.z), x = Number(p.x), y = Number(p.y.replace(/\.png$/, ""));
  if (!tileAllowed(z, x, y)) return miss(404);

  const key = `${z}/${x}/${y}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 7 * 86_400_000) return new Response(hit.body, { headers: { "Content-Type": "image/png", "Cache-Control": CACHE } });

  if (!checkRate()) return miss(429); // upstream fetches only; cached tiles are never refused
  try {
    const res = await fetch(`${UPSTREAM}/${key}.png`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/png")) return miss(502);
    const body = await res.arrayBuffer();
    if (body.byteLength > 400_000) return miss(502);
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
    cache.set(key, { body, at: Date.now() });
    return new Response(body, { headers: { "Content-Type": "image/png", "Cache-Control": CACHE } });
  } catch {
    return miss(504);
  }
}
