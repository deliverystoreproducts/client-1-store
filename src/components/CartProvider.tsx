"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CART_STORAGE_KEY } from "@/lib/site";
import type { CartLineInput } from "@/lib/public-types";

/**
 * The browser-side cart: product ids and quantities, nothing else.
 *
 * It deliberately does NOT remember prices. A cart that carries its own prices
 * is a cart the customer can edit; every total in this app comes back from the
 * server, priced against the live catalog.
 */

interface CartContext {
  items: CartLineInput[];
  count: number;
  /** False until localStorage has been read, so the header does not flicker. */
  ready: boolean;
  add: (productId: number, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

const Ctx = createContext<CartContext | null>(null);

const MAX_QTY = 99;

function parseStored(raw: string | null): CartLineInput[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: CartLineInput[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const { productId, quantity } = entry as { productId?: unknown; quantity?: unknown };
      const id = Number(productId);
      const qty = Number(quantity);
      if (!Number.isInteger(id) || id <= 0) continue;
      if (!Number.isFinite(qty) || qty <= 0) continue;
      out.push({ productId: id, quantity: Math.min(MAX_QTY, Math.floor(qty)) });
    }
    return out;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineInput[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(parseStored(window.localStorage.getItem(CART_STORAGE_KEY)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* private mode / quota — the cart simply will not survive a reload */
    }
  }, [items, ready]);

  const add = useCallback((productId: number, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (!existing) return [...prev, { productId, quantity: Math.min(MAX_QTY, quantity) }];
      return prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) }
          : i,
      );
    });
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) =>
            i.productId === productId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i,
          ),
    );
  }, []);

  const remove = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContext>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      ready,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, ready, add, setQuantity, remove, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
