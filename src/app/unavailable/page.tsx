import type { Metadata } from "next";
import { StoreUnavailable } from "@/components/StoreUnavailable";

export const metadata: Metadata = { title: "Temporarily closed" };
export const dynamic = "force-dynamic";

export default function UnavailablePage() {
  return <StoreUnavailable storeName={process.env.NEXT_PUBLIC_SITE_NAME} />;
}
