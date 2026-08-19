import type { Metadata } from "next";
import { SignInPanel } from "@/components/SignInPanel";
import { getStoreProfile } from "@/lib/store";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const profile = await getStoreProfile();
  return (
    <>
      <h1>Sign in</h1>
      <p className="muted" style={{ maxWidth: "54ch" }}>
        No password. We text you a code to confirm your number — the same number the driver uses to
        reach you.
      </p>
      <SignInPanel requireIdPhoto={profile.requireIdVerification} />
    </>
  );
}
