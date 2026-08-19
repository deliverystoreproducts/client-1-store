"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SITE_NAME } from "@/lib/site";

/**
 * Legal-age confirmation. Rendered by the layout INSTEAD of the store, decided
 * server-side from a cookie, so there is no frame in which the catalog is
 * visible to someone who has not answered.
 *
 * This is a self-attestation gate, which is what the law asks a delivery
 * storefront for at browse time — real identity checks happen at signup (when
 * the store requires an ID photo) and at the door.
 */
export function AgeGate({ minAge }: { minAge: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/age", { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setBusy(false);
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="gate">
      <div className="gate-card">
        <div className="brand brand-mark" style={{ justifyContent: "center", marginBottom: 18 }}>
          <span className="brand-dot" aria-hidden />
          {SITE_NAME}
        </div>
        <h1 style={{ fontSize: "1.5rem" }}>Are you {minAge} or older?</h1>
        <p className="muted">
          You must be {minAge}+ to enter this store. We may ask for a valid government-issued ID at
          delivery.
        </p>
        {error ? (
          <div className="notice notice-error" style={{ marginBottom: 14 }}>
            {error}
          </div>
        ) : null}
        <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
          <button className="btn" onClick={confirm} disabled={busy}>
            {busy ? "One moment…" : `Yes, I'm ${minAge}+`}
          </button>
          <a className="btn btn-ghost" href="https://www.google.com" rel="noreferrer">
            No, take me back
          </a>
        </div>
      </div>
    </main>
  );
}
