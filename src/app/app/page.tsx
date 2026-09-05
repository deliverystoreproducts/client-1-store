import type { Metadata } from "next";
import { AppPromo } from "@/components/AppPromo";
import { getStoreProfile } from "@/lib/store";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Get the app · ${SITE_NAME}`,
  description: `Add ${SITE_NAME} to your home screen and turn on notifications for delivery updates and a discount on your next order.`,
};
export const dynamic = "force-dynamic";

/** "Get the app" — the install + notifications offer (APP-REWARD-01). */
export default async function AppPage() {
  const profile = await getStoreProfile();
  return <AppPromo siteName={profile.storeName || SITE_NAME} requireIdPhoto={profile.requireIdVerification} />;
}
