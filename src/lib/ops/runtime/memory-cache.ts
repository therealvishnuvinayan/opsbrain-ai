type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightCache = new Map<string, Promise<unknown>>();

function now() {
  return Date.now();
}

export function readMemoryCache<T>(key: string): T | undefined {
  const entry = memoryCache.get(key);

  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= now()) {
    memoryCache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

export function writeMemoryCache<T>(key: string, value: T, ttlMs: number) {
  memoryCache.set(key, {
    value,
    expiresAt: now() + ttlMs,
  });
}

export async function getOrSetMemoryCache<T>(
  key: string,
  ttlMs: number,
  factory: () => Promise<T>
): Promise<T> {
  const cached = readMemoryCache<T>(key);

  if (cached !== undefined) {
    return cached;
  }

  const inFlight = inFlightCache.get(key);

  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const nextPromise = factory()
    .then((value) => {
      writeMemoryCache(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inFlightCache.delete(key);
    });

  inFlightCache.set(key, nextPromise);
  return nextPromise;
}

export function buildCacheKey(parts: unknown[]) {
  return JSON.stringify(parts);
}
