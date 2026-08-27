import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import "./globals.css";
import { AgeGate } from "@/components/AgeGate";
import { CartProvider } from "@/components/CartProvider";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SiteHeader } from "@/components/SiteHeader";
import { TopBanner } from "@/components/TopBanner";
import { StoreUnavailable } from "@/components/StoreUnavailable";
import { SwRegister } from "@/components/SwRegister";
import { isUpstreamConfigured } from "@/lib/kamui/env";
import { OPEN_ROUTE_HEADER } from "@/lib/open-routes";
import { hasPassedAgeGate } from "@/lib/session";
import { getBannerPromo, getStoreProfile } from "@/lib/store";
import { LICENSE_PLACEHOLDER, MISSING, SITE_TAGLINE } from "@/lib/site";
import { DELIVERY_WINDOW_LABEL } from "@/lib/hours";

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_SITE_NAME || "YB Cannabis Co.",
    template: `%s · ${process.env.NEXT_PUBLIC_SITE_NAME || "YB Cannabis Co."}`,
  },
  description: SITE_TAGLINE,
  // No indexing by default: a store should opt in to search engines once its
  // real domain, hours and legal pages are in place. Launch day flips ONE env
  // var (SEO_INDEX=on) — until then this is also the single deliberate
  // Lighthouse SEO failure.
  robots:
    process.env.SEO_INDEX === "on"
      ? { index: true, follow: true }
      : { index: false, follow: false },
  // Installed-app identity for iOS (Android reads the manifest). The startup
  // images kill the blank white flash an installed PWA otherwise shows on
  // launch; Safari picks the FIRST link whose media matches, so the dark
  // variants come first — a light-scheme device skips them, a dark one stops
  // there. Files generated from icon.svg by the splash script (see git log).
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: process.env.NEXT_PUBLIC_SITE_SHORT_NAME || "YB",
    startupImage: (
      [
        [430, 932, 3], [402, 874, 3], [393, 852, 3], [390, 844, 3],
        [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2],
        [768, 1024, 2], [810, 1080, 2], [820, 1180, 2], [834, 1194, 2], [1024, 1366, 2],
      ] as const
    ).flatMap(([w, h, r]) => {
      const device = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`;
      return [
        { url: `/splash/${w}x${h}@${r}x-dark.png`, media: `(prefers-color-scheme: dark) and ${device}` },
        { url: `/splash/${w}x${h}@${r}x-light.png`, media: device },
      ];
    }),
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6fbf2" },
    { media: "(prefers-color-scheme: dark)", color: "#120b1e" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fail closed, and fail early. With no credentials there is no catalog, no
  // cart and no checkout — so the whole site becomes one honest "closed" page
  // rather than a shop whose every shelf happens to be empty.
  const configured = isUpstreamConfigured();
  const profile = await getStoreProfile();
  const promo = await getBannerPromo();
  const storeName =
    process.env.NEXT_PUBLIC_SITE_NAME || profile.storeName || "YB Cannabis Co.";
  const passedGate = await hasPassedAgeGate();

  // ── AGE GATE: UNCONDITIONAL ────────────────────────────────────────────
  // This is a legal control, not a UI preference, so it is NOT wired to any
  // upstream flag. The store profile carries an `ageGate` boolean that a
  // dashboard toggle can flip; this storefront deliberately does not read it —
  // and `PublicStoreProfile` no longer even carries it, so there is nothing to
  // wire back by accident. The only thing configuration decides is the
  // THRESHOLD (`minAge`, defaulted to 21 both in the mapper and in the
  // fail-safe fallback profile).
  //
  // TWO LAYERS, and both are needed:
  //   1. `middleware.ts` rewrites every navigable URL to /age when the cookie is
  //      missing, so the catalog page function never runs and never reaches the
  //      RSC flight payload. That is the layer that actually holds — without it
  //      the whole shelf ships inside <script> tags under the gate.
  //   2. This branch renders the gate instead of `children`, so a request that
  //      somehow skipped middleware still shows no store.
  //
  // ONE EXCEPTION, and it is not a loophole: /privacy and /terms. CalOPPA
  // (B&P § 22575) requires the privacy policy to be conspicuously posted, and
  // the gate is itself a point of collection — it sets a cookie before anyone
  // has read anything — so hiding the policy behind it makes the link on the
  // gate lead back to the gate. Those two routes render no catalogue data at
  // all, so the thing layer 1 protects is not in play. The header is stamped by
  // `src/proxy.ts`, which deletes any inbound copy first.
  const openRoute = (await headers()).get(OPEN_ROUTE_HEADER) === "1";
  const gated = !passedGate && !openRoute;

  const year = new Date().getFullYear();

  return (
    // data-scroll-behavior is Next's handshake for CSS smooth scrolling: it
    // keeps ROUTE-change scroll resets instant while same-page anchor jumps
    // (banner → #catalogue, pager) animate.
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        {/* Applies the saved theme before first paint — no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("ybs.theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}',
          }}
        />
        {/* Self-hosted, same-origin. Fonts are always fetched in CORS mode, so
            the preload must be anonymous or the browser fetches them twice. */}
        <link
          rel="preload"
          href="/fonts/fraunces-latin-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/archivo-latin-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

        {!configured ? (
          <StoreUnavailable storeName={process.env.NEXT_PUBLIC_SITE_NAME} />
        ) : gated ? (
          // The store is not rendered at all until the visitor answers. This is a
          // server-side decision, so there is no frame in which the catalog is
          // in the DOM for someone who has not passed the gate.
          <AgeGate minAge={profile.minAge} storeName={storeName} licenseNumber={profile.licenseNumber} />
        ) : (
          <CartProvider>
            <div className="shell">
              <TopBanner promo={promo} />
              <SiteHeader storeName={storeName} logo={profile.logo} />
              <main className="main">
                <div className="wrap">{children}</div>
              </main>

              <footer className="site-footer">
                <div className="wrap">
                  <div className="footer-grid">
                    <div className="footer-brand">
                      <p className="footer-mark">{storeName}</p>
                      <p className="faint" style={{ maxWidth: "30ch" }}>
                        {profile.heroSubtitle || SITE_TAGLINE}
                      </p>
                    </div>

                    <nav className="footer-col" aria-label="Shop">
                      <span className="eyebrow" style={{ marginBottom: "0.7rem" }}>
                        Shop
                      </span>
                      <Link href="/">Everything</Link>
                      <Link href="/cart">Cart</Link>
                      <Link href="/account">Your account</Link>
                    </nav>

                    <nav className="footer-col" aria-label="Info">
                      <span className="eyebrow" style={{ marginBottom: "0.7rem" }}>
                        Info
                      </span>
                      <Link href="/faq">FAQ</Link>
                      <Link href="/returns">Returns &amp; refunds</Link>
                      <Link href="/contact">Contact</Link>
                      <Link href="/track">Track an order</Link>
                      {profile.contactPhone ? (
                        <a href={`tel:${profile.contactPhone}`}>{profile.contactPhone}</a>
                      ) : null}
                      {profile.contactEmail ? (
                        <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>
                      ) : null}
                    </nav>

                    <nav className="footer-col" aria-label="Legal">
                      <span className="eyebrow" style={{ marginBottom: "0.7rem" }}>
                        Legal
                      </span>
                      {/* CalOPPA (B&P § 22575) requires the privacy policy to be
                          CONSPICUOUSLY POSTED — a link on every page is what that
                          means in practice. */}
                      <Link href="/privacy">Privacy policy</Link>
                      <Link href="/terms">Terms of service</Link>
                      {/* Not required by any rule (COMPLIANCE.md § 4.4) — a free
                          trust signal, and the customer can check the number
                          printed below against the state's own register. */}
                      <a
                        href="https://search.cannabis.ca.gov/"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Verify our licence
                      </a>
                    </nav>
                  </div>

                  {/* ── Licensee identification ──────────────────────────────
                      B&P § 26151(a)(1): all advertising and marketing shall
                      "accurately and legibly identify the licensee responsible
                      for its content, by adding, at a minimum, the licensee's
                      license number." Every page of this store is marketing, so
                      it goes in the global footer.

                      ⚠️ THERE IS DELIBERATELY NO PROP 65 WARNING HERE. 27 CCR
                      § 25602(b)(1)(C) says a warning is not prominently
                      displayed if "the purchaser must search for it in the
                      general content of the website" — a footer warning earns
                      nothing. It belongs on the product display page, and that
                      is where it is. Do not "helpfully" add one here. */}
                  <div className="footer-legal">
                    <p>
                      <span className="license" data-missing={!profile.legalEntityName}>
                        {profile.legalEntityName || MISSING("Legal entity name")}
                      </span>{" "}
                      · Licensed cannabis retailer · DCC Licence{" "}
                      <span className="license" data-missing={!profile.licenseNumber}>
                        {profile.licenseNumber || LICENSE_PLACEHOLDER}
                      </span>
                      {profile.localPermitNumber ? (
                        <>
                          {" "}
                          · Local permit <span className="license">{profile.localPermitNumber}</span>
                        </>
                      ) : null}
                      <br />
                      Delivery {DELIVERY_WINDOW_LABEL} (4 CCR § 15403). Must be {profile.minAge}+
                      with a valid government-issued ID. Keep out of reach of children and pets.
                      Cash on delivery — nothing is charged online.
                    </p>
                    <p>
                      © {year} {storeName}
                    </p>
                  </div>
                </div>
              </footer>
            </div>
            <InstallPrompt />
          </CartProvider>
        )}
        <SwRegister />
      </body>
    </html>
  );
}
