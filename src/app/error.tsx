"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * Next.js already strips server error messages in production builds, replacing
 * them with a digest. We do not undo that: nothing from `error` is rendered
 * except the digest, which is a lookup key for the server log and says nothing
 * on its own.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Browser console only; the real detail is server-side.
    console.error("Page error", error.digest ?? "");
  }, [error]);

  return (
    <div className="card center" style={{ maxWidth: 520, margin: "60px auto" }}>
      <h1 style={{ fontSize: "1.4rem" }}>Something went wrong</h1>
      <p className="muted">We hit a problem loading this page.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button className="btn" onClick={reset}>
          Try again
        </button>
        <a className="btn btn-ghost" href="/">
          Back to shop
        </a>
      </div>
      {error.digest ? (
        <p className="faint" style={{ marginTop: 18, marginBottom: 0 }}>
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
