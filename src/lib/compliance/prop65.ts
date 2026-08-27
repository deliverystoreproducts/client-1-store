/**
 * ══════════════════════════════════════════════════════════════════════════
 *  PROPOSITION 65 — the cannabis-tailored warnings, and where they may live
 * ══════════════════════════════════════════════════════════════════════════
 *
 * This is the warning obligation that attaches to the WEB PAGE rather than to
 * the package, and it is the one storefronts most often build wrong.
 *
 * ── Placement (27 CCR § 25602(b)(1), verbatim) ────────────────────────────
 *   (A) a warning on the product display page, or
 *   (B) a clearly marked hyperlink using the word "WARNING" or the words
 *       "CA WARNING" or "CALIFORNIA WARNING" on the product display page that
 *       links to the warning, or
 *   (C) an otherwise prominently displayed warning provided to the purchaser
 *       prior to completing the purchase. … the warning is not prominently
 *       displayed if the purchaser must search for it in the general content
 *       of the website.
 *
 * Three consequences this codebase respects:
 *   1. A SITE-WIDE FOOTER WARNING DOES NOT SATISFY THIS. The regulation
 *      expressly forecloses it ("must search for it in the general content").
 *      There is deliberately no Prop 65 text in `app/layout.tsx`.
 *   2. We take route (A) — inline text on the product display page — so the
 *      exact-link-text rule in (B) never has to be got right. Nothing in this
 *      app links to a Prop 65 warning under any other label.
 *   3. The cart and checkout ALSO carry the warnings for everything in the
 *      basket, which is route (C). Belt and braces; (A) is what compliance
 *      rests on.
 *
 * ── Content: cannabis has its OWN text, and short-form is unavailable ──────
 * California adopted cannabis-specific tailored safe-harbour warnings at
 * 27 CCR §§ 25607.38–25607.47, effective 1 October 2022. They displace the
 * generic § 25603 wording, and the short-form warning is NOT available for
 * cannabis (each tailored section incorporates § 25602's methods "not
 * including subsection (a)(4)", which is the short-form label method).
 *
 * The familiar "This product can expose you to chemicals including…" text is
 * therefore WRONG here. So is the bare p65warnings.ca.gov URL — the cannabis
 * sections carry the /cannabis path.
 *
 * ── Is the wording mandated word-for-word? ────────────────────────────────
 * Strictly no: 27 CCR § 25600(f) preserves other methods, and the statute
 * (HSC § 25249.6) requires only a "clear and reasonable warning". The
 * regulations are a deemed-compliant SAFE HARBOUR. Deviating forfeits the
 * presumption and shifts the burden onto the retailer against a private
 * plaintiffs' bar that files thousands of 60-day notices a year, for no upside
 * whatsoever. **These strings are reproduced verbatim. Do not edit them, do
 * not "improve" the punctuation, do not interpolate marketing copy into the
 * warning container (27 CCR § 25601(e) limits supplemental content there).**
 *
 * Sources, accessed 19 Aug 2026 (see COMPLIANCE.md § 5.1 and § 14):
 *   27 CCR § 25602    https://www.law.cornell.edu/regulations/california/27-CCR-25602
 *   27 CCR § 25607.39 (smoked)      /27-CCR-25607.39
 *   27 CCR § 25607.41 (ingested)    /27-CCR-25607.41
 *   27 CCR § 25607.43 (vaped/dabbed)/27-CCR-25607.43
 *   27 CCR § 25607.45 (dermal)      /27-CCR-25607.45
 *
 * NOT LEGAL ADVICE. A California cannabis attorney must review this before
 * launch — Prop 65 is enforced by people who make a living filing these
 * claims, not by a regulator who writes a warning letter first.
 */

export type ConsumptionRoute = "smoked" | "ingested" | "vaped_dabbed" | "dermal";

export interface Prop65Warning {
  route: ConsumptionRoute;
  /** Always the bare word `WARNING` — see the signal-word note below. */
  signalWord: "WARNING";
  /** The warning sentence(s) AFTER "WARNING:". Verbatim. */
  body: string;
  /** The regulation the body is quoted from. */
  citation: string;
}

/**
 * Signal word. The cannabis sections were adopted in 2022 and specify only
 * *"The word 'WARNING:' in all capital letters and bold print"*. They do NOT
 * carry the "CA WARNING:" / "CALIFORNIA WARNING:" alternatives a 2024
 * amendment added to the generic § 25603(a)(2). Using plain `WARNING`
 * everywhere — inline text and any link — makes that tension disappear.
 */
const SIGNAL_WORD = "WARNING" as const;

/**
 * The four tailored warnings, verbatim.
 *
 * ⚠️ Punctuation is reproduced as printed by OEHHA. The INGESTED variant ends
 *    without a full stop in the official text, unlike its three siblings. That
 *    is not a typo in this file — do not "fix" it.
 */
const WARNINGS: Record<ConsumptionRoute, Prop65Warning> = {
  smoked: {
    route: "smoked",
    signalWord: SIGNAL_WORD,
    body:
      "Smoking cannabis increases your cancer risk and during pregnancy exposes your child to delta-9-THC and other chemicals that can affect your child's birthweight, behavior, and learning ability. For more information go to www.P65Warnings.ca.gov/cannabis.",
    citation: "27 CCR § 25607.39(a)(3)",
  },
  ingested: {
    route: "ingested",
    signalWord: SIGNAL_WORD,
    body:
      "Consuming this product during pregnancy exposes your child to delta-9-THC, which can affect your child's behavior and learning ability. For more information go to www.P65Warnings.ca.gov/cannabis",
    citation: "27 CCR § 25607.41(a)(3)(A)",
  },
  vaped_dabbed: {
    route: "vaped_dabbed",
    signalWord: SIGNAL_WORD,
    body:
      "Vaping or dabbing this product during pregnancy exposes your child to delta-9-THC, which can affect your child's behavior and learning ability. For more information go to www.P65Warnings.ca.gov/cannabis.",
    citation: "27 CCR § 25607.43(a)(3)(A)",
  },
  dermal: {
    route: "dermal",
    signalWord: SIGNAL_WORD,
    body:
      "Using this product during pregnancy exposes your child to delta-9-THC, which can affect your child's behavior and learning ability. For more information go to www.P65Warnings.ca.gov/cannabis.",
    citation: "27 CCR § 25607.45(a)(3)(A)",
  },
};

/**
 * ⚠️ THE (B) CARCINOGEN VARIANTS ARE NOT IMPLEMENTED, ON PURPOSE.
 *
 * Each of the ingested / vaped / dermal sections has a second variant for
 * products that ALSO expose the consumer to a listed carcinogen, e.g.
 * § 25607.41(a)(3)(B): "…exposes you to carcinogens including [name one or
 * more listed carcinogens], and during pregnancy…".
 *
 * Selecting it requires per-SKU knowledge of which listed carcinogens a
 * product exposes the consumer to. **The upstream catalogue carries no such
 * field**, and inventing one would be worse than the gap: the bracket in the
 * regulation must be filled with real, named, listed chemicals. So this app
 * emits the (A) variant and the gap is declared in README.md and COMPLIANCE.md
 * rather than papered over.
 *
 * Note this is not a gap for SMOKED goods: cannabis smoke is itself listed for
 * cancer and § 25607.39(a)(3) — the only text this app uses for that route —
 * already carries "increases your cancer risk".
 */
export const CARCINOGEN_VARIANT_UNSUPPORTED =
  "27 CCR §§ 25607.41/.43/.45(a)(3)(B) require naming the listed carcinogens; the catalogue carries no per-SKU carcinogen data.";

// ─────────────────────── does the duty apply at all? ───────────────────────

/**
 * HSC § 25249.11(b): "'Person in the course of doing business' does not include
 * any person employing fewer than 10 employees in his or her business".
 *
 * If the retailer employs fewer than ten people, Prop 65's warning duty does
 * not reach them. It is a real exemption and a fragile one — it tracks the
 * business, not the product, and a delivery retailer hiring drivers crosses the
 * line without noticing. How the count is measured (contractors? part-timers?
 * measured when?) is a lawyer question with money attached, not a developer
 * question.
 *
 * So: the capability is built unconditionally and the exemption is a switch.
 * **The switch defaults to SHOWING the warning.** Defaulting to the exemption
 * would mean a storefront that silently ships without a Prop 65 warning because
 * nobody set a variable, which is exactly the wrong direction to fail in.
 *
 * Set `NEXT_PUBLIC_PROP65_WARNINGS=exempt` only on a written determination that
 * HSC § 25249.11(b) applies, and put someone on watch for the tenth hire.
 */
export const PROP65_WARNINGS_ENABLED =
  (process.env.NEXT_PUBLIC_PROP65_WARNINGS || "").trim().toLowerCase() !== "exempt";

// ─────────────────────────── route classification ───────────────────────────

/** The minimum a product must look like to be classified. */
export interface ClassifiableProduct {
  name: string;
  tags?: readonly string[] | null;
  category?: { name: string } | null;
  description?: string | null;
}

/**
 * Keyword rules, most-specific class first.
 *
 * Matching is word-boundary based over the CATEGORY name first (most reliable
 * — an operator names their own categories), then TAGS, then the product name.
 * The description is deliberately not searched: supplier prose mentions every
 * consumption route in passing and would classify everything as everything.
 */
const ROUTE_TERMS: { route: ConsumptionRoute; terms: string[] }[] = [
  {
    route: "dermal",
    terms: [
      "topical", "topicals", "transdermal", "balm", "salve", "lotion", "cream",
      "ointment", "patch", "patches", "body oil", "massage", "roll-on", "rollon",
      "bath bomb", "bath soak", "serum",
    ],
  },
  {
    route: "ingested",
    terms: [
      "edible", "edibles", "gummy", "gummies", "chocolate", "brownie", "cookie",
      "cookies", "beverage", "beverages", "drink", "drinks", "soda", "seltzer",
      "lemonade", "tea", "tincture", "tinctures", "capsule", "capsules",
      "softgel", "softgels", "tablet", "lozenge", "mint", "mints", "taffy",
      "chew", "chews", "syrup", "honey", "caramel", "sublingual", "sparkling",
    ],
  },
  {
    route: "smoked",
    terms: [
      "flower", "preroll", "prerolls", "pre-roll", "pre-rolls", "pre roll",
      "pre rolls", "joint", "joints", "blunt", "blunts", "smalls", "shake",
      "eighth", "eighths", "nug", "nugs", "bud",
    ],
  },
  {
    route: "vaped_dabbed",
    terms: [
      "cartridge", "cartridges", "cart", "carts", "vape", "vapes", "vaporizer",
      "vaporizers", "pod", "pods", "disposable", "disposables", "510", "dab",
      "dabs", "dabbing", "wax", "shatter", "rosin", "resin", "badder", "batter",
      "budder", "crumble", "diamond", "diamonds", "distillate", "concentrate",
      "concentrates", "extract", "extracts", "hash", "hashish", "kief", "sauce",
      "sugar", "applicator", "syringe",
    ],
  },
];

/** Tags the operator can set to override the guess outright. */
const ROUTE_TAG_ALIASES: Record<string, ConsumptionRoute> = {
  smoked: "smoked",
  smoke: "smoked",
  ingested: "ingested",
  ingest: "ingested",
  eaten: "ingested",
  vaped: "vaped_dabbed",
  vaped_dabbed: "vaped_dabbed",
  "vaped-dabbed": "vaped_dabbed",
  dabbed: "vaped_dabbed",
  inhaled: "vaped_dabbed",
  dermal: "dermal",
  topical: "dermal",
};

function hasTerm(haystack: string, term: string): boolean {
  // Word-boundary match so "cart" does not fire on "cartel" and "bud" does not
  // fire on "buddha". Terms are lower-case and may contain spaces or hyphens.
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

function routeFromText(text: string): ConsumptionRoute | null {
  if (!text) return null;
  for (const group of ROUTE_TERMS) {
    for (const term of group.terms) {
      if (hasTerm(text, term)) return group.route;
    }
  }
  return null;
}

/**
 * The route the Prop 65 text is selected by, or `null` when the catalogue does
 * not say and nothing in the copy gives it away.
 *
 * Precedence: explicit tag → category name → other tags → product name.
 */
export function classifyConsumptionRoute(p: ClassifiableProduct): ConsumptionRoute | null {
  const tags = (p.tags ?? []).map((t) => String(t).trim().toLowerCase());

  for (const tag of tags) {
    const direct = ROUTE_TAG_ALIASES[tag];
    if (direct) return direct;
    // `p65:vaped_dabbed` / `route:smoked` styles too.
    const m = /^(?:p65|route|consumption)[:=]\s*(.+)$/.exec(tag);
    const captured = m?.[1];
    if (captured) {
      const aliased = ROUTE_TAG_ALIASES[captured.trim()];
      if (aliased) return aliased;
    }
  }

  return (
    routeFromText(p.category?.name ?? "") ??
    routeFromText(tags.join(" ")) ??
    routeFromText(p.name)
  );
}

/**
 * What to warn with when the catalogue does not let us tell.
 *
 * Defaults to `smoked`, which is the only variant carrying the cancer clause
 * and is therefore the most protective of the four — over-warning is not a
 * Prop 65 violation, failing to warn is. Configurable because an operator whose
 * catalogue is, say, edibles-only may reasonably prefer a different fallback.
 *
 * Unclassified products are logged server-side (see `reportUnclassified`) so
 * the fallback is a stopgap the operator can see and fix in the catalogue,
 * rather than a silent guess.
 */
export const PROP65_FALLBACK_ROUTE: ConsumptionRoute = (() => {
  const raw = (process.env.NEXT_PUBLIC_PROP65_FALLBACK_ROUTE || "").trim().toLowerCase();
  return (ROUTE_TAG_ALIASES[raw] ?? "smoked") as ConsumptionRoute;
})();

/** The warning to print for a product. Never null while warnings are enabled. */
export function prop65WarningFor(p: ClassifiableProduct): Prop65Warning | null {
  if (!PROP65_WARNINGS_ENABLED) return null;
  const route = classifyConsumptionRoute(p) ?? PROP65_FALLBACK_ROUTE;
  return WARNINGS[route];
}

export function prop65WarningForRoute(route: ConsumptionRoute): Prop65Warning {
  return WARNINGS[route];
}

/** Every warning, for the legal pages. */
export function allProp65Warnings(): Prop65Warning[] {
  return Object.values(WARNINGS);
}
