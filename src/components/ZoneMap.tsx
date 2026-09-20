"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Pin } from "@/lib/geo/tiles";
import { MAX_ZOOM, MIN_ZOOM, VIEW_BOX } from "@/lib/geo/tiles";

/**
 * MAP-01: a real map of where the shop delivers. OpenStreetMap, a pin on every
 * delivery city, tap a pin for the minimum order and a link to that city's page.
 *
 * Leaflet is bundled with the site and the tiles come through /api/tiles, so the
 * security policy is untouched (nothing loads from another origin) and a
 * visitor's IP never reaches a third party. Leaflet needs `window`, so it is
 * imported inside the effect: the server renders an empty box of the right
 * height and the map fills it in the browser.
 *
 * DARK by CSS: the tile pane is inverted and re-tinted (globals.css), which turns
 * OpenStreetMap's daylight cartography into a night map without a second tile
 * provider, a key, or a licence to read. Pins are CSS too, not Leaflet's PNG
 * markers: those are resolved relative to the stylesheet at runtime, which a
 * bundler breaks, and a missing marker image is a map with no pins.
 *
 * The "Leaflet" prefix is removed from the corner credit (Leaflet allows that);
 * the OpenStreetMap credit stays, because their licence requires it.
 */
export function ZoneMap({ pins }: { pins: Pin[] }) {
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || pins.length === 0) return;
    let dead = false;
    let cleanup = () => {};
    void import("leaflet").then(({ default: L }) => {
      if (dead) return;
      const limits = L.latLngBounds([VIEW_BOX.minLat, VIEW_BOX.minLng], [VIEW_BOX.maxLat, VIEW_BOX.maxLng]);
      const map = L.map(el, {
        minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, zoomSnap: 0.25, zoomDelta: 0.5, scrollWheelZoom: false,
        maxBounds: limits, maxBoundsViscosity: 1, zoomControl: false, attributionControl: false,
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.control.attribution({ prefix: false, position: "bottomleft" }).addTo(map);
      L.tileLayer("/api/tiles/{z}/{x}/{y}", {
        minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, bounds: limits,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }).addTo(map);

      const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
      for (const p of pins) {
        const icon = L.divIcon({ className: "", html: '<span class="zmap-pin"></span>', iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10] });
        const min = p.minimumOrder > 0 ? `$${p.minimumOrder.toFixed(0)} minimum` : "No minimum";
        L.marker([p.lat, p.lng], { icon, title: p.city, alt: `Delivery in ${p.city}`, keyboard: true, riseOnHover: true })
          .addTo(map)
          .bindPopup(
            `<span class="zmap-pop-city">${esc(p.city)}</span><span class="zmap-pop-meta">${min}${p.freeDelivery ? " · free delivery" : ""}</span><a class="zmap-pop-link" href="/delivery/${encodeURIComponent(p.slug)}">See delivery details →</a>`,
            { closeButton: false, className: "zmap-pop", maxWidth: 240 },
          );
      }
      // Frame the pins, with a little more room on the left where the ocean is: the land (and every pin) then
      // sits slightly right of centre, which is how California reads on a wide screen.
      map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { paddingTopLeft: [60, 36], paddingBottomRight: [36, 36], maxZoom: 11 });
      // Wheel-zoom only after a click: a map that eats the page's scroll is the first thing people hate about maps.
      map.once("focus", () => map.scrollWheelZoom.enable());
      cleanup = () => map.remove();
    });
    return () => { dead = true; cleanup(); };
  }, [pins]);

  if (pins.length === 0) return null;
  return (
    <figure className="zmap">
      <div ref={box} className="zmap-canvas" role="application" aria-label={`Map with a pin on each of the ${pins.length} cities we deliver to`} />
      <figcaption className="small muted">
        Tap a pin for that city&apos;s minimum order. Pins mark city centres; your exact address is confirmed at checkout.
      </figcaption>
    </figure>
  );
}
