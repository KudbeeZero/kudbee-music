import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Self-hosted (offline, $0 — no Google Fonts fetch at build/runtime). Space Grotesk
// is the display face (brand, headings, scores); Inter carries body + UI text. Both
// are exposed as CSS variables so the CSS Modules reference them without importing
// next/font anywhere but here — keeping component tests (vitest) free of the SWC dep.
const display = localFont({
  variable: '--font-display',
  display: 'swap',
  src: [
    { path: './fonts/SpaceGrotesk-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/SpaceGrotesk-700.woff2', weight: '700', style: 'normal' },
  ],
});
const body = localFont({
  variable: '--font-body',
  display: 'swap',
  src: [
    { path: './fonts/Inter-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Inter-600.woff2', weight: '600', style: 'normal' },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://wifi-dj-meme.pages.dev'),
  title: 'HERMES Hit Factory — Lyrical Combinator Brain',
  description: 'A multi-agent song-creation studio. Turn a rough idea into a full song package — concept, hooks, lyrics, production, visuals, uniqueness, and a banger score.',
  // Installable PWA: manifest + icons let phones "Add to Home Screen" and open the
  // studio standalone (see docs/mobile.md). Icons rasterize from public/icon.svg
  // via scripts/make-icons.mjs.
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', sizes: '192x192' }],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'HERMES' },
};

// Explicit viewport so the studio scales correctly on phones/tablets and can
// paint into the safe-area (notch) region the mobile bottom sheets pad against.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#07070b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
