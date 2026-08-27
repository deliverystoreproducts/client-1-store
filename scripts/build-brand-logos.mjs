#!/usr/bin/env node
/**
 * Build src/data/brand-logos.json from a Weedmaps brand export.
 *
 *   node scripts/build-brand-logos.mjs ~/Downloads/weedmaps_brands.csv
 *
 * Input: the CSV the DevTools snippet (weedmaps_brands_console.js) or the
 * Python fetcher writes — columns id,name,slug,page_url,image (order-free,
 * matched by header). Output: { normalisedName: imageUrl }, sorted, one brand
 * per name. When two brands normalise to the same name the first wins and the
 * collision is printed so it can be looked at.
 *
 * Normalisation MUST match src/lib/brand-art.ts — it is duplicated here rather
 * than imported because this runs under plain node, before any build.
 */
import { readFileSync, writeFileSync } from "node:fs";

const src = process.argv[2];
if (!src) {
  console.error("usage: build-brand-logos.mjs <weedmaps_brands.csv>");
  process.exit(1);
}

function normalize(name) {
  return (name ?? "")
    .toLowerCase()
    .replace(/[™®©Ⓡ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the\s+/, "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Minimal RFC-4180 reader: quoted fields, doubled quotes, CRLF. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const [header, ...rows] = parseCsv(readFileSync(src, "utf8"));
const col = (n) => header.findIndex((h) => h.trim().toLowerCase() === n);
const iName = col("name");
const iImage = col("image") >= 0 ? col("image") : col("original_url");
if (iName < 0 || iImage < 0) {
  console.error(`need "name" and "image" columns; got: ${header.join(", ")}`);
  process.exit(1);
}

const out = {};
let skipped = 0;
for (const r of rows) {
  const key = normalize(r[iName]);
  const url = (r[iImage] ?? "").trim();
  if (!key || !/^https:\/\/images\.weedmaps\.com\//.test(url)) {
    skipped++;
    continue;
  }
  // strip any query string — brand-art.ts adds its own sizing params
  const clean = url.split("?")[0];
  if (out[key] && out[key] !== clean) {
    console.error(`collision: "${r[iName]}" → ${key} (kept first)`);
    continue;
  }
  out[key] = clean;
}

const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(new URL("../src/data/brand-logos.json", import.meta.url), JSON.stringify(sorted, null, 0) + "\n");
console.log(`wrote ${Object.keys(sorted).length} brands (${skipped} rows skipped: no name or non-Weedmaps image)`);
