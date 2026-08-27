"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/client-api";
import { formatUsd } from "@/lib/money";

/**
 * Header search with a suggestion dropdown.
 *
 * Before this there was no search box in the header at all: a customer on a
 * product page or in the cart had to navigate back to the shelf to look for
 * anything. That is the actual gap — the dropdown is the nicety on top.
 *
 * IT IS A REAL <form>. Enter submits to /products?q=… whether or not the
 * dropdown has loaded, has failed, or is empty, and whether or not JavaScript
 * ran. The suggestions are an enhancement over a control that works without
 * them; they are never the only way to search.
 *
 * Three groups — products, categories, brands — because a query is often not a
 * product name. "boots" is a category, "Nike" is a brand. Returning products
 * only makes those queries look like an empty shop.
 *
 * Keyboard model is the same ARIA combobox as AddressField, deliberately: two
 * different dropdown behaviours in one header is worse than either.
 */

interface Suggestions {
  products: { id: number; name: string; image: string | null; unitPrice: number }[];
  categories: { id: number; name: string; productCount: number }[];
  brands: { id: number; name: string; productCount: number }[];
}

const EMPTY: Suggestions = { products: [], categories: [], brands: [] };

type Flat = { key: string; href: string; label: string };

export function SearchSuggest({ id = "hdr-q" }: { id?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sug, setSug] = useState<Suggestions>(EMPTY);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<number | null>(null);
  // Guards against a slow response for "ni" landing after a fast one for "nike".
  const seq = useRef(0);

  function query(next: string) {
    setQ(next);
    setActive(-1);
    if (timer.current) window.clearTimeout(timer.current);
    if (next.trim().length < 2) {
      setSug(EMPTY);
      setOpen(false);
      return;
    }
    const mine = ++seq.current;
    timer.current = window.setTimeout(() => {
      apiGet<Suggestions>(`/api/suggest?q=${encodeURIComponent(next.trim())}`)
        .then((r) => {
          if (seq.current !== mine) return;
          setSug(r);
          setOpen(true);
        })
        .catch(() => {
          // Silent: the form still submits. A search box that shows an error
          // for a failed *suggestion* teaches people the search is broken.
          if (seq.current === mine) {
            setSug(EMPTY);
            setOpen(false);
          }
        });
    }, 300);
  }

  // One flat list so arrow keys cross group boundaries the way a person expects.
  const flat: Flat[] = [
    ...sug.products.map((p) => ({
      key: `p${p.id}`,
      href: `/product/${p.id}`,
      label: p.name,
    })),
    ...sug.categories.map((c) => ({
      key: `c${c.id}`,
      href: `/category/${c.id}`,
      label: c.name,
    })),
    ...sug.brands.map((b) => ({ key: `b${b.id}`, href: `/brand/${b.id}`, label: b.name })),
  ];
  const hasAny = flat.length > 0;

  function go(href: string) {
    setOpen(false);
    setActive(-1);
    router.push(href);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && flat[active]) {
      go(flat[active].href);
      return;
    }
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(term)}`);
  }

  let idx = -1;

  return (
    <form className="hdr-search" role="search" onSubmit={submit} action="/products" method="get">
      <label className="sr-only" htmlFor={id}>
        Search products
      </label>
      <input
        id={id}
        name="q"
        type="search"
        autoComplete="off"
        placeholder="Search…"
        value={q}
        role="combobox"
        aria-expanded={open && hasAny}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        onChange={(e) => query(e.target.value)}
        onFocus={() => {
          if (hasAny) setOpen(true);
        }}
        // Delayed so a click on an option lands before the list unmounts.
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setActive(-1);
            return;
          }
          if (!open || !hasAny) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, flat.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          }
        }}
      />
      <button className="hdr-search-go" type="submit" aria-label="Search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      {open && hasAny ? (
        <div className="hdr-pop" id={`${id}-list`} role="listbox" aria-label="Search suggestions">
          {sug.products.length > 0 ? (
            <div className="hdr-group">
              <span className="hdr-group-head" role="presentation">
                Products
              </span>
              {sug.products.map((p) => {
                idx += 1;
                const i = idx;
                return (
                  <div
                    key={p.id}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className="hdr-opt"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      go(`/product/${p.id}`);
                    }}
                    onMouseEnter={() => setActive(i)}
                  >
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="hdr-thumb" src={p.image} alt="" loading="lazy" />
                    ) : (
                      <span className="hdr-thumb hdr-thumb-empty" aria-hidden />
                    )}
                    <span className="hdr-opt-name">{p.name}</span>
                    <span className="hdr-opt-meta num">{formatUsd(p.unitPrice)}</span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {(
            [
              ["Categories", sug.categories, "category"],
              ["Brands", sug.brands, "brand"],
            ] as const
          ).map(([head, rows, seg]) =>
            rows.length > 0 ? (
              <div className="hdr-group" key={head}>
                <span className="hdr-group-head" role="presentation">
                  {head}
                </span>
                {rows.map((r) => {
                  idx += 1;
                  const i = idx;
                  return (
                    <div
                      key={r.id}
                      id={`${id}-opt-${i}`}
                      role="option"
                      aria-selected={i === active}
                      className="hdr-opt"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        go(`/${seg}/${r.id}`);
                      }}
                      onMouseEnter={() => setActive(i)}
                    >
                      <span className="hdr-opt-name">{r.name}</span>
                      <span className="hdr-opt-meta num">{r.productCount}</span>
                    </div>
                  );
                })}
              </div>
            ) : null,
          )}

          <button
            className="hdr-all"
            type="submit"
            onMouseDown={(e) => {
              e.preventDefault();
              const term = q.trim();
              if (term) go(`/products?q=${encodeURIComponent(term)}`);
            }}
          >
            See all results for “{q.trim()}”
          </button>
        </div>
      ) : null}
    </form>
  );
}
