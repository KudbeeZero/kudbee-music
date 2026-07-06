// TDE local mock-mission persistence — Branch 10 (docs/kudbee-tde-roadmap.md).
// Follows lib/hermes/storage.ts conventions in miniature: localStorage with an
// in-memory fallback (SSR/tests), a `.bak` mirror healed on corrupt reads, and
// hostile-input sanitization at the boundary (length caps, field coercion,
// prototype-pollution-safe, never throws). Stores ONLY the visitor's own mock
// mission suggestions — no secrets, no credentials, nothing executable.

import { MISSION_TYPES, type MissionType, type MockMission } from './MissionPanel';

const KEY = 'hermes.tdeMissions.v1';
const BAK = '.bak';
const MAX_MISSIONS = 50;
const MAX_TEXT = 500;
const MAX_NOTE = 200;

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

const memory = new Map<string, string>();
const memoryKV: KV = {
  getItem: (k) => (memory.has(k) ? memory.get(k)! : null),
  setItem: (k, v) => void memory.set(k, v),
};

function kv(): KV {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return memoryKV;
}

const STATUSES: ReadonlyArray<MockMission['status']> = ['queued (mock)', 'suggested'];

/** Boundary sanitizer — every stored payload is treated as hostile. */
export function sanitizeMission(raw: unknown): MockMission | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'number' && Number.isFinite(o.id) ? Math.floor(o.id) : null;
  const text = typeof o.text === 'string' ? o.text.slice(0, MAX_TEXT).trim() : '';
  if (id === null || !text) return null;
  const type: MissionType = (MISSION_TYPES as readonly string[]).includes(o.type as string)
    ? (o.type as MissionType)
    : 'Code';
  const status = STATUSES.includes(o.status as MockMission['status'])
    ? (o.status as MockMission['status'])
    : 'suggested';
  const note = typeof o.note === 'string' ? o.note.slice(0, MAX_NOTE) : '';
  // Rebuilt object — own keys only, so __proto__/constructor payloads never survive.
  return { id, type, text, status, note };
}

function parseList(raw: string | null): MockMission[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(sanitizeMission).filter((m): m is MockMission => m !== null);
  } catch {
    return null;
  }
}

export function loadMissions(): MockMission[] | null {
  try {
    const live = parseList(kv().getItem(KEY));
    if (live) return live;
    const backup = parseList(kv().getItem(KEY + BAK));
    if (backup) {
      try { kv().setItem(KEY, JSON.stringify(backup)); } catch { /* heal is best-effort */ }
      return backup;
    }
  } catch { /* storage unavailable — caller falls back to seeds */ }
  return null;
}

export function saveMissions(missions: MockMission[]): boolean {
  const capped = missions.slice(0, MAX_MISSIONS).map(sanitizeMission).filter((m): m is MockMission => m !== null);
  const json = JSON.stringify(capped);
  let ok = false;
  try { kv().setItem(KEY, json); ok = true; } catch { /* quota/unavailable */ }
  try { kv().setItem(KEY + BAK, json); } catch { /* mirror best-effort */ }
  return ok;
}
