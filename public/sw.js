/* YB storefront service worker.
 *
 * Scope is deliberately narrow: HTML is NEVER cached or served from cache —
 * the age gate is a server-side rewrite, and a cached page would be a copy of
 * whatever the server decided for a PREVIOUS request. Pages always go to the
 * network; the only navigation fallback is the offline notice. What IS cached:
 * hashed build assets, fonts and icons — all immutable, none of them gated.
 * /api/* is never touched.
 */
// BUMP VERSION whenever offline.html or the caching rules change — the old
// cache (including the precached offline page) lives until the version moves.
const VERSION = "ybs-v1";
const OFFLINE_URL = "/offline.html";
const CACHED_PATHS = ["/_next/static/", "/fonts/", "/icons/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // cache: "reload" skips the HTTP cache so the precached copy is fresh.
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    // The cache can be evicted under storage pressure; never respondWith
    // undefined — fall through to a plain-text last resort.
    event.respondWith(
      fetch(req).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then(
            (hit) =>
              hit ||
              new Response("You're offline. Reconnect and try again.", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              }),
          ),
      ),
    );
    return;
  }

  if (CACHED_PATHS.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((cache) => cache.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
