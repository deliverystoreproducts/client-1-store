import Link from "next/link";
import { ZoneMap } from "@/components/ZoneMap";
import { CA_CITIES } from "@/lib/geo/ca-cities";
import type { Pin } from "@/lib/geo/tiles";
import type { PublicDeliveryZone } from "@/lib/public-types";

/** Zones → pins. A zone the gazetteer cannot place has no pin; /delivery still lists it. */
export function zonePins(zones: PublicDeliveryZone[]): Pin[] {
  return zones.flatMap((z) => {
    const at = CA_CITIES[z.slug];
    return at ? [{ city: z.city, slug: z.slug, isLocal: z.isLocal, minimumOrder: z.minimumOrder, freeDelivery: z.freeDelivery, lat: at[0], lng: at[1] }] : [];
  });
}

/**
 * MAP-01: "Where we deliver" on the home page, under the category rail. The
 * same map as /delivery at a smaller height, headed like the rails around it
 * (title + arrow), so it reads as one more shelf rather than a widget.
 *
 * The delivery-area LIST was taken off the home page at the owner's request on
 * 2026-08-27 (thirty city names is a wall of text). A map says the same thing in
 * one glance, which is why the owner asked for this back as a map, 2026-09-20.
 */
export function DeliveryMapSection({ zones }: { zones: PublicDeliveryZone[] }) {
  const pins = zonePins(zones);
  if (pins.length === 0) return null;
  return (
    <section className="cat-row" aria-labelledby="deliver-head">
      <div className="wm-head">
        <h2 className="wm-title" id="deliver-head">
          Where we deliver
        </h2>
        <span className="faint num">
          {zones.length} {zones.length === 1 ? "city" : "cities"}
        </span>
        <Link className="wm-more" href="/delivery" aria-label={`All ${zones.length} delivery areas`}>
          →
        </Link>
      </div>
      <ZoneMap pins={pins} compact />
    </section>
  );
}
