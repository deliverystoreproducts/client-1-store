import "server-only";

import { toPublicImageUrl } from "./images";
import {
  LEGAL_ENTITY_NAME,
  LICENSE_NUMBER,
  LOCAL_PERMIT_NUMBER,
  POLICY_EFFECTIVE_DATE,
  PRIVACY_CONTACT_ADDRESS,
  PRIVACY_CONTACT_EMAIL,
  SAFER_USE_BROCHURE_URL,
} from "@/lib/site";
import type {
  StoreBrandV1,
  StoreCategoryV1,
  StoreCouponV1,
  StoreDealV1,
  StoreOrderV1,
  StoreProductV1,
  TenantProfileV1,
  TrackingOrderV1,
  CustomerProfileV1,
} from "./types";
import type {
  PublicBrand,
  PublicCategory,
  PublicCoupon,
  PublicCustomer,
  PublicDeal,
  PublicOrderSummary,
  PublicProduct,
  PublicStoreProfile,
  PublicTracking,
} from "@/lib/public-types";

/**
 * Wire -> public. The ONLY sanctioned crossing point.
 *
 * Every mapper here is allow-list shaped: it names the fields it emits. A
 * spread would let a new upstream field ride into the browser the day it is
 * added, which is precisely the leak this file exists to prevent.
 */

export function toPublicProduct(p: StoreProductV1): PublicProduct {
  const unitPrice = p.salePrice != null && p.salePrice > 0 ? p.salePrice : p.price;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    tags: Array.isArray(p.tags) ? p.tags : [],
    price: p.price,
    salePrice: p.salePrice,
    unitPrice,
    image: toPublicImageUrl(p.image),
    category: p.category ? { id: p.category.id, name: p.category.name } : null,
    brand: p.brand ? { id: p.brand.id, name: p.brand.name } : null,
    // Upstream reports availability as "is this active and priced for this
    // store", not as a stock count. `stockQty` is a legacy column nobody
    // maintains there, so we do not surface it and we do not gate on it.
    available: p.inStock !== false,
    genetics: p.genetics,
    thcPercentage: p.thcPercentage,
    cbdPercentage: p.cbdPercentage,
    featured: !!p.featured,
  };
}

export function toPublicDeal(d: StoreDealV1): PublicDeal {
  return {
    id: d.id,
    name: d.name,
    type: typeof d.type === "string" ? d.type : "",
    description: d.description,
    // Both go through the proxy; the upload path allows a `video/` sub-path and
    // the proxy's allowed content types already include mp4/webm.
    image: toPublicImageUrl(d.image),
    video: toPublicImageUrl(d.video),
    endsAt: d.expiresAt,
  };
}

export function toPublicCategory(c: StoreCategoryV1): PublicCategory {
  const image = toPublicImageUrl(c.image ?? null);
  return {
    id: c.id,
    name: c.name,
    productCount: c.productCount,
    image,
    video: toPublicImageUrl(c.video ?? null),
    sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : 0,
    // Featured IS "has artwork" — see the note on PublicCategory. Note this
    // reads the PROXIED url, not the raw one: a picture on a host our proxy
    // refuses is not a picture we can show, so it must not promote the category
    // into a feature tile that would then render an empty frame.
    featured: image != null,
  };
}

export function toPublicBrand(b: StoreBrandV1): PublicBrand {
  return {
    id: b.id,
    name: b.name,
    productCount: b.productCount,
    image: toPublicImageUrl(b.image ?? null),
  };
}

export function toPublicStoreProfile(t: TenantProfileV1): PublicStoreProfile {
  return {
    // `slug` is upstream's tenant identifier — intentionally absent.
    storeName: t.storeName,
    contactPhone: t.contactPhone,
    contactEmail: t.contactEmail,
    heroTitle: t.heroTitle,
    heroSubtitle: t.heroSubtitle,
    heroImage: toPublicImageUrl(t.heroBgImage),
    // These were dropped on the floor: the operator could set them in the
    // dashboard and no storefront ever asked. The upload path and the settings
    // have existed the whole time.
    heroVideo: toPublicImageUrl(t.heroBgVideo),
    heroVideoDesktop: toPublicImageUrl(t.heroDesktopVideo),
    open: t.storeEnabled !== false,
    // `t.ageGate` is INTENTIONALLY NOT MAPPED. The age gate is a legal control
    // and is unconditional in the layout; letting a dashboard toggle reach the
    // browser is how it silently stopped showing. Only the threshold crosses.
    minAge: Number.isFinite(t.minAge) && t.minAge > 0 ? t.minAge : 21,
    showCannabinoids: !!t.cannabinoidDisplay,
    requireIdVerification: !!t.requireIdVerification,
    couponsEnabled: !!t.couponsDeals,

    // The logo is an image reference in the upstream's URL space; the proxy
    // mint is what keeps that host out of our HTML.
    logo: toPublicImageUrl(t.shopLogo),

    // Shop-window copy. Upstream already parsed, clamped and icon-checked the
    // highlights, so this is a pass-through with a shape guard rather than a
    // second validator — two validators is how they end up disagreeing.
    promoText: (t.promoText ?? "").trim() || null,
    promoBadge: (t.promoBadge ?? "").trim() || null,
    promoHref: (t.promoHref ?? "").trim() || null,
    highlights: Array.isArray(t.highlights) ? t.highlights.slice(0, 3) : [],
    deliveryCities: Array.isArray(t.deliveryCities)
      ? t.deliveryCities.filter((c) => typeof c === "string" && c.trim() !== "")
      : [],

    // Business identity: the dashboard value wins, env is the fallback. A
    // licence-number typo gets fixed in a settings form, not with a redeploy —
    // but a tenant that has configured nothing keeps working exactly as before.
    // (Upstream sends null for "not set", never "".)
    licenseNumber: t.licenseNumber ?? (LICENSE_NUMBER || null),
    legalEntityName: t.legalEntityName ?? (LEGAL_ENTITY_NAME || null),
    localPermitNumber: t.localPermitNumber ?? (LOCAL_PERMIT_NUMBER || null),
    privacyContactEmail: t.privacyContactEmail ?? (PRIVACY_CONTACT_EMAIL || null),
    privacyContactAddress: t.contactAddress ?? (PRIVACY_CONTACT_ADDRESS || null),
    policyEffectiveDate: t.policyEffectiveDate ?? (POLICY_EFFECTIVE_DATE || null),
    saferUseBrochureUrl: t.saferUseBrochureUrl ?? (SAFER_USE_BROCHURE_URL || null),
  };
}

export function toPublicCustomer(c: CustomerProfileV1): PublicCustomer {
  // customerId and referredFrom are upstream bookkeeping; the browser has no
  // use for either and an id is a handle we would rather not publish.
  return { name: c.name, phone: c.phone, address: c.address };
}

/**
 * Where a coupon came from, in words a customer recognises.
 *
 * Derived from `source` — an enum-ish column we control — rather than passed
 * through from `note`, which is free text written by the platform for STAFF and
 * contains third-party PII on referral coupons.
 */
function couponLabel(source: string): string {
  switch (source) {
    case "spin":
      return "Spin & win";
    case "catch":
      return "Catch & save";
    case "quiz":
      return "Strain quiz";
    case "promo_420":
      return "4/20 promo";
    case "referral":
      return "Referral reward";
    case "tenant_promo":
      return "Store promo";
    case "signup":
      return "Welcome offer";
    default:
      return "Offer";
  }
}

export function toPublicCoupon(c: StoreCouponV1, autoApplied = false): PublicCoupon {
  return {
    code: c.code,
    type: typeof c.type === "string" ? c.type : "",
    value: Number(c.value) || 0,
    label: couponLabel(c.source),
    expiresAt: c.expiresAt,
    autoApplied,
    // Only whether it is restricted, never to WHAT. The restriction is enforced
    // upstream at redemption; naming the products here would leak merchandising
    // decisions and cannot change the outcome.
    targeted: c.targeting != null,
  };
}

export function toPublicOrderSummary(o: StoreOrderV1): PublicOrderSummary {
  return {
    id: o.id,
    orderNumber: o.sNo,
    status: o.status,
    total: o.price,
    paidOnDelivery: !o.paymentDone,
    trackingToken: o.trackingToken,
    placedAt: o.createdAt,
    items: (o.orderItems ?? []).map((i) => ({
      name: i.product?.name ?? "Item",
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
  };
}

export function toPublicTracking(t: TrackingOrderV1): PublicTracking {
  return {
    orderNumber: t.sNo,
    status: t.status,
    customerName: t.customerName,
    address: t.address,
    eta: t.eta,
    arrivedAt: t.arrivedAt,
    placedAt: t.createdAt,
    driverFirstName: t.driverFirstName,
    // Upstream only ever puts a MASKED proxy line here, never a driver's mobile.
    driverPhone: t.driverProxyPhone,
    // The raw coordinates stay server-side: we report only whether a live
    // position exists, so the page can say "on the way" without publishing a
    // person's location to anyone holding a forwarded link.
    hasDriverLocation: t.driverLat != null && t.driverLng != null,
    // `onfleetTrackUrl` is deliberately dropped — it is a third-party URL that
    // identifies the dispatch stack behind this store.
  };
}
