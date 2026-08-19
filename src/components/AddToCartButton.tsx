"use client";

import { useState } from "react";
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

  if (disabled) {
    return (
      <button className={`btn btn-ghost btn-block${small ? " btn-sm" : ""}`} disabled>
        Unavailable
      </button>
    );
  }

  return (
    <button
      className={`btn btn-block${small ? " btn-sm" : ""}`}
      onClick={() => {
        add(productId, quantity);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1400);
      }}
    >
      {added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
