"use client";

import { useEffect } from "react";

/** Registers the service worker (production builds only — a worker in dev
 *  serves yesterday's bundle and turns hot reload into archaeology). */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
