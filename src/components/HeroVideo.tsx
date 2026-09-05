"use client";

import { useState } from "react";

/**
 * The hero video and what stands in for it while it loads.
 *
 * A background loop is scenery; a black rectangle is not. Until the first
 * frame is actually playing, a greyed-out icon on a neutral ground holds the
 * space, the way an empty media slot does — quiet, not decorative. When an
 * operator has uploaded a still, that is the poster and wins over the icon.
 * The video fades in over the placeholder on `playing`.
 */
export function HeroVideo({ src, poster }: { src: string; poster: string | null }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="hero-media hero-video-wrap" data-playing={playing || undefined} aria-hidden>
      {!poster ? (
        <div className="hero-placeholder">
          {/* One grey line icon, the way an image slot is greyed out — nothing
              drawn, nothing animated. */}
          <svg className="hero-placeholder-icon" viewBox="0 0 64 40" role="presentation" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 26 L50 14 Q56 12 57 18 Q58 24 52 26 L16 34 Q10 36 9 30 Q8 26 14 26 Z" />
            <path d="M22 28 l2 -6 M30 26 l2 -6 M38 24 l2 -6" strokeOpacity="0.6" />
            <path d="M50 14 Q52 22 52 26" strokeOpacity="0.6" />
            <circle cx="10" cy="31" r="2" />
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
