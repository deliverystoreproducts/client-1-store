import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { UpstreamError } from "@/lib/kamui/errors";
import { fail, failFromUpstream, json } from "@/lib/http";
import { formatUsd } from "@/lib/money";
import { readCustomerToken, readPendingToken } from "@/lib/session";
import { assessDailyLimitsForCheckout, getStoreProfile, sanitizeCartLines } from "@/lib/store";
import { describeBreach } from "@/lib/compliance/limits";

/**
 * POST /api/checkout — place the order.
 *
 * ID policy: when the store requires an ID photo (`requireIdVerification`),
 * the customer must have one ON FILE — uploaded once, kept on the account. No
 * per-order scan: the driver checks the physical card at the door on every
 * delivery, and a photo the store keeps is what "we check ID" meant to the
 * owner. Daily purchase limits (4 CCR § 15409) are re-checked here too.
 */

export const dynamic = "force-dynamic";

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

  // ID on file. The ORIGINAL rule, restored 2026-08-27 at the owner's request:
  // when the store requires an ID photo, the customer must have ONE saved on
  // their account (uploaded once — signup or the checkout's ID step — via
  // /api/account/id-photo). The two-sided per-order barcode scan that briefly
  // replaced this stored nothing, so the account never showed a photo on file
  // and the customer was asked again every order. The driver checks the
  // physical card at the door on every delivery regardless (4 CCR § 15413).
  const profile = await getStoreProfile();
  if (profile.requireIdVerification) {
    let hasId = false;
    try {
      hasId = !!(await api.getMe(token)).customer.hasId;
    } catch (e) {
      return failFromUpstream(e, "We couldn't check your account just now. Please try again.");
    }
    if (!hasId) {
      return fail(400, "id_required", {
        message: "Please add a photo of your government ID to your account before placing this order.",
      });
    }
  }

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
