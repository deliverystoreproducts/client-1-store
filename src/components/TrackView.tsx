"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client-api";
import type { PublicTracking } from "@/lib/public-types";

/**
 * Delivery status, polled.
 *
 * This page answers WHERE IS MY ORDER and nothing else — no items, no prices.
 * The tracking link arrives by SMS and gets forwarded, screenshotted and pasted
 * into support chats, so anyone holding it can see this page. It must not be an
 * itemised receipt.
 */

const POLL_MS = 20_000;

const FRIENDLY: Record<string, string> = {
  pending: "Order received",
  confirmed: "Confirmed",
  preparing: "Being prepared",
  ready: "Ready for pickup by driver",
  assigned: "Driver assigned",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function TrackView({ token }: { token: string }) {
  const [data, setData] = useState<PublicTracking | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await apiGet<PublicTracking>(
          `/api/orders/track/${encodeURIComponent(token)}`,
        );
        if (!stop) setData(res);
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
      <div className="card center" style={{ maxWidth: 520, margin: "50px auto" }}>
        <h1 style={{ fontSize: "1.4rem" }}>We couldn&apos;t find that order</h1>
        <p className="muted">Check the link from your confirmation text and try again.</p>
        <Link className="btn btn-ghost" href="/track">
          Try another code
        </Link>
      </div>
    );
  }

  if (!data) return <p className="muted">Looking up your order…</p>;

  const status = FRIENDLY[data.status] ?? data.status.replace(/_/g, " ");
  const eta = data.eta ? new Date(data.eta) : null;

  return (
    <div className="card" style={{ maxWidth: 560, margin: "30px auto" }}>
      <div className="spread">
        <h1 style={{ fontSize: "1.4rem", margin: 0 }}>
          {data.orderNumber ? `Order #${data.orderNumber}` : "Your order"}
        </h1>
        <span className="status-pill">{status}</span>
      </div>

      <div className="stack" style={{ marginTop: 20 }}>
        {data.arrivedAt ? (
          <p style={{ margin: 0 }}>
            Delivered at <strong>{new Date(data.arrivedAt).toLocaleTimeString()}</strong>.
          </p>
        ) : eta ? (
          <p style={{ margin: 0 }}>
            Estimated arrival <strong>{eta.toLocaleTimeString()}</strong>.
          </p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            We&apos;ll update this page as your order moves.
          </p>
        )}

        {data.driverFirstName ? (
          <p className="muted" style={{ margin: 0 }}>
            {data.driverFirstName} is handling your delivery
            {data.hasDriverLocation ? " and is on the road" : ""}.
          </p>
        ) : null}

        {data.address ? <p className="faint" style={{ margin: 0 }}>Delivering to {data.address}</p> : null}

        {data.driverPhone ? (
          <a className="btn btn-ghost" href={`tel:${data.driverPhone}`}>
            Call your driver
          </a>
        ) : null}

        <p className="faint" style={{ marginTop: 10, marginBottom: 0 }}>
          Placed {new Date(data.placedAt).toLocaleString()} · Payment is cash on delivery.
        </p>
      </div>
    </div>
  );
}
