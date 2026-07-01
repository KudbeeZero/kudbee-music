// Output-safety filter. The combinator is original-by-construction (it recombines
// the artist's OWN words), but a generated hook could still coincidentally echo a
// very famous line. This screens generated text against a small, extensible list of
// well-known phrases/titles and flags a near-match so the artist can change it before
// release. It is a HEURISTIC aid, not legal advice — see SAFETY_DISCLAIMER. $0, local.

// A starter list of widely-recognizable phrases/titles. Titles/short phrases aren't
// themselves protectable, but an accidental echo reads as unoriginal — so we flag it.
// Grow this list over time; keep entries short and lowercase.
export const FAMOUS_PHRASES: string[] = [
  'started from the bottom',
  'empire state of mind',
  'eye of the tiger',
  'sweet dreams are made of this',
  'we will rock you',
  'born to run',
  'smells like teen spirit',
  'purple rain',
  'stairway to heaven',
  'bohemian rhapsody',
  'sweet home alabama',
  'living on a prayer',
  'billie jean',
  'rolling in the deep',
  'lose yourself',
  'in da club',
  'hips don\'t lie',
  'shake it off',
  'old town road',
  'god\'s plan',
];

export interface SafetyFlag {
  phrase: string;   // the famous phrase that was echoed
  line: string;     // the line it appeared in
}

export const SAFETY_DISCLAIMER =
  'Lyrics are generated locally from your own inputs and are provided as a creative ' +
  'starting point. HERMES does not guarantee originality — you are responsible for ' +
  'clearing any song before you release or monetize it. Coincidental similarity to ' +
  'existing works is possible; always review.';

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

/** Screen a block of lyrics line-by-line for echoes of famous phrases. */
export function screenFamousPhrases(text: string, list: string[] = FAMOUS_PHRASES): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  const seen = new Set<string>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const n = ` ${norm(line)} `;
    for (const phrase of list) {
      const p = norm(phrase);
      if (p && n.includes(` ${p} `) && !seen.has(p)) {
        seen.add(p);
        flags.push({ phrase, line });
      }
    }
  }
  return flags;
}

/** Convenience: is this text clear of famous-phrase echoes? */
export function isClear(text: string, list: string[] = FAMOUS_PHRASES): boolean {
  return screenFamousPhrases(text, list).length === 0;
}
