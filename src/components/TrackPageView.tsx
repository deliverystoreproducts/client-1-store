"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/track";

/**
 * ANALYTICS-01: the events that can be read straight off the URL.
 *   every route        → page_view
 *   /product/[id]      → + product_view (productId)
 *   /products?q=…      → + search (meta.query — the key the dashboard reads)
 * Cart, checkout and order events are fired by the components that hold the
 * cart, because those need its contents.
 */
export function TrackPageView() {
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") || params.get("search") || "";
  useEffect(() => {
    if (!pathname) return;
    track("page_view", { page: pathname });
    const m = pathname.match(/^\/product\/(\d+)$/);
    if (m) track("product_view", { page: pathname, productId: Number(m[1]) });
    if (pathname === "/products" && q.trim()) track("search", { page: pathname, meta: { query: q.trim().slice(0, 200) } });
    // `q` is derived from params; re-run when the query changes, not on every params object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, q]);
  return null;
}
