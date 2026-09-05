import type { MetadataRoute } from "next";

/**
 * SEO-01. Mirrors the layout's robots meta: SEO_INDEX=on opens the site,
 * anything else closes it — one switch, one behaviour. The private surfaces
 * are never crawled either way.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = (process.env.SITE_ORIGIN || "").trim().replace(/\/$/, "");
  const open = process.env.SEO_INDEX === "on";
  return {
    rules: open
      ? [{ userAgent: "*", allow: "/", disallow: ["/account", "/cart", "/checkout", "/signin", "/track", "/age", "/api/"] }]
      : [{ userAgent: "*", disallow: "/" }],
    ...(open && origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
