"use client";

/** Last-resort boundary: replaces the whole document, so it ships its own
 *  <html>/<body> and its own minimal styling. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#f7f2e6",
          color: "#1f2a1e",
          // This boundary replaces the whole document, stylesheet included, so
          // it cannot rely on the self-hosted webfonts — fallback chain only.
          fontFamily: '"Avenir Next", "Helvetica Neue", sans-serif',
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.4rem" }}>Something went wrong</h1>
          <p style={{ color: "#44523f" }}>Please reload the page.</p>
          {error.digest ? (
            <p style={{ color: "#5d6845", fontSize: "0.85rem" }}>Reference: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
