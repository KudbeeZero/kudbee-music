import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  currentSubscription,
  getTierFeatures,
  hasFeature,
  upgradeSubscription,
  downgradeToFree,
  checkMonthlyQuota,
  checkVaultQuota,
  tierLabel,
  __clearSubscription,
  SubscriptionTier,
} from '../subscription';

describe('subscription', () => {
  beforeEach(() => {
    __clearSubscription();
  });

  afterEach(() => {
    __clearSubscription();
  });

  describe('currentSubscription', () => {
    it('defaults to free tier', () => {
      const sub = currentSubscription();
      expect(sub.tier).toBe('free');
      expect(sub.startedAt).toBeGreaterThan(0);
      expect(sub.expiresAt).toBeNull();
    });

    it('returns existing subscription', () => {
      const first = currentSubscription();
      const second = currentSubscription();
      expect(second.tier).toBe('free');
      expect(second.startedAt).toBe(first.startedAt);
    });

    it('downgrades expired paid tier to free', () => {
      const now = Date.now();
      upgradeSubscription('pro', now - 1000); // expired 1s ago
      const sub = currentSubscription();
      expect(sub.tier).toBe('free');
    });

    it('keeps valid paid tier', () => {
      const now = Date.now();
      upgradeSubscription('premium', now + 86400000); // expires in 1 day
      const sub = currentSubscription();
      expect(sub.tier).toBe('premium');
    });
  });

  describe('getTierFeatures', () => {
    it('returns features for free tier', () => {
      const features = getTierFeatures('free');
      expect(features.tier).toBe('free');
      expect(features.maxSongsPerMonth).toBe(5);
      expect(features.maxVaultSize).toBe(20);
      expect(features.stems).toBe(false);
      expect(features.cloudSync).toBe(false);
      expect(features.marketplaceUpload).toBe(false);
      expect(features.customPlugins).toBe(false);
      expect(features.apiAccess).toBe(false);
      expect(features.priority).toBe(false);
    });

    it('returns features for pro tier', () => {
      const features = getTierFeatures('pro');
      expect(features.tier).toBe('pro');
      expect(features.maxSongsPerMonth).toBe(25);
      expect(features.maxVaultSize).toBe(100);
      expect(features.stems).toBe(true);
      expect(features.cloudSync).toBe(true);
      expect(features.marketplaceUpload).toBe(true);
      expect(features.customPlugins).toBe(true);
      expect(features.apiAccess).toBe(false);
      expect(features.priority).toBe(false);
    });

    it('returns features for premium tier', () => {
      const features = getTierFeatures('premium');
      expect(features.tier).toBe('premium');
      expect(features.maxSongsPerMonth).toBe(100);
      expect(features.maxVaultSize).toBe(500);
      expect(features.stems).toBe(true);
      expect(features.cloudSync).toBe(true);
      expect(features.marketplaceUpload).toBe(true);
      expect(features.customPlugins).toBe(true);
      expect(features.apiAccess).toBe(true);
      expect(features.priority).toBe(true);
    });

    it('returns features for enterprise tier', () => {
      const features = getTierFeatures('enterprise');
      expect(features.tier).toBe('enterprise');
      expect(features.maxSongsPerMonth).toBe(Infinity);
      expect(features.maxVaultSize).toBe(Infinity);
      expect(features.stems).toBe(true);
      expect(features.cloudSync).toBe(true);
      expect(features.marketplaceUpload).toBe(true);
      expect(features.customPlugins).toBe(true);
      expect(features.apiAccess).toBe(true);
      expect(features.priority).toBe(true);
    });

    it('defaults to current subscription tier', () => {
      upgradeSubscription('pro', Date.now() + 86400000);
      const features = getTierFeatures();
      expect(features.tier).toBe('pro');
    });
  });

  describe('hasFeature', () => {
    it('denies feature access for free tier', () => {
      expect(hasFeature('stems')).toBe(false);
      expect(hasFeature('cloudSync')).toBe(false);
      expect(hasFeature('apiAccess')).toBe(false);
    });

    it('allows basic features for pro tier', () => {
      upgradeSubscription('pro', Date.now() + 86400000);
      expect(hasFeature('stems')).toBe(true);
      expect(hasFeature('cloudSync')).toBe(true);
      expect(hasFeature('marketplaceUpload')).toBe(true);
      expect(hasFeature('customPlugins')).toBe(true);
      expect(hasFeature('apiAccess')).toBe(false);
    });

    it('allows all features for premium tier', () => {
      upgradeSubscription('premium', Date.now() + 86400000);
      expect(hasFeature('stems')).toBe(true);
      expect(hasFeature('apiAccess')).toBe(true);
      expect(hasFeature('priority')).toBe(true);
    });

    it('allows all features for enterprise tier', () => {
      upgradeSubscription('enterprise', Date.now() + 86400000);
      expect(hasFeature('stems')).toBe(true);
      expect(hasFeature('apiAccess')).toBe(true);
      expect(hasFeature('priority')).toBe(true);
    });
  });

  describe('upgradeSubscription', () => {
    it('upgrades to pro tier', () => {
      const expiresAt = Date.now() + 86400000;
      const sub = upgradeSubscription('pro', expiresAt);
      expect(sub.tier).toBe('pro');
      expect(sub.expiresAt).toBe(expiresAt);
    });

    it('upgrades to premium tier', () => {
      const expiresAt = Date.now() + 86400000 * 30;
      const sub = upgradeSubscription('premium', expiresAt);
      expect(sub.tier).toBe('premium');
      expect(sub.expiresAt).toBe(expiresAt);
    });

    it('upgrades to enterprise tier', () => {
      const expiresAt = Date.now() + 86400000 * 365;
      const sub = upgradeSubscription('enterprise', expiresAt);
      expect(sub.tier).toBe('enterprise');
      expect(sub.expiresAt).toBe(expiresAt);
    });

    it('defaults expiresAt to null if not provided', () => {
      const sub = upgradeSubscription('pro');
      expect(sub.expiresAt).toBeNull();
    });

    it('persists upgrade to storage', () => {
      const expiresAt = Date.now() + 86400000;
      upgradeSubscription('pro', expiresAt);
      const restored = currentSubscription();
      expect(restored.tier).toBe('pro');
      expect(restored.expiresAt).toBe(expiresAt);
    });
  });

  describe('downgradeToFree', () => {
    it('downgrades from pro to free', () => {
      upgradeSubscription('pro', Date.now() + 86400000);
      const sub = downgradeToFree();
      expect(sub.tier).toBe('free');
      expect(sub.expiresAt).toBeNull();
    });

    it('downgrades from premium to free', () => {
      upgradeSubscription('premium', Date.now() + 86400000);
      const sub = downgradeToFree();
      expect(sub.tier).toBe('free');
    });

    it('persists downgrade to storage', () => {
      upgradeSubscription('enterprise', Date.now() + 86400000);
      downgradeToFree();
      const restored = currentSubscription();
      expect(restored.tier).toBe('free');
    });
  });

  describe('checkMonthlyQuota', () => {
    it('allows songs within free tier quota', () => {
      const result = checkMonthlyQuota(3);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('denies songs at free tier limit', () => {
      const result = checkMonthlyQuota(5);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('denies songs over free tier limit', () => {
      const result = checkMonthlyQuota(10);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('allows more songs for pro tier', () => {
      upgradeSubscription('pro', Date.now() + 86400000);
      const result = checkMonthlyQuota(20);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('allows unlimited songs for enterprise tier', () => {
      upgradeSubscription('enterprise', Date.now() + 86400000);
      const result = checkMonthlyQuota(1000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe('checkVaultQuota', () => {
    it('allows vault within free tier quota', () => {
      const result = checkVaultQuota(15);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('denies vault at free tier limit', () => {
      const result = checkVaultQuota(20);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('denies vault over free tier limit', () => {
      const result = checkVaultQuota(50);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('allows larger vault for premium tier', () => {
      upgradeSubscription('premium', Date.now() + 86400000);
      const result = checkVaultQuota(400);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(100);
    });

    it('allows unlimited vault for enterprise tier', () => {
      upgradeSubscription('enterprise', Date.now() + 86400000);
      const result = checkVaultQuota(10000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe('tierLabel', () => {
    it('labels free tier', () => {
      expect(tierLabel('free')).toBe('Free');
    });

    it('labels pro tier', () => {
      expect(tierLabel('pro')).toBe('Pro — $18/mo');
    });

    it('labels premium tier', () => {
      expect(tierLabel('premium')).toBe('Premium — $30/mo');
    });

    it('labels enterprise tier', () => {
      expect(tierLabel('enterprise')).toBe('Enterprise — $45/mo');
    });
  });

  describe('expiry validation', () => {
    it('keeps non-expired subscription', () => {
      const futureTime = Date.now() + 86400000;
      upgradeSubscription('pro', futureTime);
      const sub = currentSubscription();
      expect(sub.tier).toBe('pro');
    });

    it('downgrades expired subscription immediately', () => {
      const pastTime = Date.now() - 1000;
      upgradeSubscription('premium', pastTime);
      const sub = currentSubscription();
      expect(sub.tier).toBe('free');
    });

    it('handles edge case at exact expiry time', () => {
      const now = Date.now();
      upgradeSubscription('pro', now);
      const sub = currentSubscription();
      // Subscription is still valid at exact expiry moment (uses > not >=)
      expect(sub.tier).toBe('pro');
      // But expires one millisecond later
      upgradeSubscription('pro', now - 1);
      const expired = currentSubscription();
      expect(expired.tier).toBe('free');
    });
  });

  describe('storage isolation', () => {
    it('independent subscriptions per call', () => {
      upgradeSubscription('pro', Date.now() + 86400000);
      let sub = currentSubscription();
      expect(sub.tier).toBe('pro');

      downgradeToFree();
      sub = currentSubscription();
      expect(sub.tier).toBe('free');

      upgradeSubscription('premium', Date.now() + 86400000);
      sub = currentSubscription();
      expect(sub.tier).toBe('premium');
    });
  });
});
