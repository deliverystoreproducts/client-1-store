"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { buildField, CA_CENTER_X, GRID, type DotPin, type Region } from "@/lib/geo/dotfield";
import { answer, type CityAnswer } from "@/lib/geo/city-search";
import type { Pin } from "@/lib/geo/tiles";

/**
 * MAP-02: the home page's "Where we deliver" as a living dot map (owner, 2026-09-22: "I love the idea of dots,
 * they're cool to look at and touch … more interactive is cool").
 *
 * The whole section is a field of ~6,000 dots on one canvas: ocean, the neighbouring states, California brighter,
 * the shop's delivery areas glowing and breathing. Dots under the pointer swell and part like a lens; a tap
 * anywhere sends a ripple across the field; hovering a green city shows it, tapping it opens its page; a region
 * label dims the others and lists its cities; the search lights the city it finds. Idle, a soft pulse leaves a
 * random delivery city every few seconds.
 *
 * Canvas, no library, nothing from another origin (the site's CSP holds). Motion stops for people who ask their
 * system for reduced motion, and the animation pauses while the section is off screen.
 */
const COL = ["#121a1f", "#1d2429", "#5d6a72"];
const HOT = "#4ade80", WARM = "#23915a", DIM_HOT = "#1f5c3a", DIM_WARM = "#17402b";

interface Ripple { x: number; y: number; t: number; p: number }

export function DotMap({ pins }: { pins: Pin[] }) {
  const field = useMemo(() => buildField(pins), [pins]);
  const box = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const live = useRef({ mouse: { x: -999, y: -999, on: false }, ripples: [] as Ripple[], focus: -1, pinned: null as DotPin | null, s: 1, ox: 0, oy: 0 });
  const [view, setView] = useState({ s: 1, ox: 0, oy: 0 });
  const [tip, setTip] = useState<DotPin | null>(null);
  const [open, setOpen] = useState<Region | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CityAnswer | null>(null);

  const link = (p: Pin) => `/delivery/${encodeURIComponent(p.zoneSlug ?? p.slug)}`;

  useEffect(() => {
    const el = box.current, cv = canvas.current;
    if (!el || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const L = live.current;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dots = field.dots.map((d) => ({ ...d, dx: 0, dy: 0, g: 0 }));
    let dpr = 1, cw = 0, ch = 0, raf = 0, visible = true;
    const t0 = performance.now();

    const fit = () => {
      cw = el.clientWidth; ch = el.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = cw * dpr; cv.height = ch * dpr; cv.style.width = `${cw}px`; cv.style.height = `${ch}px`;
      const s = Math.max(cw / GRID.W, ch / GRID.H);
      // Wide: the whole field. Narrow (a phone): scale to the height and keep California centred.
      const ox = cw / GRID.W >= ch / GRID.H ? 0 : Math.min(0, Math.max(cw - GRID.W * s, cw / 2 - CA_CENTER_X * s));
      const oy = (ch - GRID.H * s) / 2;
      Object.assign(L, { s, ox, oy });
      setView({ s, ox, oy });
    };
    const toDesign = (px: number, py: number): [number, number] => [(px - L.ox) / L.s, (py - L.oy) / L.s];
    const nearest = (x: number, y: number): DotPin | null => {
      let best: DotPin | null = null, bd = (18 / L.s) ** 2;
      for (const p of field.pins) { const e = (p.x - x) ** 2 + (p.y - y) ** 2; if (e < bd) { bd = e; best = p; } }
      return best;
    };
    const ripple = (x: number, y: number, p = 1) => { if (!reduce) L.ripples.push({ x, y, t: performance.now(), p }); };
    (L as unknown as { ripple: typeof ripple }).ripple = ripple;

    const onMove = (e: PointerEvent) => {
      const b = cv.getBoundingClientRect();
      L.mouse = { x: e.clientX - b.left, y: e.clientY - b.top, on: true };
      const z = nearest(...toDesign(L.mouse.x, L.mouse.y));
      cv.style.cursor = z ? "pointer" : "crosshair";
      if (!L.pinned) setTip(z);
    };
    const onLeave = () => { L.mouse.on = false; if (!L.pinned) setTip(null); };
    const onClick = (e: MouseEvent) => {
      const b = cv.getBoundingClientRect();
      const [x, y] = toDesign(e.clientX - b.left, e.clientY - b.top);
      const z = nearest(x, y);
      if (z) { window.location.href = link(z); return; }
      ripple(x, y, 1);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    cv.addEventListener("click", onClick);

    const idle = window.setInterval(() => {
      if (!L.mouse.on && visible && document.visibilityState === "visible" && field.pins.length) {
        const z = field.pins[(Math.random() * field.pins.length) | 0]!;
        ripple(z.x, z.y, 0.6);
      }
    }, 2600);

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      const T = (now - t0) / 1000, s = L.s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      const [mx, my] = toDesign(L.mouse.x, L.mouse.y), lens = 110 / s;
      L.ripples = L.ripples.filter((r) => now - r.t < 1800 * r.p);
      for (const d of dots) {
        let boost = 0, push = 0, ux = 0, uy = 0;
        if (L.mouse.on) {
          const ex = d.x - mx, ey = d.y - my, dist = Math.hypot(ex, ey);
          if (dist < lens) { let f = 1 - dist / lens; f *= f; boost += f * 1.3; push = f * 7; if (dist > 0.01) { ux = ex / dist; uy = ey / dist; } }
        }
        for (const r of L.ripples) {
          const age = (now - r.t) / 1000, band = Math.abs(Math.hypot(d.x - r.x, d.y - r.y) - age * 260 * r.p);
          if (band < 22) boost += (1 - band / 22) * (1 - age / (1.8 * r.p)) * 1.1 * r.p;
        }
        d.dx += (ux * push - d.dx) * 0.18; d.dy += (uy * push - d.dy) * 0.18; d.g += (boost - d.g) * 0.2;
        let base = d.t === 0 ? 1.4 : d.t === 1 ? 1.9 : 2.8, col = COL[d.t]!, glow = false;
        const dimmed = L.focus >= 0 && d.reg !== L.focus;
        if (d.heat === 1) { col = dimmed ? DIM_WARM : WARM; base = 3.0; }
        if (d.heat === 2) {
          base = 3.4 + (reduce ? 0 : Math.sin(T * 2.2 + d.x * 0.05 + d.y * 0.03) * 0.35);
          col = dimmed ? DIM_HOT : HOT; glow = !dimmed;
        }
        if (d.g > 0.25 && !d.heat) col = d.t === 0 ? "#26404a" : d.t === 1 ? "#3b4a52" : "#9aa8b0";
        const r = (base + d.g * (d.t === 0 ? 1.4 : 2.2)) * Math.min(1.25, s);
        ctx.beginPath();
        ctx.arc((d.x + d.dx) * s + L.ox, (d.y + d.dy) * s + L.oy, r, 0, 6.2832);
        ctx.shadowBlur = glow ? 10 * s + d.g * 8 : 0;
        if (glow) ctx.shadowColor = HOT;
        ctx.fillStyle = col;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (L.pinned) {
        ctx.beginPath();
        ctx.arc(L.pinned.x * s + L.ox, L.pinned.y * s + L.oy, 7 + Math.sin(T * 4) * 1.5, 0, 6.2832);
        ctx.fillStyle = "#fff"; ctx.shadowColor = HOT; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
      }
      if (!reduce || L.mouse.on || L.ripples.length) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    el.addEventListener("pointermove", kick);
    el.addEventListener("click", kick);
    // Off screen, the field sleeps: 6,000 dots at 60 fps is not free on a phone.
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; if (visible) kick(); });
    io.observe(el);
    (L as unknown as { kick: () => void }).kick = kick;

    fit();
    const ro = new ResizeObserver(() => { fit(); kick(); });
    ro.observe(el);
    kick();
    return () => {
      cancelAnimationFrame(raf); window.clearInterval(idle); io.disconnect(); ro.disconnect();
      el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointermove", kick); el.removeEventListener("click", kick); cv.removeEventListener("click", onClick);
    };
  }, [field]);

  const act = () => live.current as unknown as { ripple?: (x: number, y: number, p?: number) => void; kick?: () => void };
  const focusRegion = (r: Region | null) => { live.current.focus = r ? r.id : -1; act().kick?.(); };
  const search = (text: string) => {
    setQuery(text);
    live.current.pinned = null;
    if (text.trim().length < 2) { setResult(null); setTip(null); focusRegion(null); return; }
    const a = answer(text, pins);
    setResult(a);
    const target = a.kind === "delivers" ? a.pin : a.kind === "nearby" ? a.nearest : null;
    const dp = target ? field.pins.find((p) => p.slug === target.slug) ?? null : null;
    if (dp) {
      live.current.pinned = dp; setTip(dp); setOpen(null);
      focusRegion(field.regions[dp.reg] ?? null);
      act().ripple?.(dp.x, dp.y, 1.6); act().kick?.();
    } else { setTip(null); focusRegion(null); }
  };

  if (field.pins.length === 0) return null;
  const at = (x: number, y: number) => ({ left: x * view.s + view.ox, top: y * view.s + view.oy });

  return (
    <div className="dm" ref={box}>
      <canvas ref={canvas} aria-label={`Dot map of California. The ${field.pins.length} cities we deliver to glow.`} />
      <div className="dm-top">
        <input className="dm-q" type="search" value={query} onChange={(e) => search(e.target.value)}
          placeholder="Do you deliver to my city?" aria-label="Search for your city" autoComplete="off" enterKeyHint="search" />
        {result?.kind === "delivers" ? (
          <p className="dm-note">Yes, we deliver to <b>{result.pin.city}</b>{result.pin.minimumOrder > 0 ? ` · $${result.pin.minimumOrder.toFixed(0)} minimum` : ""} · <Link href={link(result.pin)}>Details →</Link></p>
        ) : result?.kind === "nearby" ? (
          <p className="dm-note">Not in {result.asked} yet. Closest: <Link href={link(result.nearest)}>{result.nearest.city}</Link>, about {result.miles} mi away.</p>
        ) : result?.kind === "unknown" ? (
          <p className="dm-note">We could not find that city. <Link href="/delivery">See every city we deliver to →</Link></p>
        ) : open ? (
          <p className="dm-note"><b>{open.name}</b> · {open.pins.map((p, i) => <span key={p.slug}>{i ? " · " : ""}<Link href={link(p)}>{p.city}</Link></span>)}</p>
        ) : null}
      </div>
      {field.regions.map((r) => (
        <button key={r.id} type="button" className="dm-label" style={{ left: at(r.x, r.y).left + 28, top: at(r.x, r.y).top - 18 }}
          onMouseEnter={() => focusRegion(r)} onMouseLeave={() => { if (open?.id !== r.id) focusRegion(null); }}
          onClick={() => { const next = open?.id === r.id ? null : r; setOpen(next); setResult(null); setQuery(""); live.current.pinned = null; focusRegion(next); if (next) { act().ripple?.(r.x, r.y, 1.4); act().kick?.(); } }}
          aria-expanded={open?.id === r.id}>
          <b>{r.name}</b>
          <span>{r.pins.length} {r.pins.length === 1 ? "city" : "cities"}</span>
        </button>
      ))}
      {tip ? (
        <div className="dm-tip" style={at(tip.x, tip.y)}>
          <b>{tip.city}</b>
          <span>{tip.minimumOrder > 0 ? `$${tip.minimumOrder.toFixed(0)} minimum` : "No minimum"} · tap for details</span>
        </div>
      ) : null}
      <p className="dm-hint">Move over the map · tap a green city · tap anywhere else for a ripple</p>
    </div>
  );
}
