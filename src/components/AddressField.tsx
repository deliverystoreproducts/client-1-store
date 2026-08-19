"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Address input with suggestions from our own /api/address (Photon, proxied —
 * the browser never talks to a third party). Free text remains valid: this
 * assists entry, it does not gate it — the backend's delivery-zone check at
 * checkout is the authority on where we actually deliver.
 */
export function AddressField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const timer = useRef<number | null>(null);
  const chosen = useRef<string | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  function query(q: string) {
    if (timer.current) window.clearTimeout(timer.current);
    if (q.trim().length < 3 || q === chosen.current) { setItems([]); setOpen(false); return; }
    timer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/address?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const s: string[] = data.suggestions ?? [];
        setItems(s); setActive(-1); setOpen(s.length > 0);
      } catch { /* suggester down → plain input, no noise */ }
    }, 300);
  }

  function pick(s: string) {
    chosen.current = s;
    onChange(s);
    setOpen(false); setItems([]);
  }

  return (
    <div className="addr">
      <input
        id={id}
        className="input"
        autoComplete="street-address"
        placeholder={placeholder}
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        onChange={(e) => { onChange(e.target.value); query(e.target.value); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(items[active]!); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open ? (
        <ul className="addr-pop" id={`${id}-list`} role="listbox">
          {items.map((s, i) => (
            <li
              key={s}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className="addr-opt"
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActive(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
