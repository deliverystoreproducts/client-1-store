/**
 * Money helpers. Pure — safe on both sides of the network.
 *
 * Everything is computed in integer cents and only formatted at the edge.
 * Dollar floats accumulate error across a cart, and a storefront that shows a
 * total one cent off the one it is charged is a support ticket.
 */

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatUsd(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

export interface TaxRates {
  stateRate: number;
  exciseRate: number;
  cityRate: number;
}

export interface TaxBreakdown {
  cityCents: number;
  exciseCents: number;
  stateCents: number;
  totalCents: number;
}

/**
 * Reproduces the upstream tax cascade so the cart can show a realistic number
 * BEFORE checkout: city on the post-discount subtotal, excise on
 * (subtotal + city), state on (subtotal + city + excise). Rounded per component,
 * exactly as upstream does it.
 *
 * ⚠️ This is a MIRROR of someone else's arithmetic and can drift. It is used for
 *    display only — the charged total is always the one checkout returns.
 */
export function computeTaxes(taxableCents: number, rates: TaxRates): TaxBreakdown {
  const taxable = Math.max(0, taxableCents) / 100;
  const cityDollars = taxable * (rates.cityRate / 100);
  const exciseDollars = (taxable + cityDollars) * (rates.exciseRate / 100);
  const stateDollars = (taxable + cityDollars + exciseDollars) * (rates.stateRate / 100);
  const cityCents = Math.round(cityDollars * 100);
  const exciseCents = Math.round(exciseDollars * 100);
  const stateCents = Math.round(stateDollars * 100);
  return {
    cityCents,
    exciseCents,
    stateCents,
    totalCents: cityCents + exciseCents + stateCents,
  };
}
