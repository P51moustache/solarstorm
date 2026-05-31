/**
 * API Key Management Service
 * Handles generation, validation, and rate limiting for public API access
 */

import { checkRateLimit, type RateLimitConfig } from '@/lib/util/rateLimit';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string; // First 8 chars for display (e.g., "ss_live_abc...")
  key_hash: string; // SHA-256 hash of full key for validation
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  requests_today: number;
  daily_limit: number;
}

export interface ApiKeyCreateResult {
  apiKey: ApiKey;
  fullKey: string; // Only returned on creation, never stored
}

// Rate limits by tier
export const API_RATE_LIMITS: Record<string, RateLimitConfig & { dailyLimit: number }> = {
  pro: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    dailyLimit: 1000,
  },
};

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

/**
 * Hash a string using SHA-256
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a new API key
 * Format: ss_live_<32 random chars>
 */
export async function generateApiKey(
  userId: string,
  name: string,
  tier: 'pro' = 'pro'
): Promise<ApiKeyCreateResult> {
  const randomPart = generateRandomString(32);
  const fullKey = `ss_live_${randomPart}`;
  const keyPrefix = fullKey.substring(0, 12) + '...';
  const keyHash = await hashString(fullKey);

  const limits = API_RATE_LIMITS[tier];

  // Store in localStorage for now (would be Supabase in production)
  const apiKey: ApiKey = {
    id: crypto.randomUUID(),
    user_id: userId,
    name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    last_used_at: null,
    created_at: new Date().toISOString(),
    expires_at: null,
    is_active: true,
    requests_today: 0,
    daily_limit: limits.dailyLimit,
  };

  // Store the key (in production, this would go to Supabase)
  const stored = getStoredKeys();
  stored.push(apiKey);
  localStorage.setItem('solarstorm:apiKeys', JSON.stringify(stored));

  // Also store the hash -> key mapping for validation
  const hashMap = JSON.parse(localStorage.getItem('solarstorm:apiKeyHashes') || '{}');
  hashMap[keyHash] = { userId, tier, keyId: apiKey.id };
  localStorage.setItem('solarstorm:apiKeyHashes', JSON.stringify(hashMap));

  return { apiKey, fullKey };
}

/**
 * Get all API keys for a user (without the actual key values)
 */
export function getUserApiKeys(userId: string): ApiKey[] {
  const stored = getStoredKeys();
  return stored.filter((key) => key.user_id === userId && key.is_active);
}

/**
 * Delete (deactivate) an API key
 */
export function deleteApiKey(keyId: string, userId: string): boolean {
  const stored = getStoredKeys();
  const index = stored.findIndex((k) => k.id === keyId && k.user_id === userId);

  if (index === -1) return false;

  stored[index].is_active = false;
  localStorage.setItem('solarstorm:apiKeys', JSON.stringify(stored));

  return true;
}

/**
 * Validate an API key and check rate limits
 */
export async function validateApiKey(
  key: string
): Promise<{
  valid: boolean;
  userId?: string;
  tier?: string;
  keyId?: string;
  remaining?: number;
  error?: string;
}> {
  if (!key.startsWith('ss_live_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const keyHash = await hashString(key);
  const hashMap = JSON.parse(localStorage.getItem('solarstorm:apiKeyHashes') || '{}');
  const keyInfo = hashMap[keyHash];

  if (!keyInfo) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Check if key is still active
  const stored = getStoredKeys();
  const apiKey = stored.find((k) => k.id === keyInfo.keyId);

  if (!apiKey || !apiKey.is_active) {
    return { valid: false, error: 'API key has been revoked' };
  }

  // Check expiration
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Check rate limit
  const limits = API_RATE_LIMITS[keyInfo.tier] || API_RATE_LIMITS.pro;
  const rateLimitResult = checkRateLimit(`api:${keyInfo.keyId}`, limits);

  if (!rateLimitResult.success) {
    return {
      valid: false,
      error: 'Rate limit exceeded',
      remaining: 0,
    };
  }

  // Update last used
  const index = stored.findIndex((k) => k.id === keyInfo.keyId);
  if (index !== -1) {
    stored[index].last_used_at = new Date().toISOString();
    stored[index].requests_today++;
    localStorage.setItem('solarstorm:apiKeys', JSON.stringify(stored));
  }

  return {
    valid: true,
    userId: keyInfo.userId,
    tier: keyInfo.tier,
    keyId: keyInfo.keyId,
    remaining: rateLimitResult.remaining,
  };
}

/**
 * Get stored keys from localStorage
 */
function getStoredKeys(): ApiKey[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('solarstorm:apiKeys') || '[]');
  } catch {
    return [];
  }
}

/**
 * Reset daily request counts (call at midnight)
 */
export function resetDailyLimits(): void {
  const stored = getStoredKeys();
  for (const key of stored) {
    key.requests_today = 0;
  }
  localStorage.setItem('solarstorm:apiKeys', JSON.stringify(stored));
}
