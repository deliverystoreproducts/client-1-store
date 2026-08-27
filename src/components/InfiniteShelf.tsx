"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { apiGet } from "@/lib/client-api";
import type { PublicProduct, PublicProductPage } from "@/lib/public-types";

/**
 * The shelf as a feed: the first page is server-rendered (so it is linkable,
 * indexable and works with no JavaScript), and every page after it loads as the
 * customer nears the bottom. The "Load more" button is the fallback — for a
 * browser with no IntersectionObserver, and for anyone who would rather tap.
 *
 * `query` is the browse query string WITHOUT a page (`?q=…&category=…`); the
 * page is appended here. Whenever it changes (new filter, new category) the
 * feed resets to the server-rendered first page it was given.
 */
export function InfiniteShelf({
  initial,
  query,
  pageSize,
}: {
  initial: PublicProductPage;
  query: string;
  pageSize: number;
}) {
  const [products, setProducts] = useState<PublicProduct[]>(initial.products);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const more = page < initial.totalPages;

  // A new query (server re-rendered the first page) restarts the feed.
  useEffect(() => {
    setProducts(initial.products);
    setPage(initial.page);
    setFailed(false);
  }, [initial, query]);

  const loadNext = useCallback(async () => {
    if (loading || !more) return;
    setLoading(true);
    setFailed(false);
    try {
      const sep = query ? "&" : "?";
      const next = await apiGet<PublicProductPage>(
        `/api/catalog${query}${sep}page=${page + 1}&limit=${pageSize}`,
      );
      setProducts((prev) => {
        // The feed must never show one product twice, even if a page shifted
        // under us (a product going inactive between two loads).
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.products.filter((p) => !seen.has(p.id))];
      });
      setPage(next.page);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loading, more, query, page, pageSize]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadNext();
      },
      // Start fetching a screen early so the next row is there before the
      // customer reaches it.
      { rootMargin: "120% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadNext, more]);

  return (
    <>
      <div className="catalogue">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i + 1} />
        ))}
      </div>

      <div ref={sentinel} className="feed-foot" aria-live="polite">
        {loading ? (
          <span className="faint">Loading more…</span>
        ) : failed ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void loadNext()}>
            Couldn&apos;t load more — try again
          </button>
        ) : more ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadNext()}>
            Load more
          </button>
        ) : products.length > pageSize ? (
          <span className="faint num">
            {products.length} of {initial.total} — that&apos;s everything
          </span>
        ) : null}
      </div>
    </>
  );
}
