import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { UpstreamError } from "@/lib/kamui/errors";
import { fail, failFromUpstream, json, readJson } from "@/lib/http";
import { formatUsd } from "@/lib/money";
import { readCustomerToken, readPendingToken } from "@/lib/session";
import { sanitizeCartLines } from "@/lib/store";

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
function describeRefusal(e: UpstreamError): { error: string; message: string; detail?: Record<string, string | number> } | null {
  const body = (e.body ?? {}) as { error?: unknown; minimumOrder?: unknown; city?: unknown };

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

  const body = await readJson<Body>(req);
  if (!body) return fail(400, "invalid_request", { message: "Malformed request." });

  const items = sanitizeCartLines(body.items);
  if (items.length === 0) return fail(400, "empty_cart", { message: "Your cart is empty." });

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (address.length < 6) {
    return fail(400, "address_required", { message: "Enter a full delivery address." });
  }
  if (address.length > 300) {
    return fail(400, "address_too_long", { message: "That address is too long." });
  }

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) || null : null;
  const couponCode =
    typeof body.couponCode === "string" && body.couponCode.trim()
      ? body.couponCode.trim().slice(0, 64)
      : null;

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
