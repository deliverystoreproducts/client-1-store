import type { PublicStoreProfile } from "@/lib/public-types";

/**
 * The reassurance strip and the delivery-area list — the band directly under
 * the hero.
 *
 * Both are operator-controlled and both render nothing when empty. That matters
 * more than it sounds: a "we deliver to…" panel with no cities, or a promise
 * card with no promise, tells a customer the shop is broken. Absent is fine;
 * empty is not.
 */

/**
 * Icons are chosen from a fixed set by NAME, never supplied as markup or a URL.
 * The operator picks "truck"; the storefront decides what a truck looks like.
 * That keeps operator input away from anything that renders as HTML, and keeps
 * the icon set a design decision rather than a data one.
 */
function Glyph({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "truck":
      return (
        <svg {...common}>
          <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="17.5" cy="18" r="1.6" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "cash":
      return (
        <svg {...common}>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 20c5-1 8-4.5 8-9.5V4h-5C10 4 7 7 7 12v8z" />
          <path d="M12 20c0-4 1.5-7 4-9" />
        </svg>
      );
  }
}

export function HighlightStrip({ items }: { items: PublicStoreProfile["highlights"] }) {
  if (items.length === 0) return null;
  return (
    <ul className="promises" aria-label="What to expect">
      {items.map((h, i) => (
        <li className="promise" key={`${h.title}-${i}`} data-tone={i % 3}>
          <span className="promise-ico">
            <Glyph name={h.icon} />
          </span>
          <span className="promise-body">
            <strong className="promise-title">{h.title}</strong>
            {h.body ? <span className="promise-sub">{h.body}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DeliveryAreas({ cities }: { cities: string[] }) {
  if (cities.length === 0) return null;

  return (
    <section className="areas" aria-labelledby="areas-head">
      <p className="areas-head" id="areas-head">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        Now delivering across {cities.length} area{cities.length === 1 ? "" : "s"}
      </p>

      {/*
        THE LIST LIVES OUTSIDE <details>, and that is the whole fix.

        It was inside, before the <summary>. A browser hides every non-<summary>
        child of a closed <details> — so all 66 pills vanished and the panel
        rendered as a heading with a lone "Show all 66 areas" under it. Verified
        in the live markup: the <li>s were present and simply not displayed.

        Now <details> holds only the toggle, and :has() reads its open state to
        lift the clamp on the list beside it. The pills are never inside the
        element that hides things.

        The clamp itself is VISUAL — two rows by height, in CSS. A count cannot
        be decided by a server that does not know the viewport width: twelve
        fills one row on a laptop and spills to four on a phone.

        Nothing is withheld from the DOM either way, so find-in-page still finds
        a visitor's own suburb while the list is collapsed.

        Plain text, not links: a city is not a page here, and making it look
        clickable when it is not is the kind of small lie that costs trust.
      */}
      <ul className="areas-list">
        {cities.map((c) => (
          <li className="area-pill" key={c}>
            {c}
          </li>
        ))}
      </ul>

      {/* The label names the TOTAL, not a remainder: how many are hidden
          depends on the width, and a number that is wrong at most sizes is
          worse than no number. */}
      <details className="areas-fold">
        <summary>
          <span className="areas-more-open">Show all {cities.length} areas</span>
          <span className="areas-more-shut">Show fewer</span>
        </summary>
      </details>

    </section>
  );
}
