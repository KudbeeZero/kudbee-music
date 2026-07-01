import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HERMES Hit Factory — Lyrical Combinator Brain',
  description: 'A multi-agent song-creation studio. Turn a rough idea into a full song package — concept, hooks, lyrics, production, visuals, uniqueness, and a banger score.',
};

// Explicit viewport so the studio scales correctly on phones/tablets and can
// paint into the safe-area (notch) region the mobile bottom sheets pad against.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
