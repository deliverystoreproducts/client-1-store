"use client";

import { useEffect, useState } from "react";

const KEY = "ybs.theme";

/** The <meta name="theme-color"> pair is media-query-driven, so an EXPLICIT
 *  in-app flip leaves the browser chrome painted for the OS theme. Overwrite
 *  both metas with the chosen ground so the chrome follows the toggle. */
function syncChromeColor(dark: boolean) {
  const color = dark ? "#0c0c0e" : "#fafafa";
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", color));
}

/** Dark-mode switch. Lives in the menus (More ▾ / burger sheet), never in the
 *  bar itself. The inline script in layout.tsx applies the saved choice before
 *  first paint; this control only has to flip and remember. */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Light by default. The OS preference is deliberately NOT consulted: the
    // store has one look, and dark is an opt-in the visitor makes here.
    const attr = document.documentElement.getAttribute("data-theme");
    setDark(attr === "dark");
    if (attr) syncChromeColor(attr === "dark");
  }, []);

  if (dark === null) return <span className="theme-toggle" aria-hidden />;

  return (
    <button
      className="theme-toggle"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
        syncChromeColor(next);
        try {
          localStorage.setItem(KEY, next ? "dark" : "light");
        } catch {}
      }}
    >
      <span className="theme-toggle-label">Dark mode</span>
      <span className="theme-toggle-track" aria-hidden>
        <span className="theme-toggle-knob" />
      </span>
    </button>
  );
}
