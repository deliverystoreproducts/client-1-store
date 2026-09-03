"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A sideways rail that a MOUSE can actually move.
 *
 * WHY THIS EXISTS. `.cat-pills` and `.brand-rail` are `overflow-x: auto` with
 * `scrollbar-width: none` — deliberately, because a grey scrollbar under every
 * shelf ruins the design. On a Mac trackpad that is fine: two fingers sideways.
 * On a Windows desktop with a plain wheel mouse it is a dead end — no
 * horizontal wheel, no scrollbar, no buttons. The categories past "Vape Pens"
 * and the brands past "Jeeter" were simply unreachable, and the edge fade
 * promising "there is more this way" made it worse: it said the content
 * existed while offering no way to get to it.
 *
 * So: arrows, and only when they are needed. They appear when the rail
 * actually overflows and disappear at each end, so a rail whose contents fit
 * looks exactly as it did before.
 *
 * NOT the wheel. Translating a vertical wheel into sideways movement is the
 * usual quick fix and it is the wrong one: the page then stops scrolling
 * whenever the cursor happens to be over a shelf, which is most of this page.
 * Shift+wheel already works natively in every desktop browser; the arrows are
 * for the shopper who does not know that.
 *
 * `tabIndex={-1}` on the buttons is deliberate, not an oversight: every tile in
 * the rail is a link, tabbing to one scrolls it into view, so a keyboard user
 * can already reach the whole rail. Putting two more stops in front of every
 * shelf would make the page worse to keyboard through, not better.
 */
export function ScrollRail({
  className,
  label,
  children,
}: {
  /** Class for the <ul> itself — the existing rail class, styling unchanged. */
  className: string;
  /** What the rail holds, for the buttons' accessible names ("categories"). */
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Sub-pixel widths make an exhausted rail report scrollLeft 199.6 of 200,
    // so compare with a pixel of slack or the last arrow never switches off.
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(max > 1 && el.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    // Width changes for three different reasons and only one of them is a
    // window resize: images load late (a logo tile is empty until it arrives),
    // fonts swap, and the list itself can change. Observe the rail AND its
    // children rather than listening for resize.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure, children]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    // Just under a screenful, so something stays visible across the jump and
    // the shopper keeps their place. The floor matters on a narrow window,
    // where 80% of the rail is less than one tile.
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="rail">
      <ul className={className} ref={ref}>
        {children}
      </ul>
      {canPrev ? (
        <button
          type="button"
          className="rail-nav rail-nav-prev"
          onClick={() => page(-1)}
          tabIndex={-1}
          aria-label={`Scroll ${label} left`}
        >
          <span aria-hidden>‹</span>
        </button>
      ) : null}
      {canNext ? (
        <button
          type="button"
          className="rail-nav rail-nav-next"
          onClick={() => page(1)}
          tabIndex={-1}
          aria-label={`Scroll ${label} right`}
        >
          <span aria-hidden>›</span>
        </button>
      ) : null}
    </div>
  );
}
