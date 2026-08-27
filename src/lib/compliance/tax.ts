/**
 * ══════════════════════════════════════════════════════════════════════════
 *  CANNABIS EXCISE TAX — R&TC § 34011.2
 * ══════════════════════════════════════════════════════════════════════════
 *
 * § 34011.2(d), verbatim:
 *
 *   The cannabis retailer shall provide each purchaser with an invoice,
 *   receipt, or other document that separately states the cannabis excise tax.
 *
 * Source: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=34011.2
 * (accessed 19 Aug 2026; amended by Stats. 2025, Ch. 127 (AB 564))
 *
 * No sentence is mandated word-for-word. What is mandated is that the excise
 * tax be SEPARATELY STATED — a line item labelled "Cannabis excise tax"
 * satisfies it, and a single lumped "Estimated tax" figure does not. CDTFA
 * warns that failing to separately state it can mean the entire selling price
 * is treated as gross receipts subject to the excise tax, so the formatting
 * error has a direct cost.
 *
 * ⚠️ DO NOT PRINT "The cannabis excise taxes are included in the total amount of
 *    this invoice." That sentence was mandated by the FORMER § 34011(a)(2),
 *    which § 34011(h) made inoperative on 1 April 2023 when AB 195 moved excise
 *    collection from distributors to retailers. It is still widely copied from
 *    stale templates and printing it today is affirmatively wrong.
 *
 * ── The rate is NOT a constant, and this app does not own it ───────────────
 * The charged rate comes from the commerce backend (`GET /tax-rates`) and the
 * charged total always comes back from checkout. What lives here is the
 * STATUTORY rate history, used for two things only:
 *
 *   1. labelling the rate we display, and
 *   2. a drift check — if the backend is still returning the repealed 19 %,
 *      that is a live over-collection and it gets logged loudly instead of
 *      quietly appearing on customers' receipts.
 *
 * We do not override the backend's number. Showing a customer a figure
 * different from the one they will be charged would trade one wrong number for
 * a worse one; the fix belongs upstream, and the log says so.
 */

/** One operative window of the excise rate. */
export interface ExciseRateStage {
  /** Inclusive ISO date. */
  from: string;
  /** Inclusive ISO date, or null for "until further notice". */
  to: string | null;
  /** Percent, e.g. 15 means 15 %. */
  rate: number;
  authority: string;
}

/**
 * R&TC § 34011.2 rate history.
 *
 * ⚠️ Ends 30 June 2028 ON PURPOSE. § 34011.2(a)(3) requires CDTFA to adjust the
 *    rate for FY 2028–29 and every two years after, announced by 1 May and
 *    operative the following 1 July, capped at 19 % and rounded to the nearest
 *    one-quarter of one percent. A future rate could be 17.25 %. Past the last
 *    window this module returns null and stops asserting anything — a stale
 *    hardcoded rate that looks authoritative is worse than no rate at all.
 */
export const EXCISE_RATE_HISTORY: ExciseRateStage[] = [
  { from: "2023-01-01", to: "2025-06-30", rate: 15, authority: "AB 195 (Stats. 2022, Ch. 56)" },
  { from: "2025-07-01", to: "2025-09-30", rate: 19, authority: "R&TC § 34011.2(a) adjustment" },
  { from: "2025-10-01", to: "2028-06-30", rate: 15, authority: "AB 564 (Stats. 2025, Ch. 127)" },
];

/** The statutory rate in force on a date, or null once it is CDTFA's to set. */
export function statutoryExciseRate(day: string): ExciseRateStage | null {
  for (const stage of EXCISE_RATE_HISTORY) {
    if (day >= stage.from && (stage.to === null || day <= stage.to)) return stage;
  }
  return null;
}

export interface ExciseRateCheck {
  /** What the backend says it will charge. */
  upstreamRate: number;
  /** What the statute says, when we can still assert it. */
  statutory: ExciseRateStage | null;
  agrees: boolean;
  /** Server-log sentence when it does not agree, else null. */
  warning: string | null;
}

/**
 * R&TC § 34011.2(a)(3) rounds any adjusted rate to the nearest one-quarter of
 * one percent, so a difference smaller than that cannot be a genuine change of
 * rate — it is a rounding or configuration artefact. Anything at or above it
 * is real, and the 19 % → 15 % reversal this check exists to catch is four
 * whole points.
 */
const RATE_TOLERANCE = 0.25;

export function checkExciseRate(upstreamRate: number, day: string): ExciseRateCheck {
  // A rate of exactly 0 is the admin's OFF SWITCH (dashboard → Settings →
  // Taxes), not a misconfiguration: a non-cannabis catalog, or a shop that
  // prices tax-inclusive, legitimately charges no separate excise line. The
  // drift check exists to catch a WRONG rate, not a disabled one — warning on
  // 0 would train operators to ignore it.
  if (upstreamRate === 0) {
    return { upstreamRate, statutory: null, agrees: true, warning: null };
  }
  const statutory = statutoryExciseRate(day);
  if (statutory == null) {
    return {
      upstreamRate,
      statutory: null,
      agrees: true,
      warning:
        `[tax] the cannabis excise rate for ${day} is set by CDTFA under R&TC § 34011.2(a)(3), ` +
        `not by the schedule in src/lib/compliance/tax.ts. Backend is charging ${upstreamRate} % — verify against CDTFA and extend EXCISE_RATE_HISTORY.`,
    };
  }
  const agrees = Math.abs(upstreamRate - statutory.rate) <= RATE_TOLERANCE;
  return {
    upstreamRate,
    statutory,
    agrees,
    warning: agrees
      ? null
      : `[tax] backend cannabis excise rate is ${upstreamRate} % but R&TC § 34011.2 puts it at ` +
        `${statutory.rate} % from ${statutory.from} (${statutory.authority}). ` +
        `Over-collection after 1 Oct 2025 must be refunded or reported as excess tax collected — fix the rate in the back office.`,
  };
}

/**
 * Labels for the receipt lines. R&TC § 34011.2(e)–(f): sales tax is computed on
 * a base that INCLUDES the excise tax, and the excise base EXCLUDES sales tax —
 * so the order these appear in is not cosmetic either.
 */
export const TAX_LINE_LABELS = {
  city: "Local cannabis business tax",
  excise: "California cannabis excise tax",
  state: "Sales tax",
} as const;
