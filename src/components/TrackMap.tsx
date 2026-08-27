"use client";

import { useEffect, useState } from "react";

/**
 * The map on the tracking page.
 *
 * It is an <img>, and that is the whole design. The upstream renders the map
 * server-side (it holds the Maps key) and streams a PNG, so this app needs no
 * maps SDK, no key in the markup, and — the part that matters — no CSP change:
 * `img-src 'self'` already covers a same-origin image, while a maps SDK would
 * need `script-src` and `connect-src` exceptions and would end the invariant
 * that the browser talks only to this app.
 *
 * THREE THINGS IT REFUSES TO DO:
 *
 *  1. Render a broken-image icon. There are several honest reasons for there to
 *     be no map — the driver hasn't been assigned, no coordinates yet, the shop
 *     has no Maps key — and none of them is worth explaining to someone who
 *     just wants to know where their order is. `onError` hides the whole block.
 *  2. Poll on its own clock. `refreshKey` comes from the parent's existing
 *     20-second poll, so the map moves when the data moves and a second timer
 *     cannot drift out of step with the status text beside it.
 *  3. Flash. A failed load stays hidden for the rest of the page's life rather
 *     than retrying every refresh, because a map that blinks in and out is
 *     worse than one that is simply absent.
 */
export function TrackMap({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // A new token is a different order; forget a previous order's failure.
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [token]);

  if (failed) return null;

  const src = `/api/orders/track/${encodeURIComponent(token)}/map?v=${refreshKey}`;

  return (
    <div className="track-map" data-ready={loaded || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Map showing your delivery address and, when one is assigned, your driver's position"
        width={640}
        height={320}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
