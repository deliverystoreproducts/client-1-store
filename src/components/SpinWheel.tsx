"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Spin & Save — the wheel that appears ten seconds into a first visit.
 *
 * ── Why "Save", not "Win" ────────────────────────────────────────────────
 * California forbids cannabis giveaways, contests, sweepstakes and raffles
 * (§ 15040(a)(4), § 15040.2), and whether a randomised-discount wheel is a
 * "sweepstakes" is a live question for counsel (COMPLIANCE.md). This copy
 * therefore never says win, prize, contest or lucky: every segment is a
 * percentage off, everyone who spins gets one, and the wording says exactly
 * that. The prize table itself lives server-side and cannot express a free
 * product at all.
 *
 * ── When it shows ────────────────────────────────────────────────────────
 * After 10 s on any shop page, once per visitor:
 *   - never on /checkout (nothing interrupts money),
 *   - never again after a successful spin (localStorage, and the backend's
 *     one-spin-per-phone rule is the real arbiter),
 *   - snoozed for 3 days on dismiss,
 *   - never for a signed-in customer who already played (status check).
 * The age gate has always run first — this can only mount inside the gated
 * shell — so the age-affirmation-before-dialogue requirement is already met.
 */

const SHOW_AFTER_MS = 10_000;
const DONE_KEY = "ybs.spin.done.v1";
const SNOOZE_KEY = "ybs.spin.snooze.v1";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

const TURNS = 5; // full revolutions before settling — theatre, not math

type Step =
  | { at: "phone" }
  | { at: "code"; phone: string }
  | { at: "ready" } // signed-in: no phone needed
  | { at: "spinning" }
  | { at: "result"; label: string; couponCode: string }
  | { at: "already" };

interface Status {
  spun: boolean;
  signedIn: boolean;
  segments: { label: string }[];
}

function snoozed(): boolean {
  try {
    if (localStorage.getItem(DONE_KEY)) return true;
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return until > Date.now();
  } catch {
    return true; // no storage (private mode edge) → never nag repeatedly
  }
}

export function SpinWheel() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({ at: "phone" });
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);

  const onCheckout = pathname?.startsWith("/checkout");

  // The 10-second fuse. Status is fetched when the fuse burns down, not on
  // mount — most visits never open the modal and should not pay the request.
  useEffect(() => {
    if (onCheckout || snoozed()) return;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fuse = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/spin");
        if (!res.ok) return; // wheel unavailable → no modal, no noise
        const s = (await res.json()) as Status;
        if (s.spun) {
          try {
            localStorage.setItem(DONE_KEY, "1");
          } catch {}
          return;
        }
        if (!s.segments?.length) return;
        setStatus(s);
        setStep(s.signedIn ? { at: "ready" } : { at: "phone" });
        setOpen(true);
      } catch {
        /* quiet — a promo must never surface an error to someone who never asked for it */
      }
    }, SHOW_AFTER_MS);
    return () => window.clearTimeout(fuse);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fuse is arm-once by design
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {}
  }, []);

  // Escape closes; focus lands in the dialog while it is up.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, dismiss]);

  if (!open || !status) return null;

  const segments = status.segments;
  const seg = 360 / segments.length;

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Couldn't send the code. Check the number.");
        return;
      }
      // OTP-off stores sign the visitor straight in (or hand a pending
      // session); either way the spin no longer needs a code.
      if (data.status === "signed_in") setStep({ at: "ready" });
      else if (data.status === "needs_profile") setStep({ at: "ready" });
      else setStep({ at: "code", phone });
    } finally {
      setBusy(false);
    }
  }

  async function spin(body: { phone?: string; code?: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setStep({ at: "already" });
        try {
          localStorage.setItem(DONE_KEY, "1");
        } catch {}
        return;
      }
      if (!res.ok) {
        setError(data.message || "The wheel isn't available right now.");
        return;
      }
      // Land segmentIndex's centre under the pointer at 12 o'clock.
      const target = TURNS * 360 + (360 - (data.segmentIndex + 0.5) * seg);
      setStep({ at: "spinning" });
      setRotation(target);
      const settle = reduced.current ? 250 : 3800;
      window.setTimeout(() => {
        setStep({ at: "result", label: data.label, couponCode: data.couponCode });
        try {
          localStorage.setItem(DONE_KEY, "1");
        } catch {}
      }, settle);
    } finally {
      setBusy(false);
    }
  }

  const wheelStyle: React.CSSProperties = {
    transform: `rotate(${rotation}deg)`,
    transition: reduced.current
      ? "none"
      : "transform 3.6s cubic-bezier(0.16, 0.84, 0.24, 1)",
    background: `conic-gradient(${segments
      .map((_, i) => {
        const tones = ["var(--ground-raise)", "var(--ground-deep)", "#f2ead6"];
        const c = tones[i % (segments.length % 2 === 0 ? 2 : 3)];
        return `${c} ${i * seg}deg ${(i + 1) * seg}deg`;
      })
      .join(", ")})`,
  };

  return (
    <div className="spin-backdrop" onClick={dismiss} role="presentation">
      <div
        className="spin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="spin-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="spin-close" onClick={dismiss} aria-label="Close">
          ×
        </button>

        <p className="eyebrow">A one-time thing</p>
        <h2 id="spin-title" className="display-sm spin-title">
          Spin &amp; Save
        </h2>
        <p className="spin-sub">
          Every segment is a percentage off your order. One spin per phone number — whatever it
          lands on is yours.
        </p>

        <div className="wheel-stage" aria-hidden={step.at === "result"}>
          <span className="wheel-pointer" aria-hidden />
          <div className="wheel" style={wheelStyle} aria-hidden>
            {segments.map((s, i) => (
              <span
                key={i}
                className="wheel-label"
                style={{ transform: `rotate(${(i + 0.5) * seg}deg)` }}
              >
                <i>{s.label}</i>
              </span>
            ))}
          </div>
        </div>

        {error ? <p className="spin-error" role="alert">{error}</p> : null}

        {step.at === "phone" ? (
          <form
            className="spin-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) void sendCode();
            }}
          >
            <label className="label" htmlFor="spin-phone">
              Mobile number
            </label>
            <input
              id="spin-phone"
              className="input"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="(555) 555-0134"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <button className="btn btn-block" disabled={busy}>
              {busy ? "Sending…" : "Text me a code"}
            </button>
            <p className="spin-fine">
              We text one code to verify the number, and order updates if you buy. Msg &amp; data
              rates may apply. Reply STOP to opt out.
            </p>
          </form>
        ) : null}

        {step.at === "code" ? (
          <form
            className="spin-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) void spin({ phone: step.phone, code });
            }}
          >
            <label className="label" htmlFor="spin-code">
              The code we texted
            </label>
            <input
              id="spin-code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <button className="btn btn-block" disabled={busy}>
              {busy ? "Checking…" : "Spin the wheel"}
            </button>
          </form>
        ) : null}

        {step.at === "ready" ? (
          <div className="spin-form">
            <button
              className="btn btn-block"
              disabled={busy}
              onClick={() => void spin(status.signedIn ? {} : { phone })}
            >
              {busy ? "One moment…" : "Spin the wheel"}
            </button>
          </div>
        ) : null}

        {step.at === "result" ? (
          <div className="spin-result" role="status">
            <p className="eyebrow">{step.label} — locked in</p>
            <p className="spin-code-value num">{step.couponCode}</p>
            <div className="row">
              <button
                className="btn btn-sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(step.couponCode).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? "Copied ✓" : "Copy code"}
              </button>
              <Link
                className="btn btn-ghost btn-sm"
                href="/checkout"
                onClick={() => setOpen(false)}
              >
                Apply it at checkout
              </Link>
            </div>
            <p className="spin-fine">
              Enter it in the promo box at checkout. Good for 7 days, one per phone number.
            </p>
          </div>
        ) : null}

        {step.at === "already" ? (
          <div className="spin-result" role="status">
            <p>
              This number already has its discount — check your texts for the code, and the promo
              box at <Link className="link" href="/checkout">checkout</Link> is where it goes.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
