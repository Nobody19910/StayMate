/**
 * Local filesystem cache using Capacitor Preferences (JSON data)
 * and Filesystem (large payloads / images).
 *
 * Strategy: stale-while-revalidate
 *  1. Return cached data instantly (if fresh enough)
 *  2. Fetch from Supabase in background
 *  3. Update cache + notify caller with fresh data
 *
 * Works on native (iOS/Android) and web (falls back to localStorage).
 */

import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

// ─── Config ──────────────────────────────────────────────────────────────────

const CACHE_PREFIX = "sm_cache_";
const DEFAULT_TTL = 5 * 60 * 1000;        // 5 min — data considered "fresh"
const STALE_TTL = 30 * 60 * 1000;         // 30 min — data usable while revalidating
const MAX_AGE = 24 * 60 * 60 * 1000;      // 24h — hard expiry, force network

// ─── Types ───────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  ts: number;       // timestamp when cached
  version: number;   // schema version for invalidation
}

const SCHEMA_VERSION = 1;

// ─── Core read / write ───────────────────────────────────────────────────────

async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const { value } = await Preferences.get({ key: CACHE_PREFIX + key });
    if (!value) return null;
    const entry: CacheEntry<T> = JSON.parse(value);
    if (entry.version !== SCHEMA_VERSION) return null;
    // Hard expiry
    if (Date.now() - entry.ts > MAX_AGE) {
      Preferences.remove({ key: CACHE_PREFIX + key });
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now(), version: SCHEMA_VERSION };
    await Preferences.set({ key: CACHE_PREFIX + key, value: JSON.stringify(entry) });
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface CachedResult<T> {
  data: T;
  fromCache: boolean;
  stale: boolean;
}

/**
 * Fetch with stale-while-revalidate caching.
 *
 * @param key     Unique cache key (e.g. "homes", "hostel_abc123")
 * @param fetcher Async function that fetches fresh data from Supabase
 * @param opts    Optional TTL overrides
 * @returns       Cached or fresh data
 *
 * Usage:
 *   const { data } = await cachedFetch("homes", () => getHomes());
 *   // or with background revalidation callback:
 *   cachedFetch("homes", () => getHomes(), {
 *     onRevalidated: (fresh) => setHomes(fresh),
 *   });
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: {
    freshTTL?: number;
    staleTTL?: number;
    onRevalidated?: (data: T) => void;
  }
): Promise<CachedResult<T>> {
  const freshTTL = opts?.freshTTL ?? DEFAULT_TTL;
  const staleTTL = opts?.staleTTL ?? STALE_TTL;

  // 1. Try cache
  const cached = await readCache<T>(key);

  if (cached) {
    const age = Date.now() - cached.ts;

    // Fresh — return immediately, no network
    if (age < freshTTL) {
      return { data: cached.data, fromCache: true, stale: false };
    }

    // Stale but usable — return cached, revalidate in background
    if (age < staleTTL) {
      // Fire-and-forget background refresh
      fetcher()
        .then(async (fresh) => {
          await writeCache(key, fresh);
          opts?.onRevalidated?.(fresh);
        })
        .catch(() => {}); // Network error — keep stale data

      return { data: cached.data, fromCache: true, stale: true };
    }
  }

  // 2. No cache or expired — fetch from network
  try {
    const data = await fetcher();
    await writeCache(key, data);
    return { data, fromCache: false, stale: false };
  } catch (err) {
    // Network failure — return expired cache as last resort
    if (cached) {
      return { data: cached.data, fromCache: true, stale: true };
    }
    throw err;
  }
}

/**
 * Invalidate a specific cache key (e.g. after user edits a listing).
 */
export async function invalidateCache(key: string): Promise<void> {
  await Preferences.remove({ key: CACHE_PREFIX + key });
}

/**
 * Invalidate all keys matching a prefix (e.g. "homes" clears "homes", "homes_abc").
 */
export async function invalidateCachePrefix(prefix: string): Promise<void> {
  try {
    const { keys } = await Preferences.keys();
    const targets = keys.filter(k => k.startsWith(CACHE_PREFIX + prefix));
    await Promise.all(targets.map(key => Preferences.remove({ key })));
  } catch {
    // Best effort
  }
}

/**
 * Clear entire StayMate cache.
 */
export async function clearAllCache(): Promise<void> {
  try {
    const { keys } = await Preferences.keys();
    const targets = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await Promise.all(targets.map(key => Preferences.remove({ key })));
  } catch {
    // Best effort
  }
}

/**
 * Check if we're on a native platform (for conditional cache sizing).
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
