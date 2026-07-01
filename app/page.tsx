import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';

// The route stays a server component so metadata is emitted statically; all the
// scroll-driven interactivity lives in the client-only <Landing /> island.
export const metadata: Metadata = {
  title: 'HERMES — a songwriting brain you can watch think',
  description:
    'A local, deterministic songwriting brain. 10 cross-checking agents turn a rough idea into a complete, original song package — concept, hooks, lyrics, production, Suno prompts, scores. $0, no API key, same input → same song.',
  openGraph: {
    title: 'HERMES — a songwriting brain you can watch think',
    description:
      '10 cross-checking agents. $0, local, deterministic, no API key. Every song ships with a generation trace.',
    images: ['/landing/social-preview.png'],
  },
};

export default function Home() {
  return <Landing />;
}
