import type { Metadata } from "next";
import { CheckoutView } from "@/components/CheckoutView";
import { getStoreProfile } from "@/lib/store";
import { deliveryWindowNotice, isWithinDeliveryWindow } from "@/lib/hours";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // Whether a first-time customer must upload a government ID is the store's
  // setting, read server-side. The backend enforces it either way; this only
  // decides whether we ask for the file up front instead of failing later.
  const profile = await getStoreProfile();
  // Computed here, not in the client view, so the sentence a customer reads is
  // the server's reading of Pacific time and cannot drift on a device whose
  // clock is wrong.
  return (
    <CheckoutView
      requireIdPhoto={profile.requireIdVerification}
      deliveryNotice={deliveryWindowNotice()}
      withinDeliveryWindow={isWithinDeliveryWindow()}
    />
  );
}
