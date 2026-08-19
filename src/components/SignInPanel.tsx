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
    // No name here either: "signed in as <person>" is exactly the readout this
    // storefront keeps off a screen someone else can read over your shoulder.
    // The number was verified; that is all the confirmation this needs.
    return (
      <div className="panel auth">
        <p className="muted">You&apos;re signed in.</p>
        <button className="btn mt-1" onClick={() => router.push("/account")}>
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
