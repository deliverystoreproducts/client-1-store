import type { Metadata } from "next";
import { CheckoutView } from "@/components/CheckoutView";
import { getStoreProfile } from "@/lib/store";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // Whether a first-time customer must upload a government ID is the store's
  // setting, read server-side. The backend enforces it either way; this only
  // decides whether we ask for the file up front instead of failing later.
  const profile = await getStoreProfile();
  return <CheckoutView requireIdPhoto={profile.requireIdVerification} />;
}
