import "server-only";

/**
 * A ceiling on how fast this store asks OpenStreetMap for tiles it has not cached: 40 a second, whoever is
 * asking. A person opening the map needs about twenty, once. Anything that sustains more than this is a scraper
 * using the relay, and the right answer to it is "no", not a bill or a ban from OpenStreetMap.
 */
let windowStart = 0;
let used = 0;
export function checkRate(limit = 40): boolean {
  const now = Date.now();
  if (now - windowStart >= 1000) { windowStart = now; used = 0; }
  return ++used <= limit;
}
