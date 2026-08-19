"use client";

import { useEffect, useState } from "react";

const KEY = "ybs.theme";

/** Sun/moon toggle. The inline script in layout.tsx applies the saved choice
 *  before first paint; this button only has to flip and remember. */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    setDark(
      attr ? attr === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
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
        try {
          localStorage.setItem(KEY, next ? "dark" : "light");
        } catch {}
      }}
    >
      {dark ? "\u2600" : "\u263E"}
    </button>
  );
}
