import { saveState, saveRateCache } from './storage';
import type { TripState } from '../types';

export async function migrateFromLocalStorage(): Promise<TripState | null> {
  try {
    const raw = localStorage.getItem('splittrip-data');
    if (!raw) return null;

    const data: TripState = JSON.parse(raw);
    if (!data.trips || !Array.isArray(data.trips)) return null;

    await saveState(data);

    // Migrate rate cache if present
    const ratesRaw = localStorage.getItem('splittrip-rates');
    if (ratesRaw) {
      const ratesData = JSON.parse(ratesRaw);
      if (ratesData.rates && ratesData.timestamp) {
        await saveRateCache(ratesData.rates, ratesData.timestamp);
      }
    }

    // Remove localStorage keys to mark migration complete
    localStorage.removeItem('splittrip-data');
    localStorage.removeItem('splittrip-rates');

    return data;
  } catch {
    return null;
  }
}
