import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty" data-reveal>
      <span className="eyebrow mb-2" style={{ display: "block" }}>
        404
      </span>
      <h1>That shelf is empty</h1>
      <p className="muted mb-2">The page or product you were after doesn&apos;t exist.</p>
      <Link className="btn" href="/">
        Back to the shop
      </Link>
    </div>
  );
}
