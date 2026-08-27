import {
  prop65WarningForRoute,
  type ConsumptionRoute,
  type Prop65Warning,
} from "@/lib/compliance/prop65";
import {
  vapeDisposalMessageForHardware,
  type VapeDisposalMessage,
  type VapeHardware,
} from "@/lib/compliance/vape";

/**
 * The mandated warnings, rendered.
 *
 * No "use client" directive: these are pure, hook-free components so the same
 * markup can be produced by the server-rendered product page AND by the client
 * cart/checkout views.
 *
 * ── Legibility is part of the requirement ─────────────────────────────────
 * 27 CCR § 25602 asks for a warning that is not something "the purchaser must
 * search for"; B&P § 26152.1 asks for one "prominently … in a clear and legible
 * fashion". So these boxes are set at body size on full-contrast bone
 * (16.0 : 1 on the page ground), not at caption size in grey. A warning styled
 * to be skipped fails the letter of both rules and the point of them.
 *
 * The text is real text in the document flow — in the accessible tree, read by
 * a screen reader in order, selectable, translatable, and findable with ⌘F.
 * The only `aria-hidden` element is the triangle glyph, whose meaning is
 * carried by the word WARNING beside it.
 */

/**
 * 27 CCR § 25603(a)(1), verbatim: "A symbol consisting of a black exclamation
 * point in a yellow equilateral triangle with a bold black outline. … The
 * symbol shall be placed to the left of the text of the warning, in a size no
 * smaller than the height of the word 'WARNING'."
 *
 * Inline SVG so it scales with the type, needs no network request, and cannot
 * be blocked by an image blocker.
 */
function WarningTriangle() {
  return (
    <svg
      className="warn-sym"
      viewBox="0 0 24 22"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 1.7 22.7 20.3H1.3Z"
        fill="#FFD600"
        stroke="#000"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path d="M12 7.9v5.7" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="17.3" r="1.45" fill="#000" />
    </svg>
  );
}

/**
 * The tailored warnings end with "…go to www.P65Warnings.ca.gov/cannabis".
 * Linking that span is a convenience only: the VISIBLE TEXT is untouched, so
 * the warning still reads exactly as the regulation prints it.
 */
const P65_URL_TEXT = "www.P65Warnings.ca.gov/cannabis";

function WarningBody({ body }: { body: string }) {
  const at = body.indexOf(P65_URL_TEXT);
  if (at === -1) return <>{body}</>;
  return (
    <>
      {body.slice(0, at)}
      <a
        className="warn-link"
        href="https://www.p65warnings.ca.gov/cannabis"
        rel="noopener noreferrer"
        target="_blank"
      >
        {P65_URL_TEXT}
      </a>
      {body.slice(at + P65_URL_TEXT.length)}
    </>
  );
}

export function Prop65WarningBox({ warning }: { warning: Prop65Warning }) {
  return (
    <div className="warn" role="note">
      <WarningTriangle />
      <p className="warn-body">
        {/* § 25607.39–.45: "The word 'WARNING:' in all capital letters and bold
            print." Not a style choice. Interpolated as ONE string so React does
            not split it into two text nodes with a comment between them — the
            markup should read `WARNING:` to anything parsing it. */}
        <strong className="warn-word">{`${warning.signalWord}:`}</strong>{" "}
        <WarningBody body={warning.body} />
      </p>
    </div>
  );
}

export function VapeDisposalBox({ message }: { message: VapeDisposalMessage }) {
  return (
    <div className="warn warn-disposal" role="note">
      <p className="warn-body">
        <strong className="warn-word">DISPOSAL:</strong> {message.text}
      </p>
    </div>
  );
}

/**
 * Everything a basket needs, deduplicated.
 *
 * This is 27 CCR § 25602(b)(1)(C) — "an otherwise prominently displayed warning
 * provided to the purchaser prior to completing the purchase". The requirement
 * is already satisfied by the inline warning on each product display page
 * (method (A)); this is the second, independent surface, and it is where a
 * customer who added straight from a tile sees it.
 */
export function BasketComplianceNotices({
  routes,
  vapeHardware,
  className,
}: {
  routes: readonly ConsumptionRoute[];
  vapeHardware: readonly VapeHardware[];
  className?: string;
}) {
  const uniqueRoutes = [...new Set(routes)];
  const uniqueHardware = [...new Set(vapeHardware)];
  if (uniqueRoutes.length === 0 && uniqueHardware.length === 0) return null;

  return (
    <section className={className} aria-label="Required product warnings">
      {uniqueRoutes.map((route) => (
        <Prop65WarningBox key={route} warning={prop65WarningForRoute(route)} />
      ))}
      {uniqueHardware.map((hardware) => (
        <VapeDisposalBox key={hardware} message={vapeDisposalMessageForHardware(hardware)} />
      ))}
    </section>
  );
}
