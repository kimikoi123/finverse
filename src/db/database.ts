import Dexie, { type Table } from 'dexie';
import type { Trip, DeletedTrip, ExchangeRates } from '../types';

interface MetaRecord {
  key: string;
  value: string | null;
}

interface RateCacheRecord {
  key: string;
  rates: ExchangeRates;
  timestamp: number;
}

interface DeletedTripRecord extends DeletedTrip {
  id: string;
}

class SplitTripDB extends Dexie {
  trips!: Table<Trip, string>;
  meta!: Table<MetaRecord, string>;
  rateCache!: Table<RateCacheRecord, string>;
  deletedTrips!: Table<DeletedTripRecord, string>;

  constructor() {
    super('splittrip');
    this.version(1).stores({
      trips: 'id',
      meta: 'key',
      rateCache: 'key',
    });
    this.version(2).stores({
      trips: 'id',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
    });
  }
}


const db = new SplitTripDB();

export { db };
export type { MetaRecord, RateCacheRecord };
