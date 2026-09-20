/**
 * MAP-01 — which map tiles this store will fetch on a visitor's behalf. PURE.
 *
 * The delivery map's tiles come from OpenStreetMap THROUGH this store
 * (/api/tiles/z/x/y), for two reasons: the security policy lets a page load
 * images from this origin only, and relaying means a visitor's IP address never
 * reaches a third party, which is what the privacy page promises.
 *
 * A relay that fetches any tile asked of it is a free tile server for the whole
 * internet, paid for by this shop and blamed on it by OpenStreetMap. So it only
 * serves the zooms a delivery map needs, and only tiles that touch California.
 */
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 13;
const CA = { minLat: 32.0, maxLat: 42.5, minLng: -125.0, maxLng: -113.5 };

/** Standard slippy-map tile numbering (Web Mercator). */
export function tileOf(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return { x: Math.floor(((lng + 180) / 360) * n), y: Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n) };
}

export function tileAllowed(z: number, x: number, y: number): boolean {
  if (![z, x, y].every(Number.isInteger) || z < MIN_ZOOM || z > MAX_ZOOM) return false;
  const nw = tileOf(CA.maxLat, CA.minLng, z), se = tileOf(CA.minLat, CA.maxLng, z);
  return x >= nw.x && x <= se.x && y >= nw.y && y <= se.y;
}

export interface ZoneIn { city: string; slug: string; isLocal: boolean; minimumOrder: number; freeDelivery: boolean }
export interface Pin extends ZoneIn { lat: number; lng: number }
