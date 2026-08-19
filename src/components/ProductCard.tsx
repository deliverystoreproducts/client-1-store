import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { formatUsd } from "@/lib/money";
import type { PublicProduct } from "@/lib/public-types";

/**
 * A catalog tile.
 *
 * `product.image` is already OUR url (`/api/img/...`) — the mapper rewrote it.
 * Plain <img> rather than next/image on purpose: next/image's optimizer would
 * add a second fetch layer and its own URL scheme on top of a proxy that already
 * exists precisely to control image traffic.
 */
export function ProductCard({ product }: { product: PublicProduct }) {
  const onSale = product.salePrice != null && product.salePrice < product.price;

  return (
    <article className="product-card">
      <Link href={`/product/${product.id}`} className="thumb" aria-label={product.name}>
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
        ) : (
          <span className="thumb-placeholder">No photo</span>
        )}
      </Link>
      <div className="product-body">
        {product.brand ? <span className="faint">{product.brand.name}</span> : null}
        <Link href={`/product/${product.id}`} className="product-name">
          {product.name}
        </Link>
        <div>
          <span className="price">{formatUsd(product.unitPrice)}</span>
          {onSale ? <span className="price-was">{formatUsd(product.price)}</span> : null}
        </div>
        <div className="product-actions">
          <AddToCartButton productId={product.id} disabled={!product.available} small />
        </div>
      </div>
    </article>
  );
}
