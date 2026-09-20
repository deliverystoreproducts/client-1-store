/**
 * MAP-01 — "do you deliver to my city?", answered from what the page already has. PURE.
 *
 * Three answers, and the third is the one worth building: a city we deliver to
 * (fly to its pin), a city we have never heard of (say so), and a real
 * California city we do NOT deliver to, where the useful reply is not "no" but
 * "not yet; the closest place we do is Anaheim, 9 miles away".
 */
import { CA_CITIES } from "@/lib/geo/ca-cities";
import { citySlug } from "@/lib/city-slug";
import type { Pin } from "@/lib/geo/tiles";

export type CityAnswer =
  | { kind: "delivers"; pin: Pin }
  | { kind: "nearby"; asked: string; nearest: Pin; miles: number }
  | { kind: "unknown" };

const R = Math.PI / 180;
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dy = (a.lat - b.lat) * 69.1;
  const dx = (a.lng - b.lng) * 69.1 * Math.cos(((a.lat + b.lat) / 2) * R);
  return Math.hypot(dx, dy);
}

const title = (slug: string) => slug.split("-").map((w) => (w.length <= 2 && w !== "el" && w !== "la" ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1))).join(" ");

/** Cities to offer while typing: ones we deliver to first (prefix, then anywhere in the name), capped. */
export function suggest(query: string, pins: Pin[], max = 6): Pin[] {
  const q = citySlug(query);
  if (q.length < 2) return [];
  const starts = pins.filter((p) => p.slug.startsWith(q));
  const has = pins.filter((p) => !p.slug.startsWith(q) && p.slug.includes(q));
  return [...starts, ...has].sort((a, b) => Number(b.slug.startsWith(q)) - Number(a.slug.startsWith(q)) || a.city.localeCompare(b.city)).slice(0, max);
}

export function answer(query: string, pins: Pin[]): CityAnswer {
  const q = citySlug(query);
  if (q.length < 2 || pins.length === 0) return { kind: "unknown" };
  const exact = pins.find((p) => p.slug === q) ?? suggest(query, pins, 1)[0];
  if (exact) return { kind: "delivers", pin: exact };
  // A real city we do not serve: exact name, or the only city that starts with what was typed.
  const known = CA_CITIES[q] ? q : (() => { const m = Object.keys(CA_CITIES).filter((s) => s.startsWith(q)); return m.length === 1 ? m[0] : undefined; })();
  if (!known) return { kind: "unknown" };
  const at = { lat: CA_CITIES[known]![0], lng: CA_CITIES[known]![1] };
  const nearest = pins.reduce((best, p) => (milesBetween(at, p) < milesBetween(at, best) ? p : best), pins[0]!);
  return { kind: "nearby", asked: title(known), nearest, miles: Math.max(1, Math.round(milesBetween(at, nearest))) };
}
