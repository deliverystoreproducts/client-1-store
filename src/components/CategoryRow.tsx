import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import type { PublicCategory, PublicProduct } from "@/lib/public-types";

/**
 * One category, one row of its products, a big heading, and a way through.
 *
 * This is the shape the reference storefront is built from — Flower, Pre Roll,
 * Vape Pens, Edibles, each its own band — and it is the pattern for a shop
 * whose customers arrive knowing the FORM they want before the brand. A single
 * mixed grid asks them to scan for it; a row per category answers before they
 * scroll.
 *
 * The heading is deliberately the loudest type on the page after the hero. On a
 * shelf this dense, the category name is the wayfinding, so it has to win over
 * the product names beneath it.
 *
 * A row renders only when the category actually has products. An empty band
 * under a big heading reads as a broken shop, and it is worse than the category
 * simply not appearing.
 */
export function CategoryRow({
  category,
  products,
  index = 0,
}: {
  category: PublicCategory;
  products: PublicProduct[];
  index?: number;
}) {
  if (products.length === 0) return null;

  return (
    <section className="cat-row" aria-labelledby={`cat-${category.id}-head`}>
      <div className="cat-row-head">
        <h2 className="cat-row-name" id={`cat-${category.id}-head`}>
          {category.name}
        </h2>
        <Link className="cat-row-all" href={`/category/${category.id}`}>
          View all <span className="num">{category.productCount}</span>
          <span className="sr-only"> {category.name} products</span> →
        </Link>
      </div>

      <div className="catalogue catalogue-row">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={index * 100 + i + 1} />
        ))}
      </div>
    </section>
  );
}
