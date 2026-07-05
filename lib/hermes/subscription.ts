// Subscription tiers — Free, Pro ($18), Premium ($30), Enterprise ($45).
// Tier determines which features/plugins are available. Stored in browser localStorage
// (same pattern as identity/profile). No server, no payment processing (Stripe seam
// is opt-in, deferred). $0 core stays local-first.

export type SubscriptionTier = 'free' | 'pro' | 'premium' | 'enterprise';

export interface TierFeatures {
  tier: SubscriptionTier;
  maxSongsPerMonth: number;
  maxVaultSize: number; // number of songs
  stems: boolean; // multi-track export
  cloudSync: boolean; // cross-device vault
  marketplaceUpload: boolean; // sell beats/plugins
  customPlugins: boolean; // install third-party plugins
  apiAccess: boolean; // for integrations
  priority: boolean; // faster processing
}

const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  free: {
    tier: 'free',
    maxSongsPerMonth: 5,
    maxVaultSize: 20,
    stems: false,
    cloudSync: false,
    marketplaceUpload: false,
    customPlugins: false,
    apiAccess: false,
    priority: false,
  },
  pro: {
    tier: 'pro',
    maxSongsPerMonth: 25,
    maxVaultSize: 100,
    stems: true,
    cloudSync: true,
    marketplaceUpload: true,
    customPlugins: true,
    apiAccess: false,
    priority: false,
  },
  premium: {
    tier: 'premium',
    maxSongsPerMonth: 100,
    maxVaultSize: 500,
    stems: true,
    cloudSync: true,
    marketplaceUpload: true,
    customPlugins: true,
    apiAccess: true,
    priority: true,
  },
  enterprise: {
    tier: 'enterprise',
    maxSongsPerMonth: Infinity,
    maxVaultSize: Infinity,
    stems: true,
    cloudSync: true,
    marketplaceUpload: true,
    customPlugins: true,
    apiAccess: true,
    priority: true,
  },
};

interface Subscription {
  tier: SubscriptionTier;
  startedAt: number;
  expiresAt: number | null; // null = never (free tier), timestamp = renews then
  purchaseId?: string; // Stripe order ID if paid tier
}

const SUBSCRIPTION_KEY = 'hermes.subscription.v1';

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

/**
 * Get the current subscription. Defaults to 'free' tier if none is set.
 */
export function currentSubscription(): Subscription {
  try {
    const raw = kv().getItem(SUBSCRIPTION_KEY);
    if (!raw) return createSubscription('free');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed && typeof (parsed as any).tier === 'string') {
      const sub = parsed as Subscription;
      // Check if paid tier has expired
      if (sub.expiresAt && Date.now() > sub.expiresAt) {
        // Downgrade to free
        return setSubscription('free');
      }
      return sub;
    }
  } catch {
    /* fallthrough */
  }
  return createSubscription('free');
}

/**
 * Get the features available for a tier.
 */
export function getTierFeatures(tier: SubscriptionTier = currentSubscription().tier): TierFeatures {
  return TIER_FEATURES[tier];
}

/**
 * Check if a feature is available for the current tier.
 */
export function hasFeature(feature: keyof Omit<TierFeatures, 'tier'>): boolean {
  const tier = currentSubscription().tier;
  return TIER_FEATURES[tier][feature] === true;
}

/**
 * Create a new subscription (internal).
 */
function createSubscription(tier: SubscriptionTier, expiresAt?: number): Subscription {
  return {
    tier,
    startedAt: Date.now(),
    expiresAt: expiresAt ?? null,
  };
}

/**
 * Upgrade to a paid tier (manual for now; Stripe integration is opt-in).
 * `expiresAt` is when the subscription renews (or null for never).
 */
export function upgradeSubscription(tier: Exclude<SubscriptionTier, 'free'>, expiresAt?: number): Subscription {
  const sub = createSubscription(tier, expiresAt);
  return setSubscription(tier, expiresAt);
}

/**
 * Downgrade to free tier (keeps all data, just feature-gates).
 */
export function downgradeToFree(): Subscription {
  return setSubscription('free');
}

/**
 * Set subscription directly (internal).
 */
function setSubscription(tier: SubscriptionTier, expiresAt?: number): Subscription {
  const sub = createSubscription(tier, expiresAt);
  try {
    kv().setItem(SUBSCRIPTION_KEY, JSON.stringify(sub));
  } catch {
    /* quota — sub still works for this session */
  }
  return sub;
}

/**
 * Check if a user has hit their monthly song quota.
 */
export function checkMonthlyQuota(songsThisMonth: number): { allowed: boolean; remaining: number } {
  const features = getTierFeatures();
  const remaining = Math.max(0, features.maxSongsPerMonth - songsThisMonth);
  return { allowed: remaining > 0, remaining };
}

/**
 * Check if vault size is within tier limits.
 */
export function checkVaultQuota(totalSongs: number): { allowed: boolean; remaining: number } {
  const features = getTierFeatures();
  const remaining = Math.max(0, features.maxVaultSize - totalSongs);
  return { allowed: remaining > 0, remaining };
}

/**
 * Get the tier badge label (pricing).
 */
export function tierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'pro':
      return 'Pro — $18/mo';
    case 'premium':
      return 'Premium — $30/mo';
    case 'enterprise':
      return 'Enterprise — $45/mo';
  }
}

/** Test-only reset */
export function __clearSubscription(): void {
  memory.clear();
  try {
    kv().removeItem(SUBSCRIPTION_KEY);
  } catch {
    /* ignore */
  }
}
