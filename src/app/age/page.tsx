import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasPassedAgeGate } from "@/lib/session";

/**
 * The age-gate route.
 *
 * It renders nothing itself: the ROOT LAYOUT owns the gate, and when the
 * confirmation cookie is missing it renders `<AgeGate/>` in place of whatever
 * page was requested. This file exists so `middleware.ts` has a destination to
 * rewrite un-gated traffic to — a page segment with no catalog in it, and
 * therefore no catalog in the RSC payload.
 *
 * Reaching here WITH the cookie means middleware did not run (a misconfigured
 * matcher, a self-hosted proxy in front). Fail towards the store rather than
 * leaving a blank page.
 */

export const metadata: Metadata = { title: "Age check" };
export const dynamic = "force-dynamic";

export default async function AgePage() {
  if (await hasPassedAgeGate()) redirect("/");
  return null;
}
