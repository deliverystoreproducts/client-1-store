import Link from "next/link";

/**
 * The announcement bar. One line, one link, above the header.
 *
 * The DEFAULT copy advertises the only promotion that verifiably exists (the
 * spin wheel). It deliberately does NOT ship a "N% off every order" default:
 * an untrue discount claim is a § 26154 misleading-statement problem, so a
 * real campaign line is the operator's to set (env now; a dashboard setting
 * when upstream grows one) and to keep true.
 */
export function TopBanner() {
  const text =
    (process.env.NEXT_PUBLIC_ANNOUNCEMENT || "").trim() ||
    "Spin the wheel — every spin takes a percentage off your order";
  const href = (process.env.NEXT_PUBLIC_ANNOUNCEMENT_HREF || "").trim() || "/#catalogue";
  if (text === "off") return null;
  return (
    <Link href={href} className="topbar">
      <span className="topbar-badge">YB</span>
      <span className="topbar-text">{text}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}
