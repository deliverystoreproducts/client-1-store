"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The "more filters" fold. On a phone it starts CLOSED behind a Filters
 * button (open only when one of the folded filters is already applied); on a
 * desktop the rail has room, so it opens itself after mount. Server-rendered
 * closed, which is the right default for the device where it matters.
 *
 * A <details>, so it is a real disclosure with no JS: the form inside submits
 * the same either way.
 */
export function FiltersFold({
  applied,
  startOpen,
  children,
}: {
  /** How many of the folded filters are active — shown on the button. */
  applied: number;
  /** Open even on a phone (a folded filter is set, so the customer needs it). */
  startOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(startOpen);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 861px)");
    const sync = () => setOpen(startOpen || mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [startOpen]);

  return (
    <details className="filters-fold" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="btn btn-outline btn-sm filters-btn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        Filters
        {applied > 0 ? <span className="filters-n num">{applied}</span> : null}
      </summary>
      <div className="filters-fold-body">{children}</div>
    </details>
  );
}
