import * as api from "@/lib/kamui/client";
import { toPublicCoupon } from "@/lib/kamui/map";
import { fail, failFromUpstream, json } from "@/lib/http";
import { readCustomerToken } from "@/lib/session";
import type { PublicCoupon } from "@/lib/public-types";

/**
 * GET /api/coupons — the signed-in customer's usable coupons.
 *
 * ⚠ THE PHONE MUST COME FROM THE SESSION. Read this before changing anything
 * here.
 *
 * The upstream `/coupon/mine?phone=…` authenticates the STORE, not the
 * customer: presented with a store key it will answer for ANY phone number.
 * The legacy storefront exposed that shape more or less directly, which made
 * every customer's coupon list readable by anyone willing to guess a phone
 * number — and a coupon list names what someone bought and what they were
 * offered.
 *
 * So this route accepts NO phone parameter. It resolves the customer token to a
 * profile upstream — which is the only party that can say whose token it is —
 * and uses the phone that comes back. A client-supplied phone is not validated
 * here; it is not read at all.
 *
 * The wallet is never cached (`revalidate: false` on the upstream call, and
 * `dynamic` here): one customer's coupons served from another's cache entry is
 * the same disclosure by a different route.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const token = await readCustomerToken();
  if (!token) return fail(401, "not_authenticated", { message: "Please sign in." });

  try {
    // Whose token is this? Only upstream can answer. Note we ask for the
    // profile rather than trusting anything the browser sent.
    const me = await api.getMe(token);
    const phone = me?.customer?.phone;
    if (!phone) {
      // A verified token with no phone behind it is not a state we can serve a
      // wallet for, and it is not the customer's problem to solve.
      return json({ coupons: [], autoPromo: null });
    }

    const res = await api.listMyCoupons(phone);

    const coupons: PublicCoupon[] = (res.coupons ?? []).map((c) => toPublicCoupon(c, false));
    const autoPromo = res.autoPromo
      ? toPublicCoupon(
          {
            id: 0,
            code: res.autoPromo.code,
            type: res.autoPromo.type,
            value: res.autoPromo.value,
            phone: null,
            source: res.autoPromo.source,
            note: res.autoPromo.note,
            used: false,
            reusable: true,
            useCount: 0,
            targeting: null,
            expiresAt: res.autoPromo.expiresAt,
            createdAt: "",
          },
          true,
        )
      : null;

    return json({ coupons, autoPromo });
  } catch (e) {
    return failFromUpstream(e, "We couldn't load your offers.");
  }
}
