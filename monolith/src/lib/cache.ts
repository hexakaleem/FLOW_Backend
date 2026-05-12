type CacheEntry = {
  value: unknown;
  expiresAt: number;
  cleanupTimer?: NodeJS.Timeout;
};

class TtlCache {
  private store = new Map<string, CacheEntry>();

  set(key: string, value: unknown, ttlSeconds: number): void {
    const existingEntry = this.store.get(key);
    if (existingEntry?.cleanupTimer) {
      clearTimeout(existingEntry.cleanupTimer);
    }

    const entry: CacheEntry = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };

    entry.cleanupTimer = setTimeout(() => {
      this.store.delete(key);
    }, ttlSeconds * 1000);

    this.store.set(key, entry);
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    const entry = this.store.get(key);
    if (entry?.cleanupTimer) {
      clearTimeout(entry.cleanupTimer);
    }
    this.store.delete(key);
  }

  clear(): void {
    for (const entry of this.store.values()) {
      if (entry.cleanupTimer) {
        clearTimeout(entry.cleanupTimer);
      }
    }
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const tokenBlacklist = new TtlCache();
export const introspectCache = new TtlCache();
export const otpCache = new TtlCache();
export const permissionCache = new TtlCache();
