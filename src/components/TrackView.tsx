"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrackMap } from "@/components/TrackMap";
import { apiGet } from "@/lib/client-api";
import type { PublicTracking } from "@/lib/public-types";

/**
 * Delivery status, polled.
 *
 * This page answers WHERE IS MY ORDER and nothing else — no items, no prices,
 * and no customer name (the payload carries one; it is deliberately never
 * rendered). The tracking link arrives by SMS and gets forwarded, screenshotted
 * and pasted into support chats, so anyone holding it can see this page. It must
 * not be an itemised receipt, and it must not identify the buyer.
 */

const POLL_MS = 20_000;

const FRIENDLY: Record<string, string> = {
  pending: "Order received",
  confirmed: "Confirmed",
  preparing: "Being prepared",
  ready: "Ready for the driver",
  assigned: "Driver assigned",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** The four stages a customer actually cares about, and where each raw upstream
 *  status sits on them. Unknown statuses fall back to stage 0 so the page still
 *  reads sensibly if upstream adds one. */
const STAGES = ["Order received", "Being prepared", "On the way", "Delivered"] as const;

const STAGE_OF: Record<string, number> = {
  pending: 0,
  confirmed: 0,
  preparing: 1,
  ready: 1,
  assigned: 2,
  out_for_delivery: 2,
  delivered: 3,
};

export function TrackView({ token }: { token: string }) {
  const [data, setData] = useState<PublicTracking | null>(null);
  const [missing, setMissing] = useState(false);
  // Bumped on every successful poll. The map re-fetches on the parent's clock
  // rather than running a second timer that could drift out of step with the
  // status text beside it.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await apiGet<PublicTracking>(
          `/api/orders/track/${encodeURIComponent(token)}`,
        );
        if (!stop) {
          setData(res);
          setTick((n) => n + 1);
        }
      } catch {
        if (!stop) setMissing(true);
      }
    };
    void load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [token]);

  if (missing) {
    return (
      <div className="empty" data-reveal>
        <h1>We couldn&apos;t find that order</h1>
        <p className="muted mb-2">Check the link from your confirmation text and try again.</p>
        <Link className="btn btn-ghost" href="/track">
          Try another code
        </Link>
      </div>
    );
  }

  if (!data) return <p className="muted">Looking up your order…</p>;

  const raw = data.status.toLowerCase();
  const cancelled = raw === "cancelled";
  const label = FRIENDLY[raw] ?? data.status.replace(/_/g, " ");
  const stage = cancelled ? -1 : (STAGE_OF[raw] ?? 0);
  const eta = data.eta ? new Date(data.eta) : null;
  const tone = cancelled ? "off" : stage === 3 ? "done" : undefined;

  return (
    <div className="track-card panel" data-reveal>
      <div className="spread">
        <span className="eyebrow">
          {data.orderNumber ? `Order #${data.orderNumber}` : "Your order"}
        </span>
        <span className="status-pill" data-tone={tone}>
          <span className="dot" aria-hidden />
          {label}
        </span>
      </div>

      <p className="track-status display" data-tone={tone}>
        {data.arrivedAt
          ? "Delivered."
          : cancelled
            ? "Cancelled."
            : eta
              ? `Arriving ~${eta.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : "On its way to you."}
      </p>

      {!cancelled ? (
        <ol className="timeline">
          {STAGES.map((s, i) => (
            <li key={s} data-state={i < stage ? "done" : i === stage ? "now" : undefined}>
              <span className="timeline-node" aria-hidden />
              <span className="timeline-label">
                {s}
                {i === stage && !data.arrivedAt ? " — now" : ""}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted mt-2">
          This order was cancelled. If that&apos;s unexpected, call the store and we&apos;ll sort
          it out.
        </p>
      )}

      {/* Placed after the status, before the details: a customer looks for
          "where is it" first and the map answers that faster than prose. It
          renders nothing at all when there is no position to draw. */}
      <TrackMap token={token} refreshKey={tick} />

      <div className="stack" style={{ gap: "0.6rem" }}>
        {data.arrivedAt ? (
          <p className="muted mb-0">
            Delivered at{" "}
            <strong>
              {new Date(data.arrivedAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </strong>
            .
          </p>
        ) : null}

        {data.driverFirstName ? (
          <p className="muted mb-0">
            {data.driverFirstName} is handling your delivery
            {data.hasDriverLocation ? " and is on the road" : ""}.
          </p>
        ) : null}

        {data.address ? <p className="faint mb-0">Delivering to {data.address}</p> : null}

        {data.driverPhone ? (
          <a className="btn btn-ghost mt-1" href={`tel:${data.driverPhone}`}>
            Call your driver
          </a>
        ) : null}

        <p className="faint mb-0" style={{ marginTop: "0.6rem" }}>
          Placed {new Date(data.placedAt).toLocaleString()} · Payment is cash on delivery.
        </p>
      </div>
    </div>
  );
}
