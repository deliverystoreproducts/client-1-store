import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { AgeGate } from "@/components/AgeGate";
import { CartProvider } from "@/components/CartProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { StoreUnavailable } from "@/components/StoreUnavailable";
import { isUpstreamConfigured } from "@/lib/kamui/env";
import { hasPassedAgeGate } from "@/lib/session";
import { getStoreProfile } from "@/lib/store";
import { LICENSE_NUMBER, LICENSE_PLACEHOLDER, SITE_TAGLINE } from "@/lib/site";
import { DELIVERY_WINDOW_LABEL } from "@/lib/hours";

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_SITE_NAME || "YB Cannabis Co.",
    template: `%s · ${process.env.NEXT_PUBLIC_SITE_NAME || "YB Cannabis Co."}`,
  },
  description: SITE_TAGLINE,
  // No indexing by default: a store should opt in to search engines once its
  // real domain, hours and legal pages are in place.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#14100c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fail closed, and fail early. With no credentials there is no catalog, no
  // cart and no checkout — so the whole site becomes one honest "closed" page
  // rather than a shop whose every shelf happens to be empty.
  const configured = isUpstreamConfigured();
  const profile = await getStoreProfile();
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
  const gated = !passedGate;

  const year = new Date().getFullYear();

  return (
    <html lang="en">
      <body>
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
          <AgeGate minAge={profile.minAge} storeName={storeName} />
        ) : (
          <CartProvider>
            <div className="shell">
              <SiteHeader storeName={storeName} />
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

                    <nav className="footer-col" aria-label="Help">
                      <span className="eyebrow" style={{ marginBottom: "0.7rem" }}>
                        Help
                      </span>
                      <Link href="/track">Track an order</Link>
                      {profile.contactPhone ? (
                        <a href={`tel:${profile.contactPhone}`}>{profile.contactPhone}</a>
                      ) : null}
                      {profile.contactEmail ? (
                        <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>
                      ) : null}
                    </nav>
                  </div>

                  <div className="footer-legal">
                    <p>
                      {/* B&P § 26151(a) — every page of this store is marketing, and
                          marketing must identify the licensee by licence number. */}
                      Licensed cannabis retailer · License{" "}
                      <span className="license" data-missing={!LICENSE_NUMBER}>
                        {LICENSE_NUMBER || LICENSE_PLACEHOLDER}
                      </span>
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
          </CartProvider>
        )}
      </body>
    </html>
  );
}
