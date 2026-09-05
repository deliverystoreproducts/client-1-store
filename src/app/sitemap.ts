import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getBrands, getCatalogPage, getCategories } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Catalogue pages are bounded so a runaway shop cannot make this endpoint crawl forever. */
const PAGE = 100;
const MAX_PAGES = 50;

async function origin(): Promise<string> {
  const configured = (process.env.SITE_ORIGIN || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost";
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

/**
 * SEO-01. Everything a crawler may index: the static pages, every category
 * and brand, and every available product. Private surfaces are not here and
 * are disallowed in robots.txt. Rebuilt on each request (the catalogue moves),
 * cached at the edge by the Cache-Control set in next.config.ts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await origin();
  const now = new Date();
  const u = (p: string, priority = 0.5, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "daily") =>
    ({ url: `${base}${p}`, lastModified: now, changeFrequency, priority });

  const out: MetadataRoute.Sitemap = [
    u("/", 1, "daily"),
    u("/products", 0.9, "daily"),
    u("/categories", 0.7, "weekly"),
    u("/brands", 0.7, "weekly"),
    u("/deals", 0.8, "daily"),
    u("/faq", 0.3, "monthly"),
    u("/returns", 0.3, "monthly"),
    u("/contact", 0.3, "monthly"),
    u("/privacy", 0.2, "yearly"),
    u("/terms", 0.2, "yearly"),
  ];

  const [categories, brands] = await Promise.all([getCategories(), getBrands()]);
  for (const c of categories) out.push(u(`/category/${c.id}`, 0.8, "daily"));
  for (const b of brands) out.push(u(`/brand/${b.id}`, 0.6, "weekly"));

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await getCatalogPage({ page, limit: PAGE });
    for (const p of res.products) if (p.available) out.push(u(`/product/${p.id}`, 0.6, "daily"));
    if (res.products.length < PAGE) break;
  }
  return out;
}
