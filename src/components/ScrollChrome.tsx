"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Two attributes on <html> that the phone header reads (globals.css, "PHONE
 * CHROME"):
 *
 *   data-scrolled       the page has moved — the bar goes solid white
 *   data-hero-overlay   this page opens with a full-bleed banner, so the bar
 *                       starts transparent, floating over the picture, the way
 *                       a store page does in the Weedmaps app
 *
 * Attributes rather than React state because the header is a client component
 * that never re-renders on scroll, and the thing that decides "is there a
 * banner" is a server component several trees away. Re-evaluated on every
 * route change; nothing rendered.
 */
export function ScrollChrome() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const hasBanner = !!document.querySelector('.hero[data-banner="true"]');
    if (hasBanner) root.setAttribute("data-hero-overlay", "1");
    else root.removeAttribute("data-hero-overlay");

    let raf = 0;
    const apply = () => {
      raf = 0;
      if (window.scrollY > 12) root.setAttribute("data-scrolled", "1");
      else root.removeAttribute("data-scrolled");
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return null;
}
