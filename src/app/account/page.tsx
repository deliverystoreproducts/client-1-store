import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default function AccountPage() {
  return <AccountView />;
}
