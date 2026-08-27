/**
 * Upstream commerce API — v1 wire types.
 *
 * PROVENANCE — these are HAND-COPIED from the upstream monorepo. This repo lives
 * outside that release cycle and cannot depend on its `workspace:*` package, so
 * the types here are a snapshot, not a link. Sources, as of 2026-08-19:
 *
 *   packages/store-contract/src/{product,category,brand,deal,auth,checkout,order,
 *                                coupon,tenant-profile}.ts
 *   apps/dashboard/src/app/api/store/v1/**\/route.ts   (the actual handlers)
 *   apps/dashboard/src/lib/store/dto.ts                (toStoreProductV1)
 *
 * ⚠️ RE-CHECK THESE WHENEVER THE UPSTREAM API CHANGES. Nothing in this repo will
 *    tell you the contract drifted — a renamed field just becomes `undefined` at
 *    runtime. See README.md § "What to check when the upstream API changes".
 *
 * ⚠️ These are WIRE types, not view models. They must never be handed to a client
 *    component as-is: they carry upstream-relative image paths and upstream field
 *    semantics. Map them through `src/lib/public-dto.ts` first.
 *
 * KNOWN CONTRACT DISCREPANCIES (verified against the handlers, not the package):
 *   - CheckoutResponseV1.orderNumber is typed `string` upstream but the handler
 *     returns `checkoutOrder()`'s `sNo`, which is a `number`. Typed here as
 *     `number | string` and rendered as a string.
 *   - CheckoutResponseV1.trackingToken is typed `string` upstream but
 *     `checkoutOrder()` returns `string | null`. Typed here as nullable.
 */

// ─────────────────────────── catalog ───────────────────────────

export interface StoreProductV1 {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  tags: string[];
  price: number;
  salePrice: number | null;
  discountType: string | null;
  discountValue: number | null;
  /**
   * RELATIVE path in the upstream's own URL space (e.g. "/api/uploads/foo.jpg"),
   * NOT an absolute URL — the DTO mapper passes the raw DB value straight
   * through. Never emit this to the browser; run it through
   * `toPublicImageUrl()` so it is served by our own /api/img proxy.
   */
  image: string | null;
  category: { id: number; name: string } | null;
  brand: { id: number; name: string } | null;
  /** Always `true` upstream — availability is `isActive`, not a stock count. */
  inStock: boolean;
  stockQty: number;
  genetics: string | null;
  thcPercentage: number | null;
  cbdPercentage: number | null;
  weightPricing: unknown;
  featured: boolean;
  featuredOrder: number | null;
}

export interface ListProductsResponse {
  products: StoreProductV1[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductDetailResponse {
  product: StoreProductV1;
  related: StoreProductV1[];
}

export interface StoreCategoryV1 {
  /** Category artwork set by the operator. May be a RELATIVE upload path. */
  image?: string | null;
  video?: string | null;
  /** The operator's chosen order — also the array order, but published as a value. */
  sortOrder?: number;
  id: number;
  name: string;
  productCount: number;
}

/** GET /categories returns a BARE ARRAY, not an envelope. */
export type ListCategoriesResponse = StoreCategoryV1[];

export interface StoreBrandV1 {
  /** Brand artwork, set by the operator. May be a RELATIVE upload path. */
  image?: string | null;
  id: number;
  name: string;
  productCount: number;
}

export interface ListBrandsResponse {
  brands: StoreBrandV1[];
  total: number;
  page: number;
  totalPages: number;
}

// ─────────────────────────── tenant profile ───────────────────────────

/**
 * Store-level configuration. `slug` is the upstream tenant identifier — it is
 * deliberately dropped by the public mapper and must never reach the browser.
 */
export interface TenantProfileV1 {
  /** Shop-window copy the operator controls from the dashboard (STORE-WIN1). */
  promoText?: string | null;
  promoBadge?: string | null;
  promoHref?: string | null;
  /** Already parsed and clamped upstream — at most three, every one has a title. */
  highlights?: { icon: string; title: string; body: string }[];
  /** Cities from the shop's ACTIVE delivery zones — the ones checkout enforces. */
  deliveryCities?: string[];
  slug: string;
  storeName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroBgImage: string | null;
  heroBgVideo: string | null;
  heroDesktopVideo: string | null;
  storeEnabled: boolean;
  ageGate: boolean;
  minAge: number;
  cannabinoidDisplay: boolean;
  requireIdVerification: boolean;
  couponsDeals: boolean;

  // Business identity, edited in the upstream dashboard (Settings → Business).
  // All optional/nullable: null means "the operator has not set this yet",
  // never "set to empty" — the UI needs that distinction to render its loud
  // not-set placeholders. Optional (`?`) so an older upstream that predates
  // these fields still parses.
  //
  // The upstream key behind legalEntityName is the SAME one its register prints
  // on receipts — there is deliberately no second "entity name" field anywhere,
  // so a receipt and this site can never disagree about who the business is.
  licenseNumber?: string | null;
  legalEntityName?: string | null;
  localPermitNumber?: string | null;
  privacyContactEmail?: string | null;
  contactAddress?: string | null;
  policyEffectiveDate?: string | null;
  saferUseBrochureUrl?: string | null;
  /** Raw upstream value — may be a relative upload path on the upstream host.
   *  NEVER emit as-is; it must go through toPublicImageUrl like every image. */
  shopLogo?: string | null;
}

export interface TaxRatesV1 {
  stateRate: number;
  exciseRate: number;
  cityRate: number;
}

// ─────────────────────────── auth ───────────────────────────

export interface CustomerProfileV1 {
  customerId: number;
  phone: string;
  name: string | null;
  address: string | null;
  hasId: boolean;
  referredFrom: string | null;
}

/** verify-code / send-code(OTP-disabled) for a KNOWN phone. */
export interface VerifyCodeExistingResponse {
  token: string;
  customer: CustomerProfileV1;
}

/**
 * verify-code for an UNKNOWN phone. `token` is a short-lived verified-phone
 * token — it authenticates /auth/register and NOTHING else.
 */
export interface VerifyCodeNewResponse {
  phoneVerified: true;
  token: string;
}

export type VerifyCodeResponse = VerifyCodeExistingResponse | VerifyCodeNewResponse;

/** send-code normally answers `{ sent: true }`; with OTP disabled upstream it
 *  short-circuits straight to a verify-code-shaped body. */
export type SendCodeResponse = { sent: true } | VerifyCodeResponse;

export type RegisterResponse = VerifyCodeExistingResponse;

export interface MeResponse {
  customer: CustomerProfileV1;
}

// ─────────────────────────── cart / checkout ───────────────────────────

export interface CheckoutItemV1 {
  productId: number;
  quantity: number;
}

export interface CheckoutRequestV1 {
  items: CheckoutItemV1[];
  address: string;
  notes?: string | null;
  couponCode?: string | null;
  /** Whether to persist `address` back onto the customer record. Upstream
   *  default is `true` when omitted. */
  addressUpdate?: boolean;
}

export interface CheckoutResponseV1 {
  orderId: number;
  orderNumber: number | string;
  trackingToken: string | null;
}

/**
 * Structured checkout failures. The handler returns a bare `{ error }` for most
 * cases; `minimum_order` additionally carries the numbers we need to write our
 * own message instead of echoing the upstream string.
 */
export interface CheckoutErrorBodyV1 {
  error?: string;
  details?: unknown;
  minimumOrder?: number;
  city?: string;
}

export interface CouponValidateRequestV1 {
  code: string;
  cartTotal: number;
  items: { productId: number; quantity: number; price: number }[];
}

export interface CouponValidateResponseV1 {
  valid: boolean;
  /** Dollars. 0 when invalid or non-monetary. */
  discount: number;
  couponId?: number;
  type?: string;
  value?: number;
  /** Human-readable reason when invalid. Upstream-authored text — safe to show
   *  (it names coupons, not infrastructure), but we still whitelist it. */
  message?: string;
}

// ─────────────────────────── orders ───────────────────────────

export interface OrderItemV1 {
  quantity: number;
  unitPrice: number;
  product: { name: string };
}

export interface StoreOrderV1 {
  id: number;
  sNo: number | null;
  status: string;
  price: number;
  paymentType: string | null;
  paymentDone: boolean;
  trackingToken: string | null;
  createdAt: string;
  orderItems: OrderItemV1[];
}

export interface ListOrdersResponse {
  orders: StoreOrderV1[];
  nextCursor: number | null;
  limit: number;
}

/**
 * The public tracking payload. DELIBERATELY carries no line items and no money:
 * a tracking token travels by SMS and is freely forwardable, so the page answers
 * "where is my driver" and nothing about what was bought. Do not add fields here
 * hoping they appear — they were removed upstream on purpose.
 */
export interface TrackingOrderV1 {
  sNo: number | null;
  status: string;
  customerName: string | null;
  address: string | null;
  eta: string | null;
  arrivedAt: string | null;
  onfleetTrackUrl: string | null;
  createdAt: string;
  driverFirstName: string | null;
  driverLat: number | null;
  driverLng: number | null;
  destLat: number | null;
  destLng: number | null;
  driverProxyPhone: string | null;
  hasFeedback: boolean;
}

/**
 * A promotion, as the platform stores it.
 *
 * `rules` is deliberately `unknown` here and never parsed on this side.
 * `rules.matchId` names ids in the PLATFORM's id space; a storefront that
 * resolved them against its own catalogue would match nothing, and silently,
 * because "no products in this deal" is a legal answer. That is exactly how
 * every bundle quietly stopped applying after a catalogue cutover once. Ask
 * `GET /deals/[id]` for the membership instead — it resolves server-side.
 *
 * `image` and `video` may be RELATIVE upload paths; both go through
 * toPublicImageUrl like every other media reference.
 */
export interface StoreDealV1 {
  id: number;
  name: string;
  type: string;
  rules: unknown;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  image: string | null;
  video: string | null;
  description: string | null;
}

/** Route response shape: a bare array. Upstream already filters to live deals. */
export type ListDealsResponse = StoreDealV1[];

export interface DealDetailResponse {
  deal: StoreDealV1;
  products: StoreProductV1[];
}

/**
 * A coupon row, as the platform sends it.
 *
 * This is a RAW database row and it carries two things the browser must never
 * see. `note` on a referral coupon reads "Referral reward: <name> (<phone>)
 * ordered" — a DIFFERENT customer's name and phone number. `tenantId` names the
 * backend's tenancy. `toPublicCoupon` drops both; they are typed here precisely
 * so that dropping them is visible rather than accidental.
 */
export interface StoreCouponV1 {
  id: number;
  tenantId?: string;
  code: string;
  type: string;
  value: number;
  phone: string | null;
  source: string;
  note: string | null;
  used: boolean;
  reusable: boolean;
  useCount: number;
  targeting: unknown;
  expiresAt: string;
  createdAt: string;
}

export interface MyCouponsResponse {
  coupons: StoreCouponV1[];
  /**
   * A promo that applies WITHOUT being tapped (the 4/20 enrollment). Surfaced
   * separately upstream on purpose: shown in the tap-to-apply list, a customer
   * would think they lost it by not tapping.
   */
  autoPromo: {
    code: string;
    type: string;
    value: number;
    note: string | null;
    source: string;
    expiresAt: string;
  } | null;
}

/**
 * `GET /delivery-zone?address=…`. `zone: null` means the address did not match
 * any configured zone — which is NOT the same as "we don't deliver there": a
 * shop with no zones configured at all also returns null for everything.
 *
 * `deliveryFee` is on the wire and is deliberately NOT mapped through. It is
 * synced from Weedmaps and shown in the operator's settings, but no order path
 * ever adds it to a total — so putting it in front of a customer would
 * advertise a charge the driver will not collect.
 */
export interface DeliveryZoneResponse {
  zone: { city: string; name: string; minimumOrder: number; deliveryFee: number } | null;
}
