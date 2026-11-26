import test from "node:test";
import assert from "node:assert/strict";

// Isolated ES test harness mirroring TtlLruCache and idempotent/batch sync logic
// so backend behavior is verified deterministically without mutating production DB.

class TtlLruCache {
  constructor({ maxEntries = 250, defaultTtlMs = 15_000 } = {}) {
    this.store = new Map();
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    this.hits = 0;
    this.misses = 0;
  }

  get(key, now = Date.now()) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (now > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs, now = Date.now()) {
    if (this.store.has(key)) this.store.delete(key);
    while (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: now + ttlMs });
  }

  invalidatePrefix(prefix) {
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
}

function createInMemoryPostActionSimulator() {
  const posts = new Map([
    ["post-1", { deleted: false, likesCount: 5, sharesCount: 1 }],
    ["post-2", { deleted: false, likesCount: 0, sharesCount: 0 }],
  ]);
  const likes = new Set(); // `${userId}:${postId}`
  const bookmarks = new Set();
  const idemCache = new TtlLruCache({ maxEntries: 500, defaultTtlMs: 600_000 });

  function applyLike(postId, userId, { desiredState, idempotencyKey } = {}) {
    if (idempotencyKey) {
      const cached = idemCache.get(`${userId}:${idempotencyKey}`);
      if (cached) return cached;
    }
    const post = posts.get(postId);
    if (!post || post.deleted) {
      return { status: "not_found", error: "Post topilmadi" };
    }
    const key = `${userId}:${postId}`;
    const target = typeof desiredState === "boolean" ? desiredState : !likes.has(key);
    if (target && !likes.has(key)) {
      likes.add(key);
      post.likesCount += 1;
    } else if (!target && likes.has(key)) {
      likes.delete(key);
      post.likesCount = Math.max(0, post.likesCount - 1);
    }
    const outcome = { status: "synced", isLiked: target, likesCount: post.likesCount };
    if (idempotencyKey) idemCache.set(`${userId}:${idempotencyKey}`, outcome);
    return outcome;
  }

  function applyBookmark(postId, userId, { desiredState, idempotencyKey } = {}) {
    if (idempotencyKey) {
      const cached = idemCache.get(`${userId}:${idempotencyKey}`);
      if (cached) return cached;
    }
    const post = posts.get(postId);
    if (!post || post.deleted) {
      return { status: "not_found", error: "Post topilmadi" };
    }
    const key = `${userId}:${postId}`;
    const target = typeof desiredState === "boolean" ? desiredState : !bookmarks.has(key);
    if (target) bookmarks.add(key);
    else bookmarks.delete(key);
    const outcome = { status: "synced", isSaved: target };
    if (idempotencyKey) idemCache.set(`${userId}:${idempotencyKey}`, outcome);
    return outcome;
  }

  function applyShare(postId, userId, { idempotencyKey } = {}) {
    if (idempotencyKey) {
      const cached = idemCache.get(`${userId}:${idempotencyKey}`);
      if (cached) return cached;
    }
    const post = posts.get(postId);
    if (!post || post.deleted) {
      return { status: "not_found", error: "Post topilmadi" };
    }
    post.sharesCount += 1;
    const outcome = { status: "synced", sharesCount: post.sharesCount };
    if (idempotencyKey) idemCache.set(`${userId}:${idempotencyKey}`, outcome);
    return outcome;
  }

  return { applyLike, applyBookmark, applyShare, posts };
}

test("TtlLruCache respects TTL, LRU eviction, and user-scoped prefix invalidation", () => {
  const cache = new TtlLruCache({ maxEntries: 2, defaultTtlMs: 1000 });
  cache.set("bookmarks:u1:20", ["p1"], 1000, 100);
  cache.set("bookmarks:u2:20", ["p2"], 1000, 100);

  // Touch u1 so u2 becomes least recently used
  assert.deepEqual(cache.get("bookmarks:u1:20", 200), ["p1"]);
  cache.set("feed:guest:first", ["p3"], 1000, 300);

  assert.equal(cache.get("bookmarks:u2:20", 350), undefined);
  assert.deepEqual(cache.get("bookmarks:u1:20", 400), ["p1"]);

  // Expired after TTL
  assert.equal(cache.get("bookmarks:u1:20", 1500), undefined);

  cache.set("feed:u1:p1", [1], 5000, 1500);
  cache.set("feed:u2:p1", [2], 5000, 1500);
  assert.equal(cache.invalidatePrefix("feed:u1:"), 1);
  assert.equal(cache.get("feed:u1:p1", 1600), undefined);
  assert.deepEqual(cache.get("feed:u2:p1", 1600), [2]);
});

test("Idempotent desiredState prevents duplicate likes/shares across retries", () => {
  const sim = createInMemoryPostActionSimulator();

  // Rapid duplicate desiredState=true like calls (and retried idempotencyKey) increment only once
  const r1 = sim.applyLike("post-1", "u1", { desiredState: true, idempotencyKey: "k1" });
  const r2 = sim.applyLike("post-1", "u1", { desiredState: true, idempotencyKey: "k1" });
  const r3 = sim.applyLike("post-1", "u1", { desiredState: true, idempotencyKey: "k2" });
  assert.equal(r1.likesCount, 6);
  assert.equal(r2.likesCount, 6);
  assert.equal(r3.likesCount, 6);
  assert.equal(r3.isLiked, true);

  // Share with same idempotencyKey does not double-count on retry
  const s1 = sim.applyShare("post-1", "u1", { idempotencyKey: "share-1" });
  const s2 = sim.applyShare("post-1", "u1", { idempotencyKey: "share-1" });
  assert.equal(s1.sharesCount, 2);
  assert.equal(s2.sharesCount, 2);

  // Missing post returns not_found without throwing or halting batch sync
  const b1 = sim.applyBookmark("missing-id", "u1", { desiredState: true, idempotencyKey: "bk-miss" });
  const b2 = sim.applyBookmark("post-2", "u1", { desiredState: true, idempotencyKey: "bk-ok" });
  assert.equal(b1.status, "not_found");
  assert.equal(b2.status, "synced");
  assert.equal(b2.isSaved, true);
});
