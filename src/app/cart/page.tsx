import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = {
  robots: { index: false, follow: false }, title: "Cart" };
export const dynamic = "force-dynamic";

export default function CartPage() {
  return <CartView />;
}
