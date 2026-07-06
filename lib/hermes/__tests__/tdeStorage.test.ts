// TDE mock-mission persistence (components/tde/tdeStorage.ts) — Branch 10.
// The store follows storage.ts conventions in miniature: hostile-input
// sanitization at the boundary, a .bak mirror healed on corrupt reads, and an
// in-memory fallback when localStorage is absent (this node environment).
import { describe, expect, it } from 'vitest';
import { loadMissions, sanitizeMission, saveMissions } from '../../../components/tde/tdeStorage';

describe('tdeStorage — sanitizeMission treats every payload as hostile', () => {
  it('rejects non-objects and missing/empty required fields', () => {
    expect(sanitizeMission(null)).toBeNull();
    expect(sanitizeMission('hi')).toBeNull();
    expect(sanitizeMission([])).toBeNull();
    expect(sanitizeMission({})).toBeNull();
    expect(sanitizeMission({ id: 1 })).toBeNull(); // no text
    expect(sanitizeMission({ id: 'x', text: 'hello' })).toBeNull(); // bad id
    expect(sanitizeMission({ id: 1, text: '   ' })).toBeNull(); // blank text
  });

  it('coerces unknown enum values to safe defaults and caps lengths', () => {
    const m = sanitizeMission({
      id: 7.9,
      text: 'a'.repeat(2000),
      type: 'DROP TABLE',
      status: 'running for real',
      note: 'n'.repeat(2000),
    });
    expect(m).not.toBeNull();
    expect(m!.id).toBe(7);
    expect(m!.text.length).toBeLessThanOrEqual(500);
    expect(m!.type).toBe('Code');
    expect(m!.status).toBe('suggested'); // never a status implying execution
    expect(m!.note.length).toBeLessThanOrEqual(200);
  });

  it('rebuilds objects so prototype-pollution keys never survive', () => {
    const hostile = JSON.parse('{"id":1,"text":"hi","__proto__":{"polluted":true},"constructor":{"x":1}}');
    const m = sanitizeMission(hostile);
    expect(m).not.toBeNull();
    expect(Object.keys(m!)).toEqual(['id', 'type', 'text', 'status', 'note']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('tdeStorage — save/load roundtrip (in-memory KV in node)', () => {
  it('persists a capped, sanitized list and loads it back', () => {
    const missions = Array.from({ length: 60 }, (_, i) => ({
      id: 60 - i,
      type: 'SCRIBE' as const,
      text: `mission ${i}`,
      status: 'suggested' as const,
      note: 'test',
    }));
    expect(saveMissions(missions)).toBe(true);
    const loaded = loadMissions();
    expect(loaded).not.toBeNull();
    expect(loaded!.length).toBe(50); // MAX_MISSIONS cap
    expect(loaded![0].text).toBe('mission 0');
  });
});
