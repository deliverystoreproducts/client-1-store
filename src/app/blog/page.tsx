import type { Metadata } from "next";
import Link from "next/link";
import { getPosts, getStoreProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * BLOG-01 — the blog index. Everything here is written in the dashboard
 * (Store → Blog) and only published posts arrive. The organic entry for a
 * niche that cannot buy ads: strain guides, "best X for Y in <city>",
 * how-delivery-works — the questions people Google before they order.
 */
export async function generateMetadata(): Promise<Metadata> {
  const profile = await getStoreProfile();
  return {
    title: "Blog",
    description: `Strain guides, what's good for what, and how delivery works — from ${profile.storeName}.`,
    alternates: { canonical: "/blog" },
  };
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function BlogIndexPage() {
  const posts = await getPosts();
  return (
    <article className="legal">
      <p className="faint">Blog</p>
      <h1 className="display">Guides &amp; strain notes</h1>
      {posts.length === 0 ? (
        <p>Nothing published yet — check back soon.</p>
      ) : (
        <div className="blog-grid">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="blog-card">
              {p.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverImage} alt="" loading="lazy" />
              ) : null}
              <span className="blog-meta">{when(p.publishedAt)}</span>
              <span className="blog-title">{p.title}</span>
              {p.excerpt ? <p>{p.excerpt}</p> : null}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
