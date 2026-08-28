import type { Metadata } from "next";
import Link from "next/link";
import { categoryIconUrl } from "@/lib/category-art";
import { getCategories } from "@/lib/store";

/**
 * Every category, with its picture — the page behind the home rail's arrow.
 * Same picture rules as the rail: the operator's own artwork first, the
 * bundled icon matched by name as the fallback, in the operator's order.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories",
  description: "Everything on the shelf, by kind.",
};

export default async function CategoriesPage() {
  const categories = await getCategories();
  // sortOrder 0 means "never ordered by the operator" — those go LAST, so the
  // curated categories (1, 2, 3…) lead the rail instead of trailing it.
  const ordered = [...categories].sort((a, b) => (a.sortOrder || 9999) - (b.sortOrder || 9999));

  return (
    <section>
      <div className="wm-head">
        <h1 className="wm-title">Categories</h1>
        {categories.length > 0 ? (
          <span className="faint num">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
          </span>
        ) : null}
      </div>

      {categories.length === 0 ? (
        <div className="empty">
          <h2>No categories yet</h2>
          <p className="mt-2">
            <Link className="btn btn-ghost" href="/products">
              Browse everything instead
            </Link>
          </p>
        </div>
      ) : (
        <ul className="cat-grid">
          {ordered.map((c) => {
            const art = c.image ?? categoryIconUrl(c.name);
            return (
              <li key={c.id}>
                <Link href={`/category/${c.id}`} className="cat-card">
                  <span className="cat-card-art" data-empty={!art || undefined} aria-hidden>
                    {art ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={art} alt="" loading="lazy" />
                    ) : null}
                  </span>
                  <span className="cat-card-name">{c.name}</span>
                  <span className="cat-card-n num">
                    {c.productCount} item{c.productCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
