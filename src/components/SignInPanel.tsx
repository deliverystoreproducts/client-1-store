"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInFlow } from "@/components/SignInFlow";
import { apiGet } from "@/lib/client-api";
import type { SessionState } from "@/lib/public-types";

/** Wraps the sign-in flow for the standalone /signin page: skips it when the
 *  visitor already has a session, and resumes an interrupted signup. */
export function SignInPanel({ requireIdPhoto }: { requireIdPhoto: boolean }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    apiGet<SessionState>("/api/auth/me")
      .then(setSession)
      .catch(() =>
        setSession({ authenticated: false, pendingRegistration: false, customer: null }),
      );
  }, []);

  if (session === null) return <p className="muted">One moment…</p>;

  if (session.authenticated) {
    return (
      <div className="card" style={{ maxWidth: 460 }}>
        <p>
          You&apos;re signed in as <strong>{session.customer?.name || "a customer"}</strong>.
        </p>
        <button className="btn" onClick={() => router.push("/account")}>
          Go to your account
        </button>
      </div>
    );
  }

  return (
    <SignInFlow
      requireIdPhoto={requireIdPhoto}
      initialStep={session.pendingRegistration ? "profile" : "phone"}
      onSignedIn={() => router.push("/account")}
    />
  );
}
