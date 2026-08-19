import type { DailyLimitAssessment } from "@/lib/compliance/limits";
import type { ConsumptionRoute } from "@/lib/compliance/prop65";
import type { VapeHardware } from "@/lib/compliance/vape";

/**
 * The shapes THIS storefront speaks — to its own pages and to its own browser
 * JavaScript. Pure types, importable from anywhere — the three imports above
 * are `import type` only and are erased at compile time, so this file still
 * pulls in no runtime code.
 *
 * These are deliberately NOT the upstream wire types. Everything that crosses
 * from `src/lib/kamui/types.ts` goes through `src/lib/kamui/map.ts`, which:
 *   - rewrites image paths onto our own /api/img proxy,
 *   - drops upstream-only identifiers (tenant slug, internal flags),
 *   - drops fields the browser has no use for.
 *
 * If you need a new field in the UI, add it here AND map it there. Do not widen
 * a component to take the wire type.
 */

export interface PublicCategory {
  id: number;
  name: string;
  productCount: number;
}

export interface PublicBrand {
  id: number;
  name: string;
  productCount: number;
}

export interface PublicProduct {
  id: number;
  name: string;
  description: string | null;
  tags: string[];
  /** List price, dollars. */
  price: number;
  /** Discounted price when the product is on sale, else null. */
  salePrice: number | null;
  /** What one unit actually costs today: `salePrice ?? price`. */
  unitPrice: number;
  /** Our own proxied URL (`/api/img/...`) or an external absolute URL, or null. */
  image: string | null;
  category: { id: number; name: string } | null;
  brand: { id: number; name: string } | null;
  available: boolean;
  genetics: string | null;
  thcPercentage: number | null;
  cbdPercentage: number | null;
  featured: boolean;
}

export interface PublicProductPage {
  products: PublicProduct[];
  total: number;
  page: number;
  totalPages: number;
  /**
   * True when the catalog could not be READ at all, as opposed to genuinely
   * having no matches. The UI must say different things for "nothing matches
   * your search" and "the shelves are unreachable" — and neither message may
   * say why.
   */
  unavailable: boolean;
}

/** Store-level config the UI is allowed to know. No tenant identifiers. */
export interface PublicStoreProfile {
  storeName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImage: string | null;
  open: boolean;
  /**
   * The legal-age THRESHOLD. There is deliberately no `ageGate` boolean here:
   * the gate is unconditional in `app/layout.tsx` and must not be switchable
   * from a dashboard toggle. Upstream still sends one (`TenantProfileV1.ageGate`)
   * and `toPublicStoreProfile` deliberately drops it on the floor.
   */
  minAge: number;
  showCannabinoids: boolean;
  requireIdVerification: boolean;
  couponsEnabled: boolean;

  /** Shop logo, ALREADY proxied through /api/img — safe to put in an <img>. */
  logo: string | null;

  // ── Business identity ─────────────────────────────────────────────────────
  //
  // Edited by the operator in their dashboard settings; env vars remain as the
  // fallback so the legal pages still render when nothing is configured
  // upstream, or the upstream is unreachable (FALLBACK_PROFILE carries the env
  // values too).
  //
  // Dashboard wins over env: the point is that a licence-number typo is fixed
  // in a settings form, not with a redeploy.
  //
  // All nullable; null means "not set anywhere", and the UI renders its loud
  // not-set placeholder rather than nothing.
  licenseNumber: string | null;
  legalEntityName: string | null;
  localPermitNumber: string | null;
  privacyContactEmail: string | null;
  privacyContactAddress: string | null;
  policyEffectiveDate: string | null;
  saferUseBrochureUrl: string | null;
}

export interface PublicCustomer {
  name: string | null;
  phone: string;
  address: string | null;
}

/** What `GET /api/auth/me` answers. Never carries a token. */
export interface SessionState {
  authenticated: boolean;
  /** Phone verified but no profile yet — the sign-in flow must finish. */
  pendingRegistration: boolean;
  customer: PublicCustomer | null;
}

export interface CartLineInput {
  productId: number;
  quantity: number;
}

export interface PricedCartLine {
  productId: number;
  name: string;
  image: string | null;
  quantity: number;
  /** Dollars, one unit, after any product-level sale. */
  unitPrice: number;
  listPrice: number;
  lineTotal: number;
  available: boolean;
  /**
   * Which of the four tailored Prop 65 warnings this line needs
   * (27 CCR §§ 25607.39/.41/.43/.45), or null when Prop 65 warnings are
   * switched off under the HSC § 25249.11(b) sub-10-employee exemption.
   *
   * Classified SERVER-SIDE from the catalogue, never in the browser — the same
   * function the product page uses, so the cart cannot disagree with the PDP.
   */
  consumptionRoute: ConsumptionRoute | null;
  /**
   * Vape hardware kinds whose B&P § 26152.1 disposal message this line must
   * carry. Empty for everything that is not a cartridge or an integrated
   * vaporizer. Two entries when the catalogue does not say which it is.
   */
  vapeHardware: VapeHardware[];
}

export interface PricedCart {
  lines: PricedCartLine[];
  /** Ids in the request that the catalog no longer resolves. */
  unavailableProductIds: number[];
  subtotal: number;
  discount: number;
  couponMessage: string | null;
  couponApplied: boolean;
  /**
   * Separately stated, because R&TC § 34011.2(d) requires the cannabis excise
   * tax to be separately stated on the document the purchaser gets. A single
   * lumped "tax" figure does not satisfy it. Order matters too — § 34011.2(e)–(f)
   * computes sales tax on a base that includes the excise tax.
   */
  taxes: { city: number; excise: number; state: number; total: number };
  /** The excise rate the backend says it will charge, in percent. */
  exciseRatePercent: number | null;
  /**
   * Best-effort total. Store-wide deal engines run at checkout and can only make
   * this smaller, so treat it as an upper bound, not a quote.
   */
  estimatedTotal: number;
  /**
   * 4 CCR § 15409 daily-limit position for THIS CART ONLY. Computed server-side.
   *
   * ⚠️ Read `src/lib/compliance/limits.ts` before trusting it: the catalogue
   * publishes no per-SKU weights, so every figure here is a FLOOR. It can prove
   * a cart is over the limit; it cannot prove one is under it. The per-customer
   * per-day aggregation that § 15409 actually requires happens at checkout,
   * server-side, where the customer's order history is reachable.
   */
  dailyLimit: DailyLimitAssessment;
}

export interface PublicOrderSummary {
  id: number;
  orderNumber: number | null;
  status: string;
  total: number;
  paidOnDelivery: boolean;
  trackingToken: string | null;
  placedAt: string;
  items: { name: string; quantity: number; unitPrice: number }[];
}

/** The tracking page payload. Carries no line items and no money — by design. */
export interface PublicTracking {
  orderNumber: number | null;
  status: string;
  customerName: string | null;
  address: string | null;
  eta: string | null;
  arrivedAt: string | null;
  placedAt: string;
  driverFirstName: string | null;
  driverPhone: string | null;
  hasDriverLocation: boolean;
}

/** Uniform error envelope for every one of our own /api routes. */
export interface ApiErrorBody {
  error: string;
  message?: string;
  /** Only ever set from structured, whitelisted upstream fields. */
  detail?: Record<string, string | number>;
}
