import type { Metadata } from 'next';
import Link from 'next/link';
import { tracks, scoreboard } from '@/lib/hermes/statusBoard';
import styles from '@/components/landing/landing.module.css';
import fstyles from './features.module.css';

// Public "what's coming" showcase — GENERATED from brain/roadmap.json (the same
// spine STATUS.md/CLAUDE.md read), never a second hand-maintained feature list.
// Founder ask: a flashy public page showing shipped/building/queued work. Server
// component, no client JS — the data is static at build time, same as the rest
// of this $0 static-export app.

export const metadata: Metadata = {
  title: "What's Coming — HERMES",
  description:
    'Shipped, building, and queued — the HERMES roadmap, straight from the source of truth. Built in public, $0, no gatekeeping.',
};

interface Item { id: string; title: string; status: string; home?: string }
interface TrackItem extends Item { track: string }

function flatten(): TrackItem[] {
  return tracks().flatMap((t) => t.items.map((i) => ({ ...i, track: t.name.replace(/^Phase \d+ — /, '') })));
}

export default function FeaturesPage() {
  const all = flatten();
  const building = all.filter((i) => ['in-progress', 'building', 'next', 'scaffold-shipped'].includes(i.status));
  const queued = all.filter((i) => i.status === 'queued' || i.status === 'idea');
  const shipped = all.filter((i) => i.status === 'shipped').slice(-12).reverse();
  const score = scoreboard();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={`${styles.section} ${fstyles.hero}`} style={{ paddingTop: 'clamp(40px, 8vh, 80px)' }}>
          <p className={styles.sectionKicker}>HERMES · built in public</p>
          <h1 className={styles.sectionTitle}>What&rsquo;s coming</h1>
          <p className={styles.sectionLede}>
            Every item below is generated straight from the same living spine
            (<code className={fstyles.code}>brain/roadmap.json</code>) that drives the
            project&rsquo;s own internal status board — nothing on this page is a separate,
            hand-written list that can drift out of sync.
          </p>
          <div className={fstyles.scoreRow}>
            <div className={fstyles.scoreChip} data-tone="shipped">
              <span className={fstyles.scoreNum}>{score.shipped}</span>
              <span className={fstyles.scoreLabel}>shipped</span>
            </div>
            <div className={fstyles.scoreChip} data-tone="building">
              <span className={fstyles.scoreNum}>{score.inBuild}</span>
              <span className={fstyles.scoreLabel}>building</span>
            </div>
            <div className={fstyles.scoreChip} data-tone="queued">
              <span className={fstyles.scoreNum}>{score.queued}</span>
              <span className={fstyles.scoreLabel}>queued</span>
            </div>
          </div>
        </section>

        {building.length > 0 && (
          <section className={styles.section} aria-labelledby="building-title">
            <p className={styles.sectionKicker}>🔨 Happening now</p>
            <h2 id="building-title" className={styles.sectionTitle}>Building</h2>
            <div className={fstyles.grid}>
              {building.map((i) => (
                <div key={i.id} className={fstyles.card} data-tone="building">
                  <span className={fstyles.cardTag}>{i.track}</span>
                  <p className={fstyles.cardTitle}>{i.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section} aria-labelledby="queued-title">
          <p className={styles.sectionKicker}>💤 On the roadmap</p>
          <h2 id="queued-title" className={styles.sectionTitle}>Coming soon</h2>
          <p className={styles.sectionLede}>Queued, not yet started — the backlog, honestly labeled.</p>
          <div className={fstyles.grid}>
            {queued.map((i) => (
              <div key={i.id} className={fstyles.card} data-tone="queued">
                <span className={fstyles.cardTag}>{i.track}</span>
                <p className={fstyles.cardTitle}>{i.title}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="shipped-title">
          <p className={styles.sectionKicker}>✅ Already live</p>
          <h2 id="shipped-title" className={styles.sectionTitle}>Recently shipped</h2>
          <ul className={fstyles.shippedList}>
            {shipped.map((i) => (
              <li key={i.id} className={fstyles.shippedRow}>
                <span className={fstyles.shippedDot} aria-hidden="true" />
                <span>{i.title}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} style={{ textAlign: 'center', paddingBottom: 'clamp(56px, 10vh, 100px)' }}>
          <div className={styles.ctaRow}>
            <Link href="/hermes" className={styles.ctaPrimary}>Try HERMES now ▸</Link>
            <a href="https://github.com/KudbeeZero/kudbee-music" className={styles.ctaGhost}>View the source</a>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <p className={styles.footerMeta}>
          $0, local, deterministic — this page and the app it describes both ship from the same repo.
        </p>
      </footer>
    </div>
  );
}
