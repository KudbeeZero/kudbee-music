'use client';

import { useState } from 'react';
import type { SongInputs, SongSection } from '@/lib/hermes/types';
import { renderSections } from '@/lib/hermes/edits';
import { claudeEngineReady, getClaudeKey } from '@/lib/hermes/claudeKey';
import { suggestLineRewrites, ClaudeProviderError } from '@/lib/hermes/providers/claudeLyricsProvider';
import styles from './hermes.module.css';

interface Target { section: number; line: number }

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
    if (!claudeReady) {
      setSuggestFor({ section, line });
      setSuggestions([]);
      setSuggestError('Unlock the Claude Engine in the rack above (your own Anthropic key) to enable AI line rewrites.');
      return;
    }
    const s = sections[section];
    setSuggestFor({ section, line });
    setSuggestions([]);
    setSuggestError(null);
    setSuggestLoading(true);
    try {
      const alts = await suggestLineRewrites(
        { apiKey: getClaudeKey() ?? undefined },
        { sectionLabel: s.label, line: s.lines[line], precedingLine: s.lines[line - 1], followingLine: s.lines[line + 1], inputs },
        3,
      );
      setSuggestions(alts);
    } catch (e) {
      setSuggestError(e instanceof ClaudeProviderError ? e.message : 'Rewrite request failed — try again.');
    } finally {
      setSuggestLoading(false);
    }
  }

  function applySuggestion(text: string) {
    if (!suggestFor) return;
    updateLine(suggestFor.section, suggestFor.line, text);
    closeSuggestions();
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
                    aria-label={`${s.label} line ${li + 1}`}
                  />
                  <button
                    className={styles.copyBtn}
                    style={{ marginLeft: 0 }}
                    onClick={() => requestRewrite(si, li)}
                    title={claudeReady ? 'AI rewrite — 3 alternate phrasings from the Claude Engine' : 'Unlock the Claude Engine in the rack to enable AI rewrites'}
                  >
                    ✨
                  </button>
                  <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => addLineAfter(si, li)} title="Add a line below">+</button>
                  <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => deleteLine(si, li)} title="Delete this line">×</button>
                </div>
                {suggestFor?.section === si && suggestFor.line === li && (
                  <div style={{ marginTop: 4, marginLeft: 4, padding: 8, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-1)' }}>
                    {suggestLoading && <div className={styles.hint}>✨ asking the Claude Engine…</div>}
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
      </div>
    </div>
  );
}
