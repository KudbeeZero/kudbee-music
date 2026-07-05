'use client';

import { useState, useEffect } from 'react';
import type { SongInputs, SongSection } from '@/lib/hermes/types';
import { renderSections } from '@/lib/hermes/edits';
import { claudeEngineReady, getClaudeKey } from '@/lib/hermes/claudeKey';
import { suggestLineRewrites, ClaudeProviderError } from '@/lib/hermes/providers/claudeLyricsProvider';
import { suggestLightningLineRewrites, LightningProviderError } from '@/lib/hermes/providers/lightningLyricsProvider';
import { suggestHermesScribeLineRewrites, HermesScribeProviderError } from '@/lib/hermes/providers/hermesScribeLyricsProvider';
import { getLightningEndpoint, getLightningApiKey, lightningConfigured } from '@/lib/hermes/lightningKey';
import { similarWords } from '@/lib/hermes/lexicon';
import { hasSeenScribeTour, markScribeTourSeen } from '@/lib/hermes/storage';
import GuidedTour, { type TourStep } from './GuidedTour';
import styles from './hermes.module.css';

type RewriteProvider = 'hermes' | 'claude' | 'lightning';

interface Target { section: number; line: number }
interface WordTarget { section: number; line: number; word: string; start: number; end: number }

const SCRIBE_PROVIDER_KEY = 'hermes.scribeProvider.v1';

function getScribeProvider(): RewriteProvider {
  if (typeof window === 'undefined') return 'hermes';
  try {
    const stored = localStorage.getItem(SCRIBE_PROVIDER_KEY);
    if (stored === 'claude' || stored === 'lightning') return stored as RewriteProvider;
    return 'hermes';
  } catch {
    return 'hermes';
  }
}

function setScribeProvider(provider: RewriteProvider): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCRIBE_PROVIDER_KEY, provider);
  } catch {
    /* ignore quota/unavailable */
  }
}

const TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="scribe-line-input"]', title: 'Edit any line', body: 'Every line is its own field — click in and type, just like a text box.' },
  { selector: '[data-tour="scribe-line-input"]', title: 'Word ideas', body: 'Double-click a word for similar words — same imagery and mood, sourced from the real lexicon.' },
  { selector: '[data-tour="scribe-ai-rewrite"]', title: 'AI rewrite', body: 'Get 3 alternate phrasings for this line, powered by the HERMES brain.' },
  { selector: '[data-tour="scribe-add-line"]', title: 'Add a line', body: 'Insert a new blank line right below this one.' },
  { selector: '[data-tour="scribe-delete-line"]', title: 'Delete a line', body: "Remove a line you don't need." },
];

// The Scribe editor — edit lyrics line by line instead of one big text block.
// Every line gets its own field plus a small toolbar (✨ AI rewrite when the
// Claude Engine is unlocked, + add a line below, × delete). Saves through the
// same renderSections → onSave path the raw-text editor already uses, so
// learn-from-edits keeps working unchanged.
export default function ScribeEditor({
  sections: initial, inputs, onSave, onCancel,
}: {
  sections: SongSection[]; inputs: SongInputs; onSave: (rawText: string) => void; onCancel: () => void;
}) {
  const [sections, setSections] = useState<SongSection[]>(() => initial.map((s) => ({ ...s, lines: [...s.lines] })));
  const [suggestFor, setSuggestFor] = useState<Target | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const claudeReady = claudeEngineReady();
  const lightningReady = lightningConfigured();
  const [rewriteProvider, setRewriteProvider] = useState<RewriteProvider>('hermes');
  useEffect(() => {
    setRewriteProvider(getScribeProvider());
  }, []);
  // Word ideas — double-click any word while editing to see similar words (same
  // imagery category, closest affect), sourced from lexicon.ts's real word store,
  // never invented. Click a suggestion to replace the double-clicked word in place.
  const [wordTarget, setWordTarget] = useState<WordTarget | null>(null);
  const wordIdeas = wordTarget ? similarWords(wordTarget.word) : [];
  // Guided tour — shown once automatically (first time this browser opens the
  // Scribe editor), replayable anytime via "? Show me around".
  const [tourOpen, setTourOpen] = useState(() => !hasSeenScribeTour());
  function closeTour() {
    setTourOpen(false);
    markScribeTourSeen();
  }

  function updateLine(section: number, line: number, text: string) {
    setSections((prev) => prev.map((s, si) => si !== section ? s : { ...s, lines: s.lines.map((l, li) => li === line ? text : l) }));
  }

  function deleteLine(section: number, line: number) {
    setSections((prev) => prev.map((s, si) => si !== section ? s : { ...s, lines: s.lines.filter((_, li) => li !== line) }));
    if (suggestFor?.section === section && suggestFor.line === line) closeSuggestions();
  }

  function addLineAfter(section: number, line: number) {
    setSections((prev) => prev.map((s, si) => {
      if (si !== section) return s;
      const lines = [...s.lines];
      lines.splice(line + 1, 0, '');
      return { ...s, lines };
    }));
  }

  function closeSuggestions() {
    setSuggestFor(null);
    setSuggestions([]);
    setSuggestError(null);
  }

  async function requestRewrite(section: number, line: number) {
    const s = sections[section];
    setSuggestFor({ section, line });
    setSuggestions([]);
    setSuggestError(null);
    setSuggestLoading(true);

    const ctx = {
      sectionLabel: s.label,
      line: s.lines[line],
      precedingLine: s.lines[line - 1],
      followingLine: s.lines[line + 1],
      inputs,
    };

    try {
      // Try the selected provider first
      if (rewriteProvider === 'lightning' && lightningReady) {
        try {
          const alts = await suggestLightningLineRewrites(
            { endpoint: getLightningEndpoint() ?? undefined, apiKey: getLightningApiKey() ?? undefined },
            ctx,
            3,
          );
          setSuggestions(alts);
          return;
        } catch (e) {
          // Fall through to next provider
        }
      }

      // Try Claude (if selected or as fallback)
      if (rewriteProvider === 'claude' && claudeReady) {
        try {
          const alts = await suggestLineRewrites(
            { apiKey: getClaudeKey() ?? undefined },
            ctx,
            3,
          );
          setSuggestions(alts);
          return;
        } catch (e) {
          // Fall through to HERMES
        }
      }

      // Always try HERMES as primary or final fallback
      try {
        const alts = await suggestHermesScribeLineRewrites(
          { endpoint: process.env.NEXT_PUBLIC_SCRIBE_REWRITE_ENDPOINT },
          ctx,
          3,
        );
        setSuggestions(alts);
        return;
      } catch (e) {
        const msg = e instanceof HermesScribeProviderError ? e.message : 'HERMES rewrite unavailable';
        setSuggestError(msg + ' — ensure the SCRIBE backend is running.');
      }
    } catch (e) {
      setSuggestError(e instanceof ClaudeProviderError ? e.message : 'Rewrite request failed — try again.');
    } finally {
      setSuggestLoading(false);
    }
  }

  function handleProviderChange(newProvider: RewriteProvider) {
    setRewriteProvider(newProvider);
    setScribeProvider(newProvider);
    closeSuggestions();
  }

  function applySuggestion(text: string) {
    if (!suggestFor) return;
    updateLine(suggestFor.section, suggestFor.line, text);
    closeSuggestions();
  }

  function handleWordDoubleClick(section: number, line: number, e: React.MouseEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const word = input.value.slice(start, end).replace(/[^a-zA-Z']/g, '');
    if (!word || start === end) return;
    setWordTarget({ section, line, word, start, end });
  }

  function applyWordIdea(replacement: string) {
    if (!wordTarget) return;
    const current = sections[wordTarget.section].lines[wordTarget.line];
    const next = current.slice(0, wordTarget.start) + replacement + current.slice(wordTarget.end);
    updateLine(wordTarget.section, wordTarget.line, next);
    setWordTarget(null);
  }

  function save() {
    onSave(renderSections(sections));
  }

  return (
    <div>
      {sections.map((s, si) => (
        <div key={si} style={{ marginBottom: 14 }}>
          <span className={styles.sectionTag}>[{s.label}]</span>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {s.lines.map((line, li) => (
              <div key={li}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    className={styles.input}
                    style={{ flex: 1, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 13.5 }}
                    value={line}
                    onChange={(e) => updateLine(si, li, e.target.value)}
                    onDoubleClick={(e) => handleWordDoubleClick(si, li, e)}
                    title="Double-click a word for similar-word ideas"
                    aria-label={`${s.label} line ${li + 1}`}
                    data-tour={si === 0 && li === 0 ? 'scribe-line-input' : undefined}
                  />
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {(claudeReady || lightningReady) && (
                      <select
                        className={styles.copyBtn}
                        value={rewriteProvider}
                        onChange={(e) => handleProviderChange(e.target.value as RewriteProvider)}
                        title="Choose rewrite provider"
                        style={{ marginLeft: 0, padding: '2px 4px', fontSize: 11, cursor: 'pointer' }}
                      >
                        <option value="hermes">HERMES</option>
                        {claudeReady && <option value="claude">Claude</option>}
                        {lightningReady && <option value="lightning">Lightning</option>}
                      </select>
                    )}
                    <button
                      className={styles.copyBtn}
                      style={{ marginLeft: 0 }}
                      onClick={() => requestRewrite(si, li)}
                      title={
                        rewriteProvider === 'lightning' && lightningReady
                          ? 'AI rewrite with Lightning — 3 alternate phrasings'
                          : rewriteProvider === 'claude' && claudeReady
                            ? 'AI rewrite with Claude Engine — 3 alternate phrasings'
                            : 'AI rewrite with HERMES — 3 alternate phrasings'
                      }
                      data-tour={si === 0 && li === 0 ? 'scribe-ai-rewrite' : undefined}
                    >
                      ✨
                    </button>
                  </div>
                  <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => addLineAfter(si, li)} title="Add a line below" data-tour={si === 0 && li === 0 ? 'scribe-add-line' : undefined}>+</button>
                  <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => deleteLine(si, li)} title="Delete this line" data-tour={si === 0 && li === 0 ? 'scribe-delete-line' : undefined}>×</button>
                </div>
                {suggestFor?.section === si && suggestFor.line === li && (
                  <div style={{ marginTop: 4, marginLeft: 4, padding: 8, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-1)' }}>
                    {suggestLoading && <div className={styles.hint}>✨ asking for alternatives…</div>}
                    {suggestError && <div className={styles.hint} style={{ color: 'var(--amber)' }}>{suggestError}</div>}
                    {!suggestLoading && suggestions.map((alt, ai) => (
                      <div
                        key={ai}
                        className={styles.hookCard}
                        style={{ marginBottom: 4, cursor: 'pointer', padding: 8 }}
                        onClick={() => applySuggestion(alt)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applySuggestion(alt); } }}
                      >
                        {alt}
                      </div>
                    ))}
                    {!suggestLoading && (suggestions.length > 0 || suggestError) && (
                      <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={closeSuggestions}>dismiss</button>
                    )}
                  </div>
                )}
                {wordTarget?.section === si && wordTarget.line === li && (
                  <div style={{ marginTop: 4, marginLeft: 4, padding: 8, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-1)' }}>
                    <div className={styles.hint} style={{ marginBottom: 4 }}>Similar to “{wordTarget.word}”:</div>
                    {wordIdeas.length ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {wordIdeas.map((w) => (
                          <span
                            key={w.w}
                            className={styles.copyBtn}
                            style={{ marginLeft: 0, cursor: 'pointer' }}
                            onClick={() => applyWordIdea(w.w)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyWordIdea(w.w); } }}
                          >
                            {w.w}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.hint}>nothing in the lexicon is close to that word</div>
                    )}
                    <button className={styles.copyBtn} style={{ marginLeft: 0, marginTop: 6 }} onClick={() => setWordTarget(null)}>dismiss</button>
                  </div>
                )}
              </div>
            ))}
            {s.lines.length === 0 && (
              <button className={styles.copyBtn} style={{ marginLeft: 0, alignSelf: 'flex-start' }} onClick={() => addLineAfter(si, -1)}>+ add a line</button>
            )}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className={styles.runBtn} style={{ width: 'auto', flex: 1, padding: 10 }} onClick={save}>Save — teach the brain</button>
        <button className={styles.ghostBtn} onClick={onCancel}>Cancel</button>
        <button className={styles.ghostBtn} onClick={() => setTourOpen(true)} title="Replay the guided tour of this editor">? Show me around</button>
      </div>
      {tourOpen && <GuidedTour steps={TOUR_STEPS} onDone={closeTour} />}
    </div>
  );
}
