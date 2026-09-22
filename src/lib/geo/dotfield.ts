/**
 * MAP-02 — the home page's dot map, as data. PURE: no React, no DOM, no canvas.
 *
 * The owner's brief (2026-09-22): not a street map, a SCHEMATIC. "I love the idea of dots … more interactive is
 * cool." So the whole section is a field of dots: ocean, the neighbouring states, and California brighter on
 * top, with the shop's delivery areas glowing. Filling the band with ocean and desert is what makes a tall state
 * work in a wide slot; the first try drew California alone and left most of the box empty.
 *
 * The land mask is generated once (scripts/gen-dotfield.py → dotfield-grid.ts). Everything that depends on the
 * SHOP (which dots glow, the region labels) is computed here from its zones, so a new zone lights up by itself.
 */
import { DOT_ROWS } from "@/lib/geo/dotfield-grid";
import type { Pin } from "@/lib/geo/tiles";

/** Must match scripts/gen-dotfield.py. Design space is W×H; the component scales it to the section. */
export const GRID = { W: 1260, H: 460, STEP: 10, MAX_LAT: 42.6, MIN_LAT: 31.9, LNG0: -131.5 } as const;
const K = Math.cos((37.3 * Math.PI) / 180);
const S = GRID.H / (GRID.MAX_LAT - GRID.MIN_LAT);
/** Design px per mile (latitude: 69 miles a degree). */
const PX_PER_MILE = S / 69;
/** California's middle, in design x: what a narrow screen keeps centred. */
export const CA_CENTER_X = 420;

export function toXY(lat: number, lng: number): [number, number] {
  return [(lng - GRID.LNG0) * K * S, (GRID.MAX_LAT - lat) * S];
}

/** 0 ocean, 1 neighbouring state, 2 California. heat: 0 none, 1 near a delivery city, 2 in one. reg: region index. */
export interface Dot { x: number; y: number; t: 0 | 1 | 2; heat: 0 | 1 | 2; reg: number }
export interface Region { id: number; name: string; x: number; y: number; pins: Pin[] }
export interface DotPin extends Pin { x: number; y: number; reg: number }

const HOT_MILES = 15;
const WARM_MILES = 34;

export function gridDots(): Omit<Dot, "heat" | "reg">[] {
  const out: Omit<Dot, "heat" | "reg">[] = [];
  DOT_ROWS.forEach((row, r) => {
    const gy = r * GRID.STEP;
    for (let c = 0; c < row.length; c++) {
      out.push({ x: c * GRID.STEP + (r % 2 ? GRID.STEP / 2 : 0), y: gy, t: Number(row[c]) as 0 | 1 | 2 });
    }
  });
  return out;
}

/** Single-link clusters in miles: 70 keeps Visalia with Fresno and a metro's suburbs together, and never bridges
 *  the farmland between the Central Valley and either metro. */
function clusters(pins: DotPin[], linkMiles = 44): DotPin[][] {
  const parent = pins.map((_, i) => i);
  const find = (i: number): number => { const up = parent[i] as number; return up === i ? i : (parent[i] = find(up)); };
  pins.forEach((a, i) => pins.forEach((b, j) => {
    if (j > i && Math.hypot(a.x - b.x, a.y - b.y) / PX_PER_MILE <= linkMiles) parent[find(i)] = find(j);
  }));
  const g = new Map<number, DotPin[]>();
  pins.forEach((p, i) => g.set(find(i), [...(g.get(find(i)) ?? []), p]));
  return [...g.values()].sort((a, b) => b.length - a.length);
}

const REGION_NAMES: { name: string; minLat: number; maxLat: number; minLng: number; maxLng: number }[] = [
  { name: "Southern California", minLat: 32.4, maxLat: 34.75, minLng: -119.4, maxLng: -116.3 },
  { name: "Sacramento area", minLat: 38.2, maxLat: 39.2, minLng: -122.0, maxLng: -120.8 },
  { name: "Bay Area", minLat: 37.1, maxLat: 38.2, minLng: -122.8, maxLng: -121.6 },
  { name: "Central Valley", minLat: 35.0, maxLat: 38.2, minLng: -121.6, maxLng: -118.6 },
  { name: "San Diego area", minLat: 32.5, maxLat: 33.4, minLng: -117.4, maxLng: -116.8 },
];

export function regionName(pins: Pin[]): string {
  const lat = pins.reduce((s, p) => s + p.lat, 0) / pins.length, lng = pins.reduce((s, p) => s + p.lng, 0) / pins.length;
  const r = REGION_NAMES.find((b) => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng);
  return r ? r.name : pins.length > 1 ? `Around ${pins[0]!.city}` : pins[0]!.city;
}

/** The shop's field: every dot with its heat and region, the placed pins, and one labelled region per cluster. */
export function buildField(pins: Pin[]): { dots: Dot[]; pins: DotPin[]; regions: Region[] } {
  const placed: DotPin[] = pins.map((p) => { const [x, y] = toXY(p.lat, p.lng); return { ...p, x, y, reg: -1 }; });
  const groups = clusters(placed);
  const regions: Region[] = groups.map((g, id) => {
    g.forEach((p) => (p.reg = id));
    // Labels sit to the right of their cluster's top-right city, where the land thins out.
    const x = Math.max(...g.map((p) => p.x)), y = g.reduce((s, p) => s + p.y, 0) / g.length;
    return { id, name: regionName(g), x, y, pins: [...g].sort((a, b) => a.city.localeCompare(b.city)) };
  });
  const dots: Dot[] = gridDots().map((d) => {
    if (d.t !== 2 || placed.length === 0) return { ...d, heat: 0, reg: -1 };
    let best = Infinity, reg = -1;
    for (const p of placed) { const e = Math.hypot(p.x - d.x, p.y - d.y); if (e < best) { best = e; reg = p.reg; } }
    const miles = best / PX_PER_MILE;
    return { ...d, heat: miles < HOT_MILES ? 2 : miles < WARM_MILES ? 1 : 0, reg: miles < WARM_MILES ? reg : -1 };
  });
  return { dots, pins: placed, regions };
}
