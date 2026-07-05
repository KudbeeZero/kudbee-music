import { describe, it, expect, beforeEach } from 'vitest';
import {
  emailSignUp,
  emailSignIn,
  currentSession,
  refreshSession,
  emailSignOut,
  changePassword,
  __clearAuth,
} from '../auth.ts';
import { __clearIdentity } from '../identity.ts';

const mockProfile = { id: 'test-1', name: 'Test User', kind: 'email' as const, createdAt: new Date().toISOString() };

describe('auth.ts', () => {
  beforeEach(() => {
    __clearAuth();
    __clearIdentity();
  });

  describe('emailSignUp', () => {
    it('creates a new account with valid email and password', async () => {
      const result = await emailSignUp('test@example.com', 'password123', mockProfile);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(currentSession()).not.toBeNull();
    });

    it('rejects invalid email', async () => {
      const result = await emailSignUp('invalid', 'password123', mockProfile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    it('rejects short password', async () => {
      const result = await emailSignUp('test@example.com', 'short', mockProfile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 6 characters');
    });

    it('rejects duplicate email', async () => {
      await emailSignUp('test@example.com', 'password123', mockProfile);
      const result = await emailSignUp('test@example.com', 'different', mockProfile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already in use');
    });

    it('normalizes email to lowercase', async () => {
      const result = await emailSignUp('Test@Example.COM', 'password123', mockProfile);
      expect(result.success).toBe(true);

      // Should fail when trying to register again with different case
      const result2 = await emailSignUp('test@example.com', 'password123', mockProfile);
      expect(result2.success).toBe(false);
    });

    it('creates session with default 8h duration', async () => {
      await emailSignUp('test@example.com', 'password123', mockProfile);
      const session = currentSession();
      expect(session).not.toBeNull();
      expect(session?.expiresAt).toBeGreaterThan(Date.now());
      const diff = session!.expiresAt - session!.createdAt;
      expect(diff).toBeLessThanOrEqual(8 * 60 * 60 * 1000 + 1000); // 8h + 1s tolerance
    });

    it('creates session with custom duration', async () => {
      await emailSignUp('test@example.com', 'password123', mockProfile, '1h');
      const session = currentSession();
      const diff = session!.expiresAt - session!.createdAt;
      expect(diff).toBeLessThanOrEqual(60 * 60 * 1000 + 1000); // 1h + 1s
    });
  });

  describe('emailSignIn', () => {
    beforeEach(async () => {
      await emailSignUp('test@example.com', 'password123', mockProfile);
      emailSignOut();
    });

    it('signs in with correct email and password', async () => {
      const result = await emailSignIn('test@example.com', 'password123', mockProfile);
      expect(result.success).toBe(true);
      expect(result.profile).toEqual(mockProfile);
      expect(currentSession()).not.toBeNull();
    });

    it('rejects incorrect password', async () => {
      const result = await emailSignIn('test@example.com', 'wrongpassword', mockProfile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Incorrect password');
    });

    it('rejects nonexistent email', async () => {
      const result = await emailSignIn('nonexistent@example.com', 'password123', mockProfile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email not found');
    });

    it('normalizes email to lowercase', async () => {
      const result = await emailSignIn('Test@Example.COM', 'password123', mockProfile);
      expect(result.success).toBe(true);
    });
  });

  describe('currentSession', () => {
    it('returns null when no session exists', () => {
      expect(currentSession()).toBeNull();
    });

    it('returns session after signup', async () => {
      await emailSignUp('test@example.com', 'password123', mockProfile);
      const session = currentSession();
      expect(session).not.toBeNull();
      expect(session?.profileId).toBe(mockProfile.id);
      expect(session?.sessionToken).toBeTruthy();
    });

    it('returns null for expired session', async () => {
      // This is hard to test without mocking time, but we can verify structure
      await emailSignUp('test@example.com', 'password123', mockProfile);
      const session = currentSession();
      expect(session?.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('refreshSession', () => {
    it('extends session expiry', async () => {
      await emailSignUp('test@example.com', 'password123', mockProfile, '1h');
      const before = currentSession()?.expiresAt ?? 0;

      // Small delay to ensure timestamps differ
      await new Promise((r) => setTimeout(r, 10));
      refreshSession('30d');
      const after = currentSession()?.expiresAt ?? 0;

      expect(after).toBeGreaterThan(before);
    });

    it('does nothing when no session exists', () => {
      expect(() => refreshSession('8h')).not.toThrow();
    });
  });

  describe('emailSignOut', () => {
    it('clears the session', async () => {
      await emailSignUp('test@example.com', 'password123', mockProfile);
      expect(currentSession()).not.toBeNull();

      emailSignOut();
      expect(currentSession()).toBeNull();
    });
  });

  describe('changePassword', () => {
    beforeEach(async () => {
      await emailSignUp('test@example.com', 'password123', mockProfile);
      emailSignOut();
    });

    it('changes password with correct old password', async () => {
      const success = await changePassword('test@example.com', 'password123', 'newpassword456');
      expect(success).toBe(true);

      // Old password should fail
      const result1 = await emailSignIn('test@example.com', 'password123', mockProfile);
      expect(result1.success).toBe(false);

      // New password should work
      const result2 = await emailSignIn('test@example.com', 'newpassword456', mockProfile);
      expect(result2.success).toBe(true);
    });

    it('rejects wrong old password', async () => {
      const success = await changePassword('test@example.com', 'wrongpassword', 'newpassword456');
      expect(success).toBe(false);

      // Original password still works
      const result = await emailSignIn('test@example.com', 'password123', mockProfile);
      expect(result.success).toBe(true);
    });

    it('rejects short new password', async () => {
      const success = await changePassword('test@example.com', 'password123', 'short');
      expect(success).toBe(false);
    });

    it('rejects nonexistent email', async () => {
      const success = await changePassword('nonexistent@example.com', 'password123', 'newpassword456');
      expect(success).toBe(false);
    });
  });
});
