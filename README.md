# YB Storefront

A public webstore for a licensed cannabis dispensary: browse, cart, phone sign-in,
checkout, and order tracking. Payment is **cash on delivery** — the driver settles
at the door — so there is no card form anywhere in this app.

It is a standalone Next.js application. It owns its own domain, its own look, and
its own server. It reads the catalog from, and sends orders to, a commerce API
that belongs to the dispensary's back-office platform.

---

## 1. Architecture, and why it is shaped this way

```
   browser  ──HTTPS──▶  THIS APP (Next.js server)  ──HTTPS + API key──▶  commerce API
             ▲                     │
             └── /api/img/… ───────┘   images streamed through, never hot-linked
```

**The browser only ever talks to this app.** It never sees the commerce API's
hostname, its API key, its tenant identifier, its field names, or its error
messages. Three separate reasons make that non-negotiable rather than tidy:

1. **There is no CORS on the commerce API's store surface.** Its middleware adds
   CORS headers only for the driver and manager mobile APIs. A browser request
   would be blocked outright. Every call therefore *has* to be server-side — and
   once that is true, there is no reason for the key to exist in the browser at
   all.

2. **The API key is a full-privilege credential.** One key grants: read the whole
   catalog, place orders, redeem coupons, and **send SMS on the store's account**.
   Leaked, it is both a data problem and a bill.

3. **The relationship is nobody's business.** Which platform powers the back
   office is commercial information. Hostnames, image URLs, response headers,
   error strings and source maps are all places it escapes by accident, so all
   five are handled explicitly (see §6).

### Layers

| Layer | Where | Job |
|---|---|---|
| API client | `src/lib/kamui/` | The *only* code that knows the base URL and holds the key. Typed calls, timeouts, typed errors. Marked `server-only` — importing it from a client component fails the build. |
| Wire → public mapping | `src/lib/kamui/map.ts` | Allow-listed translation from upstream DTOs to our own shapes. Rewrites image paths. Drops tenant identifiers. |
| Read model | `src/lib/store.ts` | What pages call. Decides what a failure looks like on a page (empty shelf + a logged error, never a stack trace). |
| BFF routes | `src/app/api/` | What the browser calls. Same-origin only, cookie custody, error translation. |
| Pages | `src/app/` | Server-rendered; interactive bits are small client components. |

### Directory map

```
src/
  app/
    layout.tsx                 age gate + shell (fails closed when unconfigured)
    page.tsx                   home / browse / search / category filter
    product/[id]/page.tsx      product detail — the compliance-critical page (§3.4)
    cart/, checkout/, checkout/confirmation/
    signin/, account/
    track/, track/[token]/
    privacy/, terms/           legal notices; reachable WITHOUT the age gate (§3.4)
    unavailable/               the "we're closed" fail-closed page
    error.tsx, global-error.tsx, not-found.tsx
    api/                       ← the BFF. See §4.
  components/                  client components (cart, sign-in flow, views)
    ComplianceNotices.tsx      Prop 65 + vape-disposal boxes (hook-free, both sides)
    DailyLimitReadout.tsx      the 4 CCR §15409 position, honestly stated
  lib/
    kamui/                     SERVER ONLY: env, client, types, errors, images, map
    compliance/                prop65, vape, limits, tax, copy-rules — see §3.4
    public-types.ts            the shapes the browser is allowed to see
    store.ts                   server read model
    session.ts                 httpOnly cookie custody
    open-routes.ts             the two routes the age gate lets through
    csrf.ts, rate-limit.ts, money.ts, phone.ts, http.ts, site.ts
    client-api.ts              browser → our own /api (relative URLs only)
```

---

## 2. Quick start — run it locally against the real store

Prerequisites: **Node 22+** and **pnpm 10+** (`corepack enable` gives you pnpm).

```bash
git clone git@github.com:Hovakimyan/YB_storefront.git
cd YB_storefront
pnpm install
cp .env.example .env.local
```

Open `.env.local` and set the only two values that matter:

```bash
# The commerce API. The store endpoints live on the Kamui dashboard's own origin.
KAMUI_API_BASE_URL=https://app.kamui.digital

# This store's key — see "Getting the API key" below. Shown once, at creation.
KAMUI_STORE_API_KEY=sk_...
```

Then:

```bash
pnpm dev      # → http://localhost:3000
```

Other scripts:

```bash
pnpm build       # production build (output: "standalone")
pnpm start       # serve that build the way the container does — see §7
pnpm typecheck   # tsc --noEmit
```

### Getting the API key

The store mints its own, in its own back office: sign in at
**https://app.kamui.digital** as the store owner (a superadmin can do it too),
then **Settings → API keys** (`/settings/api-keys`) → create a key with the
**`store`** scope.

- **The value is shown once.** If it is lost, mint a new one — it cannot be read back.
- **The key carries the tenant.** There is no store id to configure anywhere; the
  server resolves the tenant from the key alone.
- If the business runs **several retail brands** from one back office, mint the key
  for the right brand. A brand-scoped key decides every price this storefront
  shows and charges, and there is deliberately no per-request override.

Everything else is optional and annotated in `.env.example` — read that file
rather than duplicating it here.

### Check it's really connected

Working looks like this: the age gate appears, and once you pass it the home page
shows **your actual products**, with their images and prices, plus the category
chips from your catalog. Anything else means the app is running but not talking
to the backend.

To test the key by itself, with this app out of the picture:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $KAMUI_STORE_API_KEY" \
  https://app.kamui.digital/api/store/v1/products
```

| Code | Meaning |
|---|---|
| `200` | The key works. |
| `401` | Wrong, mistyped, or revoked key. |
| `403` | Real key, but it does not carry the `store` scope. |

### If something doesn't work

| Symptom | Cause | Fix |
|---|---|---|
| Every page is **"We're temporarily closed"** | The server has no upstream config at all — one of the two vars is missing or `KAMUI_API_BASE_URL` isn't a valid absolute URL. | Check `.env.local`, then **restart `pnpm dev`** — env changes are not hot-reloaded. |
| **"The shop is briefly unavailable"** on the home page | The app reached for the catalog and the call failed: bad key, wrong base URL, or the backend is down. | Run the curl above. The real reason is in the terminal as an `[upstream] … -> <code>` line — never on the page, by design (§6.6). |
| curl says **401** | Key is wrong or has been revoked. | Mint a new one; `.env.local` values are pasted, so check for a trailing space or a truncated copy. |
| curl says **403** | Key exists but lacks the `store` scope. | Mint a new key with the `store` scope; scopes cannot be added to an existing key. |
| **"This store hasn't published any products yet"** and curl says 200 | The key is fine — the tenant genuinely has no active products. | Publish/activate products in the dashboard. |
| Every product shows a **placeholder image** | Images route through `/api/img/*`, which allow-lists exactly the two upstream path shapes. If upstream changes that convention, every URL maps to `null`. | `curl -i http://localhost:3000/api/img/<filename>`; if it 404s, see §8.4. |
| **Sign-in never sticks** — the code is accepted, then you're signed out | You are not on `localhost`. The session cookie is `__Host-` prefixed and `Secure` with no dev exception (`src/lib/session.ts`), so any plain-http origin that is *not* localhost has the cookie silently dropped by the browser. | Use `http://localhost:3000`. On a LAN IP or a shared dev box you need real TLS — a tunnel (`cloudflared`, `ngrok`) in front is enough. Set `SITE_ORIGIN` to the tunnel's URL so the CSRF check accepts it. |
| **No SMS arrives** | Nothing this app controls — the backend sends it on the key's authority. | Check the store's SMS configuration in the dashboard. |
| `429` on sign-in | The local rate limiter: 8 sends per client and 4 per phone number per 10 minutes (`src/app/api/auth/send-code/route.ts`). | Wait it out, or restart the dev server — the limiter is in-process memory. |

**Why localhost specifically works:** Chrome, Firefox and Safari all treat
`http://localhost` as a secure context, so they accept a `Secure` cookie there.
No other plain-http origin gets that exemption.

---

## 3. Configuration

Full annotations live in `.env.example`. The short version:

| Variable | Secret? | Purpose |
|---|---|---|
| `KAMUI_API_BASE_URL` | **secret-ish** — server only | Origin of the commerce API, no trailing slash. Must be `https` in production (loopback is exempt, for smoke tests). |
| `KAMUI_STORE_API_KEY` | **SECRET** | The store-scoped API key. Carries the tenant by itself. |
| `KAMUI_API_TIMEOUT_MS` | server only | Per-request timeout. Default 10000, clamped 1000–60000. |
| `SITE_ORIGIN` | server only | Optional. The public origin of this site, needed for the CSRF check only when a reverse proxy rewrites `Host`. |
| `NEXT_PUBLIC_SITE_NAME` | **public** | Store name in the header, titles, age gate. Falls back to the name configured upstream. |
| `NEXT_PUBLIC_SITE_TAGLINE` | **public** | Hero subheading. |
| `NEXT_PUBLIC_MIN_AGE` | **public** | Age *threshold*. The gate itself is unconditional — see § 3.1. |
| `NEXT_PUBLIC_LICENSE_NUMBER` | **public** | ⚠️ **Required before launch.** The retailer's CA cannabis licence number. See § 3.2. |
| `NEXT_PUBLIC_LEGAL_ENTITY_NAME` | **public** | ⚠️ **Required before launch.** Exact legal entity name as registered with the DCC. See § 3.4. |
| `NEXT_PUBLIC_POLICY_EFFECTIVE_DATE` | **public** | ⚠️ **Required before launch.** Effective date printed on `/privacy` and `/terms` — B&P § 22575(b)(4). |
| `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` | **public** | ⚠️ **Required before launch.** Where privacy requests land. |
| `NEXT_PUBLIC_PRIVACY_CONTACT_ADDRESS` | **public** | ⚠️ **Required before launch.** Postal address in the privacy policy. |
| `NEXT_PUBLIC_SAFER_USE_BROCHURE_URL` | **public** | ⚠️ **Required before launch.** Self-hosted path to the DCC SB 540 brochure — B&P § 26070.3(b). |
| `NEXT_PUBLIC_LOCAL_PERMIT_NUMBER` | **public** | Optional. Local jurisdiction permit number, printed beside the state licence. |
| `NEXT_PUBLIC_PROP65_WARNINGS` | **public** | Optional. `exempt` switches Prop 65 warnings OFF under the HSC § 25249.11(b) sub-10-employee exemption. **Defaults to ON.** |
| `NEXT_PUBLIC_PROP65_FALLBACK_ROUTE` | **public** | Optional. Warning to use for an unclassifiable product. Default `smoked` (the most protective). |

> ### ⚠️ Never put the API key in a `NEXT_PUBLIC_*` variable
>
> Anything named `NEXT_PUBLIC_*` is **inlined into browser JavaScript at build
> time**. It is not "hidden in the bundle" — it is in view-source, permanently,
> for every visitor, in every build artifact you ever deploy.
>
> `KAMUI_STORE_API_KEY` grants full catalog read, order placement, coupon
> redemption and **SMS sending** for this dispensary. Renaming it to
> `NEXT_PUBLIC_KAMUI_STORE_API_KEY` would hand all of that to anyone who opens
> devtools.
>
> The same goes for `KAMUI_API_BASE_URL`: publishing it defeats the entire point
> of the proxy layer.
>
> This is guarded, not just documented — `src/lib/kamui/*` imports
> [`server-only`](https://www.npmjs.com/package/server-only), so any client
> component that reaches those modules **fails the build** instead of shipping
> the key. Do not remove those imports.

### Where the API key comes from

The dispensary mints it themselves, in their own back-office dashboard:

**Settings → API keys → create a key with the `store` scope.**
(`/settings/api-keys` in the dashboard.)

Notes:

- **The key carries the tenant.** There is no separate tenant/store id to send,
  and adding one would do nothing — the server resolves the tenant *from the key*.
- The key is shown once, at creation. Store it in the host's secret manager, not
  in a file.
- If the dispensary runs several retail brands from one back office, the key may
  also be **brand-scoped**, which makes every price this storefront shows and
  charges resolve to that brand. Mint the key for the right brand; there is no
  per-request way to override it, by design.
- To rotate: mint the new key, deploy the new value, then revoke the old one.

---

### 3.1 The age gate is unconditional

The gate is a legal control, not a feature flag, and it is enforced in
`src/proxy.ts` **before any page code runs**: without the confirmation cookie
every navigable URL is rewritten to `/age`, so the catalog page function is never
invoked.

That placement is load-bearing. A layout that merely renders the gate *instead
of* the store hides it visually while the App Router still serialises the page
segment into the RSC flight payload inlined in the HTML — measured on this app,
an un-gated request returned the gate on screen and all 24 products, with names,
prices and URLs, inside `<script>self.__next_f.push(...)</script>` (62 KB vs the
11 KB it returns now). View-source defeated the gate completely.

The upstream tenant profile carries an `ageGate` boolean. It is deliberately
**not mapped** into `PublicStoreProfile` (`src/lib/kamui/map.ts`), so a dashboard
toggle cannot reach this code. Only `minAge` crosses, defaulting to 21 in the
mapper and in the fail-safe fallback profile.

**Two routes are exempt, and neither is a loophole: `/privacy` and `/terms`**
(`src/lib/open-routes.ts`). CalOPPA requires the privacy policy to be
conspicuously posted, and the gate is itself a point of collection — it sets a
cookie before anyone has read anything — so putting the policy behind it makes
the link on the gate lead back to the gate. Both pages are static legal prose
with no catalogue data in them, so the thing the gate protects is not in play.
The proxy signals the exemption to the layout with a request header it
**deletes from every inbound request first**, so a client cannot claim it for
`/product/1`; verified by replaying the header against a product URL and getting
the gate.

### 3.2 The licence number (required before launch)

California **B&P § 26151(a)** requires all advertising and marketing to
"accurately and legibly identify the licensee responsible for its content, by
adding, at a minimum, the licensee's license number." A retailer's own webstore
is marketing, so the number is printed in the site footer and on the order
confirmation (the customer's receipt).

**The operator must supply it.** Enter it in the dashboard (Settings →
Business) — or set `NEXT_PUBLIC_LICENSE_NUMBER` as the env fallback — to the
retailer's real number. There is no default and there must never be one — a
fabricated licence number on a cannabis storefront is worse than a missing one.
Left unset in both places, the footer and receipt print a red `Licence number NOT SET`
placeholder so the omission cannot ship unnoticed.

### 3.3 Delivery hours

**4 CCR § 15403** restricts sale and delivery of cannabis goods to
**06:00–22:00 Pacific**. `src/lib/hours.ts` computes the window against
`America/Los_Angeles`, never the visitor's clock.

Ordering is **not** blocked outside the window: whether an order may lawfully be
*placed* outside it for fulfilment inside it is genuinely unresolved, and that
call belongs to the operator's counsel, not to this code. What the storefront
does is refuse to take an order silently — the window is stated in the hero
plaque and the footer, and both the home page and checkout say plainly that an
out-of-hours order goes out from 6:00 AM. If the operator's counsel decides
placement must be blocked, `isWithinDeliveryWindow()` is the one function to gate
on.

### 3.4 California compliance — where each rule lives

**`COMPLIANCE.md` in this repo is the source of truth.** It is desk research, not
legal advice, and it says so; a California cannabis attorney must review it and
the finished site before launch. This section is only the map from that document
to this code.

`src/lib/compliance/` holds the rules. Each file carries the statute, the
verbatim text where wording is mandated, and — where the catalogue cannot supply
what a rule needs — a declared gap rather than a fabricated number.

| File | Rule | What it does |
|---|---|---|
| `prop65.ts` | 27 CCR § 25602(b), §§ 25607.39/.41/.43/.45 | The four cannabis-tailored warnings, verbatim, plus consumption-route classification and the HSC § 25249.11(b) exemption switch. |
| `vape.ts` | B&P § 26152.1 | The two disposal sentences, verbatim; classifies cartridge vs integrated vaporizer; **enforces (b)** by withholding supplier copy that calls these products disposable. |
| `limits.ts` | 4 CCR § 15409, HSC § 11006.5 | Daily quantity limits, with the concentrate definition as a **dated rule** (it changed on 1 Jan 2026 and changes again 1 Jan 2028). |
| `tax.ts` | R&TC § 34011.2 | Excise-rate history and a drift check; the receipt labels that keep the excise tax **separately stated**. |
| `copy-rules.ts` | B&P § 26152(b), § 26154, 4 CCR § 15040, § 15040.1 | Reviews product copy and logs findings server-side. Reviewer, not censor — three of those four rules need a human. |

Where the mandated warnings appear:

- **Prop 65 — on the product display page, inline** (`/product/[id]`). That is
  27 CCR § 25602(b)(1)(A). **There is deliberately no Prop 65 warning in the
  footer**: § 25602(b)(1)(C) says a warning is not prominently displayed if the
  purchaser must search for it in the site's general content, so a footer copy
  earns nothing. Because the text is inline, the exact-link-text rule in (B) —
  which demands the word `WARNING`, not "Prop 65" — never has to be relied on.
  The cart and checkout carry the same warnings for everything in the basket,
  which is the independent (C) surface.
- **Vape disposal — on the PDP for every cartridge and integrated vaporizer**,
  and in the basket. Verbatim, including the word "collection" that the DCC's own
  summary page drops.
- **The SB 540 safer-use brochure — at checkout, above the place-order button**
  (B&P § 26070.3(b)). Self-hosted; see `NEXT_PUBLIC_SAFER_USE_BROCHURE_URL`.
- **`/privacy` and `/terms` are reachable WITHOUT answering the age gate**
  (`src/lib/open-routes.ts`). CalOPPA wants the policy conspicuously posted, and
  the gate is itself a point of collection, so hiding the policy behind it makes
  the link on the gate lead back to the gate. Neither page renders any catalogue
  data, so the gate loses nothing.

**Three declared gaps. They are real, and they are in the code comments too:**

1. **Per-SKU weights.** The catalogue carries no net weight and no
   concentrate-equivalent weight, so `limits.ts` parses what it can out of a
   product name and counts nothing else. **Every § 15409 total is a floor: the
   check can prove a cart is over the limit, never that it is under one.**
   § 15409(e) concentrate-inside-manufactured-products is not computed at all —
   the milligrams are on the package label, not in the catalogue.
2. **Excise amount on the confirmation page.** The excise tax is separately
   stated wherever this app has the figures (cart and checkout). The placed-order
   record the commerce API returns carries a single `price` and no tax breakdown,
   so the confirmation page points at the itemised delivery receipt instead of
   printing a number it would have to guess.
3. **Age-affirmation persistence.** There is no marketing opt-in anywhere in this
   app, so 4 CCR § 15041(d) is not currently engaged. The age gate is a valid
   self-attestation, but it is not stored against the customer record — the
   upstream profile has no field for it — so § 15041(c) cannot be relied on for
   later sends. **Any marketing-SMS feature needs that field first.**

## Operator checklist before launch

> **Where to set these:** the store's dashboard, **Settings → Business**, is the
> primary place — values save there and appear on the site within about five
> minutes (the profile is cached server-side), no redeploy. The `NEXT_PUBLIC_*`
> env vars below still work as FALLBACKS: a dashboard value always wins, and env
> covers first boot or the backend being unreachable. The browser never talks to
> the dashboard either way — this site's own backend reads the profile
> server-side and serves everything from its own origin.

None of this can be invented by a developer, and the site prints a red
`SET NEXT_PUBLIC_…` placeholder wherever one is missing — on purpose, so an
unfinished storefront cannot look finished. Work through
[`COMPLIANCE.md` § 11](./COMPLIANCE.md) for the full list; these are the ones
this codebase reads.

**Identity and licensing**

- [ ] `NEXT_PUBLIC_LEGAL_ENTITY_NAME` — exact legal entity name as registered
      with the DCC, not the trading name. 4 CCR § 15420(a)(1).
- [ ] `NEXT_PUBLIC_LICENSE_NUMBER` — DCC licence number exactly as issued.
      B&P § 26151(a)(1).
- [ ] `NEXT_PUBLIC_LOCAL_PERMIT_NUMBER` — if the city or county issues one.
- [ ] Confirm the **licence type** (non-storefront retailer Type 9 vs storefront
      Type 10 vs microbusiness Type 12). It changes which rules apply.
- [ ] **Read your local permit conditions.** COMPLIANCE.md § 13 item 9: cities
      routinely impose website and advertising conditions that no desk research
      can discover. Assume at least one affects this site.

**Legal pages**

- [ ] `NEXT_PUBLIC_POLICY_EFFECTIVE_DATE` — written once, by hand. Never
      generated at build time.
- [ ] `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` and
      `NEXT_PUBLIC_PRIVACY_CONTACT_ADDRESS`.
- [ ] **Confirm the Do Not Track disclosure is still true.** `/privacy` states as
      fact that this site loads no third-party script, pixel, font or CDN and
      therefore does no cross-site tracking. That is accurate today. **Adding any
      analytics or ad pixel makes the policy false the same day** — and see
      COMPLIANCE.md § 8.4 on CIPA litigation before adding one at all.
- [ ] **Have counsel read SB 378 (B&P § 22943 et seq.) against this site.**
      Operative 1 July 2026, exposure up to $10,000 per violation per day, and
      the definition may reach a licensed retailer's own storefront. If it
      applies, `/terms` stops being optional and acquires prescribed content.
      COMPLIANCE.md § 13 item 12.

**Prop 65**

- [ ] **Employee headcount**, and who watches for the tenth hire. Warnings are ON
      by default; `NEXT_PUBLIC_PROP65_WARNINGS=exempt` turns them off and should
      only ever be set on a written determination under HSC § 25249.11(b).

**SB 540 brochure**

- [ ] `NEXT_PUBLIC_SAFER_USE_BROCHURE_URL` — download the current DCC PDF, put it
      in `public/`, point this at it. Do not hot-link the DCC CDN.
- [ ] **Stock printed copies in every delivery vehicle.** B&P § 26070.3(b)
      requires printed copies at final delivery; no website setting does that.

**Catalogue** — these are data fixes in the back office, not code changes

- [ ] **Tag every product with a consumption route** (`smoked`, `ingested`,
      `vaped_dabbed`, `dermal`) so Prop 65 selects the right warning instead of
      falling back. Untagged products are logged server-side.
- [ ] **Tag vape hardware** `vape:cartridge` or `vape:integrated`. Untagged vape
      SKUs get both disposal messages, which is over-inclusive but never wrong.
- [ ] **Give every SKU a net weight and a concentrate-equivalent weight.** This
      is what closes declared gap 1 above and makes the § 15409 check real.
- [ ] **Rename anything that calls a vape "disposable"** — including the category
      currently named *Disposable*. B&P § 26152.1(b) forbids it, and a name or a
      category cannot be redacted at render time without mis-describing the
      customer's order. Product descriptions ARE redacted; names and categories
      are only reported.
- [ ] **Review supplier copy** for health claims (B&P § 26154), "candy"/"kandy"
      and cartoon artwork (4 CCR § 15040(a)(3) — note B&P § 26152.2 lets a city
      attorney sue directly), and alcohol terms on beverages (4 CCR § 15040.1).
      Run the store and read the `[compliance]` lines in the server log; they
      name the product, the field and the citation.
- [ ] **Check that potency figures match the package label** (B&P § 26152(b)).
      Batch potency varies; the PDP qualifies the number, but the number itself
      must come from the batch record that produced the label.

**Back office**

- [ ] **Verify the excise rate the API returns.** It should be **15 %** — AB 564
      reversed the 19 % increase with effect from 1 October 2025. The app logs a
      `[tax]` error when the rate it is given disagrees with the statute; it does
      not override it, because charging one number and showing another is worse.
- [ ] **Put a tax breakdown on the order record** if the excise amount is to be
      restated on the web confirmation (declared gap 2).

**And before you flip `robots` to `index`** — see § 7.7.

## 4. What this app asks the commerce API for

Every one of these is called **server-side only**. The left column is a route in
this app; the right is what it calls upstream.

| Our route / caller | Upstream endpoint |
|---|---|
| `GET /api/catalog`, home page, cart pricing | `GET /api/store/v1/products` (incl. `?ids=1,2,3`) |
| `GET /api/catalog/:id`, product page | `GET /api/store/v1/products/:id` |
| home page category chips | `GET /api/store/v1/categories` |
| (available in the client, unused by pages) | `GET /api/store/v1/brands` |
| layout, checkout page, age gate | `GET /api/store/v1/tenant-profile` |
| cart / checkout tax estimate | `GET /api/store/v1/tax-rates` |
| `POST /api/auth/send-code` | `POST /api/store/v1/auth/send-code` |
| `POST /api/auth/verify-code` | `POST /api/store/v1/auth/verify-code` |
| `POST /api/auth/register` | `POST /api/store/v1/auth/register` (multipart) |
| `GET`/`PATCH /api/auth/me` | `GET`/`PATCH /api/store/v1/auth/me` |
| `POST /api/auth/logout` | `POST /api/store/v1/auth/logout` |
| `POST /api/cart/price` (coupon leg) | `POST /api/store/v1/coupon/validate` |
| `POST /api/checkout` | `POST /api/store/v1/checkout` |
| `GET /api/orders` | `GET /api/store/v1/orders` |
| `GET /api/orders/track/:token` | `GET /api/store/v1/orders/track/:token` |
| `GET /api/img/*` | `GET /api/uploads/*` (public upstream; no key sent) |

Deliberately **not** consumed: deals, beats, catch, quiz, promo/spin, promo/420,
referral, delivery-zone, coupon lookup/mine/redeem, catalog export, ID-photo
upload after signup. They exist upstream; this storefront does not need them.

Authentication headers, for reference:

- API key → `Authorization: Bearer <key>` (upstream also accepts `x-api-key`).
- Customer session → **`x-customer-token`**, *not* `Authorization`. That header is
  already taken by the API key. This trips people up.

---

## 5. How sign-in actually works

Phone → SMS code → session. Two branches, and the difference matters:

- **Known phone.** `verify-code` returns a full customer token. We store it in
  `__Host-ybs_session` and the visitor is signed in.
- **New phone.** `verify-code` returns `{ phoneVerified: true, token }` — a
  **short-lived verified-phone token that is only good for `/auth/register`**. We
  store it under the same cookie name but flag it with `__Host-ybs_pending=1`, so
  a half-finished signup can never be mistaken for a session. `/api/auth/me`
  reports it as `pendingRegistration`, and checkout answers `profile_required`
  instead of failing at the order POST.

The token is never in a response body, never in `localStorage`, never readable by
JavaScript. If a store has ID verification switched on (`requireIdVerification`
on the store profile), the register step also collects a photo of a
government-issued ID and forwards it upstream.

---

## 6. Security properties worth preserving

1. **API key is server-only.** `src/lib/kamui/*` imports `server-only`; the build
   fails rather than bundling it. Never `NEXT_PUBLIC_*`.
2. **No browser → commerce API traffic, ever.** `src/lib/client-api.ts` uses only
   relative URLs. If you find yourself adding an absolute URL there, that call
   belongs on the server.
3. **Image proxy.** Upstream stores *relative* image paths (`/api/uploads/x.jpg`).
   Rendered as-is they 404 on our origin; rewritten to absolute they name the
   backend in every product tile. `/api/img/[...path]` streams the bytes instead.
   It is not a general proxy — it allow-lists the two path shapes upstream serves
   and rejects everything else, so it cannot be pointed at an arbitrary URL.
   Upstream response headers are dropped; only a validated `Content-Type` and our
   own cache headers go back.
4. **Session cookie:** `__Host-ybs_session`, `HttpOnly` + `Secure` +
   `SameSite=Lax` + `Path=/` + no `Domain`. The `__Host-` prefix makes the
   *browser* enforce that, so a sibling subdomain cannot overwrite the session.
5. **CSRF:** every mutating route requires an `Origin` whose host matches ours
   (`src/lib/csrf.ts`). Missing `Origin` fails closed.
6. **Fail closed.** No credentials → the whole site is one clean "temporarily
   closed" page. Bad credentials → an empty catalog with a neutral notice. In
   both cases the reason is written to the **server log** and nothing else: no
   status code, no variable name, no host, no stack.
7. **Error translation.** Upstream error strings are never forwarded. Route
   handlers read only *structured* fields — e.g. checkout reads `minimumOrder` and
   `city` and writes its own sentence. Our own error codes are stable and generic.
8. **Rate limits.** `send-code` (per client *and* per phone), `verify-code`, and
   the tracking lookup are throttled in `src/lib/rate-limit.ts`, because our key
   can make the backend spend money on SMS. **It is per-process** — if you run
   more than one instance, move it to a shared store before treating it as a
   security control. This constrains where the app may be hosted; see §7.6.
9. **No client source maps** (`productionBrowserSourceMaps: false`), no
   `x-powered-by`, and `nosniff` / `DENY` / `strict-origin-when-cross-origin` /
   a restrictive `Permissions-Policy` on every response.
10. **Tracking pages carry no order contents.** A tracking token travels by SMS
    and gets forwarded; the payload answers *where is my driver* and nothing about
    what was bought. Upstream removed items and prices from that DTO on purpose —
    don't add them back. We additionally drop the third-party dispatch URL and the
    raw driver coordinates.

---

## 7. Deploy

`next.config.ts` sets `output: "standalone"`, so `pnpm build` emits a
self-contained Node server. The repo ships everything needed to run it on a
container host:

| File | What it is |
|---|---|
| `Dockerfile` | Three-stage production image (deps → build → runtime), Node 22 alpine, non-root. |
| `.dockerignore` | Keeps `node_modules`, `.next`, `.git` and **every `.env*`** out of the build context. |
| `railway.toml` | Railway service config: Dockerfile build, healthcheck, single replica. |
| `src/app/api/health/route.ts` | Liveness endpoint that never touches upstream. |
| `.github/workflows/ci.yml` | typecheck + build on push/PR to `main`. No secrets. |

```bash
docker build -t yb-storefront .
docker run --rm -p 3000:3000 \
  -e KAMUI_API_BASE_URL=https://app.kamui.digital \
  -e KAMUI_STORE_API_KEY=... \
  yb-storefront
```

### 7.1 Environment variables on the host

**Runtime secrets** — set these in the host's variable/secret store. They are read
from `process.env` on every request, so changing one needs a **restart**, not a
rebuild:

| Variable | Required | Notes |
|---|---|---|
| `KAMUI_API_BASE_URL` | **yes** | `https://app.kamui.digital`. No trailing slash. Must be `https` when `NODE_ENV=production` — the app refuses to serve otherwise, because the key rides an `Authorization` header. Loopback is the one exemption, for smoke tests. |
| `KAMUI_STORE_API_KEY` | **yes** | The `store`-scoped key (§2). Full-privilege: catalog, orders, coupons, **SMS on the store's account**. |
| `SITE_ORIGIN` | if proxied | e.g. `https://shop.example.com`. Only needed when the proxy rewrites `Host`; the CSRF check needs the name browsers actually use. |
| `KAMUI_API_TIMEOUT_MS` | no | Default 10000, clamped 1000–60000. |
| `PORT` | no | Defaults to 3000. Railway injects its own; `server.js` honours it. |
| `HOSTNAME` | **do not set** | Pinned to `0.0.0.0` in the Dockerfile. See §7.3. |

**Build-time public values** — `NEXT_PUBLIC_*` is **inlined into browser
JavaScript when the image is built**. Setting one at `docker run` or in the
Railway dashboard does *nothing*; the value is already compiled into the client
bundle. Changing any of them requires a **rebuild and redeploy**:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SITE_NAME` | Header, titles, age gate. Unset → falls back to the upstream store name. |
| `NEXT_PUBLIC_SITE_SHORT_NAME` | Defaults to `NEXT_PUBLIC_SITE_NAME`. |
| `NEXT_PUBLIC_SITE_TAGLINE` | Hero subheading. |
| `NEXT_PUBLIC_MIN_AGE` | Age *threshold* only. Default 21. The gate cannot be switched off. |
| `NEXT_PUBLIC_LICENSE_NUMBER` | ⚠️ Required before launch. Printed in the footer, on the age gate, and on every receipt. |
| `NEXT_PUBLIC_LEGAL_ENTITY_NAME` | ⚠️ Required before launch. Legal entity name as registered with the DCC. |
| `NEXT_PUBLIC_POLICY_EFFECTIVE_DATE` | ⚠️ Required before launch. Effective date on `/privacy` and `/terms`. |
| `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` / `..._ADDRESS` | ⚠️ Required before launch. Privacy contact details. |
| `NEXT_PUBLIC_SAFER_USE_BROCHURE_URL` | ⚠️ Required before launch. Self-hosted DCC SB 540 brochure — B&P § 26070.3(b). |
| `NEXT_PUBLIC_LOCAL_PERMIT_NUMBER` | Optional. Local jurisdiction permit number. |
| `NEXT_PUBLIC_PROP65_WARNINGS` | Optional. `exempt` turns Prop 65 warnings off. Defaults to ON — see § 3.4. |
| `NEXT_PUBLIC_PROP65_FALLBACK_ROUTE` | Optional. Warning for an unclassifiable product. Default `smoked`. |

⚠️ **These are compiled in.** A storefront built without
`NEXT_PUBLIC_SAFER_USE_BROCHURE_URL` shows the red checkout block until it is
**rebuilt**, not until the variable is set. Set them, then build.

They are exposed as Docker build args, so:

```bash
docker build --build-arg NEXT_PUBLIC_SITE_NAME="YB Cannabis Co." -t yb-storefront .
```

On Railway, set them as service variables *and* mark them as build-time — Railway
passes service variables to the Docker build, so a plain variable works, but the
value only takes effect on the next build.

> The secrets are **not** build args, deliberately. A build arg is readable in
> `docker history` forever, and `.dockerignore` excludes every `.env*` for the
> same reason. The build never needs them: every route is server-rendered on
> demand, so a credential-less build produces a byte-identical image.

### 7.2 HTTPS is mandatory — this is the first-deploy failure

The session cookie is `__Host-ybs_session`: `__Host-` prefixed, `Secure`,
`SameSite=Lax`, `Path=/`, no `Domain`. There is **no development escape hatch** in
`src/lib/session.ts` — `secure: true` is unconditional.

Over plain `http://` on any host that is not `localhost`, the browser **silently
discards** that cookie. The failure is not an error; it is worse. Sign-in appears
to succeed, the SMS code is accepted, and the visitor lands back signed out. The
age gate (`__Host-ybs_age`) does the same thing, so the gate re-prompts on every
navigation. Nothing in the logs says why.

Serve TLS, or nothing works. Railway, Fly and Render all terminate TLS for you;
if you front the app with your own nginx/Caddy, terminate there and forward.

Two related proxy settings:

- **`x-forwarded-for` must be set by the proxy.** The rate limiter keys on it
  (`src/lib/rate-limit.ts`). Exposed directly to the internet, that header is
  attacker-supplied and the limiter becomes decorative.
- **If the proxy rewrites `Host`, set `SITE_ORIGIN`.** Otherwise every mutating
  request fails the CSRF origin check with a `403` — sign-in, checkout, the lot.

### 7.3 The standalone `HOSTNAME` trap

`.next/standalone/server.js` does:

```js
const currentPort = parseInt(process.env.PORT, 10) || 3000
const hostname = process.env.HOSTNAME || '0.0.0.0'
```

Every container runtime sets `HOSTNAME` to the container id. So the default
behaviour is that the server binds to a name resolving to nothing routable, the
platform's health check never connects, and the deploy fails with no application
error to look at. The `Dockerfile` pins `ENV HOSTNAME=0.0.0.0`, which wins over
the runtime-injected value. **Do not set `HOSTNAME` as a service variable.**

The other standalone trap: `.next/standalone` does **not** contain
`.next/static` or `public/`. Copy both in, or the app boots and every stylesheet
and script 404s. The `Dockerfile` copies all three trees; `pnpm start` mirrors
the same layout locally, which is why it is not `next start` (that command
prints a warning and does not serve a standalone build).

### 7.4 Health check

`GET /api/health` → `200 {"status":"ok","uptime":<seconds>}`.

It answers from this process alone: no upstream call, no config read, no cookie.
That is the point. A health check that reaches the commerce API converts *their*
outage into *our* restart loop — the platform kills a healthy container, the
replacement fails the same check, and the storefront serves 502 instead of its
"temporarily closed" page. Whether upstream is reachable is a monitoring
question: watch the `[upstream]` log lines.

`GET /` also returns 200 when the backend is unreachable, but it renders the
whole shell to do it. Point liveness at `/api/health`.

### 7.5 Railway

`railway.toml` configures the build and the healthcheck, so:

1. Create a service from the GitHub repo. Railway reads `railway.toml` and builds
   the `Dockerfile` — no start command to set, no Nixpacks guessing.
2. **Variables** → add `KAMUI_API_BASE_URL` and `KAMUI_STORE_API_KEY`, plus any
   `NEXT_PUBLIC_*` you want baked in.
3. Deploy. Watch for the healthcheck on `/api/health` to go green.
4. **Custom domain:** service → **Settings → Networking → Custom Domain**, enter
   e.g. `shop.example.com`, then add the `CNAME` Railway shows you at your DNS
   provider. **TLS is automatic** — Railway provisions and renews the certificate
   once the CNAME resolves; there is nothing to install. Apex domains need your
   DNS provider to support ALIAS/ANAME flattening (Cloudflare, Route 53 and
   Netlify DNS do).
5. Once the domain is live, set `SITE_ORIGIN=https://shop.example.com`.

`numReplicas = 1` is set on purpose — see §7.6.

### 7.6 Serverless hosts (Vercel, Lambda, Cloud Run scale-to-zero): a real caveat

This app builds and deploys fine on Vercel. One security control degrades, and
you should decide about it consciously rather than discover it on an invoice.

`src/lib/rate-limit.ts` is a fixed-window limiter held in **process memory**. It
guards `/api/auth/send-code` (8 per client, 4 per phone, per 10 min),
`/api/auth/verify-code`, and the tracking lookup. `send-code` makes the backend
**send an SMS on the store's account**, so the limiter is standing between an
open endpoint and a phone bill.

On a long-running container, one process owns the counters and the limit means
what it says. On a serverless platform each invocation may land in a fresh
instance with empty counters, and platforms scale out precisely when traffic
spikes — which is exactly the attack. Ten warm instances is ten times the budget;
an attacker who paces requests to force cold starts gets no effective limit at
all. The same applies to a container host scaled past one replica, which is why
`railway.toml` pins `numReplicas = 1`.

**Recommendation: run it as a long-running container** (Railway, Fly, Render,
Cloud Run with `min-instances=1`), single replica, until the limiter is shared.

**To make serverless — or multiple replicas — viable**, move the counters to
shared storage: swap the `Map` in `src/lib/rate-limit.ts` for Redis (`INCR` +
`EXPIRE` is the whole implementation) or Upstash. The call sites take a key and a
window and do not care where the count lives; `rateLimit()` becoming `async` is
the only ripple. Do that first, then scale.

### 7.7 Before you launch: search engines

`src/app/layout.tsx` sets `robots: { index: false, follow: false }` in the
exported `metadata`. Every page ships `<meta name="robots" content="noindex,
nofollow">` and **nothing will appear in Google**.

That is intentional for a store that is not open yet. To launch, change that one
line to `robots: { index: true, follow: true }` (or delete the key — indexing is
the Next default) and redeploy. Do it once the real domain, hours, and legal
pages are in place, not before.

---

## 8. What to check when the commerce API changes

**This repo is outside that platform's release cycle. Nothing here will tell you
the contract drifted** — a renamed field silently becomes `undefined` at runtime
and a price quietly renders as `$NaN`. Their types were hand-copied into
`src/lib/kamui/types.ts` on **2026-08-19**; that file is a snapshot, not a link.

When you hear that the API changed, walk this list:

1. **Diff `src/lib/kamui/types.ts` against their contract package**
   (`packages/store-contract/src/*.ts`) — but treat the **route handlers** under
   `apps/dashboard/src/app/api/store/v1/**` as authoritative when the two
   disagree. They already do disagree in two places (both noted in the file
   header): `orderNumber` is documented as a string and returned as a number, and
   `trackingToken` is documented non-null and returned nullable.
2. **Do not trust their `openapi/v1.yaml`.** It covers roughly two-thirds of the
   routes, omits the entire auth surface, and documents customer auth incorrectly.
3. **Re-check the two auth headers** (§4). If `x-customer-token` is ever renamed,
   sign-in, checkout, orders and coupons all break at once.
4. **Re-check the image path convention.** If upstream starts returning absolute
   URLs or a new path prefix, update the allow-list in `src/lib/kamui/images.ts`
   — otherwise images silently become `null` and every tile shows a placeholder.
5. **Re-check the tax cascade** in `src/lib/money.ts`. It is a *mirror* of their
   arithmetic (city → excise on subtotal+city → state on subtotal+city+excise),
   used for the cart estimate only. If it drifts, the estimate is wrong but the
   charged total — which always comes back from checkout — stays correct.
6. **Re-check checkout's refusal shapes** in `src/app/api/checkout/route.ts`. We
   translate `minimumOrder`/`city` (400) and `customer_banned` (403) into our own
   copy. New refusal kinds will fall through to a generic message until mapped.
7. **Re-run the leak audit** (§9) after any change to `map.ts`, `images.ts` or
   `public-types.ts`.

A good smoke test after any upstream change: sign in, price a cart, place an
order, open the tracking link, and confirm a product image loads.

---

## 9. Leak audit

Run this after any change that touches the server layer or the DTO mapping.

```bash
pnpm build

# 1. Nothing the browser downloads may mention the backend.
grep -rin -e "$(node -e 'console.log(new URL(process.env.KAMUI_API_BASE_URL).host)')" \
          -e "KAMUI_STORE_API_KEY" -e "kamui" .next/static
# → expect: no matches

# 2. The key value must never be baked into any artifact.
grep -rl "$KAMUI_STORE_API_KEY" .next
# → expect: no matches (it is read from process.env at runtime)

# 3. No client source maps.
find .next/static -name "*.map"
# → expect: nothing
```

Then, with the server running, check the rendered output — the HTML *and* the RSC
payload embedded in it, which is easy to forget:

```bash
curl -s http://localhost:3000/ | grep -iE "your-api-host|kamui|api/store/v1|api/uploads"
```

`src/lib/kamui/` matches only ever appear in **server** chunks and **server**
source maps under `.next/server/`, which are never served to a browser. If you
would rather not have the name in the repo at all, renaming that one directory is
a safe mechanical change — nothing outside it depends on the name.

---

## 10. Deliberate non-goals

Not built, because the brief did not need them — each is a small addition on the
same seams:

- Deals / promos / loyalty / referrals / the quiz (all exist upstream).
- Delivery-zone lookup before checkout. Checkout already returns a structured
  minimum-order refusal, which we translate; a pre-check would add an upstream
  geocode call per keystroke.
- A live driver map. The tracking payload carries coordinates; we deliberately
  reduce them to a boolean rather than publish a person's position to anyone
  holding a forwarded SMS link.
- Automated tests. The types and flows were verified against a stub of the
  upstream API during development. A unit suite ships and CI runs it
  (`pnpm test`): the AAMVA parse and a real-WASM barcode decode against real
  images, the wire→browser mappers, the age-gate allowlist, and the
  browse-filter round-trip. Components are still verified in a real browser
  against the production build — see the checklist below.
- `robots` is set to `noindex` in `src/app/layout.tsx`. Flip it when the real
  domain, hours and legal pages are in place — see §7.7. `/privacy` and `/terms`
  set `noindex` in their own metadata as well; drop those lines too if the
  operator wants the policies indexed.
- **Medicinal.** This is an adult-use-only storefront. Serving 18–20 medicinal
  patients means verifying a physician's recommendation, a different set of
  daily limits (4 CCR § 15409(b)–(c)), different potency ceilings, and the
  MMIC sales-tax exemption (R&TC § 6369.6 — which needs the MMIC **and** a
  government ID, not a recommendation). A half-built medicinal path is worse
  than none; the daily-limit module hard-codes the adult-use figures and says so.
