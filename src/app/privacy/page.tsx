import type { Metadata } from "next";
import Link from "next/link";
import {
  LICENSE_PLACEHOLDER,
  MISSING,
  SITE_NAME,
} from "@/lib/site";
import { getStoreProfile } from "@/lib/store";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  PRIVACY POLICY — CalOPPA, B&P § 22575. A MUST, with no size threshold.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * CalOPPA applies to any commercial website operator that collects personally
 * identifiable information from California residents. There is no revenue or
 * headcount floor: it applies to this store regardless of turnover, unlike
 * Prop 65 (which has the sub-10-employee exemption) and unlike CCPA/CPRA
 * (which has three thresholds a single-licence delivery retailer normally
 * meets none of).
 *
 * The policy must be CONSPICUOUSLY POSTED — hence the footer link on every page
 * and the link on the age gate, and hence `/privacy` being reachable without
 * answering the gate (src/lib/open-routes.ts). It must contain six things:
 *
 *   (1) categories of PII collected + categories of third parties it is shared
 *       with                                                § 22575(b)(1)
 *   (2) a process for the consumer to review and request changes to their
 *       information                                          § 22575(b)(2)
 *   (3) the process for notifying consumers of material changes to the policy
 *                                                            § 22575(b)(3)
 *   (4) an effective date                                    § 22575(b)(4)
 *   (5) HOW THE OPERATOR RESPONDS TO "DO NOT TRACK" SIGNALS  § 22575(b)(5)
 *   (6) whether other parties may collect PII about the consumer's online
 *       activities across different sites when using this service
 *                                                            § 22575(b)(6)
 *
 * Item (5) is the one boilerplate policies almost always miss (added by AB 370,
 * Stats. 2013, Ch. 390). A policy that never mentions Do Not Track does not
 * satisfy CalOPPA. It has its own section below, and it is a factual statement
 * about this codebase — this site loads no third-party script, pixel or font,
 * so there is no cross-site tracking here to respond to. **If anyone ever adds
 * analytics or an ad pixel, that section becomes false and must be rewritten
 * the same day** (and see COMPLIANCE.md § 8.4 on CIPA litigation risk before
 * adding one at all).
 *
 * Source: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=22575
 * (accessed 19 Aug 2026)
 *
 * ⚠️ The identity, contact and effective-date values are OPERATOR-SUPPLIED and
 *    have no defaults. Unset, they print in red — a privacy policy addressed
 *    from nobody, to nobody, dated never, is worse than an obviously unfinished
 *    one, because it looks finished.
 */

export const metadata: Metadata = {
  title: "Privacy policy",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Missing({ env }: { env: string }) {
  return (
    <span className="license" data-missing="true">
      {MISSING(env)}
    </span>
  );
}

export default async function PrivacyPage() {
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
      <h1 className="display">Privacy policy</h1>

      <div className="legal-meta">
        <span>
          Effective date:{" "}
          {POLICY_EFFECTIVE_DATE ? (
            <strong>{POLICY_EFFECTIVE_DATE}</strong>
          ) : (
            <Missing env="Policy effective date" />
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
        This policy explains what {SITE_NAME}{" "}
        collects when you use this website to order cannabis
        for delivery, what we do with it, and who else sees it. It is written to meet the
        California Online Privacy Protection Act (Business &amp; Professions Code § 22575).
      </p>

      <h2>Who we are</h2>
      <p>
        This store is operated by{" "}
        {LEGAL_ENTITY_NAME ? (
          <strong>{LEGAL_ENTITY_NAME}</strong>
        ) : (
          <Missing env="Legal entity name" />
        )}
        , a cannabis retailer licensed by the California Department of Cannabis Control under
        licence{" "}
        <span className="license" data-missing={!LICENSE_NUMBER}>
          {LICENSE_NUMBER || LICENSE_PLACEHOLDER}
        </span>
        . You can check that licence at{" "}
        <a href="https://search.cannabis.ca.gov/" rel="noopener noreferrer" target="_blank">
          search.cannabis.ca.gov
        </a>
        .
      </p>

      <h2>What we collect</h2>
      <p>
        We collect the least we can and still get a legal delivery to the right door. A cannabis
        delivery order cannot be anonymous: the driver has to find you, and California requires
        them to check your ID when they arrive.
      </p>
      <ul>
        <li>
          <strong>Your mobile number.</strong> This is how you sign in — we text you a code — and
          it is how the driver reaches you. We do not use it for marketing.
        </li>
        <li>
          <strong>Your name.</strong> Collected when you create an account, so an order can be
          matched to the ID the driver checks at the door.
        </li>
        <li>
          <strong>Your delivery address</strong> and any delivery notes you write (gate codes,
          which entrance, where to meet). California requires deliveries to go to a physical
          address (4 CCR § 15416), so we cannot take an order without one.
        </li>
        <li>
          <strong>Your orders</strong> — what you bought, when, how much it cost, and the status of
          each delivery.
        </li>
        <li>
          <strong>A photo of your government-issued ID</strong>, but only if this store has ID
          upload switched on for new accounts. If it does, you will be asked for it once, on the
          screen where you create your account, and it is stored by the retailer — not by this
          website.
        </li>
        <li>
          <strong>Ordinary technical information</strong>{" "}
          that any web server records: your IP
          address, the pages you requested, and your browser&apos;s user-agent string. We use it to
          keep the site up and to rate-limit abuse of the sign-in code — for example, to stop
          someone forcing us to send thousands of text messages.
        </li>
      </ul>
      <p>
        <strong>We never take a card number.</strong> This store is cash on delivery; you pay the
        driver. There is no payment form anywhere on this site and no card data to lose.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We do not sell your information, and we do not trade it for advertising. It goes to these
        categories of recipients, and no others:
      </p>
      <ul>
        <li>
          <strong>Our own delivery staff</strong>, who need your name, address, phone number and
          order to bring it to you and check your ID.
        </li>
        <li>
          <strong>The service providers that run our order management and delivery dispatch.</strong>{" "}
          They process your order on our instructions and for no purpose of their own.
        </li>
        <li>
          <strong>Our text-message provider</strong>, which needs your mobile number to deliver
          sign-in codes and order updates.
        </li>
        <li>
          <strong>Regulators and law enforcement</strong>, where California cannabis law or a valid
          legal process requires it. Licensed cannabis retailers are subject to record-keeping and
          inspection obligations under the Department of Cannabis Control&apos;s regulations.
        </li>
      </ul>

      <h2>Do Not Track</h2>
      <p>
        Business &amp; Professions Code § 22575(b)(5) requires us to tell you how we treat browser
        &ldquo;Do Not Track&rdquo; signals. Here is the honest answer:
      </p>
      <p>
        <strong>
          We do not track you across other websites, so there is nothing for a Do Not Track signal
          to switch off, and this site does not respond to one.
        </strong>{" "}
        This is not a policy position; it is how the site is built. Every page you load comes from
        this one server. There are no advertising pixels, no analytics scripts, no social media
        buttons, no embedded video, no third-party fonts and no content delivery network. Your
        browser makes no request to anyone but us while you are on this site.
      </p>

      <h2>Other parties tracking you here</h2>
      <p>
        Business &amp; Professions Code § 22575(b)(6) requires us to say whether anyone else may
        collect personally identifiable information about your activities across different websites
        when you use ours. <strong>No.</strong> No third party runs code on these pages, so no
        third party is in a position to.
      </p>

      <h2>Cookies and what your browser stores</h2>
      <ul>
        <li>
          <strong>Age confirmation.</strong> When you confirm your age we set one cookie recording
          that you did. Without it you would be asked on every page.
        </li>
        <li>
          <strong>Sign-in.</strong>{" "}
          When you sign in we set a session cookie. It is
          &ldquo;HttpOnly&rdquo;, which means this site&apos;s own JavaScript cannot read it, and it
          is not readable by any other site.
        </li>
        <li>
          <strong>Your cart</strong>{" "}
          is kept in your browser&apos;s local storage as a list of
          product references and quantities. It never leaves your device until you ask for a price
          or place an order.
        </li>
      </ul>
      <p>None of these are advertising cookies and none are shared with anyone.</p>

      <h2>Seeing and changing your information</h2>
      <p>
        Sign in and open your{" "}
        <Link href="/account">account page</Link> to see the details we hold and the orders you have
        placed, and to change your name or your saved address. For anything you cannot change there
        — including a request to delete your account — contact us using the details below, and we
        will confirm what we can act on and what we are required to keep.
      </p>
      <p>
        We keep order records for as long as a licensed California cannabis retailer is required to
        keep them, and for as long as we need them to answer questions about a delivery.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we change this policy materially, we will post the new version here with a new effective
        date at the top, and we will say what changed. Where the change affects information we have
        already collected from you, we will tell you directly — by text message to the number on
        your account — before it takes effect. Checking this page from time to time is the reliable
        way to see the current version.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about this policy, or a request about your information:
        <br />
        {PRIVACY_CONTACT_EMAIL ? (
          <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>
        ) : (
          <Missing env="Privacy contact email" />
        )}
        <br />
        {PRIVACY_CONTACT_ADDRESS ? (
          PRIVACY_CONTACT_ADDRESS
        ) : (
          <Missing env="Privacy contact address" />
        )}
      </p>

      <p className="mt-3">
        <Link className="btn btn-ghost btn-sm" href="/">
          Back to the shop
        </Link>{" "}
        <Link className="btn btn-ghost btn-sm" href="/terms">
          Terms of service
        </Link>
      </p>
    </article>
  );
}
