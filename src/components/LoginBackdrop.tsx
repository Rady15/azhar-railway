import React, { useEffect, useState } from 'react';

/**
 * Animated photo backdrop for the sign-in screen.
 *
 * Every image in /Azhar_V004_Images_Color is layered on top of the others. Each
 * layer runs a slow Ken-Burns zoom and cross-fades, so the background is
 * continuously moving without any scroll or interaction.
 *
 * The slides fade with a per-layer opacity animation (see the keyframes below)
 * rather than JS timers, so a slow first paint never leaves the screen blank.
 */
// Served by nginx from /var/www/multisite/login-bg (converted from the
// 55 MB of source PNGs down to ~200 KB per JPEG).
const SLIDES = Array.from({ length: 22 }, (_, i) => `/login-bg/bg_${String(i + 1).padStart(2, '0')}.jpg`);

const FADE_MS = 9000;   // time each image is fully visible
const TOTAL_MS = 15000; // one full zoom cycle before an image restarts

export function LoginBackdrop() {
  const [active, setActive] = useState(0);

  // advance through the images
  useEffect(() => {
    const id = setInterval(() => {
      setActive(i => (i + 1) % SLIDES.length);
    }, FADE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* base tint so the form stays readable over bright artwork */}
      <div className="absolute inset-0 bg-slate-950" />

      {SLIDES.map((src, i) => {
        const isActive = i === active;
        return (
          <div
            key={src}
            className="absolute inset-0 login-backdrop-slide"
            style={{
              backgroundImage: `url("${src}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              // only the active slide is opaque; the others fade away
              opacity: isActive ? 1 : 0,
              transition: `opacity ${FADE_MS / 1000}s ease-in-out`,
              // slow continuous zoom, restarting each time the slide becomes active
              animation: isActive
                ? `loginKenBurns ${TOTAL_MS / 1000}s ease-out forwards`
                : 'none',
              willChange: 'opacity, transform',
            }}
          />
        );
      })}

      {/* legibility overlay: darken the art and fade the bottom so the
          form floats on a readable gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,10,20,0.55) 0%, rgba(6,10,20,0.35) 35%, rgba(6,10,20,0.72) 100%)',
        }}
      />

      <style>{`
        @keyframes loginKenBurns {
          0%   { transform: scale(1.00) translate3d(0, 0, 0); }
          100% { transform: scale(1.14) translate3d(-1.6%, -1.2%, 0); }
        }

        /* respect users who ask for less motion: keep the cross-fade,
           drop the zoom */
        @media (prefers-reduced-motion: reduce) {
          .login-backdrop-slide {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default LoginBackdrop;