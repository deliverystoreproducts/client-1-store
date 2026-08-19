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
import { SITE_TAGLINE } from "@/lib/site";

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
  themeColor: "#0e100f",
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
  const gated = profile.ageGate && !passedGate;

  return (
    <html lang="en">
      <body>
        {!configured ? (
          <StoreUnavailable storeName={process.env.NEXT_PUBLIC_SITE_NAME} />
        ) : gated ? (
          // The store is not rendered at all until the visitor answers. This is a
          // server-side decision, so there is no flash of shoppable content.
          <AgeGate minAge={profile.minAge} />
        ) : (
          <CartProvider>
            <div className="shell">
              <SiteHeader storeName={storeName} />
              <main className="main">
                <div className="wrap">{children}</div>
              </main>
              <footer className="site-footer">
                <div className="wrap stack">
                  <div className="spread">
                    <span>
                      © {new Date().getFullYear()} {storeName}
                    </span>
                    <span className="row" style={{ gap: 16 }}>
                      <Link href="/track">Track an order</Link>
                      {profile.contactPhone ? (
                        <a href={`tel:${profile.contactPhone}`}>{profile.contactPhone}</a>
                      ) : null}
                      {profile.contactEmail ? (
                        <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>
                      ) : null}
                    </span>
                  </div>
                  <span>
                    Must be {profile.minAge}+ with valid ID. Keep out of reach of children and
                    pets. Cash on delivery.
                  </span>
                </div>
              </footer>
            </div>
          </CartProvider>
        )}
      </body>
    </html>
  );
}
