import type { Metadata } from "next";
import { SignInPanel } from "@/components/SignInPanel";
import { getStoreProfile } from "@/lib/store";

export const metadata: Metadata = {
  robots: { index: false, follow: false }, title: "Sign in" };
export const dynamic = "force-dynamic";

/**
 * One compact card in the middle of the page — the reference storefront's
 * sign-in. The card carries its own title and explanation, so the page adds
 * nothing around it: a headline the height of a phone screen before the
 * first field is furniture, not welcome.
 */
export default async function SignInPage() {
  const profile = await getStoreProfile();
  return (
    <div className="auth-wrap">
      <SignInPanel requireIdPhoto={profile.requireIdVerification} />
    </div>
  );
}
