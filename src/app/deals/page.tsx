import type { Metadata } from "next";
import Link from "next/link";
import { DealCard } from "@/components/DealCard";
import { getDeals } from "@/lib/store";

/**
 * Every promotion running right now.
 *
 * What this page does NOT do is price anything. The platform's deal engine runs
 * at checkout and is the only thing that decides what a cart costs — a second
 * engine here would eventually disagree with it, and a customer would be shown
 * one price and charged another. So these are posters: what is on, what it
 * covers, where to start.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deals",
  description: "Bundles, BOGOs and current offers.",
};

export default async function DealsPage() {
  const deals = await getDeals();

  return (
    <section>
      <div className="section-head">
        <span className="eyebrow">Deals</span>
        <hr />
        {deals.length > 0 ? (
          <span className="faint num">
            {deals.length} running
          </span>
        ) : null}
      </div>

      {deals.length === 0 ? (
        <div className="empty">
          <h2>No offers running right now</h2>
          <p className="muted">
            Nothing is on today — or the catalogue is briefly out of reach. Either way the shelf
            is still open.
          </p>
          <p className="mt-2">
            <Link className="btn btn-ghost" href="/products">
              Browse everything
            </Link>
          </p>
        </div>
      ) : (
        <div className="deals-grid">
          {deals.map((d, i) => (
            <DealCard key={d.id} deal={d} index={i + 1} />
          ))}
        </div>
      )}
    </section>
  );
}
