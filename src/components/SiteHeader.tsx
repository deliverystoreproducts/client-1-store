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
export function SiteHeader({ storeName }: { storeName: string }) {
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

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand brand-mark">
          <span className="brand-dot" aria-hidden />
          {storeName}
        </Link>
        <nav className="nav">
          <Link href="/">Shop</Link>
          <Link href="/track">Track order</Link>
          {session?.authenticated ? (
            <Link href="/account">Account</Link>
          ) : (
            <Link href="/signin">Sign in</Link>
          )}
          <Link href="/cart" className="btn btn-ghost btn-sm">
            Cart{ready && count > 0 ? ` · ${count}` : ""}
          </Link>
        </nav>
      </div>
    </header>
  );
}
