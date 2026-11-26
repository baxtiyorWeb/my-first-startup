interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  maxEntries: number;
  hits: number;
  misses: number;
}

/**
 * Bounded in-memory LRU cache with per-entry TTL expiration and prefix invalidation.
 * Designed for single-node Next.js servers and serverless warm isolates without extra Redis hops.
 */
export class TtlLruCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(options: { maxEntries?: number; defaultTtlMs?: number } = {}) {
    this.maxEntries = Math.max(10, options.maxEntries ?? 250);
    this.defaultTtlMs = Math.max(100, options.defaultTtlMs ?? 15_000);
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }

    // Refresh LRU order on read
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    while (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + Math.max(50, ttlMs),
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  invalidatePrefix(prefix: string): number {
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    this.store.clear();
  }

  stats(): CacheStats {
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
    };
  }
}

const globalCacheHost = globalThis as unknown as {
  __getersFeedCache?: TtlLruCache<unknown>;
  __getersPricingCache?: TtlLruCache<unknown>;
  __getersTagCache?: TtlLruCache<unknown>;
  __getersAuthSessionCache?: TtlLruCache<{
    userExists: boolean;
    isDeactivated: boolean;
    sessionExists: boolean;
  }>;
  __getersActionIdemCache?: TtlLruCache<unknown>;
};

export const feedCache =
  globalCacheHost.__getersFeedCache ??
  (globalCacheHost.__getersFeedCache = new TtlLruCache<unknown>({
    maxEntries: 250,
    defaultTtlMs: 15_000,
  }));

export const pricingCache =
  globalCacheHost.__getersPricingCache ??
  (globalCacheHost.__getersPricingCache = new TtlLruCache<unknown>({
    maxEntries: 100,
    defaultTtlMs: 60_000,
  }));

export const tagCache =
  globalCacheHost.__getersTagCache ??
  (globalCacheHost.__getersTagCache = new TtlLruCache<unknown>({
    maxEntries: 400,
    defaultTtlMs: 30_000,
  }));

export const authSessionCache =
  globalCacheHost.__getersAuthSessionCache ??
  (globalCacheHost.__getersAuthSessionCache = new TtlLruCache({
    maxEntries: 500,
    defaultTtlMs: 15_000,
  }));

export const actionIdempotencyCache =
  globalCacheHost.__getersActionIdemCache ??
  (globalCacheHost.__getersActionIdemCache = new TtlLruCache<unknown>({
    maxEntries: 2500,
    defaultTtlMs: 10 * 60_000,
  }));

export function invalidateFeedCaches(): void {
  feedCache.invalidatePrefix("feed:");
  feedCache.invalidatePrefix("shorts:");
  feedCache.invalidatePrefix("bookmarks:");
  feedCache.invalidatePrefix("post:");
}

export function invalidatePostCaches(postId: string, userId?: string): void {
  feedCache.invalidatePrefix("feed:");
  feedCache.invalidatePrefix("shorts:");
  feedCache.invalidatePrefix(`post:${postId}:`);
  if (userId) {
    feedCache.invalidatePrefix(`bookmarks:${userId}:`);
  }
}

export function invalidateTagCaches(): void {
  tagCache.invalidatePrefix("tags:");
  tagCache.invalidatePrefix("trending:");
  tagCache.invalidatePrefix("suggest:");
  tagCache.invalidatePrefix("tag:");
}

export function invalidatePricingCaches(userId?: string): void {
  if (userId) {
    pricingCache.delete(`pricing:${userId}`);
    pricingCache.delete("pricing:guest");
    return;
  }
  pricingCache.clear();
}

export function invalidateAuthCache(userId: string): void {
  authSessionCache.invalidatePrefix(`${userId}:`);
}
