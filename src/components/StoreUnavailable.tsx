/**
 * The fail-closed screen.
 *
 * Shown when this server cannot talk to the commerce backend at all — no
 * credentials, wrong credentials, backend down. It is deliberately incurious:
 * no status code, no variable name, no host, no stack. A visitor learns that the
 * store is closed; an attacker learns nothing about what sits behind it.
 *
 * The real diagnosis is in the SERVER log, which is where it belongs.
 */
export function StoreUnavailable({ storeName }: { storeName?: string }) {
  return (
    <main className="gate">
      <div className="gate-card">
        <div className="brand brand-mark" style={{ justifyContent: "center", marginBottom: 18 }}>
          <span className="brand-dot" aria-hidden />
          {storeName || "Store"}
        </div>
        <h1 style={{ fontSize: "1.4rem" }}>We&apos;re temporarily closed</h1>
        <p className="muted" style={{ marginBottom: 0 }}>
          Our online store is unavailable right now. Please try again in a little while.
        </p>
      </div>
    </main>
  );
}
