import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '18vh 24px 24px' }}>
      <p style={{ letterSpacing: '0.4em', fontSize: 12, color: 'var(--amber)', margin: 0 }}>HERMES</p>
      <h1 style={{ fontSize: 'clamp(40px, 8vw, 76px)', lineHeight: 1.02, marginTop: 10 }}>
        Hit Factory
      </h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 18, maxWidth: 560, marginTop: 16 }}>
        A multi-agent song-creation brain. Enter a rough idea — HERMES turns it into a
        complete, original song package: concept, hooks, lyrics, production, visuals,
        uniqueness report, and a banger score.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
        <Link href="/hermes" style={ctaStyle(true)}>Open the Hit Factory →</Link>
        <Link href="/hit-factory" style={ctaStyle(false)}>/hit-factory</Link>
      </div>
      <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 40 }}>
        V1 runs fully local with mock generation — no API keys required.
      </p>
    </main>
  );
}

function ctaStyle(primary: boolean): React.CSSProperties {
  return {
    textDecoration: 'none',
    padding: '13px 20px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 15,
    border: '1px solid var(--line-strong)',
    background: primary ? 'linear-gradient(180deg, var(--amber), var(--amber-2))' : 'transparent',
    color: primary ? '#1a1206' : 'var(--ink)',
  };
}
