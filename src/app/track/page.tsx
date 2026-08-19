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
    <div className="card" style={{ maxWidth: 480, margin: "30px auto" }}>
      <h1 style={{ fontSize: "1.4rem" }}>Track your order</h1>
      <p className="muted">Paste the tracking link or code from your confirmation text.</p>
      <form action={goToTracking}>
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
