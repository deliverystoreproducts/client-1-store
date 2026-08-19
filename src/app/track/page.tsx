import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Track your order" };
export const dynamic = "force-dynamic";

/**
 * Enter-your-tracking-code screen. A plain server action so it works without
 * JavaScript — a customer chasing a delivery is often on a bad connection.
 */
async function goToTracking(formData: FormData) {
  "use server";
  const raw = String(formData.get("token") ?? "").trim();
  // Customers paste the whole link about as often as the code itself.
  const token = raw.includes("/") ? (raw.split("/").filter(Boolean).pop() ?? "") : raw;
  if (!token) redirect("/track");
  redirect(`/track/${encodeURIComponent(token.split("?")[0] ?? "")}`);
}

export default function TrackLandingPage() {
  return (
    <div className="track-card" data-reveal>
      <div className="section-head">
        <span className="eyebrow">Tracking</span>
        <hr />
      </div>

      <h1 className="display" style={{ fontSize: "var(--t-3)", maxWidth: "12ch" }}>
        Where&apos;s my order?
      </h1>

      <p className="lede mt-2 mb-3">
        Paste the tracking link or code from your confirmation text.
      </p>

      <form action={goToTracking} className="panel">
        <div className="field">
          <label className="label" htmlFor="token">
            Tracking code
          </label>
          <input id="token" name="token" className="input" required autoComplete="off" />
        </div>
        <button className="btn btn-block">Find my order</button>
      </form>
    </div>
  );
}
