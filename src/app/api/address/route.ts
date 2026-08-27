import { clientKey, rateLimit } from "@/lib/rate-limit";
import { json, fail } from "@/lib/http";

/**
 * GET /api/address?q= — address suggestions for the checkout/registration
 * forms, proxied server-side through Photon (photon.komoot.io, OSM data).
 *
 * WHY PHOTON: it is free, keyless, and built for search-as-you-type — unlike
 * Nominatim, whose usage policy explicitly forbids autocomplete. WHY PROXIED:
 * the browser on this site talks to this origin and nothing else; routed here,
 * the visitor's IP and their half-typed home address never reach a third
 * party. Results are biased to LA and filtered to the US.
 *
 * This is ASSISTANCE, not authority: free text still works (a new building
 * OSM hasn't mapped must not be unorderable), and serviceability is enforced
 * by the backend's delivery-zone check at checkout, not here.
 *
 * Community service, no SLA — so: tight timeout, per-client throttle, an hour
 * of per-query caching, and empty-on-failure (a dead suggester must never
 * block typing). If volume outgrows courtesy use, self-host Photon or move to
 * a keyed provider behind this same route; the browser contract stays.
 */

export const dynamic = "force-dynamic";

const BASE = (process.env.ADDRESS_SUGGEST_BASE_URL || "https://photon.komoot.io").replace(/\/$/, "");
const PER_CLIENT = { limit: 30, windowMs: 60_000 };

interface PhotonFeature {
  properties?: {
    countrycode?: string; name?: string; housenumber?: string; street?: string;
    city?: string; district?: string; state?: string; postcode?: string;
  };
}

function label(p: NonNullable<PhotonFeature["properties"]>): string {
  const line1 = [p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street || p.name]
    .filter(Boolean).join("");
  const parts = [line1, p.district && p.district !== p.city ? p.district : null,
                 p.city, p.state, p.postcode].filter(Boolean);
  return [...new Set(parts)].join(", ");
}

export async function GET(req: Request): Promise<Response> {
  const limited = rateLimit(clientKey(req, "addr"), PER_CLIENT.limit, PER_CLIENT.windowMs);
  if (!limited.ok) return json({ suggestions: [] }, { status: 200 });

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 3 || q.length > 120) return json({ suggestions: [] });

  try {
    const url =
      `${BASE}/api/?q=${encodeURIComponent(q)}` +
      `&limit=6&lang=en&lat=34.05&lon=-118.24`; // LA bias
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6_000),
      headers: { "User-Agent": "yb-storefront-address-suggest" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return json({ suggestions: [] });
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    const suggestions = (data.features ?? [])
      .filter((f) => f.properties?.countrycode?.toUpperCase() === "US")
      .map((f) => label(f.properties!))
      .filter((s) => s.length > 5 && !seen.has(s) && seen.add(s))
      .slice(0, 6);
    return json({ suggestions });
  } catch {
    return json({ suggestions: [] }); // a dead suggester never blocks typing
  }
}
