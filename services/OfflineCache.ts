import AsyncStorage from '@react-native-async-storage/async-storage';

// Grid resolution: ~11km cells. Nearby data cached per cell so a short drive
// doesn't invalidate the whole cache.
const CELL_SIZE = 0.1; // degrees
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cellKey(lat: number, lng: number, category: string): string {
  const r = (n: number) => Math.floor(n / CELL_SIZE) * CELL_SIZE;
  return `nearby_${category}_${r(lat).toFixed(1)}_${r(lng).toFixed(1)}`;
}

interface CacheEntry<T> { data: T; savedAt: number; }

export async function getCached<T>(lat: number, lng: number, category: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cellKey(lat, lng, category));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.savedAt > CACHE_TTL_MS) return null; // stale
    return entry.data;
  } catch { return null; }
}

export async function setCache<T>(lat: number, lng: number, category: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, savedAt: Date.now() };
    await AsyncStorage.setItem(cellKey(lat, lng, category), JSON.stringify(entry));
  } catch { /* storage full — degrade gracefully */ }
}

export async function getCacheAge(lat: number, lng: number, category: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(cellKey(lat, lng, category));
    if (!raw) return null;
    return Date.now() - (JSON.parse(raw) as CacheEntry<unknown>).savedAt;
  } catch { return null; }
}
