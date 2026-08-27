"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";

export function AddToCartButton({
  productId,
  disabled,
  small,
  quantity = 1,
}: {
  productId: number;
  disabled?: boolean;
  small?: boolean;
  quantity?: number;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  if (disabled) {
    return (
      <button className={`btn btn-ghost btn-block${small ? " btn-sm" : ""}`} disabled>
        Sold out
      </button>
    );
  }

  // On a tile the button is quiet (ghost) so twenty-four of them do not shout at
  // once; on the product page it is the primary action and reads as one.
  const tone = small ? "btn btn-ghost btn-block btn-sm" : "btn btn-block";

  return (
    <button
      className={tone}
      data-added={added}
      onClick={() => {
        add(productId, quantity);
        setAdded(true);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setAdded(false), 1600);
      }}
    >
      {added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
