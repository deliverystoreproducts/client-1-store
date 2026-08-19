/**
 * California delivery hours.
 *
 * 4 CCR § 15403 restricts a retailer's sale AND delivery of cannabis goods to
 * 06:00–22:00 Pacific. Whether a customer may PLACE an order outside that window
 * for fulfilment inside it is genuinely unsettled, so this module deliberately
 * does NOT block anything — it exists so the storefront can tell a customer when
 * their order can actually arrive instead of silently taking an order that will
 * sit until morning.
 *
 * Pure and dependency-free: safe on the server and in the browser. Everything is
 * computed against `America/Los_Angeles`, never against the visitor's clock — a
 * customer travelling with their phone on Eastern time still gets the real
 * window.
 */

export const DELIVERY_TZ = "America/Los_Angeles";

/** Inclusive start / exclusive end, in Pacific local hours. */
export const DELIVERY_OPEN_HOUR = 6;
export const DELIVERY_CLOSE_HOUR = 22;

export const DELIVERY_WINDOW_LABEL = "6:00 AM – 10:00 PM Pacific";
export const DELIVERY_WINDOW_SHORT = "6 AM – 10 PM PT";

/** The hour of the day (0–23) in Pacific time, whatever the host's timezone. */
export function pacificHour(now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: DELIVERY_TZ,
    hour: "numeric",
    hour12: false,
  }).format(now);
  const n = Number(hour);
  // `hour12: false` renders midnight as "24" in some ICU versions.
  return Number.isFinite(n) ? n % 24 : 12;
}

/** True when a delivery could legally be handed over right now. */
export function isWithinDeliveryWindow(now: Date = new Date()): boolean {
  const h = pacificHour(now);
  return h >= DELIVERY_OPEN_HOUR && h < DELIVERY_CLOSE_HOUR;
}

/**
 * One sentence a customer can act on. Never alarming, never a refusal — the
 * order is still welcome, it just cannot be handed over until the window opens.
 */
export function deliveryWindowNotice(now: Date = new Date()): string {
  return isWithinDeliveryWindow(now)
    ? `Deliveries run ${DELIVERY_WINDOW_LABEL}.`
    : `It's outside delivery hours right now. We deliver ${DELIVERY_WINDOW_LABEL}, so an order placed now goes out from 6:00 AM.`;
}
