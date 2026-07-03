// Small $0, deterministic SVG glyphs for the Agent Network codenames — line-art in
// the same stroke-only style as BrainScan.tsx, never a photorealistic/likeness
// image (no living-artist mimicry risk, no image asset, no API key). Each glyph
// is a plain abstract shape evoking the codename's craft (Synapse → a spark
// between two nodes, Vylo → an alchemist's flask, etc.), not a character
// portrait — a real still portrait is a separate, founder-gated step
// (TODO.md "Agent images → avatars").
import type { AgentCodename } from '@/lib/hermes/agents';

const GLYPHS: Record<AgentCodename, JSX.Element> = {
  Nexus: (
    <>
      <circle cx="20" cy="20" r="4" />
      <circle cx="20" cy="7" r="2.4" />
      <circle cx="32" cy="27" r="2.4" />
      <circle cx="8" cy="27" r="2.4" />
      <path d="M20 16 L20 9.4 M23 22 L29.5 25.8 M17 22 L10.5 25.8" fill="none" />
    </>
  ),
  Synapse: (
    <>
      <circle cx="9" cy="20" r="3.4" />
      <circle cx="31" cy="20" r="3.4" />
      <path d="M12 20 L17 14 L23 26 L28 20" fill="none" />
    </>
  ),
  Vylo: (
    <path
      d="M16 6 H24 V13 L30 30 Q30 34 26 34 H14 Q10 34 10 30 L16 13 Z M14 22 H26"
      fill="none"
    />
  ),
  Rhythmix: (
    <path d="M8 26 V14 M15 30 V10 M22 24 V16 M29 28 V12" fill="none" strokeLinecap="round" />
  ),
  Echo: (
    <>
      <circle cx="20" cy="20" r="3" />
      <circle cx="20" cy="20" r="9" fill="none" opacity="0.6" />
      <circle cx="20" cy="20" r="15" fill="none" opacity="0.3" />
    </>
  ),
  Sentinel: <path d="M20 6 L32 11 V20 Q32 30 20 34 Q8 30 8 20 V11 Z" fill="none" />,
  Harmony: (
    <path
      d="M6 24 Q13 14 20 24 T34 24 M6 16 Q13 6 20 16 T34 16"
      fill="none"
      opacity="0.85"
    />
  ),
  Lumi: (
    <>
      <circle cx="20" cy="20" r="6" />
      <path
        d="M20 4 V9 M20 31 V36 M4 20 H9 M31 20 H36 M9 9 L12.5 12.5 M27.5 27.5 L31 31 M31 9 L27.5 12.5 M12.5 27.5 L9 31"
        strokeLinecap="round"
      />
    </>
  ),
  Drifter: (
    <>
      <circle cx="20" cy="20" r="14" fill="none" />
      <path d="M26 14 L17 17 L14 26 L23 23 Z" fill="none" />
    </>
  ),
  Beacon: (
    <>
      <path d="M15 34 L17 12 H23 L25 34 Z" fill="none" />
      <path d="M8 18 Q11 20 8 22 M32 18 Q29 20 32 22" fill="none" strokeLinecap="round" />
    </>
  ),
};

export default function AgentAvatar({
  codename,
  color,
  size = 16,
}: {
  codename?: AgentCodename;
  color: string;
  size?: number;
}) {
  const glyph = codename && GLYPHS[codename];
  if (!glyph) return null;
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role="img"
      aria-label={`${codename} glyph`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      stroke={color}
      fill={color}
      strokeWidth="2.4"
    >
      {glyph}
    </svg>
  );
}
