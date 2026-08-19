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
          background: "#0e100f",
          color: "#f2f5f2",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.4rem" }}>Something went wrong</h1>
          <p style={{ color: "#a8b1a9" }}>Please reload the page.</p>
          {error.digest ? (
            <p style={{ color: "#6f7a71", fontSize: "0.85rem" }}>Reference: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
