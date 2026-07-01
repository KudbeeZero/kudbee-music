// Persona-map doc generator — renders the craft archetypes (PERSONAS + SIGNALS from
// personas.ts / brain/personas.json) to a committable reference. Generated FROM the code
// so it can't drift: regenerate whenever the map changes. Pure + deterministic, $0.
//
// Framing note (load-bearing, not cosmetic): these are archetypes of how a lyrical MIND
// works — subjects, rhyme density, cadence, register, novelty appetite — NEVER a real
// artist and never their words. The doc says so up front.
import { PERSONAS, SIGNALS, PERSONA_MAP } from './personas';

/** Render the persona map as a contributor + artist reference (markdown). */
export function renderPersonasDoc(): string {
  const sections = PERSONAS.map((p) => {
    const signals = (SIGNALS[p.id] ?? []).map((s) => `\`${s}\``).join(', ') || '—';
    return `### ${p.name}  \`${p.id}\`

> ${p.essence}

- **Themes it circles:** ${p.themePalette.join(', ')}
- **Rhyme:** ${p.rhyme.density} density, scheme ${p.rhyme.scheme}${p.rhyme.internal ? ', heavy internal rhyme' : ''}
- **Cadence:** ${p.cadence}
- **Register:** ${p.register}
- **Structure habits:** ${p.structure.join(' → ')}
- **Craft focus:** ${p.craftFocus}
- **Novelty appetite:** ${Math.round(p.novelty * 100)}%
- **Trigger words** (what you'd *describe* to match it): ${signals}`;
  }).join('\n\n');

  return `# 🎭 The Persona Map — craft archetypes

> **Generated from code.** Rendered from \`PERSONAS\` + \`SIGNALS\` in
> [\`lib/hermes/personas.ts\`](../lib/hermes/personas.ts) (data in
> [\`brain/personas.json\`](../brain/personas.json)) — regenerate with
> \`GEN_DOCS=1 npx vitest run personasDoc\`.

**${PERSONA_MAP.note}**

A persona is a model of how a kind of lyrical **mind** works — what it writes about, how
it rhymes, its cadence and register, its appetite for the unexpected. You describe the
*feel* you're chasing and the brain matches the closest archetype, which then biases the
Writers-Room. **No real artist is ever named, matched, or imitated** — the mapping is
about craft, not identity, and the output stays original-only.

## How matching works

\`matchPersona(description)\` scores your described feel against each archetype's trigger
words and returns the best fit (\`suggestPersona(inputs)\` does the same from a full brief).
The chosen persona adds a coaching line + a tailored option to each Writers-Room step via
\`personaOverlay\` — so picking one visibly steers the room.

## The archetypes (${PERSONAS.length})

${sections}

---

*See [\`ARCHITECTURE.md\`](../ARCHITECTURE.md) for how personas fit the wider brain, and
[\`brain/beliefs.json\`](../brain/beliefs.json) for the original-only, truth-first stance.*
`;
}
