'use client';

// The interactive landing page. Everything here runs client-side and survives a
// pure static export: no network calls, no API routes, no external assets.
// Motion is IntersectionObserver + requestAnimationFrame + CSS only (no deps),
// and every effect degrades to a static, fully readable page under
// prefers-reduced-motion or when a video fails to load.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AGENT_DEFINITIONS } from '@/lib/hermes/agents';
import styles from './landing.module.css';

const POSTER = '/landing/social-preview.png';
const REPO = 'https://github.com/KudbeeZero/kudbee-music';
const DEMOS = `${REPO}/tree/main/examples/demos`;

// Real scores from the shipped demo songs (examples/demos/) — computed by the
// deterministic A&R Judge, not invented for this page. Keep them exact.
const DEMO_SONGS = [
  { title: 'Paper Crowns', style: 'drill trap', score: 98 },
  { title: 'Signal Fade', style: 'synthwave pop', score: 98 },
  { title: 'Concrete Garden', style: 'boom-bap', score: 97 },
  { title: 'Hometown Ghosts', style: 'folk-rap', score: 93 },
  { title: 'Midnight Shift', style: 'lo-fi soul', score: 92 },
];

const STEPS = [
  {
    n: '01',
    title: 'Drop a rough idea',
    body: 'A theme, a mood, a genre — that is the whole input. No account, no key, no upload.',
  },
  {
    n: '02',
    title: 'Ten agents cross-check it',
    body: 'The right hemisphere proposes hooks and verses; the left audits them for clichés, repeats, rhyme craft, and similarity to everything in your vault.',
  },
  {
    n: '03',
    title: 'Get the original song package',
    body: 'Concept, hooks, lyrics, production notes, visuals, a uniqueness report, a banger score — and the trace of how each region decided.',
  },
  {
    n: '04',
    title: 'Ship it to Suno',
    body: 'Copy-paste-ready Suno prompts. The CLI video studio can then cut a vocal-synced 1080p music video from the same brain.',
  },
];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export default function Landing() {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const parallaxRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);

  useEffect(() => setMounted(true), []);

  // --- Hero scroll-scrub: scrolling through the 150vh runway seeks the clip. ---
  // Honest loading: until metadata arrives the poster shows (that IS the loading
  // state — no spinners, no fake progress). Seeks are rAF-throttled and rounded
  // to 1/30s frame steps so we never thrash the decoder with sub-frame seeks.
  useEffect(() => {
    if (reduced || heroVideoFailed) return;
    const track = heroTrackRef.current;
    const video = heroVideoRef.current;
    if (!track || !video) return;
    let duration = 0;
    let raf = 0;
    let pending = false;
    let lastStep = -1;
    const seek = () => {
      pending = false;
      if (!duration) return;
      const rect = track.getBoundingClientRect();
      const runway = rect.height - window.innerHeight;
      const progress = runway > 0 ? Math.min(1, Math.max(0, -rect.top / runway)) : 0;
      const step = Math.round(progress * (duration - 0.05) * 30);
      if (step === lastStep) return;
      lastStep = step;
      video.currentTime = step / 30;
    };
    const request = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(seek);
    };
    const onMeta = () => {
      duration = video.duration || 0;
      request();
    };
    if (video.readyState >= 1) onMeta();
    video.addEventListener('loadedmetadata', onMeta);
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    return () => {
      video.removeEventListener('loadedmetadata', onMeta);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      cancelAnimationFrame(raf);
    };
  }, [reduced, heroVideoFailed]);

  // --- Reveal-on-scroll: one IntersectionObserver flips data-on="true". ---
  // Under prefers-reduced-motion the CSS makes every [data-reveal] visible
  // immediately (no transform), so this observer is purely additive.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll('[data-reveal]'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute('data-on', 'true');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // --- Subtle parallax on the how-it-works clip: translateY only, rAF-driven. ---
  useEffect(() => {
    if (reduced) return;
    const video = parallaxRef.current;
    const frame = video?.parentElement;
    if (!video || !frame) return;
    let raf = 0;
    let pending = false;
    const update = () => {
      pending = false;
      const rect = frame.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      // -1..1 as the frame's center crosses the viewport's center.
      const p = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      video.style.transform = `translateY(${(p * -6).toFixed(2)}%)`;
    };
    const request = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(update);
    };
    request();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    return () => {
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  // --- Ambient loop clips only play while on screen (and never under
  // prefers-reduced-motion — the poster frame carries the design). ---
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const vids = Array.from(root.querySelectorAll<HTMLVideoElement>('video[data-loop]'));
    if (reduced) {
      vids.forEach((v) => v.pause());
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }
      },
      { threshold: 0.15 },
    );
    vids.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [reduced]);

  const rightAgents = AGENT_DEFINITIONS.filter((a) => a.hemisphere === 'right');
  const leftAgents = AGENT_DEFINITIONS.filter((a) => a.hemisphere === 'left');

  return (
    <div ref={rootRef} className={styles.page} data-mounted={mounted || undefined}>
      {/* ================= HERO — sticky viewport, scroll-scrubbed clip ================= */}
      <div ref={heroTrackRef} className={styles.heroTrack}>
        <section className={styles.hero} aria-label="HERMES — songwriting brain">
          <div className={styles.heroMedia} aria-hidden="true">
            {/*
              FUTURE (Runway hero): a generated cinematic hero film drops in here —
              replace hero-25.mp4 with the Runway cut, same scrub wiring. Comment
              only by design: no dead UI until the asset exists.
            */}
            {heroVideoFailed || reduced ? (
              // Video failed or motion is reduced: the poster is the hero. Still a
              // complete page — nothing depends on the scrub.
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.heroVideo} src={POSTER} alt="" width={1280} height={640} />
            ) : (
              <video
                ref={heroVideoRef}
                className={styles.heroVideo}
                src="/landing/hero-25.mp4"
                poster={POSTER}
                muted
                playsInline
                preload="metadata"
                tabIndex={-1}
                onError={() => setHeroVideoFailed(true)}
              />
            )}
            <div className={styles.heroShade} />
          </div>

          <div className={styles.heroInner}>
            <p className={styles.kicker}>HERMES</p>
            <h1 className={styles.heroTitle}>
              A songwriting brain
              <br />
              you can <span className={styles.heroAccent}>watch think</span>.
            </h1>
            <p className={styles.heroSub}>
              10 specialized agents cross-check each other to turn a rough idea into a
              complete, original song package — and show you exactly how they decided.
            </p>
            <ul className={styles.badges} aria-label="What it costs to run">
              <li>$0</li>
              <li>local</li>
              <li>deterministic</li>
              <li>no API key</li>
            </ul>
            <div className={styles.ctaRow}>
              <Link href="/hermes" className={styles.ctaPrimary}>
                Open the Hit Factory →
              </Link>
              <a href="#proof" className={styles.ctaGhost}>
                See a finished example
              </a>
            </div>
            <p className={styles.heroFootnote}>
              Footage: the flagship music video, rendered by this repo&apos;s own studio
              {reduced || heroVideoFailed ? '.' : ' — keep scrolling to scrub it.'}
            </p>
          </div>

          {!reduced && !heroVideoFailed && (
            <div className={styles.scrollHint} aria-hidden="true">
              <span>scroll</span>
              <i />
            </div>
          )}
        </section>
      </div>

      <main className={styles.main}>
        {/* ================= HEMISPHERES ================= */}
        <section className={styles.section} aria-labelledby="brain-title">
          <div data-reveal>
            <p className={styles.sectionKicker}>The brain</p>
            <h2 id="brain-title" className={styles.sectionTitle}>
              Right proposes · left disposes.
            </h2>
            <p className={styles.sectionLede}>
              The agents split into a <b className={styles.magenta}>right hemisphere</b> that
              creates and a <b className={styles.cyan}>left hemisphere</b> that verifies.
              Lateralization is a bias, not a switch — both always run. The hemispheres never
              share state; they pass artifacts across a corpus callosum.
            </p>
          </div>
          <div className={styles.hemis}>
            <div className={`${styles.hemi} ${styles.hemiRight}`} data-reveal>
              <h3 className={styles.hemiTitle}>Right — generative</h3>
              <p className={styles.hemiSub}>proposes: hooks, verses, visuals, moments</p>
              <ul className={styles.agentList}>
                {rightAgents.map((a) => (
                  <li key={a.id}>
                    <span className={styles.agentName}>{a.name}</span>
                    <span className={styles.agentMission}>{a.mission}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${styles.hemi} ${styles.hemiLeft}`} data-reveal>
              <h3 className={styles.hemiTitle}>Left — analytical</h3>
              <p className={styles.hemiSub}>disposes: audits, scores, gates the release</p>
              <ul className={styles.agentList}>
                {leftAgents.map((a) => (
                  <li key={a.id}>
                    <span className={styles.agentName}>{a.name}</span>
                    <span className={styles.agentMission}>{a.mission}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section className={styles.section} aria-labelledby="how-title">
          <div data-reveal>
            <p className={styles.sectionKicker}>How it works</p>
            <h2 id="how-title" className={styles.sectionTitle}>
              Rough idea in. Original song out.
            </h2>
          </div>
          <ol className={styles.steps}>
            {STEPS.map((s) => (
              <li key={s.n} className={styles.step} data-reveal>
                <span className={styles.stepNum}>{s.n}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
              </li>
            ))}
          </ol>
          <figure className={styles.filmFrame} data-reveal>
            <video
              ref={parallaxRef}
              className={styles.filmClip}
              src="/landing/hero-24.mp4"
              poster={POSTER}
              muted
              playsInline
              loop
              preload="metadata"
              tabIndex={-1}
              data-loop
            />
            <figcaption className={styles.filmCaption}>
              Hero shot from the flagship video — 25 of these, cut to the beat by the studio.
            </figcaption>
          </figure>
        </section>

        {/* ================= PROOF ================= */}
        <section id="proof" className={styles.section} aria-labelledby="proof-title">
          <div data-reveal>
            <p className={styles.sectionKicker}>Proof</p>
            <h2 id="proof-title" className={styles.sectionTitle}>
              Every song ships with a generation trace.
            </h2>
            <p className={styles.sectionLede}>
              Proof, not marketing: each demo below links to the per-region record of how the
              brain made its choices — a heat-map, every agent&apos;s contribution, and the
              copy-paste Suno prompt.
            </p>
          </div>
          <div className={styles.tableWrap} data-reveal>
            <table className={styles.proofTable}>
              <thead>
                <tr>
                  <th scope="col">Song</th>
                  <th scope="col">Style</th>
                  <th scope="col" className={styles.scoreCol}>
                    Banger score
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEMO_SONGS.map((s) => (
                  <tr key={s.title}>
                    <td className={styles.songCell}>{s.title}</td>
                    <td className={styles.styleCell}>{s.style}</td>
                    <td className={styles.scoreCell}>
                      <span className={styles.scoreBar} aria-hidden="true">
                        <span style={{ width: `${s.score}%` }} />
                      </span>
                      {s.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.proofFoot} data-reveal>
            Scored by the brain&apos;s own A&amp;R Judge (0–100), deterministically — same
            input, same score, on every machine.{' '}
            <a href={DEMOS} target="_blank" rel="noreferrer" className={styles.textLink}>
              Browse the demo gallery with full traces →
            </a>
          </p>
        </section>

        {/* ================= VIDEO STUDIO ================= */}
        <section className={styles.section} aria-labelledby="studio-title">
          <div data-reveal>
            <p className={styles.sectionKicker}>Video studio</p>
            <h2 id="studio-title" className={styles.sectionTitle}>
              The same brain cuts the video.
            </h2>
            <p className={styles.sectionLede}>
              A CLI studio renders vocal-synced 1080p music videos from the song package —
              headless Chromium frames into ffmpeg, forced-aligned lyrics, hero shots cut to
              the beat. Also $0.
            </p>
          </div>
          <div className={styles.gifRow} data-reveal>
            <figure className={styles.gifCard}>
              {/* Heavy GIFs (3.5MB / 2.5MB) load lazily, far below the fold, with real
                  dimensions so nothing shifts. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/demo-hook.gif"
                alt="Kinetic-typography hook from the neo-noir flagship music video"
                width={500}
                height={281}
                loading="lazy"
                decoding="async"
              />
              <figcaption>Neo-noir · kinetic-typography hook</figcaption>
            </figure>
            <figure className={styles.gifCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/demo-retrowave.gif"
                alt="Retrowave expansion-pack scene from the video studio"
                width={500}
                height={281}
                loading="lazy"
                decoding="async"
              />
              <figcaption>Retrowave · expansion-pack look</figcaption>
            </figure>
          </div>
        </section>

        {/* ================= FINAL CTA ================= */}
        <section className={styles.finale} aria-labelledby="finale-title">
          <video
            className={styles.finaleClip}
            src="/landing/hero-21.mp4"
            muted
            playsInline
            loop
            preload="metadata"
            tabIndex={-1}
            data-loop
            aria-hidden="true"
          />
          <div className={styles.finaleShade} aria-hidden="true" />
          <div className={styles.finaleInner} data-reveal>
            <h2 id="finale-title" className={styles.finaleTitle}>
              Open the Hit Factory.
            </h2>
            <p className={styles.finaleSub}>
              Ten seconds from clone to a full original song — lyrics, scores, and the trace
              of how the brain wrote it.
            </p>
            <pre className={styles.snippet}>
              <code>
                {`git clone ${REPO} && cd kudbee-music
npm install
npm run demo`}
              </code>
            </pre>
            <div className={styles.ctaRow}>
              <Link href="/hermes" className={styles.ctaPrimary}>
                Open the Hit Factory →
              </Link>
              <a href={REPO} target="_blank" rel="noreferrer" className={styles.ctaGhost}>
                View on GitHub
              </a>
            </div>
            {/*
              FUTURE (wallet-connect): the on-chain release flow's connect entry point
              lands here, next to the CTAs. Comment only — no dead UI until it works.
            */}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          The brain is an inspired workflow model, not biology — every claim on this page is
          real, tested code.
        </p>
        <p className={styles.footerMeta}>
          HERMES · MIT license ·{' '}
          <a href={REPO} target="_blank" rel="noreferrer" className={styles.textLink}>
            KudbeeZero/kudbee-music
          </a>
        </p>
      </footer>
    </div>
  );
}
