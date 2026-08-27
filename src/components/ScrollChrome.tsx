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

    // On phones the SHELL scrolls, not the window (globals.css "THE SHELL
    // SCROLLS"); on desktop it is the window. Watch both, read whichever moved.
    const shell = document.querySelector<HTMLElement>(".shell");
    const scrollTop = () => Math.max(window.scrollY, shell?.scrollTop ?? 0);
    // A new route starts at the top — the window does this by itself, an inner
    // scroller does not.
    shell?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

    let raf = 0;
    const apply = () => {
      raf = 0;
      if (scrollTop() > 12) root.setAttribute("data-scrolled", "1");
      else root.removeAttribute("data-scrolled");
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    shell?.addEventListener("scroll", onScroll, { passive: true });

    // ?debug=chrome — a small badge with the numbers that decide whether the
    // bar can paint under the phone's status bar. Nothing else on the page
    // can show them, and they cannot be read from a screenshot.
    let badge: HTMLDivElement | null = null;
    let tick = 0;
    if (window.location.search.includes("debug=chrome")) {
      badge = document.createElement("div");
      badge.style.cssText =
        "position:fixed;left:8px;bottom:96px;z-index:9999;background:#000;color:#0f0;font:12px/1.4 monospace;padding:6px 8px;border-radius:6px;white-space:pre";
      document.body.appendChild(badge);
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;padding-top:env(safe-area-inset-top, 0px);visibility:hidden";
      document.body.appendChild(probe);
      const meta = document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "(none)";
      const stack = document.querySelector(".hdr-stack");
      const render = () => {
        const inset = getComputedStyle(probe).paddingTop;
        const r = stack?.getBoundingClientRect();
        badge!.textContent =
          `safe-area-inset-top: ${inset}\n` +
          `stack top: ${r ? Math.round(r.top) : "?"}px  h: ${r ? Math.round(r.height) : "?"}px\n` +
          `scrollY: ${Math.round(scrollTop())}  overlay: ${root.hasAttribute("data-hero-overlay")}  scrolled: ${root.hasAttribute("data-scrolled")}\n` +
          `inner: ${window.innerWidth}x${window.innerHeight}  screen: ${screen.width}x${screen.height}\n` +
          `viewport: ${meta}`;
        tick = window.requestAnimationFrame(render);
      };
      render();
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      shell?.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
      if (tick) window.cancelAnimationFrame(tick);
      badge?.remove();
    };
  }, [pathname]);

  return null;
}
