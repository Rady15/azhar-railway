import React from 'react';

/**
 * Local avatar placeholder.
 *
 * The app used https://ui-avatars.com for the fallback. That is an external
 * dependency: if the client has no outbound internet, DNS fails, or the host is
 * unreachable, every avatar renders broken (and the request just hangs). This
 * draws the same initials-on-colour avatar locally as an inline SVG data URI —
 * zero network, works offline.
 */
const COLORS = ['#29b4c4', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarDataUri(name?: string | null, size = 128): string {
  const raw = String(name || '?').trim();
  const initials = raw
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || '?';
  const bg = COLORS[hash(raw) % COLORS.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">` +
    `<rect width="128" height="128" rx="24" fill="${bg}"/>` +
    `<text x="64" y="64" font-family="Segoe UI,Arial,sans-serif" font-size="54" ` +
    `font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">` +
    `${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Drop-in replacement for the old `https://ui-avatars.com/api/?name=...` URL. */
export function avatarUrl(name?: string | null, bg = '29b4c4', _fg = 'fff'): string {
  void bg; void _fg;
  return avatarDataUri(name);
}

/** <img> that never renders broken: falls back to a local avatar. */
export function AvatarImg({
  src, name, alt = '', className = '', size = 128,
}: { src?: string | null; name?: string | null; alt?: string; className?: string; size?: number }) {
  const fallback = avatarDataUri(name, size);
  return (
    <img
      src={src || fallback}
      alt={alt}
      className={className}
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement;
        if (el.src !== fallback) el.src = fallback;
      }}
    />
  );
}