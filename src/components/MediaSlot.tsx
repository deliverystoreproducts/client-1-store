import { MEDIA_HINTS } from "@/lib/site";

/**
 * What a missing picture or video looks like.
 *
 * Two audiences, one component, and they want opposite things:
 *
 *   THE CUSTOMER must never be shown scaffolding. "Upload a photo here" on a
 *   live shop reads as broken, and broken reads as untrustworthy on a site that
 *   is about to ask for an address and a date of birth. So by default this is a
 *   quiet, deliberate-looking panel: a soft hatch and a small glyph. It says
 *   "no photo", not "someone forgot".
 *
 *   THE OPERATOR needs the opposite — they are looking for WHERE the picture
 *   goes and cannot find a slot that is invisible. So when NEXT_PUBLIC_MEDIA_HINTS
 *   is on, every slot names itself and says which dashboard screen fills it.
 *
 * The hint is env-gated rather than always-on because it is the difference
 * between a shop window and a workbench. Turn it on in Railway while setting a
 * store up; turn it off before the first customer.
 *
 * This also replaces the hero's old Unsplash fallback, which was worse than
 * either: a real photograph of someone else's shop, shown as if chosen, so an
 * operator had no way to tell their hero was unset.
 */
export function MediaSlot({
  kind = "image",
  label,
  where,
  className = "",
}: {
  kind?: "image" | "video";
  /** What belongs here, in the operator's words — "Hero banner", "Deal picture". */
  label?: string;
  /** Where they set it, e.g. "Settings → Branding". */
  where?: string;
  className?: string;
}) {
  const showHint = MEDIA_HINTS && !!label;

  return (
    <span
      className={`slot ${className}`.trim()}
      data-kind={kind}
      data-hint={showHint || undefined}
      // Decorative to a customer. When the hint is on it carries real words, so
      // it stops being decorative and gets described.
      aria-hidden={showHint ? undefined : true}
      role={showHint ? "note" : undefined}
    >
      <span className="slot-mark" aria-hidden>
        {kind === "video" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="2.5" y="5.5" width="14" height="13" rx="2.5" />
            <path d="m16.5 11 5-3v8l-5-3z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
            <circle cx="8.5" cy="10" r="1.8" />
            <path d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4" />
          </svg>
        )}
      </span>

      {showHint ? (
        <span className="slot-words">
          <strong>{label}</strong>
          {where ? <span className="slot-where">{where}</span> : null}
          <span className="slot-kind">{kind === "video" ? "MP4, max 5MB" : "JPG or PNG"}</span>
        </span>
      ) : null}
    </span>
  );
}
