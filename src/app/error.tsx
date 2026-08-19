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
    <div className="empty" data-reveal>
      <h1>Something went wrong</h1>
      <p className="muted mb-2">We hit a problem loading this page.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <button className="btn" onClick={reset}>
          Try again
        </button>
        <a className="btn btn-ghost" href="/">
          Back to shop
        </a>
      </div>
      {error.digest ? <p className="faint mt-3 mb-0">Reference: {error.digest}</p> : null}
    </div>
  );
}
