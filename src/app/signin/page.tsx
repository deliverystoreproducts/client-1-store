import type { Metadata } from "next";
import { SignInPanel } from "@/components/SignInPanel";
import { getStoreProfile } from "@/lib/store";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const profile = await getStoreProfile();
  return (
    <div style={{ maxWidth: "58rem" }}>
      <div className="section-head" data-reveal style={{ "--i": 0 } as React.CSSProperties}>
        <span className="eyebrow">Sign in</span>
        <hr />
      </div>

      <h1
        className="display"
        data-reveal
        style={{ "--i": 1, fontSize: "var(--t-3)", maxWidth: "14ch" } as React.CSSProperties}
      >
        No password. Just your number.
      </h1>

      <p
        className="lede mt-2 mb-3"
        data-reveal
        style={{ "--i": 2 } as React.CSSProperties}
      >
        We text you a code to confirm your mobile — the same number the driver uses to reach you at
        the door.
      </p>

      <div data-reveal style={{ "--i": 3 } as React.CSSProperties}>
        <SignInPanel requireIdPhoto={profile.requireIdVerification} />
      </div>
    </div>
  );
}
