"use client";

import Link from "next/link";

/**
 * The announcement bar. One line, one action.
 *
 * DEFAULT: advertises the wheel and OPENS it on click (owner's call): if the
 * visitor hasn't spun today the modal appears; if they have, it shows today's
 * code and the once-per-day rule. A custom campaign (NEXT_PUBLIC_ANNOUNCEMENT
 * + _HREF) stays a plain link, and its truth stays the operator's job -
 * an untrue discount claim is a § 26154 problem. "off" hides the bar.
 */
export function TopBanner() {
  const text = (process.env.NEXT_PUBLIC_ANNOUNCEMENT || "").trim();
  const href = (process.env.NEXT_PUBLIC_ANNOUNCEMENT_HREF || "").trim();
  if (text === "off") return null;

  if (text) {
    return (
      <Link href={href || "/#catalogue"} className="topbar">
        <span className="topbar-badge">YB</span>
        <span className="topbar-track">
          <span className="topbar-text">{text}</span>
        </span>
        <span aria-hidden>→</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="topbar"
      onClick={() => window.dispatchEvent(new CustomEvent("ybs:open-spin"))}
    >
      <span className="topbar-badge">YB</span>
      <span className="topbar-track">
        <span className="topbar-text">
          Spin the wheel — every spin takes a percentage off · one spin per day
        </span>
      </span>
      <span aria-hidden>→</span>
    </button>
  );
}
