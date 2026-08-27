import type { Metadata } from "next";
import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Prop65WarningBox, VapeDisposalBox } from "@/components/ComplianceNotices";
import { ProductCard } from "@/components/ProductCard";
import {
  POTENCY_LABEL_QUALIFIER,
  reportCopyFindings,
  reviewProductCopy,
} from "@/lib/compliance/copy-rules";
import { classifyConsumptionRoute, prop65WarningFor } from "@/lib/compliance/prop65";
import {
  findProhibitedDisposalLanguage,
  redactProhibitedDisposalLanguage,
  vapeDisposalMessagesFor,
} from "@/lib/compliance/vape";
import { formatUsd } from "@/lib/money";
import { getProductDetail, getStoreProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getProductDetail(Number(id));
  return { title: detail?.product.name ?? "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) notFound();

  const [detail, profile] = await Promise.all([getProductDetail(numeric), getStoreProfile()]);
  if (!detail) notFound();

  const { product, related } = detail;
  const onSale = product.salePrice != null && product.salePrice < product.price;

  // ══════════════════════════════════════════════════════════════════════
  //  THIS IS THE COMPLIANCE-CRITICAL PAGE. Two MUSTs live here and nowhere
  //  else on the site:
  //
  //   1. The Prop 65 cannabis warning — 27 CCR § 25602(b)(1)(A) says "a
  //      warning on the product display page". This one. A footer copy would
  //      earn nothing (§ 25602(b)(1)(C) forecloses it) and there is none.
  //      Rendered as INLINE TEXT, so the exact-link-text rule in (B) — which
  //      demands the word `WARNING`, not "Prop 65" or "Learn more" — never
  //      has to be relied on.
  //
  //   2. The vape disposal message — B&P § 26152.1 binds ADVERTISING AND
  //      MARKETING of a cartridge or integrated vaporizer, and this page is
  //      marketing. Verbatim; do not paraphrase.
  //
  //  Everything is computed on the server. Nothing about the classification
  //  reaches the browser except the rendered warning.
  // ══════════════════════════════════════════════════════════════════════
  const prop65 = prop65WarningFor(product);
  const vapeMessages = vapeDisposalMessagesFor(product);

  // Advisory copy review: B&P § 26152(b)/§ 26154 and 4 CCR § 15040/§ 15040.1
  // need a human. Findings go to the SERVER log for the operator; the page is
  // not censored and nothing is shown to the customer. See copy-rules.ts.
  reportCopyFindings(product.id, product.name, reviewProductCopy(product));
  if (classifyConsumptionRoute(product) == null) {
    console.warn(
      `[compliance] product ${product.id} "${product.name}" has no readable consumption route; ` +
        `Prop 65 fell back to the configured default. Tag it (smoked / ingested / vaped_dabbed / dermal) in the catalogue.`,
    );
  }

  if (vapeMessages.length > 1) {
    console.warn(
      `[compliance] product ${product.id} "${product.name}" is vape hardware but the catalogue does not say whether it is a cartridge or an integrated vaporizer, so BOTH B&P § 26152.1(a) messages are shown. Tag it \`vape:cartridge\` or \`vape:integrated\` for a single clean message.`,
    );
  }

  // § 26152.1(b): marketing of these products "shall not indicate that [they are]
  // disposable nor imply that [they] may be thrown in the trash or recycling
  // streams." Supplier descriptions say exactly that, constantly. This is a
  // guard, not a note — the offending sentence is withheld from the page.
  const copy =
    vapeMessages.length > 0
      ? redactProhibitedDisposalLanguage(product.description)
      : { text: product.description, removed: [] as string[] };
  if (copy.removed.length > 0) {
    console.error(
      `[compliance] product ${product.id} "${product.name}" — B&P § 26152.1(b): withheld ${copy.removed.length} sentence(s) from the description. Fix the catalogue copy: ${copy.removed.join(" | ")}`,
    );
  }
  // A NAME and a CATEGORY cannot be redacted — the name is the identity of the
  // thing being bought, and the category is a navigation label the whole
  // catalogue shares. Silently rewriting either would mis-describe the
  // customer's order. Both are reported instead; fixing them is a catalogue
  // task and it is on the operator checklist in README.md. (This catalogue
  // currently ships a category literally named "Disposable", which is exactly
  // what § 26152.1(b) forbids.)
  if (vapeMessages.length > 0) {
    const nameHits = findProhibitedDisposalLanguage(product.name);
    if (nameHits.length > 0) {
      console.error(
        `[compliance] product ${product.id} — B&P § 26152.1(b): the PRODUCT NAME "${product.name}" indicates the item is disposable (${nameHits.join(", ")}). Rename it in the catalogue.`,
      );
    }
    const categoryName = product.category?.name ?? "";
    const categoryHits = findProhibitedDisposalLanguage(categoryName);
    if (categoryHits.length > 0) {
      console.error(
        `[compliance] product ${product.id} — B&P § 26152.1(b): the CATEGORY "${categoryName}" indicates these items are disposable (${categoryHits.join(", ")}). Rename the category in the catalogue — it labels every SKU under it.`,
      );
    }
  }

  // THC/CBD/genetics are shown only when the store has that display switched on
  // — some jurisdictions and some operators do not want potency on a web page.
  const showCannabinoids =
    profile.showCannabinoids &&
    (product.thcPercentage != null || product.cbdPercentage != null || !!product.genetics);

  return (
    <>
      <Link className="crumb" href="/" data-reveal style={{ "--i": 0 } as React.CSSProperties}>
        ← Back to the shelf
      </Link>

      {/* Masthead: the name gets the full measure of the page before the layout
          splits. Product photography rarely survives type sitting on top of it,
          so the composition breaks the column instead of overlapping it. */}
      <header className="detail-masthead">
        <span className="eyebrow" data-reveal style={{ "--i": 1 } as React.CSSProperties}>
          {product.brand?.name ?? (product.category?.name || "Catalogue")}
        </span>
        <h1
          className="display detail-title"
          data-reveal
          style={{ "--i": 2 } as React.CSSProperties}
        >
          {product.name}
        </h1>
      </header>

      <div className="detail">
        <div className="detail-media" data-reveal style={{ "--i": 3 } as React.CSSProperties}>
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} />
          ) : (
            <MediaSlot label="Product photo" where="Catalog → the product" />
          )}
        </div>

        <div data-reveal style={{ "--i": 4 } as React.CSSProperties}>
          <div className="detail-price">
            <span className="price">{formatUsd(product.unitPrice)}</span>
            {onSale ? (
              <>
                <span className="price-was">{formatUsd(product.price)}</span>
                <span className="tag tag-sale">On sale</span>
              </>
            ) : null}
            {!product.available ? <span className="tag">Sold out</span> : null}
          </div>

          <div className="detail-buy">
            <AddToCartButton productId={product.id} disabled={!product.available} />
          </div>

          {/* Above the description, not below it: 27 CCR § 25602(b) rules out a
              warning the purchaser has to go looking for, and B&P § 26152.1
              wants the disposal message "prominently … in a clear and legible
              fashion". Both sit in the buying column, at body size, at full
              contrast — see the `.warn` block in globals.css. */}
          {prop65 ? (
            <div className="detail-warnings">
              <Prop65WarningBox warning={prop65} />
            </div>
          ) : null}

          {vapeMessages.length > 0 ? (
            <div className="detail-warnings">
              {vapeMessages.map((m) => (
                <VapeDisposalBox key={m.hardware} message={m} />
              ))}
            </div>
          ) : null}

          {copy.text ? <p className="detail-copy">{copy.text}</p> : null}

          {showCannabinoids ? (
            <table className="spec">
              <caption className="sr-only">Product specification</caption>
              <tbody>
                {product.genetics ? (
                  <tr>
                    <th scope="row">Genetics</th>
                    <td>{product.genetics}</td>
                  </tr>
                ) : null}
                {product.thcPercentage != null ? (
                  <tr>
                    <th scope="row">THC</th>
                    <td>{product.thcPercentage}%</td>
                  </tr>
                ) : null}
                {product.cbdPercentage != null ? (
                  <tr>
                    <th scope="row">CBD</th>
                    <td>{product.cbdPercentage}%</td>
                  </tr>
                ) : null}
                {product.category ? (
                  <tr>
                    <th scope="row">Category</th>
                    <td>{product.category.name}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}

          {/* B&P § 26152(b): no advertising statement inconsistent with the
              product's own label. Batch potency varies, so the page qualifies
              the figure instead of asserting a precision the catalogue cannot
              guarantee against the package actually delivered. */}
          {showCannabinoids &&
          (product.thcPercentage != null || product.cbdPercentage != null) ? (
            <p className="faint mt-1">{POTENCY_LABEL_QUALIFIER}</p>
          ) : null}

          {product.tags.length > 0 ? (
            <div className="row mt-2">
              {product.tags.slice(0, 8).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          <p className="faint mt-3">
            Pay cash when your order arrives. Valid {profile.minAge}+ ID required at the door.
          </p>

          {/* The follow bar, phones only. sticky+bottom only clamps an element
              whose flow position is still BELOW the viewport — the buy button
              at the TOP of this column could never engage (audit B1). Last
              child of the column, so it rides the screen edge through the
              description, warnings and specs, then parks at the column's end
              without ever covering the footer. */}
          <div className="detail-follow">
            <span className="price num">{formatUsd(product.unitPrice)}</span>
            <AddToCartButton productId={product.id} disabled={!product.available} small />
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-4">
          <div className="section-head">
            <span className="eyebrow">Also on the shelf</span>
            <hr />
          </div>
          <div className="catalogue">
            {related.slice(0, 8).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i + 1} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
