import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HERMES Hit Factory — Lyrical Combinator Brain',
  description: 'A multi-agent song-creation studio. Turn a rough idea into a full song package — concept, hooks, lyrics, production, visuals, uniqueness, and a banger score.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
