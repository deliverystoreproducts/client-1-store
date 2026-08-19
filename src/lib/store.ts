import "server-only";

import * as api from "@/lib/kamui/client";
import { UpstreamError } from "@/lib/kamui/errors";
import {
  toPublicBrand,
  toPublicCategory,
  toPublicProduct,
  toPublicStoreProfile,
} from "@/lib/kamui/map";
import { computeTaxes, toCents } from "@/lib/money";
import { pacificDateKey } from "@/lib/hours";
import {
  LEGAL_ENTITY_NAME,
  LICENSE_NUMBER,
  LOCAL_PERMIT_NUMBER,
  POLICY_EFFECTIVE_DATE,
  PRIVACY_CONTACT_ADDRESS,
  PRIVACY_CONTACT_EMAIL,
  SAFER_USE_BROCHURE_URL,
} from "@/lib/site";
import {
  assessDailyLimits,
  EMPTY_DAILY_LIMIT_ASSESSMENT,
  type AssessableLine,
  type DailyLimitAssessment,
} from "@/lib/compliance/limits";
import { classifyConsumptionRoute, PROP65_FALLBACK_ROUTE, PROP65_WARNINGS_ENABLED } from "@/lib/compliance/prop65";
import { vapeDisposalMessagesFor } from "@/lib/compliance/vape";
import { checkExciseRate } from "@/lib/compliance/tax";
import type {
  CartLineInput,
  PricedCart,
  PricedCartLine,
  PublicBrand,
  PublicCategory,
  PublicProduct,
  PublicProductPage,
  PublicStoreProfile,
} from "@/lib/public-types";

/**
 * The server-side read model the pages use. Sits on top of the API client and
 * decides what a failure looks like for a PAGE (as opposed to for an API route):
 * usually an empty shelf plus a logged error, never a stack trace.
 */

export const FALLBACK_PROFILE: PublicStoreProfile = {
  storeName: "",
  contactPhone: null,
  contactEmail: null,
  heroTitle: null,
  heroSubtitle: null,
  heroImage: null,
  open: true,
  // Fail SAFE on the threshold too: if we cannot read the store's configuration
  // we still ask for 21+. The gate itself is unconditional (see app/layout.tsx),
  // so there is no "gate off" state to fall back into.
  minAge: 21,
  showCannabinoids: false,
  requireIdVerification: false,
  couponsEnabled: false,
  logo: null,
  // Even with the backend unreachable, the legal pages must not go blank: the
  // env-var fallbacks (the pre-dashboard way of configuring these) still apply.
  licenseNumber: LICENSE_NUMBER || null,
  legalEntityName: LEGAL_ENTITY_NAME || null,
  localPermitNumber: LOCAL_PERMIT_NUMBER || null,
  privacyContactEmail: PRIVACY_CONTACT_EMAIL || null,
  privacyContactAddress: PRIVACY_CONTACT_ADDRESS || null,
  policyEffectiveDate: POLICY_EFFECTIVE_DATE || null,
  saferUseBrochureUrl: SAFER_USE_BROCHURE_URL || null,
};

/** Store profile, or safe defaults. Never throws — the shell must always render. */
export async function getStoreProfile(): Promise<PublicStoreProfile> {
  try {
    return toPublicStoreProfile(await api.getTenantProfile());
  } catch (e) {
    logPageFailure("store-profile", e);
    return FALLBACK_PROFILE;
  }
}

/** True when we could not reach the backend at all — used to route to /unavailable. */
export async function storeIsReachable(): Promise<boolean> {
  try {
    await api.getTenantProfile();
    return true;
  } catch {
    return false;
  }
}

export interface CatalogQuery {
  search?: string;
  categoryId?: number;
  brandId?: number;
  sort?: "price_asc" | "price_desc" | "name_asc" | "newest";
  page?: number;
  limit?: number;
  featured?: boolean;
  onSale?: boolean;
}

const EMPTY_PAGE: PublicProductPage = {
  products: [],
  total: 0,
  page: 1,
  totalPages: 0,
  unavailable: true,
};

export async function getCatalogPage(q: CatalogQuery): Promise<PublicProductPage> {
  try {
    const res = await api.listProducts(q);
    return {
      products: (res.products ?? []).map(toPublicProduct),
      total: res.total ?? 0,
      page: res.page ?? 1,
      totalPages: res.totalPages ?? 0,
      unavailable: false,
    };
  } catch (e) {
    logPageFailure("catalog", e);
    return EMPTY_PAGE;
  }
}

export async function getCategories(): Promise<PublicCategory[]> {
  try {
    const rows = await api.listCategories();
    return Array.isArray(rows) ? rows.map(toPublicCategory) : [];
  } catch (e) {
    logPageFailure("categories", e);
    return [];
  }
}

export async function getBrands(): Promise<PublicBrand[]> {
  try {
    const res = await api.listBrands({ limit: 100 });
    return (res.brands ?? []).map(toPublicBrand);
  } catch (e) {
    logPageFailure("brands", e);
    return [];
  }
}

/** Product detail. Returns null for "no such product" AND for an unreachable
 *  backend — the page renders a not-found either way, which is the honest
 *  answer to a visitor and reveals nothing about which it was. */
export async function getProductDetail(
  id: number,
): Promise<{ product: PublicProduct; related: PublicProduct[] } | null> {
  try {
    const res = await api.getProduct(id);
    return {
      product: toPublicProduct(res.product),
      related: (res.related ?? []).map(toPublicProduct),
    };
  } catch (e) {
    if (!(e instanceof UpstreamError) || e.code !== "not_found") {
      logPageFailure("product-detail", e);
    }
    return null;
  }
}

// ───────────────────────────── cart pricing ─────────────────────────────

const MAX_CART_LINES = 60;
const MAX_QTY_PER_LINE = 99;

/** Normalises whatever the browser sent into something we are willing to price. */
export function sanitizeCartLines(input: unknown): CartLineInput[] {
  if (!Array.isArray(input)) return [];
  const byId = new Map<number, number>();
  for (const raw of input.slice(0, MAX_CART_LINES * 2)) {
    if (!raw || typeof raw !== "object") continue;
    const { productId, quantity } = raw as { productId?: unknown; quantity?: unknown };
    const id = Number(productId);
    const qty = Number(quantity);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const clamped = Math.min(MAX_QTY_PER_LINE, Math.floor(qty));
    byId.set(id, Math.min(MAX_QTY_PER_LINE, (byId.get(id) ?? 0) + clamped));
  }
  return [...byId.entries()].slice(0, MAX_CART_LINES).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export interface PriceCartOpts {
  couponCode?: string | null;
  /** Required to validate a coupon; coupons are a customer-scoped grant upstream. */
  customerToken?: string | null;
}

/**
 * Prices a cart against the live catalog in ONE upstream request.
 *
 * The browser's cart is a list of ids and quantities and nothing else — no
 * prices. A cart that carried its own prices is a cart a customer can edit.
 */
export async function priceCart(
  lines: CartLineInput[],
  opts: PriceCartOpts = {},
): Promise<PricedCart> {
  if (lines.length === 0) return emptyCart();

  const res = await api.listProductsByIds(lines.map((l) => l.productId));
  const byId = new Map((res.products ?? []).map((p) => [p.id, toPublicProduct(p)]));

  const priced: PricedCartLine[] = [];
  const unavailable: number[] = [];
  /** Full catalogue shapes, kept for the § 15409 assessment (needs category + tags). */
  const assessable: AssessableLine[] = [];
  let subtotalCents = 0;

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) {
      unavailable.push(line.productId);
      continue;
    }
    assessable.push({
      name: p.name,
      quantity: line.quantity,
      tags: p.tags,
      category: p.category,
    });
    const unitCents = toCents(p.unitPrice);
    const lineCents = unitCents * line.quantity;
    subtotalCents += lineCents;
    priced.push({
      productId: p.id,
      name: p.name,
      image: p.image,
      quantity: line.quantity,
      unitPrice: p.unitPrice,
      listPrice: p.price,
      lineTotal: lineCents / 100,
      available: p.available,
      // Warning selection happens HERE, on the server, using the same functions
      // the product page uses — so the basket cannot show a different Prop 65
      // warning from the one on the PDP the customer added from.
      consumptionRoute: PROP65_WARNINGS_ENABLED
        ? classifyConsumptionRoute(p) ?? PROP65_FALLBACK_ROUTE
        : null,
      vapeHardware: vapeDisposalMessagesFor(p).map((m) => m.hardware),
    });
  }

  // ── coupon ────────────────────────────────────────────────────────────
  let discountCents = 0;
  let couponMessage: string | null = null;
  let couponApplied = false;
  const code = opts.couponCode?.trim();
  if (code && opts.customerToken && priced.length > 0) {
    try {
      const result = await api.validateCoupon(opts.customerToken, {
        code,
        cartTotal: subtotalCents / 100,
        items: priced.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          price: l.unitPrice,
        })),
      });
      if (result.valid) {
        discountCents = Math.min(subtotalCents, Math.max(0, toCents(result.discount)));
        couponApplied = discountCents > 0;
        if (!couponApplied) couponMessage = "That code doesn't change this cart's total.";
      } else {
        // Upstream's invalid-coupon text is about coupons, not infrastructure,
        // so it is safe to surface — but only this one field, and only when the
        // answer is a clean `valid: false`.
        couponMessage = typeof result.message === "string" ? result.message : "Invalid code.";
      }
    } catch (e) {
      logPageFailure("coupon-validate", e);
      couponMessage = "We couldn't check that code right now.";
    }
  } else if (code && !opts.customerToken) {
    couponMessage = "Sign in to use a promo code.";
  }

  // ── taxes (estimate) ──────────────────────────────────────────────────
  //
  // Broken out per component, not lumped: R&TC § 34011.2(d) requires the
  // cannabis excise tax to be SEPARATELY STATED on the document the purchaser
  // gets, and a single "tax" figure does not satisfy it. See src/lib/compliance/tax.ts.
  let taxes = { city: 0, excise: 0, state: 0, total: 0 };
  let exciseRatePercent: number | null = null;
  try {
    const rates = await api.getTaxRates();
    exciseRatePercent = Number.isFinite(rates.exciseRate) ? rates.exciseRate : null;
    const t = computeTaxes(subtotalCents - discountCents, rates);
    taxes = {
      city: t.cityCents / 100,
      excise: t.exciseCents / 100,
      state: t.stateCents / 100,
      total: t.totalCents / 100,
    };
    // The rate is the back office's to set, and this app must not overwrite it —
    // showing a customer a number they will not be charged is worse than the
    // wrong rate. But it must not pass silently either: AB 564 put the rate back
    // to 15 % on 1 Oct 2025 and a back office still charging the repealed 19 %
    // is over-collecting on every order.
    if (exciseRatePercent != null) {
      const check = checkExciseRate(exciseRatePercent, pacificDateKey());
      if (check.warning) console.error(check.warning);
    }
  } catch (e) {
    logPageFailure("tax-rates", e);
  }

  const estimatedTotalCents =
    subtotalCents - discountCents + Math.round(taxes.total * 100);

  return {
    lines: priced,
    unavailableProductIds: unavailable,
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    couponMessage,
    couponApplied,
    taxes,
    exciseRatePercent,
    estimatedTotal: Math.max(0, estimatedTotalCents) / 100,
    dailyLimit: assessDailyLimits(assessable),
  };
}

function emptyCart(): PricedCart {
  return {
    lines: [],
    unavailableProductIds: [],
    subtotal: 0,
    discount: 0,
    couponMessage: null,
    couponApplied: false,
    taxes: { city: 0, excise: 0, state: 0, total: 0 },
    exciseRatePercent: null,
    estimatedTotal: 0,
    dailyLimit: EMPTY_DAILY_LIMIT_ASSESSMENT,
  };
}

// ───────────────────── § 15409 re-validation at checkout ─────────────────────

/**
 * The daily-limit check that actually matters: 4 CCR § 15409 is PER CUSTOMER
 * PER DAY, not per order, so a second basket the same day is measured against
 * the first.
 *
 * Runs server-side at order placement only — it costs one extra upstream call,
 * which is fine once per checkout and would not be fine on every cart keystroke.
 * The cart's own assessment (`priceCart`) is the advisory copy; this is the one
 * that refuses.
 *
 * Same declared gap applies: unmeasurable lines contribute zero, so this can
 * prove an over-limit day and cannot prove an under-limit one. See
 * `src/lib/compliance/limits.ts`.
 */
export async function assessDailyLimitsForCheckout(
  lines: CartLineInput[],
  customerToken: string,
): Promise<DailyLimitAssessment> {
  if (lines.length === 0) return EMPTY_DAILY_LIMIT_ASSESSMENT;

  const assessable: AssessableLine[] = [];

  const res = await api.listProductsByIds(lines.map((l) => l.productId));
  const byId = new Map((res.products ?? []).map((p) => [p.id, toPublicProduct(p)]));
  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) continue;
    assessable.push({ name: p.name, quantity: line.quantity, tags: p.tags, category: p.category });
  }

  // Everything already sold to this customer TODAY, Pacific.
  try {
    const today = pacificDateKey();
    const history = await api.listMyOrders(customerToken, { limit: 25 });
    for (const order of history.orders ?? []) {
      if (!order.createdAt) continue;
      const placed = new Date(order.createdAt);
      if (Number.isNaN(placed.getTime()) || pacificDateKey(placed) !== today) continue;
      // A cancelled order was not a sale.
      if (/cancel/i.test(order.status ?? "")) continue;
      for (const item of order.orderItems ?? []) {
        const name = item.product?.name;
        if (!name) continue;
        // Past orders carry no category or tags — classification falls back to
        // the product name, which is the same signal the weight is parsed from.
        assessable.push({ name, quantity: item.quantity, tags: null, category: null });
      }
    }
  } catch (e) {
    // A history we cannot read must not block a lawful order, but it must not
    // pass as "nothing bought today" either — say so in the log.
    logPageFailure("daily-limit-history", e);
    console.error(
      "[compliance] 4 CCR § 15409 day total could not include prior orders — order history unreadable. This basket was checked in isolation.",
    );
  }

  return assessDailyLimits(assessable);
}

function logPageFailure(what: string, e: unknown): void {
  if (e instanceof UpstreamError) {
    console.error(`[store] ${what} failed: ${e.code} (${e.status})`);
    return;
  }
  console.error(`[store] ${what} failed`, e);
}
