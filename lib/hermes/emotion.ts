// The Limbic layer — the brain's emotional core. Today emotion is *scored*
// (Emotion Scanner's clarity number); this *shapes* it. It reads the brief's mood
// into an affect model (valence + intensity + a primary feeling), suggests the
// emotional *contrast* that gives a song depth, and maps the song's sections into
// an emotional arc (problem → tension → payoff). Feeds the Writers-Room and lights
// the limbic brain region. Truth-first: the honest feeling, specifically rendered.
import type { SongInputs, SongSection } from './types';
import { keywords } from './text';

/**
 * Emotional clarity (0..1) — how legibly the song lands its feeling: a clear theme,
 * a named audience, a turn (bridge), and enough length to breathe. Deterministic (no
 * RNG), so it can be recomputed faithfully anywhere the pipeline's score is rebuilt.
 */
export function emotionClarity(inputs: SongInputs, sections: SongSection[]): number {
  let c = 0.4;
  if (keywords(inputs.theme).length >= 2) c += 0.2;
  if (inputs.audience.trim()) c += 0.15;
  if (sections.some((s) => /bridge/i.test(s.label))) c += 0.15;
  const lines = sections.reduce((a, b) => a + b.lines.length, 0);
  if (lines >= 10) c += 0.1;
  return Math.min(1, c);
}

export interface EmotionProfile {
  valence: number;        // -1 (dark) .. +1 (bright)
  intensity: number;      // 0 (restrained) .. 1 (explosive)
  primary: string;        // the dominant feeling
  contrast: string;       // the feeling to touch for depth (the turn)
  guidance: string;       // one-line craft nudge from the affect
}

// small affect lexicon — mood words → (valence, intensity, feeling)
const AFFECT: { re: RegExp; v: number; i: number; name: string }[] = [
  { re: /(aggress|hard|angry|rage|menac|violent|savage)/, v: -0.6, i: 0.95, name: 'defiance' },
  { re: /(dark|cold|bleak|grim|numb|empty|hopeless)/, v: -0.8, i: 0.5, name: 'desolation' },
  { re: /(sad|pain|grief|hurt|lonely|broken|mourn|cry)/, v: -0.7, i: 0.55, name: 'grief' },
  { re: /(anxious|paranoid|restless|tense|fear|dread)/, v: -0.5, i: 0.7, name: 'unease' },
  { re: /(triumph|proud|victory|win|rise|unstopp)/, v: 0.7, i: 0.85, name: 'triumph' },
  { re: /(hope|faith|light|heal|redemp|grace|rise)/, v: 0.6, i: 0.5, name: 'hope' },
  { re: /(love|warm|tender|devot|home|family)/, v: 0.7, i: 0.45, name: 'tenderness' },
  { re: /(joy|happy|celebrat|bright|fun|glow)/, v: 0.85, i: 0.7, name: 'joy' },
  { re: /(reflect|calm|still|quiet|nostalg|memory)/, v: 0.1, i: 0.3, name: 'reflection' },
];

// the feeling that best contrasts a given one (the emotional turn that adds depth)
const CONTRAST: Record<string, string> = {
  defiance: 'the tenderness underneath it', desolation: 'a flicker of hope',
  grief: 'gratitude for what was', unease: 'a moment of stillness',
  triumph: 'the cost it took to get here', hope: 'the doubt it had to beat',
  tenderness: 'the fear of losing it', joy: 'the shadow it outran',
  reflection: 'the ache that started it',
};

/** Read the brief's mood into an affect model. */
export function deriveEmotion(inputs: SongInputs): EmotionProfile {
  const text = `${inputs.mood} ${inputs.theme}`.toLowerCase();
  const hits = AFFECT.filter((a) => a.re.test(text));
  if (!hits.length) {
    return { valence: 0, intensity: 0.5, primary: 'ambivalence', contrast: 'a clear stance', guidance: 'Pick one true feeling and commit — ambivalence reads as vagueness.' };
  }
  const valence = +(hits.reduce((s, a) => s + a.v, 0) / hits.length).toFixed(2);
  const intensity = +(Math.max(...hits.map((a) => a.i))).toFixed(2);
  const primary = hits.slice().sort((a, b) => b.i - a.i)[0].name;
  const contrast = CONTRAST[primary] ?? 'the opposite feeling';
  const guidance =
    `Lead with ${primary} (${valence < 0 ? 'dark' : valence > 0 ? 'bright' : 'neutral'}, ` +
    `${intensity > 0.7 ? 'high-intensity' : 'restrained'}), then turn toward ${contrast} for depth. ` +
    `Render the feeling in a concrete image, don't name it.`;
  return { valence, intensity, primary, contrast, guidance };
}

export interface ArcBeat { label: string; beat: 'setup' | 'problem' | 'tension' | 'payoff' | 'resolve'; }

/** Map the song's sections onto an emotional arc (problem → tension → payoff). */
export function emotionalArc(sections: SongSection[]): ArcBeat[] {
  return sections.map((s, i) => {
    const l = s.label.toLowerCase();
    let beat: ArcBeat['beat'];
    if (/intro/.test(l)) beat = 'setup';
    else if (/bridge/.test(l)) beat = 'payoff';
    else if (/outro/.test(l)) beat = 'resolve';
    else if (/hook|chorus/.test(l)) beat = 'tension';
    else if (/verse\s*1|^verse$/.test(l) || i === (sections[0] && /intro/.test(sections[0].label) ? 1 : 0)) beat = 'problem';
    else beat = 'tension';
    return { label: s.label, beat };
  });
}

/** One-line coaching for the Writers-Room from the emotional profile. */
export function emotionCoaching(p: EmotionProfile): string {
  return p.guidance;
}
