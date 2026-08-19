/**
 * ══════════════════════════════════════════════════════════════════════════
 *  VAPE DISPOSAL — B&P § 26152.1, verbatim, required in MARKETING
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Unlike the GOVERNMENT WARNING (a packaging rule) this one binds advertising
 * and marketing, which is exactly why storefronts miss it: nobody has ever seen
 * it on a package they handled. It is new — added by AB 1894 (Stats. 2022,
 * Ch. 390) and operative 1 July 2024.
 *
 * B&P § 26152.1, verbatim:
 *
 *   (a)(1) Advertisement and marketing of an integrated cannabis vaporizer, as
 *   defined in Section 26122, shall prominently provide in a clear and legible
 *   fashion: "An empty integrated cannabis vaporizer shall be properly disposed
 *   of as hazardous waste at a household hazardous waste collection facility or
 *   other approved facility."
 *
 *   (a)(2) Advertisement and marketing of a cannabis cartridge shall
 *   prominently provide in a clear and legible fashion: "A spent cannabis
 *   cartridge shall be properly disposed of as hazardous waste at a household
 *   hazardous waste collection facility or other approved facility."
 *
 *   (b) Advertisement and marketing of a cannabis cartridge and an integrated
 *   cannabis vaporizer shall not indicate that a cannabis cartridge or an
 *   integrated cannabis vaporizer is disposable nor imply that it may be thrown
 *   in the trash or recycling streams.
 *
 * Source: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=26152.1
 * (accessed 19 Aug 2026)
 *
 * ⚠️ THE WORDING IS MANDATED WORD-FOR-WORD — the statute quotes the sentences
 *    directly. Do not paraphrase, do not shorten, do not merge the two.
 *
 * ⚠️ Watch out: the DCC's own summary page drops the word "collection" from the
 *    cartridge version. **The statute says "household hazardous waste
 *    collection facility" in BOTH messages, and the statute controls.**
 *
 * Placement: wherever the product is advertised or marketed — the product
 * detail page for every cartridge / integrated vaporizer SKU, and any tile or
 * basket line that markets one. A single footer line would not obviously be
 * "prominently … attached to the product being advertised".
 */

import type { ClassifiableProduct } from "./prop65";

export type VapeHardware = "cartridge" | "integrated_vaporizer";

export interface VapeDisposalMessage {
  hardware: VapeHardware;
  /** Verbatim statutory sentence. */
  text: string;
  citation: string;
}

const MESSAGES: Record<VapeHardware, VapeDisposalMessage> = {
  integrated_vaporizer: {
    hardware: "integrated_vaporizer",
    text:
      "An empty integrated cannabis vaporizer shall be properly disposed of as hazardous waste at a household hazardous waste collection facility or other approved facility.",
    citation: "B&P § 26152.1(a)(1)",
  },
  cartridge: {
    hardware: "cartridge",
    text:
      "A spent cannabis cartridge shall be properly disposed of as hazardous waste at a household hazardous waste collection facility or other approved facility.",
    citation: "B&P § 26152.1(a)(2)",
  },
};

// ────────────────────────── which hardware is it? ──────────────────────────

const CARTRIDGE_TERMS = ["cartridge", "cartridges", "cart", "carts", "510", "pod", "pods"];

/**
 * An "integrated cannabis vaporizer" (B&P § 26122) is the all-in-one kind: the
 * cannabis and the device are one unit. In catalogue language that is the
 * "disposable" / "all-in-one" / "AIO" pen.
 */
const INTEGRATED_TERMS = [
  "integrated", "all-in-one", "all in one", "aio", "disposable", "disposables",
  "vape pen", "vape-pen", "vaporizer", "vaporizers",
];

/** Anything that says "this SKU is vape hardware" without saying which kind. */
const GENERIC_VAPE_TERMS = ["vape", "vapes"];

function has(haystack: string, terms: string[]): boolean {
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack)) return true;
  }
  return false;
}

const HARDWARE_TAG_ALIASES: Record<string, VapeHardware> = {
  cartridge: "cartridge",
  cart: "cartridge",
  "vape:cartridge": "cartridge",
  integrated: "integrated_vaporizer",
  "integrated-vaporizer": "integrated_vaporizer",
  integrated_vaporizer: "integrated_vaporizer",
  "vape:integrated": "integrated_vaporizer",
  aio: "integrated_vaporizer",
};

/**
 * The disposal message(s) a product must carry, or an empty array.
 *
 * Returns TWO messages when the catalogue clearly describes vape hardware but
 * does not say which kind. That is over-inclusive on purpose: both sentences
 * are verbatim statutory text, both are true, and printing the wrong single one
 * is a compliance miss while printing both is only inelegant. Ambiguous SKUs
 * are logged so the operator can tag them (`vape:cartridge` /
 * `vape:integrated`) and get a single clean message.
 *
 * Concentrates that are not vape hardware — wax, rosin, dabs — get nothing:
 * § 26152.1 reaches cartridges and integrated vaporizers, not concentrate.
 */
export function vapeDisposalMessagesFor(p: ClassifiableProduct): VapeDisposalMessage[] {
  const tags = (p.tags ?? []).map((t) => String(t).trim().toLowerCase());
  for (const tag of tags) {
    const tagged = HARDWARE_TAG_ALIASES[tag];
    if (tagged) return [MESSAGES[tagged]];
  }

  const haystack = [p.category?.name ?? "", tags.join(" "), p.name].join(" ");

  const cartridge = has(haystack, CARTRIDGE_TERMS);
  const integrated = has(haystack, INTEGRATED_TERMS);

  if (cartridge && !integrated) return [MESSAGES.cartridge];
  if (integrated && !cartridge) return [MESSAGES.integrated_vaporizer];
  if (cartridge && integrated) return [MESSAGES.cartridge, MESSAGES.integrated_vaporizer];
  if (has(haystack, GENERIC_VAPE_TERMS)) {
    return [MESSAGES.cartridge, MESSAGES.integrated_vaporizer];
  }
  return [];
}

export function isVapeHardware(p: ClassifiableProduct): boolean {
  return vapeDisposalMessagesFor(p).length > 0;
}

// ───────────────── § 26152.1(b) — the "disposable" guard ─────────────────

/**
 * Subsection (b) is a PROHIBITION on our own copy, and the copy is not ours:
 * supplier product descriptions call these things "disposables" constantly,
 * because that is what the industry calls them. Left alone, a catalogue sync
 * reintroduces the violation the week after launch.
 *
 * So this is a guard, not a note. `redactProhibitedDisposalLanguage()` is
 * applied to every vape product's description before it is rendered: the
 * offending SENTENCE is withheld (not the whole description — that would make
 * the page useless), and the hit is logged for the operator.
 *
 * A product NAME cannot be redacted — it is the identity of the thing being
 * bought, and silently renaming a customer's order is worse than the wording.
 * Names are reported instead; fixing them is a catalogue task, and it is on the
 * operator checklist in README.md.
 */
const PROHIBITED_TERMS = [
  "disposable",
  "disposables",
  "single-use",
  "single use",
  "throwaway",
  "throw away",
  "throw it away",
  "toss it",
  "in the trash",
  "in the bin",
  "recyclable",
  "recycling",
  "recycle",
];

/** Which prohibited terms appear in a piece of copy. Empty means clean. */
export function findProhibitedDisposalLanguage(text: string | null | undefined): string[] {
  if (!text) return [];
  const hits: string[] = [];
  for (const term of PROHIBITED_TERMS) {
    if (has(text, [term])) hits.push(term);
  }
  return hits;
}

/**
 * Drop the sentences that trip § 26152.1(b). Returns the surviving copy plus
 * what was removed, so the caller can log it.
 *
 * Only ever applied to products this module classifies as vape hardware — the
 * prohibition is written about cartridges and integrated vaporizers, and
 * "recyclable" on a topical tin is nobody's problem.
 */
export function redactProhibitedDisposalLanguage(
  text: string | null | undefined,
): { text: string | null; removed: string[] } {
  if (!text) return { text: text ?? null, removed: [] };

  const removed: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((s) => {
    const hits = findProhibitedDisposalLanguage(s);
    if (hits.length === 0) return true;
    removed.push(s.trim());
    return false;
  });

  const out = kept.join(" ").replace(/\s{2,}/g, " ").trim();
  return { text: out.length > 0 ? out : null, removed };
}

export function vapeDisposalMessageForHardware(hardware: VapeHardware): VapeDisposalMessage {
  return MESSAGES[hardware];
}
