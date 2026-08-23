import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { UpstreamError } from "@/lib/kamui/errors";
import { fail, failFromUpstream, json } from "@/lib/http";
import { looksLikeJpeg, MAX_ID_IMAGE_BYTES, verifyId } from "@/lib/identity";
import { formatUsd } from "@/lib/money";
import { readCustomerToken, readPendingToken } from "@/lib/session";
import { assessDailyLimitsForCheckout, getStoreProfile, sanitizeCartLines } from "@/lib/store";
import { describeBreach } from "@/lib/compliance/limits";

/**
 * POST /api/checkout — place the order.
 *
 * Payment is cash on delivery: the driver app collects at the door, so there is
 * no payment step here at all. Checkout's entire job is to validate, then hand a
 * clean order to the backend.
 *
 * Identity is NOT taken from this request body. The backend reads the customer's
 * name and phone off the record the session token resolves to and ignores
 * anything we send for those, so a tampered body cannot order in someone else's
 * name. We forward items, address, notes and an optional promo code — nothing
 * more.
 *
 * THE ID CHECK RUNS ON EVERY ORDER, and this is multipart rather than JSON so
 * that it can. It used to live only in the signup form, which meant a returning
 * customer was never asked again — verified once in their life and trusted
 * forever after. That is not what "we check ID" means for a cannabis retailer,
 * and it is not what the owner asked for.
 *
 * DELIBERATELY NOT WIRED TO A SETTING. The store's `requireIdVerification` flag
 * still governs the signup form, but this check is unconditional, exactly like
 * the age gate in src/proxy.ts and for the same reason: a legal control that a
 * toggle can silently switch off is a control that will one day be off without
 * anyone noticing. That is precisely how it was discovered missing.
 *
 * Verifying INLINE, rather than minting a "this customer is verified" token at
 * a separate endpoint, is the point: there is no token to replay, no lifetime
 * to reason about, and no window in which one scan covers two orders. The
 * photos are checked in the same request that places the order or not at all.
 */

export const dynamic = "force-dynamic";

/** One line per refusal, deliberately incurious: someone probing with forged
 *  cards should learn nothing from the wording. */
const ID_REFUSALS: Record<string, string> = {
  underage: "The ID you provided shows you are under the minimum age for this store.",
  expired: "That ID has expired. Please use a current, unexpired government ID.",
  fraud: "We couldn't verify that ID. Please try again with a valid government ID.",
};

async function readIdImage(
  form: FormData,
  field: string,
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const value = form.get(field);
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > MAX_ID_IMAGE_BYTES) return null;
  const bytes = new Uint8Array(await value.arrayBuffer());
  return looksLikeJpeg(bytes) ? { bytes, mimeType: "image/jpeg" } : null;
}

interface Body {
  items?: unknown;
  address?: unknown;
  notes?: unknown;
  couponCode?: unknown;
  saveAddress?: unknown;
}

/**
 * Structured refusals we are willing to translate. The upstream message string
 * is never forwarded — we read only the numeric/city fields and write our own
 * sentence, so an internal detail cannot ride out in an error.
 */
function describeRefusal(e: UpstreamError): {
  error: string;
  message: string;
  detail?: Record<string, string | number>;
} | null {
  const body = (e.body ?? {}) as {
    error?: unknown;
    minimumOrder?: unknown;
    city?: unknown;
  };

  if (e.status === 400 && typeof body.minimumOrder === "number" && body.minimumOrder > 0) {
    const city = typeof body.city === "string" && body.city ? body.city : null;
    return {
      error: "minimum_order",
      message: city
        ? `Orders to ${city} start at ${formatUsd(body.minimumOrder)}.`
        : `Orders start at ${formatUsd(body.minimumOrder)}.`,
      detail: { minimumOrder: body.minimumOrder, ...(city ? { city } : {}) },
    };
  }

  if (e.status === 403 && body.error === "customer_banned") {
    return {
      error: "order_refused",
      message: "We're unable to accept this order. Please contact the store.",
    };
  }

  if (e.status === 409) {
    return {
      error: "cart_conflict",
      message: "Something in your cart is no longer available. Please review it and try again.",
    };
  }

  return null;
}

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");

  const token = await readCustomerToken();
  if (!token) {
    // Distinguish "half-way through signup" from "signed out" so the UI can send
    // the user to the right screen rather than a dead end.
    const pending = await readPendingToken();
    return fail(401, pending ? "profile_required" : "not_authenticated", {
      message: pending ? "Please finish creating your account." : "Please sign in to check out.",
    });
  }

  // Multipart: a JSON `payload` part alongside the two ID photographs.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "invalid_request", { message: "Malformed request." });
  }

  let body: Body | null = null;
  try {
    const raw = form.get("payload");
    body = typeof raw === "string" ? (JSON.parse(raw) as Body) : null;
  } catch {
    body = null;
  }
  if (!body) return fail(400, "invalid_request", { message: "Malformed request." });

  const front = await readIdImage(form, "idFront");
  const back = await readIdImage(form, "idBack");
  if (!front || !back) {
    return fail(400, "id_required", {
      message: "Please scan the front and back of your ID to place this order.",
    });
  }

  const { minAge } = await getStoreProfile();
  const verdict = await verifyId({ front, back }, { minAge });
  if (verdict.status === "rejected") {
    return fail(403, `id_${verdict.reason}`, {
      message: ID_REFUSALS[verdict.reason] ?? ID_REFUSALS.fraud,
    });
  }
  // "review" proceeds on purpose: an unreadable barcode is our failure to parse
  // a photograph, not evidence about the customer, and the driver checks the
  // physical card at the door regardless (4 CCR § 15413). Refusing here would
  // turn a scratched licence into a lost order.
  console.info(
    `[identity] checkout verdict=${verdict.status}` +
      (verdict.status === "verified" ? ` method=${verdict.method}` : ` reason=${verdict.reason}`),
  );

  const items = sanitizeCartLines(body.items);
  if (items.length === 0) return fail(400, "empty_cart", { message: "Your cart is empty." });

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (address.length < 6) {
    return fail(400, "address_required", {
      message: "Enter a full delivery address.",
    });
  }
  if (address.length > 300) {
    return fail(400, "address_too_long", {
      message: "That address is too long.",
    });
  }

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) || null : null;
  const couponCode =
    typeof body.couponCode === "string" && body.couponCode.trim()
      ? body.couponCode.trim().slice(0, 64)
      : null;

  // ── 4 CCR § 15409 daily limits, server-side ───────────────────────────
  //
  // The cart shows the same numbers, but a cart is browser state and this is
  // the last point before a sale. § 15409 is per CUSTOMER per DAY, so this also
  // counts what the customer already bought today — see
  // `assessDailyLimitsForCheckout`. Refusing here is the only refusal that
  // means anything.
  //
  // ⚠️ It refuses over-limit baskets it can MEASURE. Lines with no published
  //    net weight contribute zero, so a pass is not a compliance certificate —
  //    the gap is documented in src/lib/compliance/limits.ts and README.md.
  try {
    const limits = await assessDailyLimitsForCheckout(items, token);
    if (limits.exceeded.length > 0) {
      return fail(400, "daily_limit_exceeded", {
        message: limits.exceeded.map((k) => describeBreach(k, limits)).join(" "),
      });
    }
  } catch (e) {
    // The limit check is a control, not a nicety: if it cannot run we do not
    // silently sell. The customer gets a neutral retry, the reason goes to the log.
    console.error("[compliance] § 15409 daily-limit check failed; order refused", e);
    return fail(503, "limit_check_unavailable", {
      message: "We couldn't verify the state daily purchase limit just now. Please try again.",
    });
  }

  try {
    const res = await api.checkout(token, {
      items,
      address,
      notes,
      couponCode,
      // Whether the address is remembered on the customer record.
      addressUpdate: body.saveAddress !== false,
    });
    return json({
      orderId: res.orderId,
      orderNumber: res.orderNumber == null ? null : String(res.orderNumber),
      trackingToken: res.trackingToken ?? null,
    });
  } catch (e) {
    if (e instanceof UpstreamError) {
      const refusal = describeRefusal(e);
      if (refusal) {
        const { error, message, detail } = refusal;
        return fail(e.status === 403 ? 403 : e.status === 409 ? 409 : 400, error, {
          message,
          ...(detail ? { detail } : {}),
        });
      }
    }
    return failFromUpstream(e, "We couldn't place your order. Please try again.");
  }
}
