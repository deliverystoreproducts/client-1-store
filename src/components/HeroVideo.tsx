"use client";

import { useState } from "react";

/**
 * The hero video and what stands in for it while it loads.
 *
 * A background loop is scenery; a black rectangle is not. Until the first
 * frame is actually playing, a drawn placeholder holds the space — a blunt
 * with its ember lit and three lines of smoke drifting up — in the store's
 * own colours, so a slow connection shows something that looks chosen. When
 * an operator has uploaded a still, that is the poster and wins over the
 * drawing. The video fades in over the placeholder on `playing`.
 */
export function HeroVideo({ src, poster }: { src: string; poster: string | null }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="hero-media hero-video-wrap" data-playing={playing || undefined} aria-hidden>
      {!poster ? (
        <div className="hero-placeholder">
          <svg className="hero-blunt" viewBox="0 0 320 200" role="presentation">
            <defs>
              <linearGradient id="hb-paper" x1="0" x2="1">
                <stop offset="0" stopColor="#c9a66b" />
                <stop offset="1" stopColor="#8b6a3a" />
              </linearGradient>
              <radialGradient id="hb-ember" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#fff2b0" />
                <stop offset="0.45" stopColor="#ff8a1f" />
                <stop offset="1" stopColor="#ff8a1f" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* smoke */}
            <g className="hero-smoke" fill="none" strokeLinecap="round" strokeWidth="2.5">
              <path className="hero-smoke-1" d="M62 92c-14-14 12-26-2-40S48 26 60 14" />
              <path className="hero-smoke-2" d="M74 88c-12-12 10-24-4-38S60 24 72 10" />
              <path className="hero-smoke-3" d="M52 98c-10-10 8-20-4-32S40 40 50 30" />
            </g>
            {/* blunt: a tapered roll, twisted tip on the left, mouth on the right */}
            <g transform="rotate(-12 160 130)">
              <path d="M66 122 L268 108 Q284 108 284 124 Q284 140 268 140 L66 150 Q56 150 54 136 Z" fill="url(#hb-paper)" />
              <path d="M66 122 L268 108" stroke="#5f4526" strokeOpacity="0.35" strokeWidth="1" />
              <path d="M60 136 q6 -8 14 -2 M80 128 q6 -8 14 -2 M100 126 q6 -8 14 -2" stroke="#5f4526" strokeOpacity="0.28" strokeWidth="1.2" fill="none" />
              <rect x="252" y="108" width="24" height="33" rx="3" fill="#a07a44" opacity="0.9" />
              <circle className="hero-ember" cx="58" cy="136" r="16" fill="url(#hb-ember)" />
              <ellipse cx="58" cy="136" rx="6" ry="9" fill="#3a2a1a" />
            </g>
          </svg>
        </div>
      ) : null}
      <video
        className="hero-video"
        src={src}
        poster={poster ?? undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={() => setPlaying(true)}
      />
    </div>
  );
}
