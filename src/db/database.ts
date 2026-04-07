import Dexie, { type Table } from 'dexie';
import type { Trip, DeletedTrip, ExchangeRates, Transaction, UserPreferences, Account, Budget, Goal, DebtEntry, Installment } from '../types';

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

interface ReceiptPhotoRecord {
  expenseId: string;
  data: string; // base64 data URI
}

class SplitTripDB extends Dexie {
  trips!: Table<Trip, string>;
  meta!: Table<MetaRecord, string>;
  rateCache!: Table<RateCacheRecord, string>;
  deletedTrips!: Table<DeletedTripRecord, string>;
  receiptPhotos!: Table<ReceiptPhotoRecord, string>;
  transactions!: Table<Transaction, string>;
  userPreferences!: Table<UserPreferences, string>;
  accounts!: Table<Account, string>;
  budgets!: Table<Budget, string>;
  goals!: Table<Goal, string>;
  debts!: Table<DebtEntry, string>;
  installments!: Table<Installment, string>;

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
    this.version(3).stores({
      trips: 'id',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
      receiptPhotos: 'expenseId',
    });
    this.version(4).stores({
      trips: 'id',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
      receiptPhotos: 'expenseId',
      transactions: 'id, date, type',
      userPreferences: 'id',
    });
    this.version(5).stores({
      trips: 'id',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
      receiptPhotos: 'expenseId',
      transactions: 'id, date, type',
      userPreferences: 'id',
      accounts: 'id, type, sortOrder',
    });
    this.version(6).stores({
      trips: 'id',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
      receiptPhotos: 'expenseId',
      transactions: 'id, date, type',
      userPreferences: 'id',
      accounts: 'id, type, sortOrder',
      budgets: 'id, type',
    });
    this.version(7).stores({
      trips: 'id',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
      receiptPhotos: 'expenseId',
      transactions: 'id, date, type',
      userPreferences: 'id',
      accounts: 'id, type, sortOrder',
      budgets: 'id, type',
      goals: 'id',
      debts: 'id, direction',
      installments: 'id',
    });
  }
}


const db = new SplitTripDB();

export { db };
export type { MetaRecord, RateCacheRecord, ReceiptPhotoRecord, Transaction, UserPreferences };
