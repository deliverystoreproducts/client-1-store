"use client";

import { useEffect, useRef } from "react";

/**
 * Drop inside a GET <form>: any change to a control submits it. Choosing
 * "Indica" IS the action — there is nothing to confirm afterwards. Typed
 * fields (price, THC) wait until the customer pauses. Without JavaScript the
 * form still has its <noscript> submit button.
 */
export function AutoSubmit() {
  const marker = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;
    let timer: number | null = null;
    const submit = () => form.requestSubmit();
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.type === "number" || t.type === "text" || t.type === "search") {
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(submit, 600);
      } else {
        submit();
      }
    };
    form.addEventListener("change", onChange);
    return () => {
      form.removeEventListener("change", onChange);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return <span ref={marker} hidden />;
}
