import type { Metadata } from "next";
import { TrackView } from "@/components/TrackView";

export const metadata: Metadata = { title: "Order status" };
export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TrackView token={token} />;
}
