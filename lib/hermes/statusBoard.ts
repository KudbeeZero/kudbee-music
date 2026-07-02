// The Status Board — status tables GENERATED from brain/roadmap.json, the single
// place project status lives. Born the day the founder found a rotted checklist on
// his phone: hand-maintained status lists drift; generated ones can't, because
// statusBoard.test.ts re-renders everything and fails CI when any committed table
// (STATUS.md, or a STATUS-marker block in CLAUDE.md / README.md / BUILD_LOG.md)
// disagrees with the spine. Pure + deterministic — same roadmap, same bytes.
// Regenerate after editing the spine:  GEN_DOCS=1 npx vitest run status
import roadmap from '../../brain/roadmap.json';

export interface RoadmapItem {
  id: string;
  title: string;
  status: string;
  pr?: string;
  home?: string;
  note?: string;
}
interface Track { name: string; items: RoadmapItem[] }

/** The closed status vocabulary for tracked items (ecosystem blobs stay freeform). */
export const ITEM_STATUSES = ['shipped', 'scaffold-shipped', 'in-progress', 'building', 'next', 'queued', 'idea', 'dropped'] as const;

const EMOJI: Record<string, string> = {
  shipped: '✅', 'scaffold-shipped': '🔌', 'in-progress': '🔨', building: '🔨',
  next: '⏭️', queued: '💤', idea: '💭', dropped: '🗑️',
};

/** Emoji for a status — exact match first, then an honest heuristic for freeform ecosystem statuses. */
export function statusEmoji(status: string): string {
  if (EMOJI[status]) return EMOJI[status];
  const s = status.toLowerCase();
  if (s.includes('shipped')) return '✅';
  if (s.includes('blocked')) return '🚧';
  if (s.includes('pending') || s.includes('paused')) return '💤';
  if (s.includes('later')) return '💭';
  return '❔';
}

// ---- the spine, flattened into tracks --------------------------------------------
type Spine = typeof roadmap;
const spine = roadmap as Spine;

/** Every governed item track (traction sprint, phases, video studio) — NOT ecosystem. */
export function tracks(): Track[] {
  return [
    { name: 'Traction Sprint', items: spine.tractionSprint.items as RoadmapItem[] },
    ...spine.phases.map((p) => ({ name: `Phase ${p.id} — ${p.name}`, items: p.items as RoadmapItem[] })),
    { name: 'Video studio', items: spine.videoStudioTrack.items as RoadmapItem[] },
  ];
}

/** Ecosystem entries (freeform statuses), flattened to renderable rows. */
export function ecosystemRows(): { key: string; status: string }[] {
  return Object.entries(spine.ecosystem)
    .filter(([k, v]) => k !== 'note' && v && typeof v === 'object' && 'status' in (v as object))
    .map(([key, v]) => ({ key, status: String((v as { status: unknown }).status) }));
}

export interface Scoreboard { shipped: number; inBuild: number; queued: number; total: number }

/** Counts across every governed item. */
export function scoreboard(): Scoreboard {
  const all = tracks().flatMap((t) => t.items);
  const shipped = all.filter((i) => i.status === 'shipped').length;
  const inBuild = all.filter((i) => ['in-progress', 'building', 'next', 'scaffold-shipped'].includes(i.status)).length;
  return { shipped, inBuild, queued: all.length - shipped - inBuild, total: all.length };
}

const bar = (done: number, total: number): string => {
  const width = 10;
  const fill = total === 0 ? 0 : Math.round((done / total) * width);
  return `\`${'▰'.repeat(fill)}${'▱'.repeat(width - fill)}\` ${done}/${total}`;
};

const itemRow = (i: RoadmapItem): string =>
  `| ${statusEmoji(i.status)} | **${i.title}** | \`${i.home ?? '—'}\` | ${i.pr ?? '—'} |`;

const GENERATED_BANNER =
  '> **Generated from [`brain/roadmap.json`](brain/roadmap.json) — do not hand-edit.** ' +
  'Status lives ONLY in the spine; edit it there, then regenerate with ' +
  '`GEN_DOCS=1 npx vitest run status`. `statusBoard.test.ts` fails CI if this file drifts.';

/** The full STATUS.md — scoreboard + one table per track + the ecosystem board. */
export function renderStatusMd(): string {
  const sb = scoreboard();
  const trackSections = tracks().map((t) => {
    const done = t.items.filter((i) => i.status === 'shipped').length;
    const rows = t.items.map(itemRow).join('\n');
    return `### ${t.name} — ${bar(done, t.items.length)}\n\n| | Item | Where it lives | PR |\n|---|------|----------------|----|\n${rows}\n`;
  }).join('\n');

  const eco = ecosystemRows()
    .map((e) => `| ${statusEmoji(e.status)} | **${e.key}** | ${e.status} |`)
    .join('\n');

  return `# 📊 HERMES — Status Board

${GENERATED_BANNER}

**Scoreboard:** ✅ ${sb.shipped} shipped · 🔨 ${sb.inBuild} in build · 💤 ${sb.queued} queued — ${sb.total} tracked items
(legend: ✅ shipped · 🔌 scaffold shipped, founder-gated · 🔨 in build · ⏭️ next · 💤 queued · 💭 idea · 🚧 blocked on founder)

## Tracks

${trackSections}
## Ecosystem (freeform, founder-paced)

| | Initiative | Status |
|---|-----------|--------|
${eco}

_The human working list is [\`TODO.md\`](TODO.md); the idea inbox is [\`IDEAS.md\`](IDEAS.md); the highlight reel is the [README roadmap](README.md#-roadmap)._
`;
}

// ---- marker-fenced blocks for other files -----------------------------------------
export const STATUS_BEGIN = '<!-- STATUS:BEGIN generated: edit brain/roadmap.json, then GEN_DOCS=1 npx vitest run status -->';
export const STATUS_END = '<!-- STATUS:END -->';

export type BlockKind = 'claude' | 'readme' | 'buildlog';

/** The compact generated block for each host file. */
export function renderStatusBlock(kind: BlockKind): string {
  const sb = scoreboard();
  const line = `**📊 Status board:** ✅ ${sb.shipped} shipped · 🔨 ${sb.inBuild} in build · 💤 ${sb.queued} queued (${sb.total} tracked) — full tables in [\`STATUS.md\`](STATUS.md), source of truth [\`brain/roadmap.json\`](brain/roadmap.json).`;

  if (kind === 'claude') return `${STATUS_BEGIN}\n${line}\n${STATUS_END}`;

  if (kind === 'readme') {
    const open = tracks()
      .flatMap((t) => t.items)
      .filter((i) => i.status !== 'shipped' && i.status !== 'dropped');
    const rows = open.map((i) => `| ${statusEmoji(i.status)} | **${i.title.split(' — ')[0]}** | \`${i.id}\` |`).join('\n');
    return `${STATUS_BEGIN}\n${line}\n\n| | Up next | id |\n|---|---------|----|\n${rows}\n${STATUS_END}`;
  }

  // buildlog — the video-studio track, the checklist that once rotted on the founder's phone
  const rows = (spine.videoStudioTrack.items as RoadmapItem[]).map(itemRow).join('\n');
  return `${STATUS_BEGIN}\n${line}\n\n| | Item | Where it lives | PR |\n|---|------|----------------|----|\n${rows}\n${STATUS_END}`;
}

/** Replace the fenced block inside a host file's source. Throws if markers are missing/mangled. */
export function injectStatusBlock(source: string, kind: BlockKind): string {
  const start = source.indexOf(STATUS_BEGIN);
  const end = source.indexOf(STATUS_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`STATUS markers missing or out of order for ${kind}`);
  }
  return source.slice(0, start) + renderStatusBlock(kind) + source.slice(end + STATUS_END.length);
}

/** Extract a host file's current fenced block (for drift comparison). */
export function extractStatusBlock(source: string): string | null {
  const start = source.indexOf(STATUS_BEGIN);
  const end = source.indexOf(STATUS_END);
  if (start === -1 || end === -1 || end < start) return null;
  return source.slice(start, end + STATUS_END.length);
}
