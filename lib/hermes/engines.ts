// The engine rack — HERMES as a professional stack. Each "unit" is a lyrical engine
// that slots into the existing LyricsProvider seam, like outboard gear in a DAW. The
// free Local Combinator is always active ($0, no key); Pro units are upgrade slots that
// light up only when you connect a key/server. Data-only + pure, so the UI (Rack.tsx)
// and future provider selection both read from one source of truth.

export interface EngineUnit {
  id: string;            // matches a LyricsProvider id when wired
  label: string;
  tier: 'free' | 'pro';
  active: boolean;       // currently driving generation
  locked: boolean;       // needs a key/server to enable
  blurb: string;
  unlockHint?: string;   // what it takes to unlock (for locked units)
}

export const ENGINE_UNITS: EngineUnit[] = [
  {
    id: 'mock-lyrics', label: 'Local Combinator', tier: 'free', active: true, locked: false,
    blurb: 'The deterministic $0 lyrical engine — original combinator, rhyme + emotion, no API key.',
  },
  {
    id: 'claude-engine', label: 'Claude Engine', tier: 'pro', active: false, locked: true,
    blurb: 'Real-AI lyric generation behind the same provider seam. Mock stays the default.',
    unlockHint: 'connect an API key to unlock',
  },
  {
    id: 'lightning-engine', label: 'Lightning Engine', tier: 'pro', active: false, locked: true,
    blurb: 'Your own agent on dedicated compute — advance your model for a bigger brain.',
    unlockHint: 'connect a Lightning server to unlock',
  },
];

/** The unit currently driving generation (the free Local Combinator by default). */
export function activeEngine(units: EngineUnit[] = ENGINE_UNITS): EngineUnit {
  return units.find((u) => u.active) ?? units[0];
}
