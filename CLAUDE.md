# CLAUDE.md — YB_storefront

The customer-facing storefront. **This repo is the base for every client site**
— it is mirrored to per-client repos (currently `deliverystoreproducts/client-1-store`),
so a change here ships to all of them.

Read `README.md` before working on anything. It explains the architecture and
why it is shaped the way it is; most mistakes here come from not knowing that.

## What this app is, and the invariant that defines it

A standalone Next.js app that reads the catalogue from, and sends orders to, the
Kamui platform's `/api/store/v1` surface. It has **no database**.

**The browser only ever talks to this app.** It never sees the commerce API's
hostname, its key, its tenant id, its field names or its error messages. This is
not tidiness — it is the whole threat model, and three separate things enforce
it:

- `src/lib/kamui/*` imports `server-only`, so a `"use client"` graph that
  reaches it **fails the build** instead of shipping the key to a browser.
- A strict CSP in `next.config.ts` (`connect-src 'self'`) makes a third-party
  request impossible at runtime.
- `/api/img/[...path]` proxies every image through this server against a host
  allow-list, so a visitor's IP never reaches a supplier CDN.

Anything that would add a third-party browser request — an analytics pixel, a
maps SDK, a CDN font — breaks the invariant AND falsifies `/privacy`, which
states as fact that there are none. If a feature seems to need one, find the
server-side shape instead (the tracking map is an `<img>` of a server-rendered
PNG for exactly this reason).

## RULE: the mapper is the only wire→browser crossing

Everything from `src/lib/kamui/types.ts` reaches the UI through
`src/lib/kamui/map.ts`, which is an **allow-list** — every mapper names its
fields explicitly and never spreads. Do not widen a component to take a wire
type.

This is load-bearing, not stylistic. It is what stops upstream rows leaking:
`/coupon/mine` returns raw `Coupon` records whose `note` reads
`"Referral reward: <name> (<phone>) ordered"` — a DIFFERENT customer's name and
phone. `toPublicCoupon` drops it and derives provenance from `source` instead.
`map.test.ts` asserts the stripped output contains neither name nor phone.

Adding a field to the UI means adding it to `public-types.ts` AND mapping it.
If you find yourself reaching for the wire type in a component, that is the
signal you are about to leak something.

## RULE: never compute money the platform will recompute

The platform prices carts, applies coupons and runs the deal engine at checkout.
This app displays; it does not calculate. Two engines drift, and the failure
mode is a customer shown one price and charged another.

Concretely: deals render as merchandising with no "you save $X"; the promo code
is a REAL coupon validated upstream before it is applied; `PricedCart.estimatedTotal`
is documented as an upper bound, not a quote.

## RULE: an absent thing renders nothing; it never renders empty

Every operator-controlled surface — promo bar, the three promises, delivery
areas, deal artwork, category tiles — returns `null` when unset. An empty
coloured band, a promise card with no promise, or a "we deliver to…" panel with
no cities all tell a customer the shop is broken, and broken reads as
untrustworthy on a site about to ask for an address and a date of birth.

`NEXT_PUBLIC_MEDIA_HINTS=on` turns empty media slots into labelled scaffolding
naming the dashboard screen that fills each one. **It must be off before
customers see the site.**

## RULE: compliance code is not refactorable on taste

`src/lib/compliance/` and `src/lib/identity/` implement statute, and
`COMPLIANCE.md` records why each piece is shaped the way it is. Before changing
any of it, read the comment above it — most carry the citation and the measured
reason.

Two that get "helpfully" broken:

- **No Prop 65 warning in the footer.** 27 CCR § 25602(b)(1)(C): a warning is
  not prominently displayed if the purchaser must search for it in the general
  content of the site. It belongs on the product page, and it is there.
- **The age gate is enforced at the ROUTING layer** (`src/proxy.ts`), not in a
  layout. A layout that renders a gate instead of children still serialises the
  whole product list into the RSC flight payload — measured at 62KB vs 11KB.
  A gate that only wins in the pixels is not a control.

The gate is an **allow-list**: everything not in `OPEN_ROUTES` is rewritten to
`/age`. That default is what makes adding a page safe. `open-routes.test.ts`
asserts every shelf route stays behind it — widening that list is a decision,
not a convenience.

## Configuration lives in the dashboard, not in this repo

Store name, licence, hero media, promo bar, the three promises, category and
brand artwork are **tenant settings** on the platform, delivered via
`/api/store/v1/tenant-profile`. They were env vars once; that meant a redeploy
per typo and a second copy per storefront.

So: before hardcoding anything client-specific, check whether it belongs on the
tenant profile. Per-client values in this repo become a fork, and a fork means
every fix has to be applied N times.

## Mirroring to client repos — RULE: mirror, never fork

Client repos are the SAME code with different env vars. To sync:

```bash
git checkout -B client-sync main
git merge -s ours --allow-unrelated-histories <client>/main -m "Sync <client> to YB main"
git push <client> HEAD:main
```

`-s ours` keeps this repo's tree and records the client's history as a parent,
which is what lets the push fast-forward. **Verify the tree is unchanged before
pushing** — `git rev-parse HEAD^{tree}` must equal `main^{tree}`.

Never let a client repo diverge. The moment a fix has to be applied twice by
hand you are in the per-client-fork model that the platform migration exists to
end.

## Gate before you push

CI in this org executes **zero steps** — jobs die in ~4s on "recent account
payments have failed". A red check is not evidence of anything.

```bash
pnpm typecheck && pnpm test && pnpm build
```

All three, locally, before pushing — and say in the PR that CI did not run.
Tests cover the parts where being wrong is expensive and silent: the AAMVA
parse, a real-WASM barcode decode, the mapper's leak assertions, and the
age-gate allow-list.

## Conventions

- Server components by default. A `"use client"` file cannot import
  `src/lib/kamui/*` — that is enforced, not a convention.
- Filters and browse state live in the **URL**, not component state, so every
  view is linkable and works before JavaScript loads.
- Plain `<img>`, never `next/image`: the optimizer would add a second fetch
  layer and its own URL scheme on top of a proxy that exists precisely to
  control image traffic.
- Comments explain WHY, and cite the statute, the measurement or the incident
  that produced the rule. A comment that only restates the code is noise; one
  that records why a tempting change is wrong is what stops it being made again.
