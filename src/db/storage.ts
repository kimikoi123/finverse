import { db } from './database';
import type { Trip, TripState, DeletedTrip, ExchangeRates } from '../types';

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

const DELETED_TRIP_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function loadDeletedTrips(): Promise<DeletedTrip[]> {
  const records = await db.deletedTrips.toArray();
  const cutoff = Date.now() - DELETED_TRIP_RETENTION_MS;
  const expired = records.filter((r) => new Date(r.deletedAt).getTime() < cutoff);
  if (expired.length > 0) {
    await db.deletedTrips.bulkDelete(expired.map((r) => r.id));
  }
  return records
    .filter((r) => new Date(r.deletedAt).getTime() >= cutoff)
    .map(({ trip, deletedAt }) => ({ trip, deletedAt }));
}

export async function addDeletedTrip(trip: Trip): Promise<void> {
  await db.deletedTrips.put({
    id: trip.id,
    trip,
    deletedAt: new Date().toISOString(),
  });
}

export async function removeDeletedTrip(tripId: string): Promise<void> {
  await db.deletedTrips.delete(tripId);
}

export async function clearAllDeletedTrips(): Promise<void> {
  await db.deletedTrips.clear();
}

export async function loadRateCache(): Promise<{ rates: ExchangeRates; timestamp: number } | null> {
  const row = await db.rateCache.get('rates');
  return row ? { rates: row.rates, timestamp: row.timestamp } : null;
}

export async function saveRateCache(rates: ExchangeRates, timestamp: number): Promise<void> {
  await db.rateCache.put({ key: 'rates', rates, timestamp });
}
