"use client";

import { useCallback, useEffect, useRef } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { PublicProduct } from "@/lib/public-types";

/**
 * Featured, as one line that never ends.
 *
 * HOW THE LOOP WORKS. The list is rendered three times and the scroller starts
 * on the middle copy. Whenever scrolling crosses into the first or last copy,
 * scrollLeft jumps by exactly one copy's width — which lands on identical
 * pixels, so the jump is invisible while the content repeats forever in both
 * directions. This is a native scroll container throughout: momentum, trackpad,
 * touch and the scrollbar all behave the way the platform's own do, which no
 * JS-driven transform gets right.
 *
 * The reposition is deliberately NOT animated and NOT debounced into a
 * transition — it must happen inside the same frame the browser is already
 * scrolling, or the seam shows.
 *
 * WHAT IT DOES NOT DO: advance on its own. An auto-playing rail moves the thing
 * a customer is reaching for out from under their finger, and these are cards
 * you tap to buy. Arrows and a swipe are enough.
 *
 * DUPLICATES ARE HIDDEN FROM ASSISTIVE TECH. Only the middle copy is exposed;
 * the other two are aria-hidden and not focusable, so a screen reader hears the
 * eight products once rather than twenty-four, and Tab does not walk through
 * the same product three times.
 */
export function FeaturedCarousel({ products }: { products: PublicProduct[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // Looping needs enough width to scroll. Below this it is a plain row.
  const loops = products.length >= 4;

  const recenter = useCallback(() => {
    const el = ref.current;
    if (!el || !loops) return;
    const copy = el.scrollWidth / 3;
    if (copy <= 0) return;
    if (el.scrollLeft < copy * 0.5) el.scrollLeft += copy;
    else if (el.scrollLeft > copy * 1.5) el.scrollLeft -= copy;
  }, [loops]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !loops) return;
    // Start on the middle copy so there is material in both directions.
    el.scrollLeft = el.scrollWidth / 3;
    el.addEventListener("scroll", recenter, { passive: true });
    return () => el.removeEventListener("scroll", recenter);
  }, [recenter, loops, products.length]);

  function nudge(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    // One viewport minus a card, so the card at the edge stays visible and a
    // customer keeps their place instead of being teleported past it.
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  }

  const copies = loops ? [0, 1, 2] : [1];

  return (
    <div className="carousel">
      <div className="carousel-track" ref={ref}>
        {copies.map((copy) => (
          <div className="carousel-run" key={copy} aria-hidden={copy !== 1 || undefined}>
            {products.map((p, i) => (
              <div
                className="carousel-cell"
                key={`${copy}-${p.id}`}
                // The clones are decoration: keep them out of the tab order so
                // Tab does not walk the same product three times.
                {...(copy !== 1 ? { inert: "" as unknown as boolean } : {})}
              >
                <ProductCard product={p} index={i + 1} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <button
        className="carousel-arrow carousel-prev"
        type="button"
        onClick={() => nudge(-1)}
        aria-label="Scroll featured products left"
      >
        ‹
      </button>
      <button
        className="carousel-arrow carousel-next"
        type="button"
        onClick={() => nudge(1)}
        aria-label="Scroll featured products right"
      >
        ›
      </button>
    </div>
  );
}
