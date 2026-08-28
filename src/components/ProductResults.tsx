import Link from "next/link";
import { InfiniteShelf } from "@/components/InfiniteShelf";
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

  // The feed appends pages after this server-rendered one; the query it
  // continues from is this page's own filters, minus the page number.
  const query = browseQueryString(filters, {}, pinned);

  return <InfiniteShelf initial={results} query={query} pageSize={pageSize} />;
}
