/**
 * `/picks?ids=…` — which products a link is asking for. PURE.
 *
 * The link is written by the shop's own email campaigns ("these six"), but it is
 * a URL, so anyone can write one. The rules make a hand-made link harmless:
 * ids are positive integers only, duplicates are dropped, and the list is
 * capped, so the page can never be turned into "dump the catalogue" or made to
 * fan out a huge upstream request. The ORDER is kept: an email shows its picks
 * in an order and the page must show the same one.
 */
export const MAX_PICKS = 24;

export function parsePickIds(raw: string | string[] | undefined): number[] {
  const text = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const out: number[] = [];
  for (const part of text.split(/[,\s]+/)) {
    if (!/^\d{1,12}$/.test(part)) continue;
    const id = Number(part);
    if (id > 0 && Number.isSafeInteger(id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_PICKS) break;
  }
  return out;
}
