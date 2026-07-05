// Email/password authentication — local-first, client-only. Passwords hashed via
// Web Crypto API (built-in, no deps). Sessions stored in localStorage with
// customizable timeout. No server, no network — all in this browser.

import type { Profile } from './identity.ts';

export type SessionDuration = '1h' | '8h' | '30d';

interface StoredCredential {
  email: string;
  passwordHash: string;
  salt: string;
}

interface Session {
  profileId: string;
  sessionToken: string;
  expiresAt: number;
  createdAt: number;
}

const CREDENTIALS_KEY = 'hermes.credentials.v1'; // keyed by email (map: email -> StoredCredential)
const SESSION_KEY = 'hermes.session.v1';

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const memory = new Map<string, string>();
const memoryKV: KV = {
  getItem: (k) => (memory.has(k) ? memory.get(k)! : null),
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

function kv(): KV {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return memoryKV;
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(arr);
  } else {
    // Node.js fallback for tests
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSessionToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `token_${Math.random().toString(36).slice(2, 18)}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  // PBKDF2 via Web Crypto API: 100,000 iterations, SHA-256
  if (typeof window === 'undefined' || !window.crypto) {
    // Node.js test fallback: simple hash
    return Buffer.from(`${password}:${salt}`).toString('base64');
  }

  const encoder = new TextEncoder();
  const saltBytes = new Uint8Array(salt.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const key = await window.crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derived = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBytes,
      iterations: 100000,
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(derived), (b) => b.toString(16).padStart(2, '0')).join('');
}

function durationMs(duration: SessionDuration): number {
  switch (duration) {
    case '1h':
      return 60 * 60 * 1000;
    case '8h':
      return 8 * 60 * 60 * 1000;
    case '30d':
      return 30 * 24 * 60 * 60 * 1000;
  }
}

function getCredentials(): Record<string, StoredCredential> {
  try {
    const raw = kv().getItem(CREDENTIALS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return parsed as Record<string, StoredCredential>;
    return {};
  } catch {
    return {};
  }
}

function saveCredentials(creds: Record<string, StoredCredential>): void {
  try {
    kv().setItem(CREDENTIALS_KEY, JSON.stringify(creds));
  } catch {
    /* quota — signup still works for this session */
  }
}

function getSession(): Session | null {
  try {
    const raw = kv().getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed && typeof (parsed as any).sessionToken === 'string') {
      const s = parsed as Session;
      if (Date.now() < s.expiresAt) return s;
      // Expired session — clean up
      kv().removeItem(SESSION_KEY);
    }
    return null;
  } catch {
    return null;
  }
}

function saveSession(session: Session): void {
  try {
    kv().setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* quota — session still works for this session */
  }
}

/**
 * Sign up with email and password. Returns the new profile on success, or an
 * error string if signup fails (email already in use, invalid input).
 */
export async function emailSignUp(
  email: string,
  password: string,
  profile: Profile,
  duration?: SessionDuration,
): Promise<{ success: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase();

  // Validate
  if (!trimmed || !/.+@.+\..+/.test(trimmed)) return { success: false, error: 'Invalid email' };
  if (!password || password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

  // Check if email already exists
  const creds = getCredentials();
  if (creds[trimmed]) return { success: false, error: 'Email already in use' };

  // Hash password with new salt
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  // Store credential
  creds[trimmed] = { email: trimmed, passwordHash: hash, salt };
  saveCredentials(creds);

  // Create session
  const sessionToken = generateSessionToken();
  const d = durationMs(duration || '8h');
  const session: Session = {
    profileId: profile.id,
    sessionToken,
    expiresAt: Date.now() + d,
    createdAt: Date.now(),
  };
  saveSession(session);

  return { success: true };
}

/**
 * Sign in with email and password. Returns the profile on success, or an error
 * string if signin fails.
 */
export async function emailSignIn(
  email: string,
  password: string,
  profile: Profile, // the profile to associate with this session
  duration?: SessionDuration,
): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  const trimmed = email.trim().toLowerCase();

  // Validate
  if (!trimmed || !password) return { success: false, error: 'Email and password required' };

  // Look up credential
  const creds = getCredentials();
  const cred = creds[trimmed];
  if (!cred) return { success: false, error: 'Email not found' };

  // Verify password
  const hash = await hashPassword(password, cred.salt);
  if (hash !== cred.passwordHash) return { success: false, error: 'Incorrect password' };

  // Create session
  const sessionToken = generateSessionToken();
  const d = durationMs(duration || '8h');
  const session: Session = {
    profileId: profile.id,
    sessionToken,
    expiresAt: Date.now() + d,
    createdAt: Date.now(),
  };
  saveSession(session);

  return { success: true, profile };
}

/**
 * Get the current session if it exists and hasn't expired.
 */
export function currentSession(): Session | null {
  return getSession();
}

/**
 * Update the session duration (extend the timeout).
 */
export function refreshSession(duration: SessionDuration): void {
  const session = getSession();
  if (!session) return;
  const d = durationMs(duration);
  session.expiresAt = Date.now() + d;
  saveSession(session);
}

/**
 * Sign out and clear the session.
 */
export function emailSignOut(): void {
  try {
    kv().removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Change password for a given email.
 */
export async function changePassword(email: string, oldPassword: string, newPassword: string): Promise<boolean> {
  const trimmed = email.trim().toLowerCase();

  // Validate
  if (!trimmed || !oldPassword || !newPassword) return false;
  if (newPassword.length < 6) return false;

  // Look up credential
  const creds = getCredentials();
  const cred = creds[trimmed];
  if (!cred) return false;

  // Verify old password
  const oldHash = await hashPassword(oldPassword, cred.salt);
  if (oldHash !== cred.passwordHash) return false;

  // Hash new password with new salt
  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  // Update
  cred.passwordHash = newHash;
  cred.salt = newSalt;
  saveCredentials(creds);

  return true;
}

/** Test-only reset */
export function __clearAuth(): void {
  memory.clear();
  try {
    kv().removeItem(CREDENTIALS_KEY);
    kv().removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
