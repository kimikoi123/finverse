import { db } from './database';
import type { TripState, ExchangeRates } from '../types';

export async function loadState(): Promise<TripState> {
  const trips = await db.trips.toArray();
  const meta = await db.meta.get('activeTripId');
  return { trips, activeTripId: meta?.value ?? null };
}

export async function saveState(state: TripState): Promise<void> {
  await db.transaction('rw', db.trips, db.meta, async () => {
    await db.trips.clear();
    if (state.trips.length > 0) {
      await db.trips.bulkPut(state.trips);
    }
    await db.meta.put({ key: 'activeTripId', value: state.activeTripId });
  });
}

export async function loadRateCache(): Promise<{ rates: ExchangeRates; timestamp: number } | null> {
  const row = await db.rateCache.get('rates');
  return row ? { rates: row.rates, timestamp: row.timestamp } : null;
}

export async function saveRateCache(rates: ExchangeRates, timestamp: number): Promise<void> {
  await db.rateCache.put({ key: 'rates', rates, timestamp });
}
