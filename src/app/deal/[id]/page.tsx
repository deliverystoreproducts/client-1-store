import type { Metadata } from "next";
import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { getDealDetail } from "@/lib/store";

/**
 * One deal, and the products it covers.
 *
 * The product list is resolved UPSTREAM — see getDealDetail. It arrives already
 * priced for this store, by the same code path that prices the shelf, so this
 * page and the tiles on it cannot disagree about money.
 *
 * There is deliberately no "you save $X" figure and no "add 2 more to unlock"
 * progress bar. Both require running the discount engine here, and the engine
 * that decides what a cart actually costs runs at checkout. A number on this
 * page that the checkout then contradicts is worse than no number: the first is
 * a broken promise, the second is just a promotion.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = Number((await params).id);
  const found = Number.isFinite(id) ? await getDealDetail(id) : null;
  if (!found) return { title: "Deal" };
  return {
    title: found.deal.name,
    description: found.deal.description ?? "A current offer.",
  };
}

export default async function DealPage({ params }: Params) {
  const id = Number((await params).id);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const found = await getDealDetail(id);
  if (!found) notFound();

  const { deal, products } = found;

  return (
    <section>
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/deals">Deals</Link>
        <span aria-hidden>/</span>
        <span>{deal.name}</span>
      </nav>

      <header className="deal-head">
        {deal.video ? (
          // Muted + autoplay + playsInline is the only combination mobile
          // browsers will start without a tap; `poster` keeps the frame from
          // being blank while it loads. No controls: it is a banner, not media
          // the customer came to watch.
          <video
            className="deal-hero"
            src={deal.video}
            poster={deal.image ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
        ) : deal.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="deal-hero" src={deal.image} alt="" />
        ) : (
          <MediaSlot
            className="deal-hero"
            label="Deal picture"
            where="Deals → the deal → Picture"
          />
        )}

        <div className="deal-head-body">
          <span className="eyebrow">Offer</span>
          <h1 className="display-sm">{deal.name}</h1>
          {deal.description ? <p className="lede">{deal.description}</p> : null}
        </div>
      </header>

      <div className="section-head">
        <span className="eyebrow">Included</span>
        <hr />
        {products.length > 0 ? (
          <span className="faint num">
            {products.length} item{products.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="empty">
          <h2>Nothing in this offer right now</h2>
          <p className="muted">
            The products this deal covers are out of stock or no longer on the shelf.
          </p>
          <p className="mt-2">
            <Link className="btn btn-ghost" href="/products">
              Browse everything
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="catalogue">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i + 1} />
            ))}
          </div>
          <p className="small muted mt-3">
            The offer is applied at checkout by the shop, not on this page — your basket total
            updates when you place the order.
          </p>
        </>
      )}
    </section>
  );
}
