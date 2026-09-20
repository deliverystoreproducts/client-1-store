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
 * serves the zooms a delivery map needs, and only the American West: California
 * and enough ocean and desert around it to FILL THE FRAME. The first version
 * allowed California's own box only, and on a wide screen the map had grey
 * bands down both sides where the refused tiles would have been.
 */
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 13;
/** The map cannot be panned outside this, so every tile it can ask for is inside it. */
export const VIEW_BOX = { minLat: 25.0, maxLat: 48.0, minLng: -137.0, maxLng: -101.0 };
const CA = VIEW_BOX;

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
