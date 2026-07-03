'use client';

import { useState } from 'react';
import type { HookOption, SongPackage, CritiqueKey } from '@/lib/hermes/types';
import { deliberationForHook } from '@/lib/hermes/cognition';
import { buildTrace } from '@/lib/hermes/trace';
import { renderTraceHtml } from '@/lib/hermes/traceHtml';
import { sunoStyle, sunoLyrics, sunoTrack } from '@/lib/hermes/suno';
import { encodeShare, shareUrl, giftMessage } from '@/lib/hermes/shareLink';
import { findOccasionPack } from '@/lib/hermes/occasionPacks';
import { downloadShareCard } from '@/lib/hermes/shareCard';
import { rhymesWith } from '@/lib/hermes/lexicon';
import ScribeEditor from './ScribeEditor';
import VoiceNotes from './VoiceNotes';
import styles from './hermes.module.css';

export default function SongPackageView({ pkg, onSaveEdit, onChooseHook, onRegenerateFromCritiques }: {
  pkg: SongPackage; onSaveEdit?: (newText: string) => void; onChooseHook?: (h: HookOption) => void;
  onRegenerateFromCritiques?: (keys: CritiqueKey[]) => void;
}) {
  const rawLyrics = pkg.sections.map((s) => `[${s.label}]\n${s.lines.join('\n')}`).join('\n\n');
  const [editing, setEditing] = useState(false);
  const [rawMode, setRawMode] = useState(false);
  const [draft, setDraft] = useState(rawLyrics);
  const [learned, setLearned] = useState(false);
  const [copiedClip, setCopiedClip] = useState(-1);
  const [shared, setShared] = useState(false);
  const [cardState, setCardState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [copiedSuno, setCopiedSuno] = useState(false);
  const [rhymeWord, setRhymeWord] = useState<string | null>(null);
  const rhymeSuggestions = rhymeWord ? rhymesWith(rhymeWord, { max: 10 }) : [];

  // A rough length estimate, not a claim of precision — 2 bars/line in 4/4 time at
  // the production tempo is a common songwriting rule of thumb, not a measurement.
  const lineCount = pkg.sections.reduce((n, s) => n + s.lines.length, 0);
  const wordCount = pkg.sections.reduce(
    (n, s) => n + s.lines.reduce((m, l) => m + (l.trim() ? l.trim().split(/\s+/).length : 0), 0),
    0,
  );
  const estSeconds = Math.round(lineCount * 2 * (240 / pkg.production.tempoBpm));
  const estRuntime = `${Math.floor(estSeconds / 60)}:${String(estSeconds % 60).padStart(2, '0')}`;

  function saveText(text: string) {
    onSaveEdit?.(text);
    setEditing(false);
    setLearned(true);
    setTimeout(() => setLearned(false), 2600);
  }

  // A plain-text copy of the full lyrics (section labels + lines, no JSON wrapper) —
  // the fastest way to paste into Suno/Notes/a text/lyric sheet without the
  // full-package export or hunting down each short-form clip one at a time.
  function copyLyrics() {
    navigator.clipboard?.writeText(rawLyrics).then(() => {
      setCopiedLyrics(true);
      setTimeout(() => setCopiedLyrics(false), 1600);
    }).catch(() => {});
  }

  // The Suno-ready prompt (style + tagged lyrics) was only reachable by opening
  // "Explain this song" and finding it inside the full trace explorer. One click
  // straight to the clipboard now, using the same sunoTrack() the trace already builds.
  function copySunoPrompt() {
    navigator.clipboard?.writeText(sunoTrack(pkg)).then(() => {
      setCopiedSuno(true);
      setTimeout(() => setCopiedSuno(false), 1600);
    }).catch(() => {});
  }

  // Rhyme helper — click any word in the read-only lyric view to see what else in
  // the lexicon rhymes with it. Reference only: it never edits the lyric, just
  // surfaces rhymesWith() (already built for generation) as a writer's tool.
  function clickWord(raw: string) {
    const clean = raw.toLowerCase().replace(/[^a-z']/g, '');
    if (!clean) return;
    setRhymeWord((prev) => (prev === clean ? null : clean));
  }

  function renderClickableLine(line: string, key: string) {
    const tokens = line.split(/(\s+)/);
    return (
      <span key={key}>
        {tokens.map((tok, i) => {
          if (!tok || /^\s+$/.test(tok)) return tok;
          const clean = tok.toLowerCase().replace(/[^a-z']/g, '');
          const active = !!clean && clean === rhymeWord;
          return (
            <span
              key={i}
              onClick={() => clickWord(tok)}
              title="Click for rhymes"
              style={{
                cursor: 'pointer',
                borderBottom: '1px dotted var(--ink-faint)',
                background: active ? 'rgba(54, 224, 212, 0.18)' : undefined,
                borderRadius: active ? 3 : undefined,
              }}
            >
              {tok}
            </span>
          );
        })}
      </span>
    );
  }

  function exportSong() {
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${pkg.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'song'}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  // "Show your work" — build the per-region generation trace for THIS song and open the
  // interactive explorer (brain heat-map + collapsible region cards + copy-paste Suno prompt)
  // in a new tab. All client-side + deterministic: renders the same self-contained HTML the
  // demo gallery ships, from the real brain modules — no server, no key.
  function explainSong() {
    const trace = buildTrace(pkg, pkg.inputs, pkg.seed ?? 0);
    const html = renderTraceHtml(trace, { sunoStyle: sunoStyle(pkg), sunoLyrics: sunoLyrics(pkg) });
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000); // let the new tab load before revoking
  }

  // "HERMES Live" — copy a link that reproduces this EXACT song (inputs + seed).
  // Anyone who opens it watches the brain generate the identical package. $0, static.
  // Only offered when the package carries its real generation seed: a seedless
  // package (the hand-authored example song, or an older import without one) would
  // share seed 0 and reproduce a DIFFERENT song than the one on screen — a silent
  // break of the "reproduces it exactly" promise, so the button hides instead.
  const shareable = typeof pkg.seed === 'number';
  // Song Gifts (phase 2): an occasion + a dedicated name turns the share button into
  // a gift button — the clipboard text becomes a one-line gift message, not a bare URL.
  const giftPack = findOccasionPack(pkg.inputs.occasion);
  const isGift = shareable && !!giftPack && !!pkg.inputs.audience.trim();
  function shareSong() {
    if (!shareable) return;
    const link = shareUrl(encodeShare(pkg.inputs, pkg.seed as number));
    const text = isGift ? giftMessage(pkg.inputs, link) : link;
    navigator.clipboard?.writeText(text).then(() => { setShared(true); setTimeout(() => setShared(false), 1600); }).catch(() => {});
  }

  function copyClip(text: string, i: number) {
    navigator.clipboard?.writeText(text).then(() => { setCopiedClip(i); setTimeout(() => setCopiedClip(-1), 1200); }).catch(() => {});
  }

  // The shareable PNG card (shareCard.ts) — a deterministic canvas render of this
  // song's brain trace, brought over from Song Gifts' gift-eyebrow work but never
  // actually wired to a button until now. Same gift framing as the Share link.
  async function downloadCard() {
    setCardState('busy');
    try {
      await downloadShareCard(pkg);
      setCardState('idle');
    } catch {
      setCardState('error');
      setTimeout(() => setCardState('idle'), 2400);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Song Package · “{pkg.title}” · v{pkg.version}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {shareable && (
            <button
              className={styles.copyBtn}
              style={{ marginLeft: 0 }}
              onClick={shareSong}
              title={isGift
                ? `Copy a gift message + link for ${pkg.inputs.audience.trim()} — opening it plays this exact ${giftPack!.label} song, dedication and all ($0, no key).`
                : "Copy a link that regenerates this song from the same brief + seed — anyone who opens it watches the brain think ($0, no key). Personal avoid-words don't travel with the link, so a heavily customized brain may render small differences."}
            >
              {shared ? (isGift ? 'gift copied ✓' : 'link copied ✓') : (isGift ? `${giftPack!.emoji} Share the gift` : '🔗 Share')}
            </button>
          )}
          <button
            className={styles.copyBtn}
            style={{ marginLeft: 0 }}
            onClick={downloadCard}
            disabled={cardState === 'busy'}
            title={isGift
              ? `Download a shareable PNG card for this ${giftPack!.label} song — the same brain heat-map + hook, framed as a gift for ${pkg.inputs.audience.trim()}.`
              : 'Download a shareable PNG card of this song — brain heat-map, lead hook, and banger score. Deterministic: this song always renders the same image.'}
          >
            {cardState === 'busy' ? 'rendering…' : cardState === 'error' ? 'failed — retry' : '🖼 Download card'}
          </button>
          <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={explainSong} title="Open the interactive brain trace for this song — heat-map, what each region did, and a copy-paste Suno prompt">🔍 Explain this song</button>
          <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={copyLyrics} title="Copy the full lyrics as plain text — section labels + lines, ready to paste into Suno or a lyric sheet">
            {copiedLyrics ? 'lyrics copied ✓' : '📋 Copy lyrics'}
          </button>
          <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={copySunoPrompt} title="Copy the Suno-ready prompt (style of music + tagged lyrics) straight to the clipboard">
            {copiedSuno ? 'suno prompt copied ✓' : '🎵 Copy Suno prompt'}
          </button>
          <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={exportSong} title="Download this song package as JSON (backup / re-import into your vault)">⬇ Export JSON</button>
        </span>
      </div>

      <Section label="Concept">
        <div className={styles.kv}>{pkg.conceptSummary}</div>
      </Section>

      <Section label="Creative brief">
        <div className={styles.kv}>{pkg.brief}</div>
      </Section>

      <Section label={onChooseHook ? 'Hook options — tap one to make it the lead' : 'Hook options'}>
        {pkg.hookOptions.map((h, i) => {
          const chosen = pkg.chosenHook?.text === h.text;
          const pick = onChooseHook && !chosen ? () => onChooseHook(h) : undefined;
          return (
            <div
              key={i}
              className={styles.hookCard}
              data-chosen={chosen}
              onClick={pick}
              role={pick ? 'button' : undefined}
              tabIndex={pick ? 0 : undefined}
              onKeyDown={pick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } } : undefined}
              style={pick ? { cursor: 'pointer' } : undefined}
              aria-pressed={onChooseHook ? chosen : undefined}
              title={onChooseHook ? (chosen ? 'Current lead hook' : 'Set as the lead hook — the brain learns your pick and re-scores') : undefined}
            >
              <div className={styles.hookText}>“{h.text}”</div>
              <div className={styles.hookMeta}>{h.angle} · {h.cadence} · stickiness {h.score}{chosen ? ' · ★ lead' : onChooseHook ? ' · tap to lead' : ''}</div>
            </div>
          );
        })}
        {pkg.chosenHook && <Deliberation hook={pkg.chosenHook.text} pkg={pkg} onRegenerateFromCritiques={onRegenerateFromCritiques} />}
      </Section>

      <div className={styles.pkgSection}>
        <div className={styles.pkgLabel}>
          Final lyrics
          <span className={styles.hint} style={{ marginLeft: 8, textTransform: 'none', letterSpacing: 'normal', fontWeight: 400 }}>
            {wordCount} words · {lineCount} lines · ~{estRuntime} <span title="Rough estimate: 2 bars/line at the production tempo, not a measurement">(est.)</span>
          </span>
          {onSaveEdit && !editing && (
            <button className={styles.copyBtn} onClick={() => { setDraft(rawLyrics); setRawMode(false); setEditing(true); }}>edit</button>
          )}
          {onSaveEdit && editing && (
            <button className={styles.copyBtn} onClick={() => setRawMode((r) => !r)}>
              {rawMode ? 'switch to line editor' : 'edit as raw text'}
            </button>
          )}
          {learned && <span className={styles.copyBtn} style={{ color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>🧠 brain learned from your edit</span>}
        </div>
        {editing ? (
          rawMode ? (
            <>
              <textarea className={styles.lyricBlock} style={{ width: '100%', minHeight: 280, color: 'var(--ink)' }}
                value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit lyrics as raw text" />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className={styles.runBtn} style={{ width: 'auto', flex: 1, padding: 10 }} onClick={() => saveText(draft)}>Save — teach the brain</button>
                <button className={styles.ghostBtn} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </>
          ) : (
            <ScribeEditor sections={pkg.sections} inputs={pkg.inputs} onSave={saveText} onCancel={() => setEditing(false)} />
          )
        ) : (
          <>
            <div className={styles.lyricBlock}>
              {pkg.sections.map((s, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <span className={styles.sectionTag}>[{s.label}]</span>
                  {'\n'}
                  {s.lines.map((line, j) => (
                    <div key={j}>{renderClickableLine(line, `${i}-${j}`)}</div>
                  ))}
                </div>
              ))}
            </div>
            {rhymeWord && (
              <div className={styles.hint} style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>Rhymes with “{rhymeWord}”:</span>
                {rhymeSuggestions.length ? (
                  rhymeSuggestions.map((r) => (
                    <span key={r.w} className={styles.copyBtn} style={{ marginLeft: 0, cursor: 'default' }}>{r.w}</span>
                  ))
                ) : (
                  <span>nothing in the lexicon rhymes with that</span>
                )}
                <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => setRhymeWord(null)}>×</button>
              </div>
            )}
          </>
        )}
      </div>

      <Section label="🎙️ Voice notes — record your own take on this song">
        <VoiceNotes songId={pkg.id} />
      </Section>

      <Section label="Production notes">
        <div className={styles.kv}>
          <b>Tempo:</b> {pkg.production.tempoBpm} BPM &nbsp; <b>Drums:</b> {pkg.production.drums} &nbsp; <b>Bass:</b> {pkg.production.bass}<br />
          <b>Instrumentation:</b> {pkg.production.instrumentation.join(', ')}<br />
          <b>Genre blend:</b> {pkg.production.genreBlend}<br />
          <b>Mix:</b> {pkg.production.mixVibe}
        </div>
        <ul className={styles.list} style={{ marginTop: 6 }}>
          {pkg.production.arrangement.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </Section>

      <Section label="Vocal delivery">
        <div className={styles.kv}>
          <b>Delivery:</b> {pkg.vocals.delivery}<br />
          <b>Ad-libs:</b> {pkg.vocals.adlibs.join('  ')}<br />
          <b>Stacks:</b> {pkg.vocals.doublesAndStacks}
        </div>
      </Section>

      <Section label="Album cover prompt" copy={pkg.visuals.albumCoverPrompt}>
        <div className={styles.promptBox}>{pkg.visuals.albumCoverPrompt}</div>
      </Section>

      <Section label="Short-form clips — tap to copy the caption">
        {pkg.viralClips.map((c, i) => (
          <div
            key={i}
            className={styles.hookCard}
            onClick={() => copyClip(c.caption, i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyClip(c.caption, i); } }}
            style={{ cursor: 'pointer' }}
            title="Copy this clip's caption"
          >
            <div className={styles.hookText}>{c.label} · ~{c.durationSec}s · {c.startHint}</div>
            <div className={styles.hookMeta}>{copiedClip === i ? 'copied ✓' : `Caption: ${c.caption}`}</div>
          </div>
        ))}
      </Section>

      <Section label="Promo caption" copy={pkg.promoCaption}>
        <div className={styles.kv}>{pkg.promoCaption}</div>
      </Section>
    </div>
  );
}

/** The dual-process readout: first thought → second thought → decision, on the lead hook. */
function Deliberation({ hook, pkg, onRegenerateFromCritiques }: {
  hook: string; pkg: SongPackage; onRegenerateFromCritiques?: (keys: CritiqueKey[]) => void;
}) {
  // Prefer the pipeline's stored verdict, but ONLY if it's for this hook — after the artist
  // re-picks a hook, pkg.cognition still holds the auto-chosen hook's deliberation.
  const d = deliberationForHook(hook, pkg.inputs, pkg.cognition);
  const failing = d.secondThought.filter((c) => !c.passes);
  return (
    <div style={{ marginTop: 8, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <div className={styles.hint}>🧭 How the brain decided <span style={{ opacity: 0.7 }}>(first thought → second thought → decision)</span></div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {d.secondThought.map((c, i) => (
          <span key={i} className={styles.chip}
            style={{ borderColor: c.passes ? 'rgba(87,217,138,0.4)' : 'rgba(255,120,120,0.4)', color: c.passes ? 'var(--good)' : 'var(--bad)' }}
            title={c.note}>
            {c.passes ? '✓' : '✗'} {c.question.replace(/^Is it |^Does it /, '').replace('?', '')}
          </span>
        ))}
      </div>
      <div className={styles.hint} style={{ marginTop: 6 }}>{d.verdict === 'keep' ? '✅ ' : '↻ '}{d.decision}</div>
      {failing.length > 0 && onRegenerateFromCritiques && (
        <button
          className={styles.copyBtn}
          style={{ marginTop: 8 }}
          onClick={() => onRegenerateFromCritiques(failing.map((c) => c.key))}
          title={`Regenerate, steering toward a hook that fixes: ${failing.map((c) => c.note).join('; ')}`}
        >
          ↻ Regenerate from these critiques
        </button>
      )}
    </div>
  );
}

function Section({ label, children, copy }: { label: string; children: React.ReactNode; copy?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className={styles.pkgSection}>
      <div className={styles.pkgLabel}>
        {label}
        {copy && (
          <button
            className={styles.copyBtn}
            onClick={() => {
              navigator.clipboard?.writeText(copy).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); }).catch(() => {});
            }}
          >
            {done ? 'copied ✓' : 'copy'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
