import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import { AddToCartButton } from "@/components/AddToCartButton";
import { formatUsd } from "@/lib/money";
import type { PublicProduct } from "@/lib/public-types";

/**
 * A catalogue tile.
 *
 * Deliberately has no card chrome — no raised panel, no drop shadow. It is an
 * entry in a printed index: a plate, an ordinal, a name, a price. The
 * composition comes from the grid dropping alternate columns (see `.catalogue`
 * in globals.css), not from decoration on the tile.
 *
 * `product.image` is already OUR url (`/api/img/...`) — the mapper rewrote it.
 * Plain <img> rather than next/image on purpose: next/image's optimizer would
 * add a second fetch layer and its own URL scheme on top of a proxy that already
 * exists precisely to control image traffic.
 */
export function ProductCard({
  product,
  index,
}: {
  product: PublicProduct;
  /** 1-based position in the printed catalogue, for the ordinal + reveal stagger. */
  index?: number;
}) {
  const onSale = product.salePrice != null && product.salePrice < product.price;
  const ordinal = index != null ? String(index).padStart(2, "0") : null;

  return (
    <article
      className="tile"
      data-reveal
      style={{ "--i": Math.min(index ?? 0, 12) } as React.CSSProperties}
    >
      <Link href={`/product/${product.id}`} className="tile-frame" aria-label={product.name}>
        {ordinal ? (
          <span className="tile-index" aria-hidden>
            {ordinal}
          </span>
        ) : null}
        {onSale ? (
          <span className="tile-badge tag tag-sale">Sale</span>
        ) : product.featured ? (
          <span className="tile-badge tag tag-pick">House pick</span>
        ) : null}
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
        ) : (
          <MediaSlot label="Product photo" where="Catalog → the product" />
        )}
      </Link>

      <div className="tile-brand">{product.brand?.name ?? " "}</div>

      <Link href={`/product/${product.id}`} className="tile-name">
        {product.name}
      </Link>

      <div className="tile-foot">
        <span className="price">{formatUsd(product.unitPrice)}</span>
        {onSale ? <span className="price-was">{formatUsd(product.price)}</span> : null}
      </div>

      <div className="tile-action">
        <AddToCartButton productId={product.id} disabled={!product.available} small />
      </div>
    </article>
  );
}
