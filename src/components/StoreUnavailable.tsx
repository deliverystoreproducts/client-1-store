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
      <div className="gate-inner" data-reveal>
        <span className="gate-mark">
          <span className="brand-seal" aria-hidden />
          {storeName || "Store"}
        </span>
        <h1 className="gate-q" style={{ marginTop: "2rem" }}>
          We&apos;re temporarily closed.
        </h1>
        <p className="muted" style={{ maxWidth: "34ch", marginInline: "auto" }}>
          Our online store is unavailable right now. Please try again in a little while.
        </p>
      </div>
    </main>
  );
}
