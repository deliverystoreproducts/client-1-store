import type { Metadata } from "next";
import Link from "next/link";

import { DELIVERY_WINDOW_LABEL } from "@/lib/hours";
import {
  DAILY_LIMIT_CONCENTRATE_GRAMS,
  DAILY_LIMIT_IMMATURE_PLANTS,
  DAILY_LIMIT_NON_CONCENTRATED_GRAMS,
} from "@/lib/compliance/limits";
import { DEFAULT_MIN_AGE, SITE_NAME } from "@/lib/site";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  FAQ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * No rule requires an FAQ. It exists because every question below is one a
 * customer would otherwise ask by phone, or — worse — discover at the door
 * with a driver standing there.
 *
 * The constraint that shapes the copy: § 26154 forbids untrue or misleading
 * statements, and § 26152(b) forbids anything inconsistent with the label. So
 * nothing here promises an effect, a potency, or a delivery time we cannot
 * keep. Where the honest answer is "it depends", it says so.
 */

export const metadata: Metadata = {
  title: `FAQ · ${SITE_NAME}`,
  description: `Delivery hours, ID requirements, payment, and order limits for ${SITE_NAME}.`,
};

interface QA {
  q: string;
  a: React.ReactNode;
}

const QUESTIONS: QA[] = [
  {
    q: "When can I get a delivery?",
    a: (
      <>
        Between <strong>{DELIVERY_WINDOW_LABEL}</strong>, seven days a week. Those hours are set by
        state law, not by us — California licenses retailers to sell and deliver only inside that
        window. You can browse and build an order any time; anything placed after hours goes out
        the following morning.
      </>
    ),
  },
  {
    q: "How long does delivery take?",
    a: (
      <>
        It depends on where you are and how many orders are ahead of yours. You&apos;ll get a
        tracking link by text as soon as a driver is assigned, and it updates as they get closer.
        We&apos;d rather give you a live link than a number we can&apos;t keep.
      </>
    ),
  },
  {
    q: "What do I need to have ready at the door?",
    a: (
      <>
        A valid government-issued photo ID showing you are {DEFAULT_MIN_AGE} or older. The driver
        has to physically inspect it before handing anything over — that is a legal requirement on
        them, not a formality, and they cannot make an exception. Acceptable: a driver&apos;s
        licence or state ID, a military ID, or a passport.
      </>
    ),
  },
  {
    q: "Can somebody else accept my order?",
    a: (
      <>
        No. The person who placed the order needs to be the one receiving it, with their own ID.
        If you won&apos;t be there, it&apos;s better to reschedule than to have a driver arrive and
        have to leave with the order.
      </>
    ),
  },
  {
    q: "How do I pay?",
    a: (
      <>
        <strong>Cash, at the door.</strong> Nothing is charged when you place the order. It helps
        to have close to the right amount — drivers carry limited change.
      </>
    ),
  },
  {
    q: "Is there a minimum order?",
    a: (
      <>
        Yes, and it depends on your address — some areas have a higher minimum than others.
        You&apos;ll see the exact figure for your address before you place the order, never after.
      </>
    ),
  },
  {
    q: "How much can I buy at once?",
    a: (
      <>
        State law caps what a retailer may sell to one adult-use customer per day:{" "}
        <strong>{DAILY_LIMIT_NON_CONCENTRATED_GRAMS} g</strong> of non-concentrated cannabis,{" "}
        <strong>{DAILY_LIMIT_CONCENTRATE_GRAMS} g</strong> of concentrate, and{" "}
        <strong>{DAILY_LIMIT_IMMATURE_PLANTS}</strong> immature plants. Your cart tracks this as
        you go, and checkout will stop an order that would go over — including anything you already
        received earlier the same day.
      </>
    ),
  },
  {
    q: "Do you deliver to me?",
    a: (
      <>
        Enter your address at checkout and we&apos;ll tell you immediately. We can only deliver to a
        physical address in California, and not to publicly owned property — that rules out parks,
        government buildings, and most campuses.
      </>
    ),
  },
  {
    q: "Can I change or cancel an order?",
    a: (
      <>
        Get in touch as soon as you can — see <Link href="/contact">Contact</Link>. Once a driver
        has left with your order there is much less we can do, so earlier is better.
      </>
    ),
  },
  {
    q: "Something was wrong with my order. What now?",
    a: (
      <>
        Tell the driver before they leave if you can — that is by far the easiest moment to fix it.
        Otherwise contact us and we&apos;ll sort it out. See{" "}
        <Link href="/returns">Returns &amp; refunds</Link> for how this works, and why cannabis is
        different from ordinary retail here.
      </>
    ),
  },
  {
    q: "Will you text me?",
    a: (
      <>
        Only about your order — a sign-in code when you ask for one, and updates on a delivery in
        progress. We don&apos;t run a marketing list. Reply STOP to any message to opt out.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <article className="legal">
      <h1 className="display">Frequently asked</h1>

      <p>
        The things worth knowing before you order. If your question isn&apos;t here,{" "}
        <Link href="/contact">get in touch</Link>.
      </p>

      {QUESTIONS.map(({ q, a }) => (
        <section key={q}>
          <h2>{q}</h2>
          <p>{a}</p>
        </section>
      ))}
    </article>
  );
}
