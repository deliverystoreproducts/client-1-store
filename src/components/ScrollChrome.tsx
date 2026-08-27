"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * On phones the `.shell` element scrolls, not the window (globals.css "THE
 * SHELL SCROLLS") — Safari fills its status-bar strip with a blur of the
 * document's top edge, and this keeps that edge the header. The window resets
 * itself to the top on a route change; an inner scroller does not, so this
 * does it. Renders nothing.
 */
export function ScrollChrome() {
  const pathname = usePathname();
  useEffect(() => {
    document.querySelector<HTMLElement>(".shell")?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
