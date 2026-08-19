import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card center" style={{ maxWidth: 520, margin: "60px auto" }}>
      <h1 style={{ fontSize: "1.4rem" }}>Not found</h1>
      <p className="muted">That page or product doesn&apos;t exist.</p>
      <Link className="btn" href="/">
        Back to shop
      </Link>
    </div>
  );
}
