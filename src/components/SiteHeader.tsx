"use client";

import Link from "next/link";
import { SearchSuggest } from "@/components/SearchSuggest";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SessionState } from "@/lib/public-types";

/**
 * Header. Client-side because the cart count lives in the browser and the
 * session badge is fetched from our own /api/auth/me (never from a token the
 * page can read — there isn't one).
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

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- same-origin
            // proxied asset; next/image's optimizer would round-trip it again.
            <img className="brand-logo" src={logo} alt="" height={28} />
          ) : (
            <span className="brand-seal" aria-hidden />
          )}
          <span className="brand-name">{storeName}</span>
        </Link>

        {/* Between the mark and the nav, on every page. The gap this closes is
            that from a product page or the cart there was previously no way to
            search at all. */}
        <SearchSuggest />

        <nav className="nav" aria-label="Main">
          {/* Text links live in a wrapper the phone hides; the burger replaces
              them. Cart and the burger always stay reachable. */}
          <span className="nav-links">
            <Link href="/" className="nav-wide">
              Home
            </Link>
            <Link href="/products" className="nav-wide">
              All Products
            </Link>
            <Link href="/brands" className="nav-wide">
              Brands
            </Link>
            {/* A disclosure, not a dropdown: <details> needs no JavaScript, is
                keyboard-operable for free, and closes on Escape. The links
                inside are the ones a shopper needs occasionally — putting them
                in the bar would crowd out the search. */}
            <details className="nav-more nav-wide">
              <summary>More</summary>
              <div className="nav-more-pop">
                <Link href="/deals">Deals</Link>
                <Link href="/track">Track an order</Link>
                <Link href="/faq">FAQ</Link>
                <Link href="/contact">Contact</Link>
              </div>
            </details>
            {session?.authenticated ? (
              <Link href="/account">Account</Link>
            ) : (
              <Link href="/signin">Sign in</Link>
            )}
            <ThemeToggle />
          </span>
          <button
            className="burger"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i /><i /><i />
          </button>
          <Link href="/cart" className="cart-link">
            Cart
            {showCount ? (
              <span key={count} className="cart-count" aria-hidden>
                {count}
              </span>
            ) : null}
            {showCount ? <span className="sr-only">{count} items in cart</span> : null}
          </Link>
        </nav>
      </div>

      {menuOpen ? (
        <div id="mobile-menu" className="mobile-menu">
          <SearchSuggest id="menu-q" />
          <Link href="/">Shop</Link>
          <Link href="/products">Shop all &amp; filter</Link>
          <Link href="/brands">Brands</Link>
          <Link href="/deals">Deals</Link>
          <Link href="/track">Track an order</Link>
          {session?.authenticated ? (
            <Link href="/account">Your account</Link>
          ) : (
            <Link href="/signin">Sign in</Link>
          )}
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
          <div className="mobile-menu-row">
            <span className="eyebrow">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </header>
  );
}
