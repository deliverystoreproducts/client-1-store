import "server-only";

import { getUpstreamConfig, UpstreamConfigError } from "./env";
import { UpstreamError, type UpstreamErrorCode } from "./errors";
import type {
  DeliveryZoneResponse,
  MyCouponsResponse,
  ListDealsResponse,
  DealDetailResponse,
  CheckoutErrorBodyV1,
  CheckoutRequestV1,
  CheckoutResponseV1,
  CouponValidateRequestV1,
  CouponValidateResponseV1,
  ListBrandsResponse,
  ListCategoriesResponse,
  ListOrdersResponse,
  ListProductsResponse,
  MeResponse,
  ProductDetailResponse,
  RegisterResponse,
  SendCodeResponse,
  TaxRatesV1,
  TenantProfileV1,
  TrackingOrderV1,
  VerifyCodeResponse,
} from "./types";

/**
 * The ONE place that knows the upstream base URL, holds the API key, and sets
 * headers. Nothing else in this repo may call `fetch()` against upstream.
 *
 * SERVER ONLY — enforced by `server-only` at the top.
 *
 * Why every call is server-side: the upstream `/api/store/v1/*` surface sends no
 * CORS headers at all (its middleware adds them only for the driver and manager
 * APIs), so a browser could not call it even if we wanted it to. That constraint
 * is load-bearing rather than annoying: it means the API key never has a reason
 * to exist outside this process.
 */

const API_PREFIX = "/api/store/v1";

interface CallOpts {
  /** Relayed as `x-customer-token`. NOT `Authorization` — that header carries
   *  the API key, and upstream reads the customer session from its own header. */
  customerToken?: string | null;
  /**
   * What a 401 from THIS endpoint means.
   *
   * Getting this wrong is not cosmetic. The OTP endpoints answer 401 for a
   * mistyped code while carrying no customer token at all, so inferring "no
   * token, therefore our API key is bad" turned every wrong code into a
   * 503 "the store is unavailable" — the user is told the shop is down when
   * they simply fat-fingered a digit. Endpoints where 401 is about the PERSON
   * say so explicitly.
   */
  unauthorizedMeans?: "api_key" | "customer";
  /** Next.js data-cache controls. */
  revalidate?: number | false;
  tags?: string[];
  signal?: AbortSignal;
}

function classify(status: number, means: "api_key" | "customer"): UpstreamErrorCode {
  if (status === 401) {
    return means === "customer" ? "customer_unauthorized" : "unauthorized";
  }
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limited";
  if (status >= 400 && status < 500) return "rejected";
  return "upstream_error";
}

function logUpstreamFailure(method: string, path: string, err: UpstreamError): void {
  // Server log only. Deliberately no base URL: these lines end up in aggregated
  // log services, and the path alone is enough to debug with.
  console.error(
    `[upstream] ${method} ${path} -> ${err.code} (${err.status})`,
    err.upstreamMessage ?? "",
  );
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function messageOf(body: unknown): string | undefined {
  if (body && typeof body === "object" && "error" in body) {
    const e = (body as { error?: unknown }).error;
    if (typeof e === "string") return e;
  }
  if (typeof body === "string") return body.slice(0, 400);
  return undefined;
}

async function call<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  init: { json?: unknown; form?: FormData } = {},
  opts: CallOpts = {},
): Promise<T> {
  let cfg;
  try {
    cfg = getUpstreamConfig();
  } catch (e) {
    if (e instanceof UpstreamConfigError) {
      console.error(`[upstream] not configured: ${e.message}`);
      throw new UpstreamError("not_configured", 0);
    }
    throw e;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.apiKey}`,
    Accept: "application/json",
  };
  if (opts.customerToken) headers["x-customer-token"] = opts.customerToken;

  let body: BodyInit | undefined;
  if (init.form) {
    body = init.form; // fetch sets the multipart boundary itself
  } else if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }

  // Own timeout, chained to any caller abort. Without this a hung upstream holds
  // a request worker until the platform kills it.
  const timer = AbortSignal.timeout(cfg.timeoutMs);
  const signal = opts.signal ? AbortSignal.any([timer, opts.signal]) : timer;

  const nextOpts: { revalidate?: number | false; tags?: string[] } = {};
  if (opts.revalidate !== undefined) nextOpts.revalidate = opts.revalidate;
  if (opts.tags) nextOpts.tags = opts.tags;

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}${path}`, {
      method,
      headers,
      body,
      signal,
      ...(Object.keys(nextOpts).length ? { next: nextOpts } : { cache: "no-store" }),
    } as RequestInit & { next?: typeof nextOpts });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    const err = new UpstreamError(timedOut ? "timeout" : "network", 0);
    logUpstreamFailure(method, path, err);
    throw err;
  }

  if (!res.ok) {
    const parsed = await readBody(res);
    const means = opts.unauthorizedMeans ?? (opts.customerToken ? "customer" : "api_key");
    const err = new UpstreamError(classify(res.status, means), res.status, {
      upstreamMessage: messageOf(parsed),
      body: parsed,
    });
    logUpstreamFailure(method, path, err);
    throw err;
  }

  if (res.status === 204) return undefined as T;

  const parsed = await readBody(res);
  if (parsed === null) return undefined as T;
  return parsed as T;
}

/** Raw upstream response, for byte streams (the image proxy). Same key, same
 *  timeout discipline; the caller owns the body. */
export async function getUpstreamStream(
  path: string,
  opts: { timeoutMs?: number; withApiKey?: boolean } = {},
): Promise<Response> {
  let cfg;
  try {
    cfg = getUpstreamConfig();
  } catch (e) {
    if (e instanceof UpstreamConfigError) throw new UpstreamError("not_configured", 0);
    throw e;
  }
  const headers: Record<string, string> = {};
  // The uploads route is public upstream and does not read the key. We do not
  // send a credential to an endpoint that does not need one.
  if (opts.withApiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

  try {
    return await fetch(`${cfg.baseUrl}${path}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(opts.timeoutMs ?? cfg.timeoutMs),
      cache: "no-store",
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new UpstreamError(timedOut ? "timeout" : "network", 0);
  }
}

// ───────────────────────────── catalog ─────────────────────────────

export interface ProductQuery {
  ids?: number[];
  categoryId?: number;
  brandId?: number;
  search?: string;
  sort?: "price_asc" | "price_desc" | "name_asc" | "newest";
  minPrice?: number;
  maxPrice?: number;
  genetics?: string;
  minThc?: number;
  maxThc?: number;
  onSale?: boolean;
  featured?: boolean;
  page?: number;
  limit?: number;
}

function productQueryString(q: ProductQuery): string {
  const sp = new URLSearchParams();
  if (q.ids?.length) sp.set("ids", q.ids.join(","));
  if (q.categoryId) sp.set("categoryId", String(q.categoryId));
  if (q.brandId) sp.set("brandId", String(q.brandId));
  if (q.search) sp.set("search", q.search);
  if (q.sort) sp.set("sort", q.sort);
  if (q.minPrice != null) sp.set("minPrice", String(q.minPrice));
  if (q.maxPrice != null) sp.set("maxPrice", String(q.maxPrice));
  if (q.genetics) sp.set("genetics", q.genetics);
  if (q.minThc != null) sp.set("minThc", String(q.minThc));
  if (q.maxThc != null) sp.set("maxThc", String(q.maxThc));
  if (q.onSale) sp.set("onSale", "true");
  if (q.featured) sp.set("featured", "true");
  if (q.page) sp.set("page", String(q.page));
  if (q.limit) sp.set("limit", String(q.limit));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** GET /products — the list, the search, and (via `ids`) the cart repricing. */
export function listProducts(q: ProductQuery, opts: CallOpts = {}): Promise<ListProductsResponse> {
  return call<ListProductsResponse>("GET", `${API_PREFIX}/products${productQueryString(q)}`, {}, {
    revalidate: 60,
    tags: ["catalog"],
    ...opts,
  });
}

/**
 * Price an exact set of ids in ONE request. This parameter exists upstream
 * precisely so a cart does not have to fan out per line item and hope the
 * answers agree; a non-numeric id invalidates the whole call rather than
 * silently shrinking the cart.
 */
export function listProductsByIds(ids: number[]): Promise<ListProductsResponse> {
  return listProducts({ ids, limit: Math.min(100, Math.max(1, ids.length)) }, {
    revalidate: false, // money — never serve a cart from a stale price
  });
}

export function getProduct(id: number): Promise<ProductDetailResponse> {
  return call<ProductDetailResponse>("GET", `${API_PREFIX}/products/${id}`, {}, {
    revalidate: 60,
    tags: ["catalog"],
  });
}

export function listCategories(): Promise<ListCategoriesResponse> {
  return call<ListCategoriesResponse>("GET", `${API_PREFIX}/categories`, {}, {
    revalidate: 300,
    tags: ["catalog"],
  });
}

export function listBrands(q: { page?: number; limit?: number; search?: string } = {}): Promise<ListBrandsResponse> {
  const sp = new URLSearchParams();
  if (q.page) sp.set("page", String(q.page));
  if (q.limit) sp.set("limit", String(q.limit));
  if (q.search) sp.set("search", q.search);
  const qs = sp.toString();
  return call<ListBrandsResponse>("GET", `${API_PREFIX}/brands${qs ? `?${qs}` : ""}`, {}, {
    revalidate: 300,
    tags: ["catalog"],
  });
}

/**
 * GET /deals — the live promotions.
 *
 * Upstream already filters by `active` AND the start/expiry window, so anything
 * returned here is running right now. Do not re-filter on dates in the UI: the
 * two clocks are different machines, and the shop's answer is the one that
 * counts at checkout.
 */
export function listDeals(): Promise<ListDealsResponse> {
  return call<ListDealsResponse>("GET", `${API_PREFIX}/deals`, {}, {
    revalidate: 120,
    tags: ["deals"],
  });
}

/** GET /deals/[id] — one deal plus the products it applies to, priced for us. */
export function getDeal(id: number): Promise<DealDetailResponse> {
  return call<DealDetailResponse>("GET", `${API_PREFIX}/deals/${id}`, {}, {
    revalidate: 120,
    tags: ["deals"],
  });
}

/**
 * GET /coupon/mine?phone=… — the coupons this phone can use now.
 *
 * ⚠ The upstream authenticates the STORE, not the customer: it will answer for
 * ANY phone the caller names. The phone therefore must never come from a
 * request — see src/app/api/coupons/route.ts, which reads it from the verified
 * session. Do not add a caller that passes a client-supplied value.
 */
export function listMyCoupons(phone: string): Promise<MyCouponsResponse> {
  return call<MyCouponsResponse>(
    "GET",
    `${API_PREFIX}/coupon/mine?phone=${encodeURIComponent(phone)}`,
    {},
    { revalidate: false }, // a wallet must not be served from another request's cache
  );
}

/**
 * GET /delivery-zone — the minimum order for an address, before the customer
 * has spent any more effort on the checkout.
 *
 * Not cached: zones are per-address, and a cache keyed on a full street address
 * is both useless and a small pile of customer addresses in a shared store.
 */
export function lookupDeliveryZone(address: string): Promise<DeliveryZoneResponse> {
  return call<DeliveryZoneResponse>(
    "GET",
    `${API_PREFIX}/delivery-zone?address=${encodeURIComponent(address)}`,
    {},
    { revalidate: false },
  );
}

export function getTenantProfile(): Promise<TenantProfileV1> {
  return call<TenantProfileV1>("GET", `${API_PREFIX}/tenant-profile`, {}, {
    revalidate: 300,
    tags: ["store-profile"],
  });
}

export function getTaxRates(): Promise<TaxRatesV1> {
  return call<TaxRatesV1>("GET", `${API_PREFIX}/tax-rates`, {}, {
    revalidate: 300,
    tags: ["store-profile"],
  });
}

// ───────────────────────────── auth ─────────────────────────────

export function sendLoginCode(phone: string): Promise<SendCodeResponse> {
  return call<SendCodeResponse>("POST", `${API_PREFIX}/auth/send-code`, { json: { phone } }, {
    unauthorizedMeans: "customer",
  });
}

export function verifyLoginCode(phone: string, code: string): Promise<VerifyCodeResponse> {
  return call<VerifyCodeResponse>(
    "POST",
    `${API_PREFIX}/auth/verify-code`,
    { json: { phone, code } },
    // A 401 here is a wrong or expired CODE, not a bad API key — this endpoint
    // rejects the person, and it does so without any customer token in play.
    { unauthorizedMeans: "customer" },
  );
}

/**
 * Finish signup for a phone that verified but has no customer record yet.
 * Authenticated by the SHORT-LIVED verified-phone token from verify-code, not by
 * a customer token. Multipart because it optionally carries a government-ID
 * photo (only required when the store has ID verification switched on).
 */
export function registerCustomer(
  verifiedPhoneToken: string,
  fields: { name: string; address?: string | null; idPhoto?: File | null },
): Promise<RegisterResponse> {
  const form = new FormData();
  form.set("name", fields.name);
  if (fields.address) form.set("address", fields.address);
  if (fields.idPhoto) form.set("idPhoto", fields.idPhoto);
  return call<RegisterResponse>("POST", `${API_PREFIX}/auth/register`, { form }, {
    customerToken: verifiedPhoneToken,
  });
}

/**
 * Attach a government-ID photo to a signed-in customer. Upstream stores the
 * object and flips `hasId`; the storefront never sees the file again.
 */
export function uploadIdPhoto(
  customerToken: string,
  photo: File,
): Promise<{ key?: string }> {
  const form = new FormData();
  form.set("photo", photo);
  return call<{ key?: string }>("POST", `${API_PREFIX}/account/id-photo`, { form }, {
    customerToken,
  });
}

export function getMe(customerToken: string): Promise<MeResponse> {
  return call<MeResponse>("GET", `${API_PREFIX}/auth/me`, {}, { customerToken });
}

export function updateMe(
  customerToken: string,
  patch: { name?: string; address?: string },
): Promise<MeResponse> {
  return call<MeResponse>("PATCH", `${API_PREFIX}/auth/me`, { json: patch }, { customerToken });
}

/** Upstream tokens are stateless, so this is symmetry only — the real logout is
 *  us dropping the cookie. Kept so a future server-side revocation lands here. */
export function logoutUpstream(customerToken: string): Promise<void> {
  return call<void>("POST", `${API_PREFIX}/auth/logout`, { json: {} }, { customerToken });
}

// ───────────────────────────── orders ─────────────────────────────

export function checkout(
  customerToken: string,
  body: CheckoutRequestV1,
): Promise<CheckoutResponseV1> {
  return call<CheckoutResponseV1>("POST", `${API_PREFIX}/checkout`, { json: body }, {
    customerToken,
  });
}

export function listMyOrders(
  customerToken: string,
  q: { limit?: number; cursor?: number } = {},
): Promise<ListOrdersResponse> {
  const sp = new URLSearchParams();
  if (q.limit) sp.set("limit", String(q.limit));
  if (q.cursor) sp.set("cursor", String(q.cursor));
  const qs = sp.toString();
  return call<ListOrdersResponse>("GET", `${API_PREFIX}/orders${qs ? `?${qs}` : ""}`, {}, {
    customerToken,
  });
}

/** Tracking is API-key-authed only — the token in the path IS the capability. */
export function trackOrder(token: string): Promise<TrackingOrderV1> {
  return call<TrackingOrderV1>(
    "GET",
    `${API_PREFIX}/orders/track/${encodeURIComponent(token)}`,
  );
}

export function validateCoupon(
  customerToken: string,
  body: CouponValidateRequestV1,
): Promise<CouponValidateResponseV1> {
  return call<CouponValidateResponseV1>("POST", `${API_PREFIX}/coupon/validate`, { json: body }, {
    customerToken,
  });
}

export interface CouponLookupResponseV1 {
  valid: boolean;
  type?: string;
  value?: number;
}

/**
 * GET /coupon/lookup?code=… — a coupon's terms, no cart and no session needed.
 * The banner uses it so it only ever advertises a promo that actually exists
 * upstream and is still redeemable.
 */
export function lookupCoupon(code: string): Promise<CouponLookupResponseV1> {
  return call<CouponLookupResponseV1>(
    "GET",
    `${API_PREFIX}/coupon/lookup?code=${encodeURIComponent(code)}`,
  );
}

export type { CheckoutErrorBodyV1 };
