/**
 * The shapes THIS storefront speaks — to its own pages and to its own browser
 * JavaScript. Pure types, no imports, importable from anywhere.
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
  ageGate: boolean;
  minAge: number;
  showCannabinoids: boolean;
  requireIdVerification: boolean;
  couponsEnabled: boolean;
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
}

export interface PricedCart {
  lines: PricedCartLine[];
  /** Ids in the request that the catalog no longer resolves. */
  unavailableProductIds: number[];
  subtotal: number;
  discount: number;
  couponMessage: string | null;
  couponApplied: boolean;
  taxes: { city: number; excise: number; state: number; total: number };
  /**
   * Best-effort total. Store-wide deal engines run at checkout and can only make
   * this smaller, so treat it as an upper bound, not a quote.
   */
  estimatedTotal: number;
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
