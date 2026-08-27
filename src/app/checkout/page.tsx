import type { Metadata } from "next";
import { CheckoutView } from "@/components/CheckoutView";
import { getBannerPromo, getStoreProfile } from "@/lib/store";
import { deliveryWindowNotice, isWithinDeliveryWindow } from "@/lib/hours";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // Whether a first-time customer must upload a government ID is the store's
  // setting, read server-side. The backend enforces it either way; this only
  // decides whether we ask for the file up front instead of failing later.
  const profile = await getStoreProfile();
  // The standing online-order promo, resolved SERVER-side. getBannerPromo looks
  // the code up upstream and returns null unless it is live and worth
  // something, so what reaches the view is never a code that would be refused.
  const promo = await getBannerPromo();
  // Computed here, not in the client view, so the sentence a customer reads is
  // the server's reading of Pacific time and cannot drift on a device whose
  // clock is wrong.
  return (
    <CheckoutView
      requireIdPhoto={profile.requireIdVerification}
      deliveryNotice={deliveryWindowNotice()}
      withinDeliveryWindow={isWithinDeliveryWindow()}
      // B&P § 26070.3(b) — the DCC safer-use brochure, displayed online at the
      // time of purchase. Dashboard-set (Settings → Business), env fallback.
      // Empty when the operator has set neither: the view then prints a loud
      // refusal-to-pretend rather than a link to nothing.
      brochureUrl={profile.saferUseBrochureUrl ?? ""}
      minAge={profile.minAge}
      // Applied on arrival rather than typed. A discount every online order
      // qualifies for is not a puzzle to solve at the last step — a customer
      // who never sees the banner should not pay more than one who did.
      autoPromoCode={promo?.code ?? ""}
      autoPromoLabel={promo?.label ?? ""}
    />
  );
}
