import type { Metadata } from "next";
import Link from "next/link";

import { SITE_NAME } from "@/lib/site";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  RETURNS & REFUNDS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ This page is NOT ordinary ecommerce returns boilerplate, and copying a
 * 30-day-no-questions policy onto a cannabis storefront would be worse than
 * having no page at all — it would promise something the licensee cannot
 * lawfully do.
 *
 * The reason: cannabis that has left the licensed premises and gone into a
 * customer's hands cannot simply be put back on the shelf and sold to somebody
 * else. Track-and-trace follows the package; the chain of custody is broken the
 * moment it leaves. So the honest policy is narrow and front-loaded: the moment
 * to resolve a problem is AT THE DOOR, while the driver is still there and the
 * order is still theirs.
 *
 * 🚩 FOR COUNSEL: the operational shape below (inspect at the door, refuse at
 * the door, defect handled at delivery, no restocking of released product) is
 * the industry-standard reading and matches how the delivery flow is built. The
 * precise citation for the destruction/disposition path of a returned unit was
 * NOT verified in the desk research behind COMPLIANCE.md. Confirm before launch,
 * and confirm whether any local permit condition imposes something stricter.
 */

export const metadata: Metadata = {
  title: `Returns & refunds · ${SITE_NAME}`,
  description: `How ${SITE_NAME} handles a wrong, damaged, or refused order — and why cannabis returns work differently.`,
};

export default function ReturnsPage() {
  return (
    <article className="legal">
      <h1 className="display">Returns &amp; refunds</h1>

      <p>
        Cannabis doesn&apos;t work like the rest of retail. Here is exactly what we can and
        can&apos;t do, and when.
      </p>
        <section>
          <h2>Check your order before the driver leaves</h2>
          <p>
            This is the single most important thing on this page. While the driver is still with
            you, the order is still ours — a wrong item, a damaged package, or something you simply
            don&apos;t want can be handed straight back and taken off your total, there and then.
          </p>
          <p>
            Once the driver has gone, that stops being possible for most things. Not because
            we&apos;re being difficult, but because of the rule in the next section.
          </p>
        </section>

        <section>
          <h2>Why we can&apos;t just take cannabis back</h2>
          <p>
            Every cannabis package is tracked by the state from the moment it&apos;s grown to the
            moment it&apos;s sold. Once a package has left our premises and been handed to a
            customer, that chain is broken — we cannot put it back into inventory and sell it to
            somebody else, even if it comes back to us sealed and untouched.
          </p>
          <p>
            So a return here is never a restock. That is why we&apos;d much rather solve a problem
            at your door than after it.
          </p>
        </section>

        <section>
          <h2>You can refuse an order at the door</h2>
          <p>
            No charge, no fee, no argument. You haven&apos;t paid anything yet — payment happens
            at delivery — so refusing simply means the driver leaves with the order.
          </p>
          <p>
            If you refuse repeatedly we may ask you to talk to us before ordering again, since
            every trip carries real product and a real driver.
          </p>
        </section>

        <section>
          <h2>If the order is wrong</h2>
          <p>
            If we sent the wrong item, missed something you paid for, or a package arrived damaged
            or leaking, that&apos;s on us. Tell the driver if they&apos;re still there. If
            you&apos;ve already noticed after they&apos;ve left, <Link href="/contact">contact us</Link>{" "}
            the same day if you can, and keep the packaging and any labels.
          </p>
          <p>
            Depending on what happened we&apos;ll replace the item on your next delivery or refund
            what you paid for it. We&apos;ll tell you which, and why.
          </p>
        </section>

        <section>
          <h2>If a product seems defective</h2>
          <p>
            Cartridges that won&apos;t draw, packaging that failed, something that doesn&apos;t
            match its label — tell us. We log every quality complaint and pass it to the maker,
            because we&apos;re required to and because it&apos;s how bad batches get caught.
          </p>
          <p>
            Please keep the packaging and the batch number. Without it there is very little either
            we or the manufacturer can trace.
          </p>
        </section>

        <section>
          <h2>What we can&apos;t refund</h2>
          <p>
            We can&apos;t refund a product simply because you didn&apos;t enjoy the effect, or
            because it wasn&apos;t what you expected it to feel like. Effects vary from person to
            person and we&apos;re not permitted to make claims about them in the first place. If
            you&apos;re unsure what to order, ask us before you buy rather than after.
          </p>
          <p>We also can&apos;t accept anything back that has been opened, used, or repackaged.</p>
        </section>

        <section>
          <h2>How to reach us</h2>
          <p>
            Everything on this page starts with a conversation — see{" "}
            <Link href="/contact">Contact</Link>. Have your order number ready if you have one; it
            makes this much faster.
          </p>
        </section>
    </article>
  );
}
