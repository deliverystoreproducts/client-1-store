/**
 * ══════════════════════════════════════════════════════════════════════════
 *  PRODUCT-COPY RULES — the ones a program cannot decide for you
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Four California rules govern what a product page may SAY. None of them can be
 * enforced by a regular expression, and pretending otherwise would be worse
 * than useless — a false sense of coverage over a catalogue nobody reviewed.
 *
 *   B&P § 26152(b)  No advertising statement inconsistent with the product's
 *                   own label. This is the one that governs the THC/CBD
 *                   numbers, weights and strain names on a product page: they
 *                   must match the label on the package actually delivered.
 *                   Batch potency varies; a menu showing a nominal 22 % while
 *                   the delivered package says 19.4 % is publishing a statement
 *                   inconsistent with the label. NO PROGRAM CAN CHECK THIS —
 *                   it needs the batch record that produced the label.
 *
 *   4 CCR § 15040.1 Cannabis goods shall not be marketed, advertised or sold
 *                   labelled as "beer, wine, liquor, spirits, or any other term
 *                   used to describe a type of alcohol." Bites THC beverages
 *                   and category naming ("cannabis wine", "weed beer").
 *
 *   B&P § 26154     No health-related statement that is untrue or tends to
 *                   create a misleading impression as to the effects on health
 *                   of cannabis consumption. "Health-related statement" is
 *                   defined expansively at § 26150(d). Where exactly the line
 *                   sits for strain-effect language ("relaxing", "uplifting")
 *                   is genuinely unsettled and is a COUNSEL CALL, not a
 *                   developer call — see COMPLIANCE.md § 13 item 3.
 *
 *   4 CCR § 15040(a)(3)(D) / § 26152(f)
 *                   Nothing attractive to children, including the words
 *                   "candy"/"candies" and spelling variants, cartoons, and
 *                   imitation confectionery packaging. Supplier product names
 *                   carry these constantly. Note § 26152.2 (AB 1170, eff.
 *                   1 Jan 2026) lets the AG, a city attorney or a county
 *                   counsel sue directly over this one, with penalties up to
 *                   $5,000 per violation.
 *
 * ── What this module therefore is ─────────────────────────────────────────
 *
 * A REVIEWER, not a censor. It scans the copy this app is about to render and
 * writes findings to the SERVER LOG so the operator can see them and fix the
 * catalogue. It does not rewrite product copy and it does not block a page:
 * three of the four rules require a human judgement it cannot make, and
 * silently editing a supplier description is its own § 26152(b) risk.
 *
 * The one exception is § 26152.1(b) ("disposable" on vape hardware), which is a
 * flat prohibition with no judgement in it. That one IS enforced — see
 * `src/lib/compliance/vape.ts`.
 *
 * Nothing from this module ever reaches the browser.
 */

export type CopyRule = "alcohol_terms" | "child_appeal" | "possible_health_claim";

export interface CopyFinding {
  rule: CopyRule;
  citation: string;
  /** The words that tripped it. */
  matches: string[];
  /** Which piece of copy — "name", "description", "tags", "category". */
  field: string;
  /** What a human has to decide or do. */
  action: string;
}

/** 4 CCR § 15040.1. */
const ALCOHOL_TERMS = [
  "beer", "lager", "ale", "pilsner", "stout", "ipa", "wine", "rosé", "rose wine",
  "champagne", "prosecco", "liquor", "spirits", "spirit", "whiskey", "whisky",
  "bourbon", "vodka", "gin", "rum", "tequila", "mezcal", "brandy", "cognac",
  "cocktail", "margarita", "mojito", "martini", "sangria", "cider", "hard seltzer",
];

/** 4 CCR § 15040(a)(3)(D) names these outright; the variants are the point. */
const CHILD_APPEAL_TERMS = [
  "candy", "candies", "kandy", "kandies", "kandeez", "candee", "kandi",
  "cartoon", "cartoons",
];

/**
 * B&P § 26154 / § 26150(d). Advisory only — several of these are ordinary
 * industry vocabulary, and counsel has to draw the line before anyone removes
 * a word from a menu.
 */
const HEALTH_CLAIM_TERMS = [
  "cure", "cures", "heal", "heals", "healing", "treat", "treats", "treatment",
  "therapeutic", "medicinal benefit", "remedy", "relief", "relieves", "relieve",
  "pain", "anxiety", "depression", "insomnia", "ptsd", "inflammation",
  "anti-inflammatory", "immune", "immunity", "wellness benefit", "detox",
  "prescription", "clinically", "doctor recommended", "fda",
];

function matchesIn(text: string, terms: string[]): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text)) found.push(term);
  }
  return found;
}

export interface ReviewableProduct {
  name: string;
  description?: string | null;
  tags?: readonly string[] | null;
  category?: { name: string } | null;
}

export function reviewProductCopy(p: ReviewableProduct): CopyFinding[] {
  const fields: { field: string; text: string }[] = [
    { field: "name", text: p.name ?? "" },
    { field: "description", text: p.description ?? "" },
    { field: "tags", text: (p.tags ?? []).join(" ") },
    { field: "category", text: p.category?.name ?? "" },
  ];

  const findings: CopyFinding[] = [];
  for (const { field, text } of fields) {
    const alcohol = matchesIn(text, ALCOHOL_TERMS);
    if (alcohol.length) {
      findings.push({
        rule: "alcohol_terms",
        citation: "4 CCR § 15040.1",
        matches: alcohol,
        field,
        action:
          "Cannabis goods may not be marketed or labelled as beer, wine, liquor, spirits or any other term describing a type of alcohol. Rename in the catalogue.",
      });
    }
    const child = matchesIn(text, CHILD_APPEAL_TERMS);
    if (child.length) {
      findings.push({
        rule: "child_appeal",
        citation: "4 CCR § 15040(a)(3), B&P § 26152(f)",
        matches: child,
        field,
        action:
          "Attractive-to-children wording. Rename in the catalogue — B&P § 26152.2 lets a city attorney sue over this directly, up to $5,000 per violation.",
      });
    }
    const health = matchesIn(text, HEALTH_CLAIM_TERMS);
    if (health.length) {
      findings.push({
        rule: "possible_health_claim",
        citation: "B&P § 26154, § 26150(d)",
        matches: health,
        field,
        action:
          "POSSIBLE health-related statement. Not automatically unlawful — counsel must set the line for effect language and the catalogue team applies it.",
      });
    }
  }
  return findings;
}

/**
 * Log findings once per product, server-side. Called from the product page and
 * from cart pricing. Never renders, never blocks, never reaches the browser.
 */
export function reportCopyFindings(productId: number, name: string, findings: CopyFinding[]): void {
  if (findings.length === 0) return;
  for (const f of findings) {
    console.warn(
      `[compliance] product ${productId} "${name}" — ${f.citation} (${f.field}): ${f.matches.join(", ")} — ${f.action}`,
    );
  }
}

/**
 * § 26152(b) again, in the one place a program CAN help: whenever potency is
 * displayed it must match the package label of the unit actually delivered.
 * Batch potency varies, so the page qualifies the number rather than asserting
 * a precision it does not have.
 */
export const POTENCY_LABEL_QUALIFIER =
  "Potency is the catalogue figure. The package delivered carries the batch-specific content — always read the label.";
