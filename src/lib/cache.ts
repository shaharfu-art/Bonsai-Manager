/**
 * Simple in-memory cache with TTL support.
 * Persists across navigation within the same session.
 * Optionally backs up to sessionStorage for PWA tab persistence.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const memoryCache = new Map<string, CacheEntry<unknown>>()
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

export function cacheGet<T>(key: string, ttl = DEFAULT_TTL): T | null {
  // Try memory first
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data
  }

  // Try sessionStorage fallback
  try {
    const raw = sessionStorage.getItem(`cache:${key}`)
    if (raw) {
      const parsed: CacheEntry<T> = JSON.parse(raw)
      if (Date.now() - parsed.timestamp < ttl) {
        // Restore to memory
        memoryCache.set(key, parsed)
        return parsed.data
      }
      sessionStorage.removeItem(`cache:${key}`)
    }
  } catch { /* ignore */ }

  // Expired or not found
  memoryCache.delete(key)
  return null
}

export function cacheSet<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() }
  memoryCache.set(key, entry)

  // Backup to sessionStorage (for tab/PWA persistence)
  try {
    sessionStorage.setItem(`cache:${key}`, JSON.stringify(entry))
  } catch { /* ignore quota errors */ }
}

export function cacheInvalidate(key: string): void {
  memoryCache.delete(key)
  try { sessionStorage.removeItem(`cache:${key}`) } catch { /* ignore */ }
}

export function cacheInvalidatePrefix(prefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key)
      try { sessionStorage.removeItem(`cache:${key}`) } catch { /* ignore */ }
    }
  }
}
