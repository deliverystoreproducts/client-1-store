"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Legal-age confirmation.
 *
 * Rendered by the layout INSTEAD of the store — not on top of it. The decision
 * is made server-side from a cookie before any markup is produced, so the
 * catalog is never in the DOM for someone who has not answered, not even for a
 * frame, and not in view-source.
 *
 * UNCONDITIONAL BY DESIGN. This component takes no "enabled" prop and the layout
 * reads no upstream flag: the store profile's `ageGate` boolean is dropped at
 * the mapper (`lib/kamui/map.ts`) precisely so a dashboard toggle cannot switch
 * a legal control off. `minAge` — the threshold only — is configurable, and
 * defaults to 21 everywhere it is read.
 *
 * Declining does not navigate anywhere. An <a> to a search engine would be both
 * a third-party request this site exists to avoid and a weaker control (the back
 * button returns you to an un-gated page in the bfcache). Instead the gate
 * swaps to a dead-end panel, still with no store behind it.
 *
 * Self-attestation is what the law asks a delivery storefront for at browse
 * time; real identity checks happen at signup and at the door.
 */
export function AgeGate({ minAge, storeName }: { minAge: number; storeName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);
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

  if (declined) {
    return (
      <main className="gate">
        <div className="gate-inner" data-reveal>
          <span className="gate-mark">
            <span className="brand-seal" aria-hidden />
            {storeName}
          </span>
          <h1 className="gate-q" style={{ marginTop: "2rem" }}>
            Come back when you&apos;re {minAge}.
          </h1>
          <p className="muted" style={{ maxWidth: "34ch", marginInline: "auto" }}>
            You need to be {minAge} or older to browse this store. There is nothing else on this
            page.
          </p>
          <div className="gate-actions">
            <button className="btn btn-ghost" onClick={() => setDeclined(false)}>
              I entered that by mistake
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="gate">
      <div className="gate-inner">
        <span className="gate-mark" data-reveal style={{ "--i": 0 } as React.CSSProperties}>
          <span className="brand-seal" aria-hidden />
          {storeName}
        </span>

        <span className="gate-age" aria-hidden data-reveal style={{ "--i": 1 } as React.CSSProperties}>
          {minAge}
        </span>

        <h1 className="gate-q" data-reveal style={{ "--i": 2 } as React.CSSProperties}>
          Are you {minAge} or older?
        </h1>

        <p
          className="muted"
          data-reveal
          style={{ "--i": 3, maxWidth: "36ch", marginInline: "auto" } as React.CSSProperties}
        >
          You must be {minAge}+ to enter. We check a valid government-issued ID at the door.
        </p>

        {error ? (
          <div className="notice notice-error" style={{ marginTop: "1.4rem", textAlign: "left" }}>
            {error}
          </div>
        ) : null}

        <div className="gate-actions" data-reveal style={{ "--i": 4 } as React.CSSProperties}>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the gate is the
              entire page; landing keyboard focus on the primary answer is the
              point. */}
          <button className="btn" onClick={confirm} disabled={busy} autoFocus>
            {busy ? "One moment…" : `Yes — I am ${minAge} or older`}
          </button>
          <button className="btn btn-ghost" onClick={() => setDeclined(true)} disabled={busy}>
            No
          </button>
        </div>

        <p className="gate-fine" data-reveal style={{ "--i": 5 } as React.CSSProperties}>
          By entering you confirm you are of legal age in your jurisdiction. Keep out of reach of
          children and pets.
        </p>
      </div>
    </main>
  );
}
