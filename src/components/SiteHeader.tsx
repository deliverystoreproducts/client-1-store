"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
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
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Promise<SessionState>) : null))
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

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
          {storeName}
        </Link>

        <nav className="nav" aria-label="Main">
          <Link href="/" className="nav-wide">
            Shop
          </Link>
          <Link href="/track">Track</Link>
          {session?.authenticated ? (
            <Link href="/account">Account</Link>
          ) : (
            <Link href="/signin">Sign in</Link>
          )}
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
    </header>
  );
}
