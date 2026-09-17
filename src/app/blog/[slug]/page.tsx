import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/components/Markdown";
import { getPost, getStoreProfile } from "@/lib/store";

// Same source the root layout uses for canonical/metadataBase.
const SITE_ORIGIN = (process.env.SITE_ORIGIN ?? "").replace(/\/+$/, "");

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/**
 * BLOG-01 — one post. The body is operator markdown rendered as React (no raw
 * HTML), the title/description pair comes from the SEO fields when set, and
 * BlogPosting JSON-LD names the shop as publisher.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found", robots: { index: false, follow: false } };
  const description = post.seoDescription || post.excerpt || undefined;
  return {
    title: post.seoTitle || post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.seoTitle || post.title,
      description,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      ...(post.coverImage ? { images: [{ url: post.coverImage }] } : {}),
    },
  };
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const [post, profile] = await Promise.all([getPost(slug), getStoreProfile()]);
  if (!post) notFound();

  const url = SITE_ORIGIN ? `${SITE_ORIGIN}/blog/${post.slug}` : undefined;
  return (
    <article className="legal">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          ...(post.excerpt ? { description: post.excerpt } : {}),
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          ...(post.coverImage ? { image: post.coverImage } : {}),
          ...(url ? { url, mainEntityOfPage: url } : {}),
          author: { "@type": post.authorName ? "Person" : "Organization", name: post.authorName || profile.storeName },
          publisher: { "@type": "Organization", name: profile.storeName, ...(SITE_ORIGIN ? { url: SITE_ORIGIN } : {}) },
        }}
      />
      <p className="faint">
        <Link href="/blog">Blog</Link> · {when(post.publishedAt)}
        {post.authorName ? ` · ${post.authorName}` : ""}
      </p>
      <h1 className="display">{post.title}</h1>
      {post.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImage} alt="" className="blog-cover" />
      ) : null}
      <Markdown>{post.bodyMd ?? ""}</Markdown>
      <p className="faint" style={{ marginTop: "2rem" }}>
        <Link href="/products">Browse the menu</Link> · <Link href="/delivery">Where we deliver</Link>
      </p>
    </article>
  );
}
