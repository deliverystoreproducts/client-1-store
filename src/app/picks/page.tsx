import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getProductsByIds } from "@/lib/store";
import { parsePickIds } from "@/lib/picks";

/**
 * "These ones": the exact products a link names, in the link's order.
 *
 * It exists for the shop's email campaigns. An email shows six products and a
 * button; the button has to open a page with THOSE six, not the whole shelf, or
 * the customer has to find them again. `/picks?ids=300004679,300004626`.
 *
 * The heading is fixed text on purpose. The link is a URL anyone can write, and
 * a title taken from it would let a stranger put their own words on the shop's
 * domain. Ids are the only input, they are validated in lib/picks, and the
 * products come back priced by the same upstream call as the rest of the shop.
 *
 * Not indexed: the page is a view over the catalogue with infinitely many URLs,
 * and every product on it already has its own indexed page.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Picked for you",
  description: "A short list of products picked out from the menu.",
  robots: { index: false, follow: true },
};

export default async function PicksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ids = parsePickIds((await searchParams).ids);
  const { products, unavailable } = await getProductsByIds(ids);

  return (
    <section>
      <div className="wm-head">
        <h1 className="wm-title">Picked for you</h1>
        {products.length > 0 ? (
          <span className="faint num">
            {products.length} item{products.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="empty">
          <h2>{unavailable ? "The menu is not loading right now" : "These are no longer on the shelf"}</h2>
          <p className="muted">
            {unavailable
              ? "Give it a minute and open the link again."
              : "The products in this link have sold out or left the menu. There is plenty more."}
          </p>
          <p className="mt-2">
            <Link className="btn btn-ghost" href="/products">
              Browse everything
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="catalogue">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i + 1} />
            ))}
          </div>
          {products.length < ids.length ? (
            <p className="small muted mt-3">
              {ids.length - products.length} of the products in this link {ids.length - products.length === 1 ? "has" : "have"} sold out since it was sent.
            </p>
          ) : null}
          <p className="mt-3">
            <Link className="btn btn-ghost" href="/products">
              See the full menu
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
