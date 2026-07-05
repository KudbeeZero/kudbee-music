'use client';

import { useState } from 'react';
import { emailSignUp, emailSignIn, type SessionDuration } from '@/lib/hermes/auth';
import { signInGuest } from '@/lib/hermes/identity';
import type { Profile } from '@/lib/hermes/identity';
import styles from './hermes.module.css';

interface EmailAuthProps {
  onSignUp: (profile: Profile) => void;
  onGuestSignIn?: () => void;
}

export default function EmailAuth({ onSignUp, onGuestSignIn }: EmailAuthProps) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [duration, setDuration] = useState<SessionDuration>('8h');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const profile: Profile = {
        id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: email.split('@')[0],
        kind: 'email',
        email: email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
      };

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        const result = await emailSignUp(email, password, profile, duration);
        if (result.success) {
          onSignUp(profile);
        } else {
          setError(result.error || 'Sign up failed');
        }
      } else {
        const result = await emailSignIn(email, password, profile, duration);
        if (result.success) {
          onSignUp(profile);
        } else {
          setError(result.error || 'Sign in failed');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.panel} style={{ maxWidth: 400, margin: '20px auto' }}>
      <div className={styles.panelTitle}>
        {mode === 'signup' ? '🔐 Create Account' : '🔑 Sign In'}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          required
          disabled={loading}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          required
          minLength={6}
          disabled={loading}
        />

        {mode === 'signup' && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={styles.input}
            required
            minLength={6}
            disabled={loading}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, opacity: 0.8 }}>Session duration:</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value as SessionDuration)}
            className={styles.input}
            disabled={loading}
          >
            <option value="1h">1 hour</option>
            <option value="8h">8 hours</option>
            <option value="30d">30 days</option>
          </select>
        </div>

        {error && <div style={{ color: 'var(--bad)', fontSize: 13 }}>❌ {error}</div>}

        <button className={styles.ghostBtn} type="submit" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? '...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
        </button>

        <button
          type="button"
          className={styles.ghostBtn}
          onClick={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup');
            setError('');
            setConfirmPassword('');
          }}
          disabled={loading}
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create account'}
        </button>
      </form>

      {onGuestSignIn && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-weak)' }}>
          <button
            className={styles.ghostBtn}
            onClick={onGuestSignIn}
            style={{ width: '100%' }}
            disabled={loading}
          >
            👤 Continue as Guest
          </button>
        </div>
      )}
    </div>
  );
}
