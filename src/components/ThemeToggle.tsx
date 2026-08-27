"use client";

import { useEffect, useState } from "react";

const KEY = "ybs.theme";

/** The <meta name="theme-color"> pair is media-query-driven, so an EXPLICIT
 *  in-app flip leaves the browser chrome painted for the OS theme. Overwrite
 *  both metas with the chosen ground so the chrome follows the toggle. */
function syncChromeColor(dark: boolean) {
  const color = dark ? "#120b1e" : "#f6fbf2";
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", color));
}

/** Sun/moon toggle. The inline script in layout.tsx applies the saved choice
 *  before first paint; this button only has to flip and remember. */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    const isDark =
      attr ? attr === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    if (attr) syncChromeColor(attr === "dark");
  }, []);

  if (dark === null) return <span className="theme-toggle" aria-hidden />;

  return (
    <button
      className="theme-toggle"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
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
      {dark ? "\u2600" : "\u263E"}
    </button>
  );
}
