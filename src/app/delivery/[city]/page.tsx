import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getDeliveryZone, getDeliveryZones, getStoreProfile } from "@/lib/store";

// Same source the root layout uses for canonical/metadataBase.
const SITE_ORIGIN = (process.env.SITE_ORIGIN ?? "").replace(/\/+$/, "");

/**
 * GEO-01: one page per delivery city — the organic entry for "delivery
 * <city>" searches. Everything on it is the shop's own data (zone minimum,
 * cities nearby, categories, contact), so the page stays true without anyone
 * editing it, and the copy is written around the facts that differ per city.
 *
 * Compliance framing is the same as the FAQ's: § 26154 forbids untrue or
 * misleading statements, so no delivery time is promised, and the fee is only
 * mentioned when it is zero (a non-zero fee is never collected by any order
 * path — see DeliveryZoneResponse).
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { city } = await params;
  const [zone, profile] = await Promise.all([getDeliveryZone(city), getStoreProfile()]);
  if (!zone) return { title: "Delivery area not found", robots: { index: false, follow: false } };
  const name = profile.storeName;
  const min = zone.minimumOrder > 0 ? `$${zone.minimumOrder.toFixed(0)} minimum` : "no minimum";
  return {
    title: `Delivery in ${zone.city}`,
    description: `${name} delivers to ${zone.city}: same-day, paid at the door, ${min}${zone.freeDelivery ? ", free delivery" : ""}. Order online, show ID at the door.`,
    alternates: { canonical: `/delivery/${zone.slug}` },
    openGraph: { title: `${name} delivery in ${zone.city}`, type: "website" },
  };
}

function pickNearby<T extends { slug: string; isLocal: boolean }>(all: T[], current: T, n = 8): T[] {
  const others = all.filter((z) => z.slug !== current.slug);
  const sameTier = others.filter((z) => z.isLocal === current.isLocal);
  const rest = others.filter((z) => z.isLocal !== current.isLocal);
  return [...sameTier, ...rest].slice(0, n);
}

export default async function DeliveryCityPage({ params }: Params) {
  const { city } = await params;
  const [zone, zones, profile, categories] = await Promise.all([
    getDeliveryZone(city),
    getDeliveryZones(),
    getStoreProfile(),
    getCategories(),
  ]);
  if (!zone) notFound();

  const name = profile.storeName;
  const nearby = pickNearby(zones, zone);
  const topCategories = [...categories].sort((a, b) => b.productCount - a.productCount).slice(0, 6);
  const minText = zone.minimumOrder > 0 ? `$${zone.minimumOrder.toFixed(0)}` : "None";
  const age = profile.minAge;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${name} delivery in ${zone.city}`,
    serviceType: "Same-day delivery",
    areaServed: { "@type": "City", name: zone.city },
    provider: { "@type": "Store", name, ...(SITE_ORIGIN ? { url: SITE_ORIGIN } : {}) },
    ...(SITE_ORIGIN ? { url: `${SITE_ORIGIN}/delivery/${zone.slug}` } : {}),
    ...(zone.minimumOrder > 0
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: zone.minimumOrder.toFixed(2),
            description: "Minimum order",
          },
        }
      : {}),
  };

  const faq = [
    {
      q: `Do you deliver to ${zone.city}?`,
      a: `Yes. ${zone.city} is one of the cities ${name} delivers to. Enter your address at checkout and it is confirmed before you pay.`,
    },
    {
      q: `Is there a minimum order in ${zone.city}?`,
      a:
        zone.minimumOrder > 0
          ? `The minimum order for ${zone.city} is $${zone.minimumOrder.toFixed(0)} before tax. Checkout tells you if you're under it.`
          : `There is no minimum order for ${zone.city}.`,
    },
    {
      q: "How do I pay?",
      a: "At the door, when the driver arrives. Nothing is charged online. Accepted payment methods are shown at checkout.",
    },
    {
      q: "What do I need at the door?",
      a: `A valid government-issued ID showing you are ${age} or older. The driver checks it on every delivery, no exceptions.`,
    },
    {
      q: "How long does delivery take?",
      a: "It depends on the day, the route and where you are. You get a text when your driver is on the way, with a live tracking link.",
    },
  ];

  return (
    <article className="legal">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      <p className="faint">
        <Link href="/delivery">Delivery areas</Link> · {zone.city}
      </p>
      <h1 className="display">Delivery in {zone.city}</h1>
      <p>
        {name} delivers to {zone.city}
        {zone.isLocal ? ", one of our local delivery cities" : ""}. Order from the full menu online, pay
        the driver at your door, and show your ID when they arrive.
      </p>

      <div className="zone-facts" aria-label="Delivery details">
        <div className="zone-fact">
          <span className="zone-fact-k">Minimum order</span>
          <span className="zone-fact-v num">{minText}</span>
        </div>
        {zone.freeDelivery ? (
          <div className="zone-fact">
            <span className="zone-fact-k">Delivery fee</span>
            <span className="zone-fact-v">Free</span>
          </div>
        ) : null}
        <div className="zone-fact">
          <span className="zone-fact-k">Payment</span>
          <span className="zone-fact-v">At the door</span>
        </div>
        <div className="zone-fact">
          <span className="zone-fact-k">ID required</span>
          <span className="zone-fact-v num">{age}+</span>
        </div>
      </div>

      <div className="zone-cta">
        <Link className="btn" href="/products">
          Order in {zone.city}
        </Link>
        <Link className="btn btn-ghost" href="/deals">
          Today&apos;s deals
        </Link>
      </div>

      <section>
        <h2>How delivery works in {zone.city}</h2>
        <p>
          Add what you want to your cart and enter your {zone.city} address at checkout. We confirm
          the address is inside our delivery area before you place the order
          {zone.minimumOrder > 0 ? `, and check that your cart meets the $${zone.minimumOrder.toFixed(0)} minimum` : ""}.
          You pay the driver when they arrive; nothing is charged online. When your driver leaves,
          you get a text with a live tracking link.
        </p>
      </section>

      {topCategories.length > 0 ? (
        <section>
          <h2>What you can order in {zone.city}</h2>
          <p>
            The whole menu delivers to {zone.city}. The biggest shelves right now:{" "}
            {topCategories.map((c, i) => (
              <span key={c.id}>
                <Link href={`/category/${c.id}`}>{c.name}</Link>
                {i < topCategories.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </section>
      ) : null}

      {faq.map((f) => (
        <section key={f.q}>
          <h2>{f.q}</h2>
          <p>{f.a}</p>
        </section>
      ))}

      {nearby.length > 0 ? (
        <section>
          <h2>Nearby delivery areas</h2>
          <div className="zone-nearby">
            {nearby.map((z) => (
              <Link key={z.slug} href={`/delivery/${z.slug}`}>
                {z.city}
              </Link>
            ))}
            <Link href="/delivery">All areas</Link>
          </div>
        </section>
      ) : null}

      {profile.licenseNumber ? (
        <p className="faint">Licensed retailer · License {profile.licenseNumber}</p>
      ) : null}
    </article>
  );
}
