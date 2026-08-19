import {
  DAILY_LIMIT_CONCENTRATE_GRAMS,
  DAILY_LIMIT_IMMATURE_PLANTS,
  DAILY_LIMIT_NON_CONCENTRATED_GRAMS,
  describeBreach,
  type DailyLimitAssessment,
} from "@/lib/compliance/limits";

/**
 * The 4 CCR § 15409 position, shown to the customer.
 *
 * Two jobs, and the second one is the unusual one:
 *
 *  1. When a measurable limit is exceeded, say so in a sentence the customer
 *     can act on, and cite the rule — being told "no" by a shop is annoying,
 *     being told "no, the state caps this at 28.5 g a day" is just a fact.
 *
 *  2. When it is NOT exceeded, do not imply a clean bill of health it has not
 *     got. The catalogue publishes no per-SKU net weights, so the running
 *     totals count only what could be read off a product name, and the
 *     concentrate inside edibles (§ 15409(e)) is not counted at all. The
 *     readout says "at least" and names the unmeasured lines rather than
 *     printing a confident number nobody should rely on.
 *
 * Hook-free so both the cart and the plain checkout can render it.
 */
export function DailyLimitReadout({
  assessment,
  className,
}: {
  assessment: DailyLimitAssessment;
  className?: string;
}) {
  const {
    exceeded,
    nonConcentratedGrams,
    concentrateGrams,
    immaturePlants,
    unmeasuredLines,
    manufacturedUnmeasuredLines,
  } = assessment;

  const counted =
    nonConcentratedGrams > 0 || concentrateGrams > 0 || immaturePlants > 0;
  const uncounted = unmeasuredLines + manufacturedUnmeasuredLines;

  if (exceeded.length > 0) {
    return (
      <div className={`notice notice-error ${className ?? ""}`} role="alert">
        <strong>Over the state daily limit.</strong>{" "}
        {exceeded.map((kind) => describeBreach(kind, assessment)).join(" ")}
      </div>
    );
  }

  if (!counted) return null;

  return (
    <div className={`notice ${className ?? ""}`}>
      <strong>State daily limit.</strong> California allows one customer{" "}
      {DAILY_LIMIT_NON_CONCENTRATED_GRAMS} g of flower, {DAILY_LIMIT_CONCENTRATE_GRAMS} g of
      concentrate and {DAILY_LIMIT_IMMATURE_PLANTS} immature plants per day (4 CCR § 15409).
      {nonConcentratedGrams > 0 ? ` This cart counts ${nonConcentratedGrams} g of flower.` : ""}
      {concentrateGrams > 0 ? ` It counts ${concentrateGrams} g of concentrate.` : ""}
      {immaturePlants > 0 ? ` It counts ${immaturePlants} immature plants.` : ""}
      {uncounted > 0
        ? ` ${uncounted} other item${uncounted === 1 ? "" : "s"} ${
            uncounted === 1 ? "does" : "do"
          } not publish a net weight, so these are minimums — we check the full total again before your order is accepted.`
        : ""}
    </div>
  );
}
