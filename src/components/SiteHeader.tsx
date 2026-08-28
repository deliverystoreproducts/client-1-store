"use client";

import Link from "next/link";
import { SearchSuggest } from "@/components/SearchSuggest";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SessionState } from "@/lib/public-types";

/**
 * Header — the reference storefront's bar, on one black strip:
 *
 *   desktop:  [logo] Home · All Products · Brands · More ▾  [ search ……… ]  👤 🛒
 *   phone:    [☰] [logo]  [ search ……………… ]  👤 🛒
 *
 * Two decisions worth stating. The SEARCH IS ALWAYS IN THE BAR — on a phone it
 * used to live inside the burger sheet, which is the one place a customer who
 * wants to type a strain name will never look. And the account and cart are
 * ICONS, not words: two labelled buttons plus a search field do not fit a
 * 375px phone, and a cart glyph with a count needs no label.
 *
 * Client-side because the cart count lives in the browser and the session
 * badge is fetched from our own /api/auth/me (never from a token the page can
 * read — there isn't one). The dark-mode switch is in the menus, not the bar.
 */
export function SiteHeader({
  storeName,
  logo,
}: {
  storeName: string;
  /** Already proxied through /api/img by the profile mapper — same-origin. */
  logo?: string | null;
}) {
  const { count, ready } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  // route change closes the menu
  useEffect(() => setMenuOpen(false), [pathname]);
  const [session, setSession] = useState<SessionState | null>(null);

  // Re-fetched on every route change AND on the ybs:auth-changed signal the
  // sign-in/out flows dispatch. Without both, the badge fossilizes at its
  // mount-time value: this is a client component, so neither router.push nor
  // router.refresh() ever remounts it — "Sign in" kept showing after login.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/auth/me")
        .then((r) => (r.ok ? (r.json() as Promise<SessionState>) : null))
        .then((s) => {
          if (!cancelled) setSession(s);
        })
        .catch(() => undefined);
    load();
    const onAuth = () => void load();
    window.addEventListener("ybs:auth-changed", onAuth);
    return () => {
      cancelled = true;
      window.removeEventListener("ybs:auth-changed", onAuth);
    };
  }, [pathname]);

  const showCount = ready && count > 0;
  const accountHref = session?.authenticated ? "/account" : "/signin";
  const accountLabel = session?.authenticated ? "Your account" : "Sign in";

  return (
    <header className="site-header">
      <div className="wrap hdr">
        <button
          className="burger"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <i />
          <i />
          <i />
        </button>

        <Link href="/" className="brand" aria-label={`${storeName} — home`}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- same-origin
            // proxied asset; next/image's optimizer would round-trip it again.
            <img className="brand-logo" src={logo} alt="" />
          ) : (
            <span className="brand-name">{storeName}</span>
          )}
        </Link>

        <nav className="nav-links" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/products">All Products</Link>
          <Link href="/brands">Brands</Link>
          {/* A disclosure, not a dropdown: <details> needs no JavaScript, is
              keyboard-operable for free, and closes on Escape. */}
          <details className="nav-more">
            <summary>More</summary>
            <div className="nav-more-pop">
              <Link href="/deals">Deals</Link>
              <Link href="/track">Track an order</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/contact">Contact</Link>
              <div className="nav-more-row">
                <ThemeToggle />
              </div>
            </div>
          </details>
        </nav>

        {/* The search sits between the nav and the icons on every page and at
            every width. */}
        <SearchSuggest />

        <div className="hdr-icons">
          <Link href={accountHref} className="hdr-icon" aria-label={accountLabel} title={accountLabel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" />
            </svg>
          </Link>
          <Link href="/cart" className="hdr-icon cart-link" aria-label="Cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2.5 3.5h2.3l2.4 12.2a1.6 1.6 0 0 0 1.6 1.3h9.6a1.6 1.6 0 0 0 1.6-1.2L21.5 8H6" />
              <circle cx="9.5" cy="20.5" r="1.3" />
              <circle cx="17.5" cy="20.5" r="1.3" />
            </svg>
            {showCount ? (
              <span key={count} className="cart-count" aria-hidden>
                {count}
              </span>
            ) : null}
            {showCount ? <span className="sr-only">{count} items in cart</span> : null}
          </Link>
        </div>
      </div>

      {menuOpen ? (
        <div id="mobile-menu" className="mobile-menu">
          <Link href="/">Home</Link>
          <Link href="/products">All Products</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/brands">Brands</Link>
          <Link href="/deals">Deals</Link>
          <Link href="/track">Track an order</Link>
          <Link href={accountHref}>{accountLabel}</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
          <div className="mobile-menu-row">
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </header>
  );
}
