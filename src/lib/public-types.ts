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
  /** Our own proxied URL, or null. */
  image: string | null;
  video: string | null;
  /**
   * The operator's ordering, carried so the home page can present the first few
   * as a feature row and still know the order was chosen rather than incidental.
   */
  sortOrder: number;
  /**
   * A category the operator has given artwork to.
   *
   * There is deliberately no separate "featured" flag: uploading a picture IS
   * the act of featuring it. A flag would be a second control that can disagree
   * with the first — a category marked featured with no art renders as an empty
   * frame, and one with art but unflagged is work the operator did for nothing.
   */
  featured: boolean;
}

export interface PublicBrand {
  id: number;
  name: string;
  productCount: number;
  /**
   * Our own proxied URL, or null.
   *
   * Null is the NORMAL case, not a failure: most shops carry more brands than
   * they have logos for. The rail has to look deliberate without one.
   */
  image: string | null;
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

/**
 * A promotion, as the UI is allowed to see it.
 *
 * Note what is NOT here: `rules`. This storefront deliberately does not compute
 * discounts. The platform's deal engine runs at CHECKOUT and is the only thing
 * that decides what a cart costs; a second engine here would eventually
 * disagree with it, and the customer would be shown one price and charged
 * another. Deals are merchandising on this side — a name, a picture, and the
 * products they cover.
 *
 * `endsAt` is carried only so the UI can say "ends Friday". It is never used to
 * decide whether a deal is live: upstream already filtered by its own clock,
 * and re-deciding here on a different machine's clock is how a running deal
 * disappears from the page.
 */
export interface PublicDeal {
  id: number;
  name: string;
  /** "bundle" | "bogo" | whatever the shop configured. Free text, shown as a label. */
  type: string;
  description: string | null;
  /** Our own proxied URL, or null. */
  image: string | null;
  video: string | null;
  endsAt: string | null;
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
  /**
   * Hero video, proxied. Two of them because a phone and a desktop want
   * different crops of the same idea, and shipping a 16:9 desktop cut to a
   * portrait screen wastes most of the frame and most of the bytes.
   */
  heroVideo: string | null;
  heroVideoDesktop: string | null;
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

  /** Top promo strip. Null hides it — an empty bar is worse than none. */
  promoText: string | null;
  promoBadge: string | null;
  promoHref: string | null;
  /** The three promises under the hero. Empty hides the strip. */
  highlights: { icon: string; title: string; body: string }[];
  /** Cities the shop actually delivers to. */
  deliveryCities: string[];

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

/**
 * A coupon the signed-in customer can use.
 *
 * Note what is absent, and why each absence is deliberate:
 *
 *   note      — on a referral coupon the upstream row reads "Referral reward:
 *               <name> (<phone>) ordered". That is a DIFFERENT customer's name
 *               and phone number. It never crosses into this type. `label`
 *               below is derived from `source` instead, so the customer still
 *               learns where the coupon came from without learning who else
 *               shops here.
 *   phone     — the wallet is already scoped to the session's own phone;
 *               echoing it back adds nothing and puts a phone number in a page
 *               that gets opened in public.
 *   tenantId  — names the backend. Never leaves the server.
 *
 * `autoApplied` marks a coupon that works without being tapped. It is rendered
 * distinctly for a practical reason: shown as a tappable code, a customer who
 * did not tap it believes they lost it.
 */
export interface PublicCoupon {
  code: string;
  /** "percent" | "fixed" | "delivery" — what the value means. */
  type: string;
  value: number;
  /** Human-readable provenance, derived from `source`. Never the raw note. */
  label: string;
  expiresAt: string;
  /** Applies on its own at checkout; nothing for the customer to do. */
  autoApplied: boolean;
  /** Restricted to certain products or brands rather than the whole order. */
  targeted: boolean;
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
