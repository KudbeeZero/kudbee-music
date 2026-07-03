'use client';

import { useEffect, useState } from 'react';
import styles from './hermes.module.css';

export interface TourStep {
  selector: string;
  title: string;
  body: string;
}

/** A small, generic coach-mark walkthrough — a static config of {selector, title,
 *  body} steps, spotlighting one real DOM element at a time with Next/Skip/Done
 *  navigation. No dependency, no tracking, purely a client-side overlay. Callers
 *  own when it renders and what "seen" means (localStorage, a manual trigger, etc). */
export default function GuidedTour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i];

  useEffect(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setRect(el.getBoundingClientRect()), 280);
    return () => clearTimeout(t);
  }, [i, step]);

  if (!steps.length || !step) return null;
  const isLast = i === steps.length - 1;
  const next = () => (isLast ? onDone() : setI((n) => n + 1));

  const cardTop = rect ? Math.min(rect.bottom + 14, (typeof window !== 'undefined' ? window.innerHeight : 800) - 170) : undefined;
  const cardLeft = rect ? Math.max(12, Math.min(rect.left, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 300)) : undefined;

  return (
    <div role="dialog" aria-label="Guided tour" style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
      {rect && (
        <div
          className={styles.tourSpotlight}
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div
        className={styles.tourCard}
        style={rect
          ? { top: cardTop, left: cardLeft }
          : { top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <div className={styles.hint} style={{ marginBottom: 4 }}>{i + 1} / {steps.length}</div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{step.title}</div>
        <div className={styles.hint} style={{ marginBottom: 10 }}>{step.body}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={styles.runBtn} style={{ width: 'auto', flex: 1, padding: '8px 12px', fontSize: 13 }} onClick={next}>
            {isLast ? 'Done' : 'Next'}
          </button>
          <button className={styles.ghostBtn} onClick={onDone}>Skip</button>
        </div>
      </div>
    </div>
  );
}
