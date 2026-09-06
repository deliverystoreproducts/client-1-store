"use client";

import { useEffect } from "react";
import { heartbeatPush } from "@/lib/push-client";

/** Registers the service worker (production builds only — a worker in dev
 *  serves yesterday's bundle and turns hot reload into archaeology), then
 *  re-reports an existing push subscription once a day (see heartbeatPush). */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => heartbeatPush())
      .catch(() => {});
  }, []);
  return null;
}
