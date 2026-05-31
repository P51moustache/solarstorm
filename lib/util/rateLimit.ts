/**
 * Simple in-memory rate limiter for API routes
 * For production with multiple instances, use Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  let entry = rateLimitMap.get(key);

  // Create new entry if doesn't exist or window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitMap.set(key, entry);
  }

  // Increment count
  entry.count++;

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const success = entry.count <= config.maxRequests;

  return {
    success,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client identifier from request headers
 */
export function getClientIdentifier(headers: Headers): string {
  // Try to get real IP from various headers (for proxies/load balancers)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback
  return 'unknown';
}

// Default rate limit configs
export const RATE_LIMITS = {
  // Standard API: 100 requests per minute
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // Auth endpoints: 10 requests per minute (prevent brute force)
  auth: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  // Heavy endpoints: 20 requests per minute
  heavy: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
};
