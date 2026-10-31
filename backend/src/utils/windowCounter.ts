// Fixed-window counter keyed by any string. In-memory like express-rate-limit's default store, so it
// is per process — move to Redis together with the rate limiters when running more than one instance.
export function windowCounter(windowMs: number, limit: number, maxKeys = 50_000) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    // Counts one hit. Returns false when the key is over its limit for the current window.
    hit(key: string): boolean {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        if (hits.size >= maxKeys) {
          for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
        }
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      entry.count += 1;
      return entry.count <= limit;
    },
  };
}
