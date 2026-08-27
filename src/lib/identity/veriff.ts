import "server-only";

import { createHmac } from "node:crypto";
import { ageOn } from "./aamva";
import type { IdentityProvider, IdVerdict } from "./types";

/**
 * Veriff adapter — document authenticity, which the barcode alone cannot give.
 *
 * SERVER TO SERVER, DELIBERATELY. Veriff also ships a browser SDK, and using
 * it would be the conventional integration; it is refused here because this
 * storefront makes no third-party request from the browser (see README), and
 * an identity vendor is the last place to make the first exception — the SDK
 * would put the customer's face, licence and IP in front of another party
 * under our own domain's appearance. Instead the images reach this server and
 * this server talks to Veriff: create a session, upload the two photos, submit.
 *
 * ⚠️ TWO THINGS TO SETTLE BEFORE TURNING THIS ON:
 *  1. Cannabis is a restricted industry for several identity vendors. Confirm
 *     in writing that this account may be used for a licensed cannabis
 *     retailer before relying on it.
 *  2. Veriff decides ASYNCHRONOUSLY — its own model is a webhook, and a
 *     decision can take longer than anyone will hold a signup form open. This
 *     adapter submits and waits briefly; when no verdict has landed by then it
 *     returns "review" with the session id, which is the honest answer and
 *     lets the account proceed pending a human. Wiring the decision webhook so
 *     a late verdict flows back is the follow-up that completes this.
 */

const BASE = "https://stationapi.veriff.com/v1";
/** How long a signup form may reasonably be held open waiting for a verdict. */
const DECISION_BUDGET_MS = 6_000;
const POLL_INTERVAL_MS = 1_500;

function credentials() {
  const apiKey = process.env.VERIFF_API_KEY?.trim();
  const secret = process.env.VERIFF_SHARED_SECRET?.trim();
  return apiKey && secret ? { apiKey, secret } : null;
}

export function veriffConfigured(): boolean {
  return credentials() !== null;
}

/** Veriff signs bodies for writes and the bare session id for reads. */
function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

async function veriffFetch(
  method: "POST" | "PATCH" | "GET",
  path: string,
  opts: { body?: unknown; signPayload?: string } = {},
): Promise<unknown> {
  const creds = credentials();
  if (!creds) throw new Error("veriff not configured");

  const body = opts.body === undefined ? undefined : JSON.stringify(opts.body);
  const headers: Record<string, string> = {
    "X-AUTH-CLIENT": creds.apiKey,
    "Content-Type": "application/json",
  };
  // Session creation is the one call authenticated by the key alone.
  const payloadToSign = opts.signPayload ?? body;
  if (payloadToSign !== undefined) {
    headers["X-HMAC-SIGNATURE"] = sign(payloadToSign, creds.secret);
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`veriff ${method} ${path} → ${res.status}`);
  }
  return res.json();
}

function dataUri(bytes: Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

export const veriffProvider: IdentityProvider = {
  name: "veriff",

  async verify({ front, back, minAge, now }): Promise<IdVerdict> {
    let sessionId: string | undefined;
    try {
      const created = (await veriffFetch("POST", "/sessions", {
        body: { verification: { document: { type: "DRIVERS_LICENSE", country: "US" } } },
      })) as { verification?: { id?: string } };
      sessionId = created.verification?.id;
      if (!sessionId) throw new Error("no session id");

      for (const [context, image] of [
        ["document-front", front],
        ["document-back", back],
      ] as const) {
        await veriffFetch("POST", `/sessions/${sessionId}/media`, {
          body: { image: { context, content: dataUri(image.bytes, image.mimeType) } },
        });
      }

      await veriffFetch("PATCH", `/sessions/${sessionId}`, {
        body: { verification: { status: "submitted" } },
      });
    } catch (e) {
      // The vendor being unreachable is OUR outage, not the customer's
      // problem, and must never read as a failed identity check.
      console.error("[identity] veriff submit failed:", e instanceof Error ? e.message : e);
      return { status: "review", reason: "vendor_unavailable" };
    }

    const deadline = Date.now() + DECISION_BUDGET_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
        const decision = (await veriffFetch("GET", `/sessions/${sessionId}/decision`, {
          signPayload: sessionId,
        })) as {
          verification?: {
            status?: string;
            person?: { dateOfBirth?: string | null };
            document?: { validUntil?: string | null };
          } | null;
        };
        const v = decision.verification;
        if (!v?.status) continue;

        if (v.status === "declined") {
          return { status: "rejected", reason: "fraud" };
        }
        if (v.status === "approved") {
          const dob = v.person?.dateOfBirth ?? null;
          const age = dob ? ageOn(dob, now) : null;
          if (age === null) {
            // Approved as a genuine document, but no usable birth date came
            // back — the age question is still unanswered.
            return { status: "review", reason: "vendor_no_dob" };
          }
          if (age < minAge) return { status: "rejected", reason: "underage", age };

          const validUntil = v.document?.validUntil;
          if (validUntil && Date.parse(`${validUntil}T23:59:59Z`) < now.getTime()) {
            return { status: "rejected", reason: "expired", age };
          }
          return { status: "verified", age, method: "vendor", reference: sessionId };
        }
        // resubmission_requested / expired / abandoned — a person decides.
        return { status: "review", reason: `vendor_${v.status}` };
      } catch (e) {
        console.error("[identity] veriff decision poll:", e instanceof Error ? e.message : e);
      }
    }

    return { status: "review", reason: "vendor_pending" };
  },
};
