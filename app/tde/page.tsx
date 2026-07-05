import type { Metadata } from 'next';
import TdeWorkbench from '@/components/tde/TdeWorkbench';

// The route stays a server component so metadata is emitted statically; the
// workbench itself is a client-only island (mirrors app/page.tsx / Landing).
export const metadata: Metadata = {
  title: 'Kudbee TDE — HERMES Workbench',
  description:
    'The Kudbee Task-Driven Environment — a suggest-only cockpit for agents, repos, models, GPU jobs, and training memory. Mock-state prototype: nothing executes.',
};

export default function TdePage() {
  return <TdeWorkbench />;
}
