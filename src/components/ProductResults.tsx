import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { browseQueryString, type BrowseFilters, type PinnedDimension } from "@/lib/catalog-query";
import type { PublicProductPage } from "@/lib/public-types";

/**
 * Grid + pager + the three empty states, shared by every shelf page.
 *
 * The three states are deliberately distinct, and none of them may explain
 * itself in terms of the backend:
 *
 *   unreachable  — we could not READ the catalogue. Not the customer's doing,
 *                  and we do not say why (that is upstream's business).
 *   no matches   — the filters are real, the shelf is real, the intersection is
 *                  empty. Offer a way out.
 *   nothing yet  — the shop has published no products at all.
 *
 * Collapsing "unreachable" into "no matches" is the failure worth guarding
 * against: it tells a customer the shop is empty when in fact we are broken.
 */
export function ProductResults({
  results,
  filters,
  basePath,
  pinned = null,
  pageSize,
  emptyHint,
}: {
  results: PublicProductPage;
  filters: BrowseFilters;
  basePath: string;
  pinned?: PinnedDimension;
  /** Rows per page — the ordinal offset, so the last (short) page keeps counting. */
  pageSize: number;
  /** What "nothing here" means on THIS page, when no filters are applied. */
  emptyHint?: string;
}) {
  if (results.unavailable) {
    return (
      <div className="empty">
        <h2>The shelf is briefly out of reach</h2>
        <p className="muted">
          We couldn&apos;t load the catalogue just now. Please try again in a moment.
        </p>
      </div>
    );
  }

  if (results.products.length === 0) {
    return (
      <div className="empty">
        <h2>Nothing matches that yet</h2>
        <p className="mt-2">
          <Link className="btn btn-ghost" href={basePath}>
            Clear filters
          </Link>
        </p>
        {emptyHint ? <p className="muted mt-2">{emptyHint}</p> : null}
      </div>
    );
  }

  const pageHref = (n: number) => `${basePath}${browseQueryString(filters, { page: n }, pinned)}`;
  const firstOnPage = (results.page - 1) * pageSize;

  return (
    <>
      <div className="catalogue">
        {results.products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={firstOnPage + i + 1} />
        ))}
      </div>

      {results.totalPages > 1 ? (
        <nav className="pager" aria-label="Pagination">
          {results.page > 1 ? (
            <Link className="btn btn-ghost btn-sm" href={pageHref(results.page - 1)}>
              ← Previous
            </Link>
          ) : null}
          <span className="eyebrow num">
            Page {results.page} / {results.totalPages}
          </span>
          {results.page < results.totalPages ? (
            <Link className="btn btn-ghost btn-sm" href={pageHref(results.page + 1)}>
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
