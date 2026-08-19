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
      <p className="faint" style={{ marginBottom: 18 }}>
        <Link href="/">← Back to shop</Link>
      </p>

      <div className="detail">
        <div className="thumb">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} />
          ) : (
            <span className="thumb-placeholder">No photo</span>
          )}
        </div>

        <div>
          {product.brand ? <p className="faint">{product.brand.name}</p> : null}
          <h1>{product.name}</h1>

          <div className="row" style={{ marginBottom: 18 }}>
            <span className="price" style={{ fontSize: "1.5rem" }}>
              {formatUsd(product.unitPrice)}
            </span>
            {onSale ? (
              <>
                <span className="price-was" style={{ fontSize: "1rem" }}>
                  {formatUsd(product.price)}
                </span>
                <span className="tag tag-sale">On sale</span>
              </>
            ) : null}
          </div>

          <div style={{ maxWidth: 320, marginBottom: 22 }}>
            <AddToCartButton productId={product.id} disabled={!product.available} />
          </div>

          {product.description ? (
            <p className="muted" style={{ whiteSpace: "pre-line" }}>
              {product.description}
            </p>
          ) : null}

          {showCannabinoids ? (
            <table className="spec-table">
              <tbody>
                {product.genetics ? (
                  <tr>
                    <td>Genetics</td>
                    <td>{product.genetics}</td>
                  </tr>
                ) : null}
                {product.thcPercentage != null ? (
                  <tr>
                    <td>THC</td>
                    <td>{product.thcPercentage}%</td>
                  </tr>
                ) : null}
                {product.cbdPercentage != null ? (
                  <tr>
                    <td>CBD</td>
                    <td>{product.cbdPercentage}%</td>
                  </tr>
                ) : null}
                {product.category ? (
                  <tr>
                    <td>Category</td>
                    <td>{product.category.name}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {product.tags.length > 0 ? (
            <div className="row" style={{ marginTop: 18 }}>
              {product.tags.slice(0, 8).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          <p className="faint" style={{ marginTop: 24 }}>
            Pay cash when your order arrives. Valid {profile.minAge}+ ID required at the door.
          </p>
        </div>
      </div>

      {related.length > 0 ? (
        <section style={{ marginTop: 54 }}>
          <h2>You might also like</h2>
          <div className="grid">
            {related.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
