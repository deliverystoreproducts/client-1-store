import type { Metadata } from "next";
import Link from "next/link";
import { ZoneMap } from "@/components/ZoneMap";
import { CA_CITIES } from "@/lib/geo/ca-cities";
import type { Pin } from "@/lib/geo/tiles";
import { getDeliveryZones, getStoreProfile } from "@/lib/store";

/**
 * GEO-01: the delivery-area index — every city the shop delivers to, one card
 * each, linking to that city's page. The list is the shop's own delivery zones
 * (the ones checkout enforces), so it can never name a city an order is then
 * refused for. Nothing here is hand-maintained.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getStoreProfile();
  const name = profile.storeName;
  return {
    title: "Delivery areas",
    description: `Every city ${name} delivers to, with the minimum order for each. Same-day delivery, paid at the door.`,
    alternates: { canonical: "/delivery" },
  };
}

export default async function DeliveryIndexPage() {
  const [zones, profile] = await Promise.all([getDeliveryZones(), getStoreProfile()]);
  const name = profile.storeName;
  const local = zones.filter((z) => z.isLocal);
  const far = zones.filter((z) => !z.isLocal);
  // MAP-01: a pin for every zone the gazetteer can place. One it cannot is still in the lists below, which are
  // the authoritative ones; the map is the picture of them.
  const pins: Pin[] = zones.flatMap((z) => {
    const at = CA_CITIES[z.slug];
    return at ? [{ city: z.city, slug: z.slug, isLocal: z.isLocal, minimumOrder: z.minimumOrder, freeDelivery: z.freeDelivery, lat: at[0], lng: at[1] }] : [];
  });

  return (
    <section>
      <div className="wm-head">
        <h1 className="wm-title">Where we deliver</h1>
        {zones.length > 0 ? (
          <span className="faint num">
            {zones.length} {zones.length === 1 ? "city" : "cities"}
          </span>
        ) : null}
      </div>

      {zones.length === 0 ? (
        <div className="empty">
          <h2>Delivery areas are being updated</h2>
          <p className="muted">Check back shortly, or start an order and we&apos;ll confirm your address at checkout.</p>
          <p className="mt-2">
            <Link className="btn btn-ghost" href="/products">
              Browse the menu
            </Link>
          </p>
        </div>
      ) : (
        <>
          <p className="muted" style={{ maxWidth: "60ch" }}>
            {name} delivers to the cities below. Pick yours for the minimum order and how it works
            there. Your exact address is confirmed at checkout.
          </p>
          <ZoneMap pins={pins} />
          {[
            { title: local.length && far.length ? "Local delivery" : null, list: local },
            { title: local.length && far.length ? "Extended delivery" : null, list: far },
          ]
            .filter((g) => g.list.length > 0)
            .map((g) => (
              <div key={g.title ?? "all"}>
                {g.title ? <h2 className="section-head">{g.title}</h2> : null}
                <ul className="zone-grid">
                  {g.list.map((z) => (
                    <li key={z.slug}>
                      <Link href={`/delivery/${z.slug}`} className="zone-card">
                        <span className="zone-card-city">{z.city}</span>
                        <span className="zone-card-meta">
                          {z.minimumOrder > 0 ? `$${z.minimumOrder.toFixed(0)} minimum` : "No minimum"}
                          {z.freeDelivery ? " · free delivery" : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </>
      )}
    </section>
  );
}
