"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

/** ANALYTICS-01: the last funnel step, fired once from the confirmation page. */
export function TrackOrderPlaced({ order }: { order: string | null }) {
  useEffect(() => {
    track("order_placed", { page: "/checkout/confirmation", meta: order ? { order } : {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
