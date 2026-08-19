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
  let subtotalCents = 0;

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) {
      unavailable.push(line.productId);
      continue;
    }
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
  let taxes = { city: 0, excise: 0, state: 0, total: 0 };
  try {
    const rates = await api.getTaxRates();
    const t = computeTaxes(subtotalCents - discountCents, rates);
    taxes = {
      city: t.cityCents / 100,
      excise: t.exciseCents / 100,
      state: t.stateCents / 100,
      total: t.totalCents / 100,
    };
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
    estimatedTotal: Math.max(0, estimatedTotalCents) / 100,
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
    estimatedTotal: 0,
  };
}

function logPageFailure(what: string, e: unknown): void {
  if (e instanceof UpstreamError) {
    console.error(`[store] ${what} failed: ${e.code} (${e.status})`);
    return;
  }
  console.error(`[store] ${what} failed`, e);
}
