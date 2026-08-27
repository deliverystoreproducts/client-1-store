import type { Metadata } from "next";
import Link from "next/link";

import { DELIVERY_WINDOW_LABEL } from "@/lib/hours";
import { getStoreProfile } from "@/lib/store";
import {
  LICENSE_PLACEHOLDER,
  MISSING,
  SITE_NAME,
} from "@/lib/site";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  CONTACT
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Two jobs beyond the obvious one.
 *
 * 1. PRODUCT QUALITY COMPLAINTS have a regulatory life of their own — a
 *    licensee must review and record each one with a defined set of fields
 *    (what the product was, its batch, who complained and when, what was found,
 *    and whether the maker was notified). That is far easier to satisfy if the
 *    customer is told up front which details to include, so the section below
 *    asks for exactly those.
 *
 * 2. The licence number belongs here as much as in the footer. Someone looking
 *    for a way to contact a licensee is often the person checking whether it IS
 *    one.
 *
 * Contact details come from the store profile — a tenant that hasn't set a
 * phone or email should show nothing rather than a placeholder that bounces.
 */

export const metadata: Metadata = {
  title: `Contact · ${SITE_NAME}`,
  description: `How to reach ${SITE_NAME} about an order, a delivery, or a product quality concern.`,
};

export default async function ContactPage() {
  const profile = await getStoreProfile();
  const phone = profile.contactPhone?.trim() || null;
  const email = profile.contactEmail?.trim() || profile.privacyContactEmail || null;
  const LICENSE_NUMBER = profile.licenseNumber ?? "";
  const LEGAL_ENTITY_NAME = profile.legalEntityName ?? "";
  const hasAnyChannel = Boolean(phone || email);

  return (
    <article className="legal">
      <h1 className="display">Contact us</h1>

      <p>Real people, during delivery hours — {DELIVERY_WINDOW_LABEL}, seven days a week.</p>

        <section>
          <h2>Get in touch</h2>
          {hasAnyChannel ? (
            <ul>
              {phone ? (
                <li>
                  Phone: <a href={`tel:${phone}`}>{phone}</a>
                </li>
              ) : null}
              {email ? (
                <li>
                  Email: <a href={`mailto:${email}`}>{email}</a>
                </li>
              ) : null}
            </ul>
          ) : (
            <p>
              <span className="license" data-missing="true">
                {MISSING("Contact email")}
              </span>
            </p>
          )}
          <p>
            Outside delivery hours you can still reach us — we&apos;ll come back to you when we
            open.
          </p>
        </section>

        <section>
          <h2>About an order in progress</h2>
          <p>
            The fastest route is the tracking link we texted you when a driver was assigned — it
            updates live. You can also <Link href="/track">look up an order</Link> with that link.
          </p>
          <p>
            If you need to change or cancel, tell us as early as you can. Once a driver has
            left with your order there is much less we can do.
          </p>
        </section>

        <section>
          <h2>A problem with something you received</h2>
          <p>
            If it&apos;s wrong, damaged, or doesn&apos;t match its label, see{" "}
            <Link href="/returns">Returns &amp; refunds</Link> — it explains what we can do and
            when.
          </p>
        </section>

        <section>
          <h2>Reporting a product quality concern</h2>
          <p>
            We record every quality complaint and pass it to the product&apos;s maker. That&apos;s
            partly a requirement on us and partly how a bad batch actually gets found. To make
            yours count, include:
          </p>
          <ul>
            <li>The product name, as printed on the package</li>
            <li>
              The <strong>batch or lot number</strong> from the label — this is the one detail
              nothing can be traced without
            </li>
            <li>When you received it, and your order number if you have it</li>
            <li>What went wrong, in your own words</li>
          </ul>
          <p>Please keep the packaging until we&apos;ve spoken.</p>
        </section>

        <section>
          <h2>Licensed retailer</h2>
          <p>
            {LEGAL_ENTITY_NAME ? (
              <strong>{LEGAL_ENTITY_NAME}</strong>
            ) : (
              <span className="license" data-missing="true">
                {MISSING("Legal entity name")}
              </span>
            )}
            <br />
            California cannabis licence{" "}
            <span className="license" data-missing={!LICENSE_NUMBER}>
              {LICENSE_NUMBER || LICENSE_PLACEHOLDER}
            </span>
          </p>
          <p>
            You can check that number against the state&apos;s own register at{" "}
            <a
              href="https://search.cannabis.ca.gov/"
              rel="noopener noreferrer"
              target="_blank"
            >
              search.cannabis.ca.gov
            </a>
            .
          </p>
        </section>
    </article>
  );
}
