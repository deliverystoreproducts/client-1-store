import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getBrands, getCatalogPage, getCategories, getDeliveryZones, getPosts } from "@/lib/store";
import { productPath } from "@/lib/product-path";

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
    u("/app", 0.5, "monthly"),
    u("/faq", 0.3, "monthly"),
    u("/returns", 0.3, "monthly"),
    u("/contact", 0.3, "monthly"),
    u("/privacy", 0.2, "yearly"),
    u("/terms", 0.2, "yearly"),
  ];

  const [categories, brands, zones, posts] = await Promise.all([getCategories(), getBrands(), getDeliveryZones(), getPosts()]);
  for (const c of categories) out.push(u(`/category/${c.id}`, 0.8, "daily"));
  for (const b of brands) out.push(u(`/brand/${b.id}`, 0.6, "weekly"));
  // GEO-01: one page per delivery city — the organic entry for "delivery <city>".
  if (zones.length > 0) out.push(u("/delivery", 0.7, "weekly"));
  for (const z of zones) out.push(u(`/delivery/${z.slug}`, 0.7, "weekly"));
  // BLOG-01: the blog index and every published post, dated by its last edit.
  if (posts.length > 0) out.push(u("/blog", 0.7, "weekly"));
  for (const p of posts) {
    out.push({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: "monthly", priority: 0.6 });
  }

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await getCatalogPage({ page, limit: PAGE });
    // BLOG-01: the slug form is the canonical product URL.
    for (const p of res.products) if (p.available) out.push(u(productPath(p), 0.6, "daily"));
    if (res.products.length < PAGE) break;
  }
  return out;
}
