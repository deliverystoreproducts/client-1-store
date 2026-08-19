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
    product/[id]/page.tsx      product detail
    cart/, checkout/, checkout/confirmation/
    signin/, account/
    track/, track/[token]/
    unavailable/               the "we're closed" fail-closed page
    error.tsx, global-error.tsx, not-found.tsx
    api/                       ← the BFF. See §4.
  components/                  client components (cart, sign-in flow, views)
  lib/
    kamui/                     SERVER ONLY: env, client, types, errors, images, map
    public-types.ts            the shapes the browser is allowed to see
    store.ts                   server read model
    session.ts                 httpOnly cookie custody
    csrf.ts, rate-limit.ts, money.ts, phone.ts, http.ts, site.ts
    client-api.ts              browser → our own /api (relative URLs only)
```

---

## 2. Running it

Requires Node 22+ and pnpm.

```bash
pnpm install
cp .env.example .env.local     # then fill in KAMUI_API_BASE_URL + KAMUI_STORE_API_KEY
pnpm dev                       # http://localhost:3000
```

```bash
pnpm build       # production build (output: "standalone")
pnpm start       # serve the build
pnpm typecheck   # tsc --noEmit
```

Without credentials the app still starts, and every page renders a clean
"we're temporarily closed" screen. That is deliberate — see §6.6.

**Local HTTPS note.** The session cookie uses the `__Host-` prefix, which the
browser only accepts on a `Secure` cookie. Chrome, Firefox and Safari all treat
`http://localhost` as a secure context, so `pnpm dev` works as-is. It will *not*
work over plain http on a LAN IP — use `localhost` or a TLS tunnel.

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
| `NEXT_PUBLIC_MIN_AGE` | **public** | Age shown before the upstream setting loads. |

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
   security control.
9. **No client source maps** (`productionBrowserSourceMaps: false`), no
   `x-powered-by`, and `nosniff` / `DENY` / `strict-origin-when-cross-origin` /
   a restrictive `Permissions-Policy` on every response.
10. **Tracking pages carry no order contents.** A tracking token travels by SMS
    and gets forwarded; the payload answers *where is my driver* and nothing about
    what was bought. Upstream removed items and prices from that DTO on purpose —
    don't add them back. We additionally drop the third-party dispatch URL and the
    raw driver coordinates.

---

## 7. Deploying

`next.config.ts` sets `output: "standalone"`, so the build is self-contained:

```bash
pnpm install --frozen-lockfile
pnpm build
# ship .next/standalone + .next/static + public (if you add one)
node .next/standalone/server.js
```

A minimal Dockerfile, Railway/Fly/Render, or any Node host works. Requirements:

- **Node 22+.**
- **Environment variables set as secrets**, not baked into the image. `NEXT_PUBLIC_*`
  values *are* baked in at build time, so a change to those requires a rebuild;
  the secret ones are read at runtime and only need a restart.
- **Serve over HTTPS.** The session cookie is `Secure`; without TLS there is no
  session (and the API key would ride an unencrypted hop).
- **Put it behind a proxy that sets `x-forwarded-for`.** The rate limiter keys on
  it; exposed directly, that header is attacker-controlled.
- If the proxy rewrites `Host`, set `SITE_ORIGIN` so the CSRF check knows the name
  browsers actually use.
- Health check: `GET /` returns 200 even when the backend is unreachable (it
  renders the "closed" page), so point liveness checks at it and watch the logs
  for `[upstream]` lines rather than treating 200 as "the catalog works".

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
  upstream API during development, but no test suite ships in this repo.
- `robots` is set to `noindex` in `src/app/layout.tsx`. Flip it when the real
  domain, hours and legal pages are in place.
