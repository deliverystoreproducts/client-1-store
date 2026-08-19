import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { formatUsd } from "@/lib/money";
import { getProductDetail, getStoreProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getProductDetail(Number(id));
  return { title: detail?.product.name ?? "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) notFound();

  const [detail, profile] = await Promise.all([getProductDetail(numeric), getStoreProfile()]);
  if (!detail) notFound();

  const { product, related } = detail;
  const onSale = product.salePrice != null && product.salePrice < product.price;

  // THC/CBD/genetics are shown only when the store has that display switched on
  // — some jurisdictions and some operators do not want potency on a web page.
  const showCannabinoids =
    profile.showCannabinoids &&
    (product.thcPercentage != null || product.cbdPercentage != null || !!product.genetics);

  return (
    <>
      <Link className="crumb" href="/" data-reveal style={{ "--i": 0 } as React.CSSProperties}>
        ← Back to the shelf
      </Link>

      {/* Masthead: the name gets the full measure of the page before the layout
          splits. Product photography rarely survives type sitting on top of it,
          so the composition breaks the column instead of overlapping it. */}
      <header className="detail-masthead">
        <span className="eyebrow" data-reveal style={{ "--i": 1 } as React.CSSProperties}>
          {product.brand?.name ?? (product.category?.name || "Catalogue")}
        </span>
        <h1
          className="display detail-title"
          data-reveal
          style={{ "--i": 2 } as React.CSSProperties}
        >
          {product.name}
        </h1>
      </header>

      <div className="detail">
        <div className="detail-media" data-reveal style={{ "--i": 3 } as React.CSSProperties}>
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} />
          ) : (
            <span className="tile-empty">No photo</span>
          )}
        </div>

        <div data-reveal style={{ "--i": 4 } as React.CSSProperties}>
          <div className="detail-price">
            <span className="price">{formatUsd(product.unitPrice)}</span>
            {onSale ? (
              <>
                <span className="price-was">{formatUsd(product.price)}</span>
                <span className="tag tag-sale">On sale</span>
              </>
            ) : null}
            {!product.available ? <span className="tag">Sold out</span> : null}
          </div>

          <div className="detail-buy">
            <AddToCartButton productId={product.id} disabled={!product.available} />
          </div>

          {product.description ? (
            <p className="detail-copy">{product.description}</p>
          ) : null}

          {showCannabinoids ? (
            <table className="spec">
              <caption className="sr-only">Product specification</caption>
              <tbody>
                {product.genetics ? (
                  <tr>
                    <th scope="row">Genetics</th>
                    <td>{product.genetics}</td>
                  </tr>
                ) : null}
                {product.thcPercentage != null ? (
                  <tr>
                    <th scope="row">THC</th>
                    <td>{product.thcPercentage}%</td>
                  </tr>
                ) : null}
                {product.cbdPercentage != null ? (
                  <tr>
                    <th scope="row">CBD</th>
                    <td>{product.cbdPercentage}%</td>
                  </tr>
                ) : null}
                {product.category ? (
                  <tr>
                    <th scope="row">Category</th>
                    <td>{product.category.name}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {product.tags.length > 0 ? (
            <div className="row mt-2">
              {product.tags.slice(0, 8).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          <p className="faint mt-3">
            Pay cash when your order arrives. Valid {profile.minAge}+ ID required at the door.
          </p>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-4">
          <div className="section-head">
            <span className="eyebrow">Also on the shelf</span>
            <hr />
          </div>
          <div className="catalogue">
            {related.slice(0, 8).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i + 1} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
