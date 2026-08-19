"use client";

import { useState } from "react";
import { apiPost, apiPostForm, ClientApiError } from "@/lib/client-api";
import { formatPhone } from "@/lib/phone";
import type { PublicCustomer } from "@/lib/public-types";

/**
 * Phone sign-in: number -> SMS code -> (first time only) name and address.
 *
 * Note what this component never touches: a token. The session token is set by
 * our own API routes as an httpOnly cookie and is not readable here, which is
 * the entire reason the flow goes through /api/auth/* instead of talking to a
 * commerce API directly.
 */

type Step = "phone" | "code" | "profile";

interface Props {
  /** Called once a full customer session exists. */
  onSignedIn: (customer: PublicCustomer | null) => void;
  /** The store demands a government-ID photo at signup. */
  requireIdPhoto: boolean;
  /** Start on the profile step (an interrupted signup being resumed). */
  initialStep?: Step;
}

export function SignInFlow({ onSignedIn, requireIdPhoto, initialStep = "phone" }: Props) {
  const [step, setStep] = useState<Step>(initialStep);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function handle(e: unknown) {
    setError(e instanceof ClientApiError ? e.message : "Something went wrong. Please try again.");
  }

  async function sendCode(resend = false) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await apiPost<{ status: string; customer?: PublicCustomer }>(
        "/api/auth/send-code",
        { phone },
      );
      if (res.status === "signed_in") return onSignedIn(res.customer ?? null);
      if (res.status === "needs_profile") return setStep("profile");
      setStep("code");
      if (resend) setNote("We sent a new code.");
    } catch (e) {
      handle(e);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await apiPost<{ status: string; customer?: PublicCustomer }>(
        "/api/auth/verify-code",
        { phone, code },
      );
      if (res.status === "signed_in") return onSignedIn(res.customer ?? null);
      setStep("profile");
    } catch (e) {
      handle(e);
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("name", name);
      if (address) form.set("address", address);
      if (idPhoto) form.set("idPhoto", idPhoto);
      const res = await apiPostForm<{ status: string; customer?: PublicCustomer }>(
        "/api/auth/register",
        form,
      );
      if (res.status === "signed_in") return onSignedIn(res.customer ?? null);
      setError("We couldn't finish creating your account.");
    } catch (e) {
      if (e instanceof ClientApiError && e.code === "not_verified") {
        setStep("phone");
        setError("That took too long. Please verify your number again.");
      } else {
        handle(e);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <div className="steps">
        <span>
          {step === "phone" ? <b>1. Your number</b> : "1. Your number"}
        </span>
        <span>·</span>
        <span>{step === "code" ? <b>2. Code</b> : "2. Code"}</span>
        <span>·</span>
        <span>{step === "profile" ? <b>3. Details</b> : "3. Details"}</span>
      </div>

      {error ? (
        <div className="notice notice-error" style={{ marginBottom: 14 }}>
          {error}
        </div>
      ) : null}
      {note ? (
        <div className="notice notice-ok" style={{ marginBottom: 14 }}>
          {note}
        </div>
      ) : null}

      {step === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <div className="field">
            <label className="label" htmlFor="phone">
              Mobile number
            </label>
            <input
              id="phone"
              className="input"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-block" disabled={busy || phone.replace(/\D/g, "").length < 10}>
            {busy ? "Sending…" : "Send me a code"}
          </button>
          <p className="faint" style={{ marginTop: 12, marginBottom: 0 }}>
            We use your number to confirm the order and to let the driver reach you. Message and
            data rates may apply.
          </p>
        </form>
      ) : null}

      {step === "code" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className="muted">
            Enter the code we sent to <strong>{formatPhone(phone)}</strong>.
          </p>
          <div className="field">
            <label className="label" htmlFor="code">
              Verification code
            </label>
            <input
              id="code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-block" disabled={busy || code.trim().length < 4}>
            {busy ? "Checking…" : "Verify"}
          </button>
          <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
            <button type="button" className="btn-link" onClick={() => setStep("phone")}>
              Change number
            </button>
            <button type="button" className="btn-link" onClick={() => void sendCode(true)} disabled={busy}>
              Resend code
            </button>
          </div>
        </form>
      ) : null}

      {step === "profile" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void register();
          }}
        >
          <p className="muted">Almost done — we just need a name for the delivery.</p>
          <div className="field">
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              className="input"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="address">
              Delivery address <span className="faint">(optional now)</span>
            </label>
            <input
              id="address"
              className="input"
              autoComplete="street-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          {requireIdPhoto ? (
            <div className="field">
              <label className="label" htmlFor="idPhoto">
                Photo of your government-issued ID
              </label>
              <input
                id="idPhoto"
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => setIdPhoto(e.target.files?.[0] ?? null)}
                required
              />
              <p className="faint" style={{ marginTop: 6, marginBottom: 0 }}>
                Required by law before your first delivery. Stored securely by the store.
              </p>
            </div>
          ) : null}
          <button className="btn btn-block" disabled={busy || !name.trim()}>
            {busy ? "Creating your account…" : "Create account"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
