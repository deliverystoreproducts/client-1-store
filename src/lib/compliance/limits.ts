/**
 * ══════════════════════════════════════════════════════════════════════════
 *  DAILY QUANTITY LIMITS — 4 CCR § 15409
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A licensed retailer shall not sell more than the following in a single day to
 * a single ADULT-USE customer:
 *
 *   | Non-concentrated cannabis                                   | 28.5 g |
 *   | Cannabis concentrate (incl. concentrate inside manufactured |  8 g   |
 *   |   products — § 15409(e) puts that on the RETAILER)          |        |
 *   | Immature cannabis plants                                    |  6     |
 *
 * § 15409(d): adult-use and medicinal limits shall not be combined.
 * Source: https://www.law.cornell.edu/regulations/california/4-CCR-15409
 * (accessed 19 Aug 2026)
 *
 * This storefront is ADULT-USE ONLY. There is no medicinal path — no
 * physician's-recommendation capture, no MMIC sales-tax exemption, no 8 oz
 * medicinal ceiling — and a half-built medicinal path would be worse than
 * none. If the operator adds medicinal, § 15409(b)–(c) limits and R&TC
 * § 6369.6 come with it.
 *
 * ── The limit is PER CUSTOMER PER DAY, not per order ──────────────────────
 * A second order the same day is checked against the first. That aggregation
 * lives in `src/lib/store.ts` (`assessDailyLimitsForCheckout`), which reads the
 * customer's orders for the current Pacific day and adds them in. It cannot be
 * done in the browser: the cart is not the customer's history.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  ⚠️ DECLARED GAP — READ THIS BEFORE TRUSTING THE NUMBERS
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The upstream catalogue carries NO per-SKU net weight and NO per-SKU
 * concentrate-equivalent weight. `StoreProductV1` has name, description, tags,
 * price, category, brand, genetics, thcPercentage, cbdPercentage — and nothing
 * with a mass in it.
 *
 * So this module measures what it can and says so, rather than faking a
 * calculation. Specifically:
 *
 *   • It parses an EXPLICIT net weight out of the product name ("3.5 g",
 *     "1/8 oz", "5-pack 0.5g"). That is the same signal a human reads off the
 *     menu, and it is only ever used to ADD weight.
 *   • A line with no readable weight contributes ZERO and is counted as
 *     UNMEASURED. Every total this module produces is therefore a FLOOR.
 *   • Consequence, stated plainly: **this check can prove a cart is over the
 *     limit; it cannot prove a cart is under it.** Blocking is sound in the
 *     direction it fires. Passing means "nothing measurable exceeds the
 *     limit", not "compliant".
 *   • § 15409(e) concentrate-inside-manufactured-products is NOT computed at
 *     all. The THC in an edible or a beverage counts toward the 8 g concentrate
 *     limit, and the milligrams that would let anyone compute it are on the
 *     package label, not in the catalogue. Those lines are reported as
 *     `manufacturedUnmeasured` and are visible in the UI.
 *
 * Closing the gap is a CATALOGUE change, not a code change: give every SKU a
 * net weight and a concentrate-equivalent weight and this module starts using
 * them. See README.md § "Operator checklist before launch".
 */

import { pacificDateKey } from "@/lib/hours";

/** Adult-use, 4 CCR § 15409(a). */
export const DAILY_LIMIT_NON_CONCENTRATED_GRAMS = 28.5;
export const DAILY_LIMIT_CONCENTRATE_GRAMS = 8;
export const DAILY_LIMIT_IMMATURE_PLANTS = 6;

// ══════════════════ the concentrate definition is a DATED rule ══════════════
//
// ⚠️ DO NOT HARDCODE A CATEGORY LIST HERE.
//
// The 8 g limit is only as stable as the category underneath it, and that
// category is defined by Health & Safety Code § 11006.5, which AB 8
// (Stats. 2025, Ch. 248, § 23) rewrote into three time-staged versions:
//
//   before 1 Jan 2026    "the separated resin, whether crude or purified,
//                         obtained from cannabis"
//   1 Jan 2026 – 31 Dec 2027
//                        "cannabis that has undergone a process to concentrate
//                         one or more active cannabinoids, thereby increasing
//                         potency, and includes extracts, oils, hash, dab,
//                         shatter, rosin, wax, and the separated resin, whether
//                         crude or purified"
//   from 1 Jan 2028      as above, extended to "cannabis OR INDUSTRIAL HEMP",
//                        and expressly EXCLUDING CBD isolate (B&P § 26001)
//
// Source: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=11006.5
// (accessed 19 Aug 2026)
//
// The 2026 rewrite widened the category well beyond "separated resin" — rosin,
// wax and shatter are named for the first time. A catalogue classified under
// the pre-2026 wording under-counts concentrate and oversells past 8 g without
// anyone noticing. It moves AGAIN on 1 January 2028, which is why this is
// modelled as a dated rule evaluated against the order date — exactly as a tax
// rate would be — rather than as a constant. **Calendar reminder: 1 Jan 2028.**

export interface ConcentrateDefinitionStage {
  /** Inclusive ISO date this stage becomes operative. */
  from: string;
  citation: string;
  /** The statutory words, so the UI and the logs can quote rather than gloss. */
  definition: string;
  /** Catalogue vocabulary that falls inside the definition in this window. */
  terms: string[];
  /** Vocabulary expressly carved OUT in this window. */
  excludedTerms: string[];
}

const OLDEST_CONCENTRATE_STAGE: ConcentrateDefinitionStage = {
  from: "0000-01-01",
  citation: "HSC § 11006.5 (pre-2026)",
  definition: "the separated resin, whether crude or purified, obtained from cannabis",
  terms: ["resin", "live resin", "hash", "hashish", "kief", "concentrate", "concentrates"],
  excludedTerms: [],
};

const CONCENTRATE_STAGES: ConcentrateDefinitionStage[] = [
  OLDEST_CONCENTRATE_STAGE,
  {
    from: "2026-01-01",
    citation: "HSC § 11006.5 (AB 8, operative 1 Jan 2026)",
    definition:
      "cannabis that has undergone a process to concentrate one or more active cannabinoids, thereby increasing potency, and includes extracts, oils, hash, dab, shatter, rosin, wax, and the separated resin, whether crude or purified",
    terms: [
      "concentrate", "concentrates", "extract", "extracts", "oil", "oils", "hash",
      "hashish", "dab", "dabs", "shatter", "rosin", "wax", "resin", "live resin",
      "badder", "batter", "budder", "crumble", "diamond", "diamonds", "sauce",
      "sugar", "distillate", "kief", "cartridge", "cartridges", "cart", "carts",
      "vape", "vapes", "vaporizer", "pod", "pods", "510", "applicator", "syringe",
    ],
    excludedTerms: [],
  },
  {
    from: "2028-01-01",
    citation: "HSC § 11006.5 (AB 8, operative 1 Jan 2028)",
    definition:
      "cannabis or industrial hemp that has undergone a process to concentrate one or more active cannabinoids, thereby increasing potency, and includes extracts, oils, hash, dab, shatter, rosin, wax, and the separated resin, whether crude or purified; does not include CBD isolate as defined in B&P § 26001",
    terms: [
      "concentrate", "concentrates", "extract", "extracts", "oil", "oils", "hash",
      "hashish", "dab", "dabs", "shatter", "rosin", "wax", "resin", "live resin",
      "badder", "batter", "budder", "crumble", "diamond", "diamonds", "sauce",
      "sugar", "distillate", "kief", "cartridge", "cartridges", "cart", "carts",
      "vape", "vapes", "vaporizer", "pod", "pods", "510", "applicator", "syringe",
      "hemp", "industrial hemp",
    ],
    excludedTerms: ["cbd isolate", "isolate"],
  },
];

export function concentrateDefinitionAt(at: Date = new Date()): ConcentrateDefinitionStage {
  // Pacific, not UTC: the stage turns over at California midnight, and a UTC
  // key would apply the 2028 definition eight hours early.
  const key = pacificDateKey(at);
  let current: ConcentrateDefinitionStage = OLDEST_CONCENTRATE_STAGE;
  for (const stage of CONCENTRATE_STAGES) {
    if (key >= stage.from) current = stage;
  }
  return current;
}

// ─────────────────────────── product classification ───────────────────────────

export type LimitCategory =
  /** Flower, prerolls, shake — counts against the 28.5 g limit. */
  | "non_concentrated"
  /** Raw concentrate and vape hardware — counts against the 8 g limit. */
  | "concentrate"
  /**
   * Edibles, beverages, topicals, capsules. § 15409(e) makes the retailer
   * responsible for the concentrate INSIDE these, and the catalogue does not
   * publish it. Counted separately as an explicit hole, never as zero.
   */
  | "manufactured"
  | "immature_plant"
  | "unknown";

const IMMATURE_PLANT_TERMS = ["clone", "clones", "seedling", "seedlings", "immature plant", "immature plants", "teen", "teens"];
const NON_CONCENTRATED_TERMS = [
  "flower", "preroll", "prerolls", "pre-roll", "pre-rolls", "pre roll", "pre rolls",
  "joint", "joints", "blunt", "blunts", "smalls", "shake", "trim", "nug", "nugs", "bud", "buds",
];
const MANUFACTURED_TERMS = [
  "edible", "edibles", "gummy", "gummies", "chocolate", "brownie", "cookie", "cookies",
  "beverage", "beverages", "drink", "drinks", "soda", "seltzer", "lemonade", "tea",
  "tincture", "tinctures", "capsule", "capsules", "softgel", "softgels", "tablet",
  "lozenge", "mint", "mints", "taffy", "chew", "chews", "syrup", "honey", "caramel",
  "topical", "topicals", "balm", "salve", "lotion", "cream", "patch", "patches",
  "transdermal", "bath bomb",
];

function hasTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

function hasAny(haystack: string, terms: string[]): boolean {
  return terms.some((t) => hasTerm(haystack, t));
}

export interface LimitClassifiable {
  name: string;
  tags?: readonly string[] | null;
  category?: { name: string } | null;
}

/**
 * Which § 15409 bucket a product falls in, evaluated against the concentrate
 * definition in force ON THE ORDER DATE (see the dated-rule note above).
 */
export function classifyForDailyLimit(p: LimitClassifiable, at: Date = new Date()): LimitCategory {
  const stage = concentrateDefinitionAt(at);
  const haystack = [p.category?.name ?? "", (p.tags ?? []).join(" "), p.name].join(" ");

  if (hasAny(haystack, IMMATURE_PLANT_TERMS)) return "immature_plant";
  // The carve-out is checked before the inclusion list, because from 2028 a
  // "CBD isolate" product names terms that are otherwise on the concentrate list.
  if (stage.excludedTerms.length > 0 && hasAny(haystack, stage.excludedTerms)) {
    return "manufactured";
  }
  // Flower first: an infused pre-roll names "hash" but is still smoked flower
  // by weight, and its own mass is what counts against 28.5 g.
  if (hasAny(haystack, NON_CONCENTRATED_TERMS)) return "non_concentrated";
  if (hasAny(haystack, stage.terms)) return "concentrate";
  if (hasAny(haystack, MANUFACTURED_TERMS)) return "manufactured";
  return "unknown";
}

// ─────────────────────────── net weight, best effort ───────────────────────────

const GRAMS_PER_OUNCE = 28.3495;

/** Trade measures that mean a weight on a California menu and nothing else. */
const TRADE_MEASURES: { term: string; grams: number }[] = [
  { term: "half ounce", grams: GRAMS_PER_OUNCE / 2 },
  { term: "half oz", grams: GRAMS_PER_OUNCE / 2 },
  { term: "quarter ounce", grams: GRAMS_PER_OUNCE / 4 },
  { term: "quarter oz", grams: GRAMS_PER_OUNCE / 4 },
  { term: "eighth", grams: GRAMS_PER_OUNCE / 8 },
  { term: "quarter", grams: GRAMS_PER_OUNCE / 4 },
  { term: "ounce", grams: GRAMS_PER_OUNCE },
  { term: "oz", grams: GRAMS_PER_OUNCE },
];

/**
 * Pull a net weight out of a product name.
 *
 * Reads, in order: an explicit fraction of an ounce ("1/8 oz"), an explicit
 * ounce figure ("1 oz"), an explicit gram figure ("3.5g", "1 gram"), and
 * finally a bare trade measure ("$100 Ounce of the Day", "Eighth"). Milligram
 * figures are deliberately IGNORED — on a cannabis menu "100mg" is potency, not
 * net weight, and reading it as mass would be a fabricated number.
 *
 * ⚠️ NO PACK MULTIPLIER, ON PURPOSE. It is tempting to read "10pk (7g)" as ten
 *    seven-gram units, and it is wrong: on real menus the parenthesised figure
 *    is the PACK TOTAL ("5pk(3G)", "Pre-Rolls 10pk (7g)"). Multiplying turned a
 *    single lawful 7 g pack into 70 g and refused the order. A parser that
 *    blocks legitimate baskets is worse than one that under-counts, because
 *    under-counting is a gap this module already declares and over-counting is
 *    a broken store. The cost is that "3 x 1G" reads as 1 g — a floor, which is
 *    what every number here is.
 *
 * Returns null when nothing readable is there. Null means "unmeasured", never
 * "zero".
 */
export function parseNetWeightGrams(name: string): number | null {
  if (!name) return null;
  const text = name.toLowerCase();

  /** A single unit heavier than a pound is a parse error, not a product. */
  const plausible = (g: number | null | undefined): number | null =>
    g != null && Number.isFinite(g) && g > 0 && g <= 454 ? g : null;

  // Strategies in confidence order. Each may fail the plausibility check, in
  // which case the next one gets its turn rather than the whole parse giving
  // up — "$100 Ounce of the Day" reads as 100 ounces on strategy 2, which is
  // absurd, and as one ounce on strategy 4, which is right.
  //
  // The `(?<![$\d.])` guard keeps a PRICE from being read as a quantity: on a
  // menu full of "$80 Ounce" and "$100 OG" the leading number is money.
  const strategies: (() => number | null)[] = [
    // "1/8 oz", "1/2oz", "3/4 ounce"
    () => {
      const m = /(\d+)\s*\/\s*(\d+)\s*(oz|ounce|ounces)\b/.exec(text);
      if (!m) return null;
      const den = Number(m[2]);
      return den > 0 ? plausible((Number(m[1]) / den) * GRAMS_PER_OUNCE) : null;
    },
    // "1 oz", "2oz"
    () => {
      const m = /(?<![$\d.])(\d+(?:\.\d+)?)\s*(oz|ounce|ounces)\b/.exec(text);
      return m ? plausible(Number(m[1]) * GRAMS_PER_OUNCE) : null;
    },
    // "3.5g", "1 gram". A non-word character must follow the unit so "1g"
    // matches and "1gb" does not; the decimal is read whole so "0.5g" is 0.5.
    () => {
      const m = /(?<![$\d.])(\d+(?:\.\d+)?)\s*(?:g|gr|gram|grams)(?![a-z0-9])/.exec(text);
      return m ? plausible(Number(m[1])) : null;
    },
    // Bare trade measure: "Ounce of the Day", "Eighth".
    () => {
      for (const measure of TRADE_MEASURES) {
        if (hasTerm(text, measure.term)) return plausible(measure.grams);
      }
      return null;
    },
  ];

  for (const strategy of strategies) {
    const grams = strategy();
    if (grams != null) return grams;
  }
  return null;
}

// ─────────────────────────── the assessment ───────────────────────────

export interface AssessableLine {
  name: string;
  quantity: number;
  tags?: readonly string[] | null;
  category?: { name: string } | null;
}

export type LimitBreach = "non_concentrated" | "concentrate" | "immature_plants";

export interface DailyLimitAssessment {
  /** Measured grams counting against 4 CCR § 15409(a)(1) — 28.5 g. */
  nonConcentratedGrams: number;
  /** Measured grams counting against § 15409(a)(2) — 8 g. */
  concentrateGrams: number;
  /** Units counting against § 15409(a)(3) — 6. */
  immaturePlants: number;
  /** Lines whose weight we could read. */
  measuredLines: number;
  /** Lines with no readable net weight — contribute zero, so totals are a floor. */
  unmeasuredLines: number;
  /**
   * Manufactured products whose § 15409(e) concentrate content is not published
   * anywhere this app can read. Never counted, always reported.
   */
  manufacturedUnmeasuredLines: number;
  exceeded: LimitBreach[];
  /** True only when every line was measurable. */
  complete: boolean;
  /** Which dated definition of "cannabis concentrate" was applied. */
  concentrateCitation: string;
}

export const EMPTY_DAILY_LIMIT_ASSESSMENT: DailyLimitAssessment = {
  nonConcentratedGrams: 0,
  concentrateGrams: 0,
  immaturePlants: 0,
  measuredLines: 0,
  unmeasuredLines: 0,
  manufacturedUnmeasuredLines: 0,
  exceeded: [],
  complete: true,
  concentrateCitation: concentrateDefinitionAt().citation,
};

export function assessDailyLimits(
  lines: readonly AssessableLine[],
  at: Date = new Date(),
): DailyLimitAssessment {
  const stage = concentrateDefinitionAt(at);
  let nonConcentratedGrams = 0;
  let concentrateGrams = 0;
  let immaturePlants = 0;
  let measuredLines = 0;
  let unmeasuredLines = 0;
  let manufacturedUnmeasuredLines = 0;

  for (const line of lines) {
    const qty = Math.max(0, Math.floor(line.quantity || 0));
    if (qty === 0) continue;
    const category = classifyForDailyLimit(line, at);

    if (category === "immature_plant") {
      immaturePlants += qty;
      measuredLines += 1;
      continue;
    }

    if (category === "manufactured") {
      // § 15409(e): the concentrate inside counts, and nothing publishes it.
      manufacturedUnmeasuredLines += 1;
      continue;
    }

    const unit = parseNetWeightGrams(line.name);
    if (unit == null) {
      unmeasuredLines += 1;
      continue;
    }

    measuredLines += 1;
    const total = unit * qty;
    if (category === "concentrate") concentrateGrams += total;
    else if (category === "non_concentrated") nonConcentratedGrams += total;
    else unmeasuredLines += 1; // "unknown" with a weight: we don't know which bucket
  }

  const exceeded: LimitBreach[] = [];
  if (round2(nonConcentratedGrams) > DAILY_LIMIT_NON_CONCENTRATED_GRAMS) {
    exceeded.push("non_concentrated");
  }
  if (round2(concentrateGrams) > DAILY_LIMIT_CONCENTRATE_GRAMS) exceeded.push("concentrate");
  if (immaturePlants > DAILY_LIMIT_IMMATURE_PLANTS) exceeded.push("immature_plants");

  return {
    nonConcentratedGrams: round2(nonConcentratedGrams),
    concentrateGrams: round2(concentrateGrams),
    immaturePlants,
    measuredLines,
    unmeasuredLines,
    manufacturedUnmeasuredLines,
    exceeded,
    complete: unmeasuredLines === 0 && manufacturedUnmeasuredLines === 0,
    concentrateCitation: stage.citation,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** One sentence per breach, in the customer's language, citing the rule.
 *  Pass the assessment so the sentence can say HOW FAR over the cart is —
 *  "remove some flower" with no numbers was the audit's #5: a mandatory wall
 *  that told the shopper nothing actionable. */
export function describeBreach(kind: LimitBreach, a?: DailyLimitAssessment): string {
  switch (kind) {
    case "non_concentrated": {
      const counted = a ? ` This cart counts at least ${round2(a.nonConcentratedGrams)} g.` : "";
      return `California limits one customer to ${DAILY_LIMIT_NON_CONCENTRATED_GRAMS} g of non-concentrated cannabis per day (4 CCR § 15409).${counted} Please remove some flower before checking out.`;
    }
    case "concentrate": {
      const counted = a ? ` This cart counts at least ${round2(a.concentrateGrams)} g.` : "";
      return `California limits one customer to ${DAILY_LIMIT_CONCENTRATE_GRAMS} g of cannabis concentrate per day (4 CCR § 15409).${counted} Please remove some concentrate before checking out.`;
    }
    case "immature_plants":
      return `California limits one customer to ${DAILY_LIMIT_IMMATURE_PLANTS} immature cannabis plants per day (4 CCR § 15409).`;
  }
}
