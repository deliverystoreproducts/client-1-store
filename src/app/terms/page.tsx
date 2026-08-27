import type { Metadata } from "next";
import Link from "next/link";
import { DELIVERY_WINDOW_LABEL } from "@/lib/hours";
import { getStoreProfile } from "@/lib/store";
import {
  DAILY_LIMIT_CONCENTRATE_GRAMS,
  DAILY_LIMIT_IMMATURE_PLANTS,
  DAILY_LIMIT_NON_CONCENTRATED_GRAMS,
} from "@/lib/compliance/limits";
import {
  LICENSE_PLACEHOLDER,
  MISSING,
  SITE_NAME,
} from "@/lib/site";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  TERMS OF SERVICE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * No *general* California law requires a terms page. It is contract hygiene —
 * and for a cannabis delivery retailer the useful content is not boilerplate,
 * it is the operational conditions the customer must know before they order:
 * ID at the door, an adult recipient present, the state's hours, the state's
 * daily limits, and cash.
 *
 * 🚩 BUT — SB 378 (Wiener, Stats. 2025, Ch. 411), operative 1 July 2026, added
 *    B&P Chapter 31.3 (§ 22943 et seq.), which imposes terms-of-service
 *    disclosure duties on an "online cannabis marketplace" with exposure of up
 *    to $10,000 per violation per day. The legislative findings target
 *    third-party platforms, but the definition at § 22943(g)(2) reaches a site
 *    that "offers for sale cannabis or a cannabis product", with no
 *    third-party qualifier on that prong. Read literally, a licensed
 *    retailer's OWN e-commerce site is an online cannabis marketplace.
 *
 *    That is unresolved, there is no case law and no DCC guidance, and it is
 *    the highest-priority counsel question in COMPLIANCE.md (§ 13 item 12).
 *    **If counsel concludes SB 378 applies, this page stops being optional and
 *    acquires prescribed content.** Do not treat what is here as sufficient
 *    for that reading.
 *
 * Everything below is operational fact about how this store works. It is NOT a
 * drafted commercial contract — limitation of liability, dispute resolution,
 * governing law and arbitration are deliberately absent rather than invented,
 * because a developer writing those clauses is worse than not having them. See
 * README.md § "Operator checklist before launch".
 */

export const metadata: Metadata = {
  title: "Terms of service",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  // Business identity resolved server-side: dashboard value first, env
  // fallback (merged in lib/kamui/map.ts). Same names the render code always
  // used — only the source moved.
  const profile = await getStoreProfile();
  const LICENSE_NUMBER = profile.licenseNumber ?? "";
  const LEGAL_ENTITY_NAME = profile.legalEntityName ?? "";
  const POLICY_EFFECTIVE_DATE = profile.policyEffectiveDate ?? "";
  const PRIVACY_CONTACT_EMAIL = profile.privacyContactEmail ?? profile.contactEmail ?? "";
  const PRIVACY_CONTACT_ADDRESS = profile.privacyContactAddress ?? "";
  const LOCAL_PERMIT_NUMBER = profile.localPermitNumber ?? "";

  return (
    <article className="legal">
      <h1 className="display">Terms of service</h1>

      <div className="legal-meta">
        <span>
          Effective date:{" "}
          {POLICY_EFFECTIVE_DATE ? (
            <strong>{POLICY_EFFECTIVE_DATE}</strong>
          ) : (
            <span className="license" data-missing="true">
              {MISSING("Policy effective date")}
            </span>
          )}
        </span>
        <span>
          Licence{" "}
          <span className="license" data-missing={!LICENSE_NUMBER}>
            {LICENSE_NUMBER || LICENSE_PLACEHOLDER}
          </span>
        </span>
      </div>

      <p>
        These terms cover ordering cannabis for delivery from {SITE_NAME}, operated by{" "}
        {LEGAL_ENTITY_NAME ? (
          <strong>{LEGAL_ENTITY_NAME}</strong>
        ) : (
          <span className="license" data-missing="true">
            {MISSING("Legal entity name")}
          </span>
        )}
        , a retailer licensed by the California Department of Cannabis Control. Placing an order
        means you accept them.
      </p>

      <h2>You must be 21 or older</h2>
      <p>
        This is an adult-use store. You must be 21 or older to browse it, to hold an account and to
        receive a delivery. We do not serve medicinal patients under 21, and we do not verify
        physician&apos;s recommendations.
      </p>

      <h2>ID is checked at the door, every time</h2>
      <p>
        California requires the delivery employee to confirm your identity and age in person before
        handing anything over (4 CCR §§ 15404, 15415). That means:
      </p>
      <ul>
        <li>
          You must show a <strong>valid, unexpired, government-issued photo ID</strong>{" "}
          — a driver&apos;s
          licence or state ID, a US or foreign passport, or a US military ID. A photo of an ID, a
          digital wallet copy or an expired card is not one of them.
        </li>
        <li>
          <strong>You must be there.</strong> Deliveries are handed to a person. There is no
          leave-at-door, no locker, no doorstep drop and no handing it to a neighbour — the law
          does not allow an unattended delivery.
        </li>
        <li>
          If the ID cannot be produced, or the person receiving the order is not 21 or older, the
          driver will not complete the delivery. That is not a discretionary call.
        </li>
      </ul>

      <h2>Hours</h2>
      <p>
        California restricts the sale and delivery of cannabis goods to {DELIVERY_WINDOW_LABEL}{" "}
        (4 CCR § 15403). An order placed outside that window goes out when it opens.
      </p>

      <h2>Daily limits</h2>
      <p>
        State law caps what one adult-use customer may buy in a single day (4 CCR § 15409):{" "}
        {DAILY_LIMIT_NON_CONCENTRATED_GRAMS} g of non-concentrated cannabis,{" "}
        {DAILY_LIMIT_CONCENTRATE_GRAMS} g of cannabis concentrate, and{" "}
        {DAILY_LIMIT_IMMATURE_PLANTS} immature plants. The limit is per person per day, not per
        order — a second order the same day counts against the same allowance. We will decline an
        order that would go over it.
      </p>

      <h2>Where we can deliver</h2>
      <p>
        We deliver only to a physical address in California. We cannot deliver to a PO box or mail
        drop, to publicly owned or publicly leased property, or to a school, day care centre or
        youth centre (4 CCR § 15416). By giving us an address you confirm it is a private residence
        or business you are entitled to receive a delivery at.
      </p>

      <h2>Payment</h2>
      <p>
        Cash on delivery. Nothing is charged online and this site never asks for a card. The amount
        shown before you place an order is an estimate; the amount due is confirmed when the order
        is accepted and is itemised on the receipt you get at the door, with the California
        cannabis excise tax stated separately as required by Revenue &amp; Taxation Code
        § 34011.2(d).
      </p>

      <h2>We may refuse or cancel an order</h2>
      <p>
        We may decline or cancel any order, before or at the door — including where ID cannot be
        produced, where the recipient appears to be under 21 or intoxicated, where the address
        cannot lawfully be delivered to, where a daily limit would be exceeded, or where an item
        turns out to be unavailable. Nothing is charged before delivery, so a cancelled order costs
        you nothing.
      </p>

      <h2>Product information</h2>
      <p>
        The package you receive carries the legally required label, and the label is authoritative.
        Where a potency figure, weight or strain name on this site differs from the label on the
        package delivered, the label governs. Tell us and we will fix the listing.
      </p>

      <h2>Your account</h2>
      <p>
        Your account is yours. Do not let anyone else order on it, and tell us if you lose control
        of the mobile number it is tied to. Orders placed from your account are treated as yours.
      </p>

      <h2>Text messages</h2>
      <p>
        We text you a code when you sign in and updates about your order. These are transactional
        messages, not marketing. Message and data rates may apply.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We will post any change to these terms on this page with a new effective date. Questions:{" "}
        {PRIVACY_CONTACT_EMAIL ? (
          <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>
        ) : (
          <span className="license" data-missing="true">
            {MISSING("Privacy contact email")}
          </span>
        )}
        .
      </p>

      <p className="mt-3">
        <Link className="btn btn-ghost btn-sm" href="/">
          Back to the shop
        </Link>{" "}
        <Link className="btn btn-ghost btn-sm" href="/privacy">
          Privacy policy
        </Link>
      </p>
    </article>
  );
}
