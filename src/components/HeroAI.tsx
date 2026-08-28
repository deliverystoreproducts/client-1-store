"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { apiGet } from "@/lib/client-api";
import { formatUsd } from "@/lib/money";
import type { PublicProduct } from "@/lib/public-types";

/**
 * The AI budtender hero — the legacy puffnluff robot, ported.
 *
 * Closed: the violet card over the robot artwork, a one-line pitch, quick
 * prompts and an input. Open: a chat that streams from /api/budtender (our own
 * BFF; the browser never learns where the answers come from) and renders
 * [PRODUCT:id] mentions as add-to-cart cards, resolved lazily through
 * /api/catalog/:id so the whole shelf never ships with the hero.
 *
 * Rendered only when NEXT_PUBLIC_HERO_AI=on (lib/site.ts HERO_AI) — the forks
 * share this code, and a shop that wants a banner hero keeps its banner.
 */

type Message = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "What's good for sleep tonight?",
  "Recommend a relaxing indica",
  "Best edibles for beginners?",
  "I want something creative",
  "Show me a strong hybrid",
];

function ChatProductCard({ product }: { product: PublicProduct }) {
  const { add } = useCart();
  return (
    <span className="bud-product">
      <Link href={`/product/${product.id}`} className="bud-product-thumb">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt="" loading="lazy" />
        ) : (
          <span aria-hidden>🌿</span>
        )}
      </Link>
      <Link href={`/product/${product.id}`} className="bud-product-body">
        <span className="bud-product-name">{product.name}</span>
        <span className="bud-product-meta">
          {product.brand?.name ?? product.category?.name ?? ""}
        </span>
        <span className="bud-product-price num">
          {formatUsd(product.unitPrice)}
          {product.salePrice != null ? <s>{formatUsd(product.price)}</s> : null}
        </span>
      </Link>
      <button
        type="button"
        className="bud-product-add"
        aria-label={`Add ${product.name} to cart`}
        onClick={() => add(product.id, 1)}
      >
        +
      </button>
    </span>
  );
}

export function HeroAI({ storeName, total }: { storeName: string; total: number }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [outOfMessages, setOutOfMessages] = useState(false);
  const [products, setProducts] = useState<Map<number, PublicProduct>>(new Map());
  const requested = useRef<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Resolve any [PRODUCT:id] the assistant mentioned that we have not seen.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    for (const m of last.content.matchAll(/\[PRODUCT:(\d+)\]/g)) {
      const id = Number(m[1]);
      if (!id || requested.current.has(id)) continue;
      requested.current.add(id);
      apiGet<{ product: PublicProduct }>(`/api/catalog/${id}`)
        .then((r) => setProducts((prev) => new Map(prev).set(id, r.product)))
        .catch(() => undefined);
    }
  }, [messages]);

  const rendered = useMemo(() => {
    return (content: string) => {
      const parts = content.split(/\[PRODUCT:(\d+)\]/g);
      return parts.map((part, i) => {
        if (i % 2 === 1) {
          const p = products.get(Number(part));
          return p ? <ChatProductCard key={`p${part}-${i}`} product={p} /> : null;
        }
        return part ? <span key={`t${i}`}>{part}</span> : null;
      });
    };
  }, [products]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming || outOfMessages) return;
    if (!open) setOpen(true);
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    try {
      const res = await fetch("/api/budtender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 429) setOutOfMessages(true);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: err.error || "Sorry, I'm having trouble right now." },
        ]);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.trim();
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const { text: t } = JSON.parse(payload) as { text?: string };
            if (t) acc += t;
          } catch {
            /* partial frame — ignore */
          }
        }
        const soFar = acc;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: soFar };
          return copy;
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, something went wrong. Try again?" },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  const inputRow = (
    <form
      className="bud-input-row"
      onSubmit={(e) => {
        e.preventDefault();
        void send(input);
      }}
    >
      {outOfMessages ? (
        <p className="bud-limit">That&apos;s all for today — come back tomorrow.</p>
      ) : (
        <>
          <input
            ref={inputRef}
            className="bud-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="What are you in the mood for?"
            aria-label="Ask the AI budtender"
          />
          <button type="submit" className="bud-send" aria-label="Send" disabled={streaming}>
            ➤
          </button>
        </>
      )}
    </form>
  );

  return (
    <section className="bud-hero" aria-label="AI budtender">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="bud-bg" src="/hero-budtender-bg.png" alt="" aria-hidden />
      <span className="bud-scrim" aria-hidden />

      {!open ? (
        <div className="bud-closed">
          <div className="bud-pitch">
            <span className="bud-badge">
              <i aria-hidden /> Live menu · {total} products
            </span>
            <h1 className="bud-title">
              {storeName ? `${storeName}'s` : "Your"} AI budtender.
            </h1>
            <p className="bud-sub">
              Tell it your mood — it pulls the right strain, edible or cart off the live shelf.
            </p>
            <Link className="btn bud-shop" href="/products">
              Shop menu
            </Link>
          </div>

          <div className="bud-card">
            <p className="bud-card-head">
              <span aria-hidden>✦</span> Ask the AI budtender
            </p>
            {inputRow}
            <div className="bud-prompts">
              {QUICK_PROMPTS.slice(0, 4).map((q) => (
                <button key={q} type="button" onClick={() => void send(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bud-chat">
          <div className="bud-chat-head">
            <button
              type="button"
              className="bud-back"
              aria-label="Close chat"
              onClick={() => {
                setOpen(false);
                setMessages([]);
              }}
            >
              ←
            </button>
            <div>
              <p className="bud-chat-title">AI Budtender</p>
              <p className="bud-chat-sub">Live menu · {total} products</p>
            </div>
          </div>

          <div className="bud-scroll" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="bud-prompts bud-prompts-center">
                {QUICK_PROMPTS.map((q) => (
                  <button key={q} type="button" onClick={() => void send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "bud-msg bud-msg-user" : "bud-msg"}>
                <div className="bud-bubble">
                  {m.content ? (
                    rendered(m.content)
                  ) : streaming && i === messages.length - 1 ? (
                    <span className="bud-cursor" aria-hidden />
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="bud-chat-foot">{inputRow}</div>
        </div>
      )}
    </section>
  );
}
