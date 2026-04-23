import Dexie, { type Table } from 'dexie';
import type { Trip, DeletedTrip, ExchangeRates, Transaction, UserPreferences, Account, Budget, Goal, DebtEntry, Installment, Employee, Advance, Rule, SyncEntityType } from '../types';

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

// Receipt rows can be in one of three states during their lifetime:
//  1. Fresh capture → only `localBase64` set. Sync engine's receipt
//     uploader will drain it to Vercel Blob on the next cycle.
//  2. Uploaded → both `localBase64` (still cached locally for instant
//     display on the device that captured it) AND `blobKey`/`blobUrl`
//     set. Only the metadata (not the base64) is pushed through the
//     sync entities table.
//  3. Pulled on a peer → only `blobKey`/`blobUrl` set (no local cache).
//     Consumers fall back to fetching the URL as an img src.
interface ReceiptPhotoRecord {
  expenseId: string;
  data?: string; // legacy field (pre-v11) — kept optional for older rows mid-migration
  localBase64?: string; // v11+ — instant-display cache + upload source
  blobKey?: string; // Vercel Blob pathname (vault-scoped)
  blobUrl?: string; // public CDN URL
  updatedAt?: number;
  deletedAt?: number;
}

// Queue of locally-mutated rows that still need to be pushed to the cloud.
// Primary key is "<entityType>:<entityId>" so rapid repeated edits of the
// same row dedupe naturally. Cleared by the sync engine on successful push.
export interface PendingPushRecord {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  enqueuedAt: number;
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
  employees!: Table<Employee, string>;
  advances!: Table<Advance, string>;
  rules!: Table<Rule, string>;
  pendingPushes!: Table<PendingPushRecord, string>;

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
    this.version(8).stores({
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
    // v9: add sync metadata (updatedAt, deletedAt) to all syncable entities.
    // Index `updatedAt` so the sync engine can range-query rows changed since a timestamp.
    // Index `deletedAt` so read queries can cheaply filter tombstones.
    this.version(9).stores({
      trips: 'id, updatedAt, deletedAt',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
      receiptPhotos: 'expenseId',
      transactions: 'id, date, type, updatedAt, deletedAt',
      userPreferences: 'id, updatedAt',
      accounts: 'id, type, sortOrder, updatedAt, deletedAt',
      budgets: 'id, type, updatedAt, deletedAt',
      goals: 'id, updatedAt, deletedAt',
      debts: 'id, direction, updatedAt, deletedAt',
      installments: 'id, updatedAt, deletedAt',
    }).upgrade(async (tx) => {
      const now = Date.now();
      const stamp = async (tableName: string) => {
        await tx.table(tableName).toCollection().modify((row: { updatedAt?: number }) => {
          if (row.updatedAt === undefined) row.updatedAt = now;
        });
      };
      await stamp('trips');
      await stamp('transactions');
      await stamp('userPreferences');
      await stamp('accounts');
      await stamp('budgets');
      await stamp('goals');
      await stamp('debts');
      await stamp('installments');
    });
    // v10: add pendingPushes queue used by the sync engine to track rows
    // that still need to be uploaded to the cloud. No data migration —
    // starts empty. On first vault bootstrap, the sync engine back-fills
    // it with every existing row so the initial upload covers all state.
    this.version(10).stores({
      trips: 'id, updatedAt, deletedAt',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
      receiptPhotos: 'expenseId',
      transactions: 'id, date, type, updatedAt, deletedAt',
      userPreferences: 'id, updatedAt',
      accounts: 'id, type, sortOrder, updatedAt, deletedAt',
      budgets: 'id, type, updatedAt, deletedAt',
      goals: 'id, updatedAt, deletedAt',
      debts: 'id, direction, updatedAt, deletedAt',
      installments: 'id, updatedAt, deletedAt',
      pendingPushes: 'id, enqueuedAt',
    });
    // v11: bring receiptPhotos under the sync layer. New fields
    // (localBase64 / blobKey / blobUrl / updatedAt / deletedAt) require
    // index updates so the sync engine can range-query by updatedAt.
    // Migration renames the legacy `data` column to `localBase64` and
    // stamps `updatedAt`. The receipt uploader takes care of draining
    // the base64 into Vercel Blob on the next sync cycle.
    this.version(11).stores({
      trips: 'id, updatedAt, deletedAt',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
      receiptPhotos: 'expenseId, updatedAt, deletedAt',
      transactions: 'id, date, type, updatedAt, deletedAt',
      userPreferences: 'id, updatedAt',
      accounts: 'id, type, sortOrder, updatedAt, deletedAt',
      budgets: 'id, type, updatedAt, deletedAt',
      goals: 'id, updatedAt, deletedAt',
      debts: 'id, direction, updatedAt, deletedAt',
      installments: 'id, updatedAt, deletedAt',
      pendingPushes: 'id, enqueuedAt',
    }).upgrade(async (tx) => {
      const now = Date.now();
      await tx.table('receiptPhotos').toCollection().modify((row: ReceiptPhotoRecord) => {
        if (row.data && !row.localBase64) {
          row.localBase64 = row.data;
          delete row.data;
        }
        if (row.updatedAt === undefined) row.updatedAt = now;
      });
    });
    // v12: add payroll tables for tracking household help salary and advances.
    this.version(12).stores({
      trips: 'id, updatedAt, deletedAt',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
      receiptPhotos: 'expenseId, updatedAt, deletedAt',
      transactions: 'id, date, type, updatedAt, deletedAt',
      userPreferences: 'id, updatedAt',
      accounts: 'id, type, sortOrder, updatedAt, deletedAt',
      budgets: 'id, type, updatedAt, deletedAt',
      goals: 'id, updatedAt, deletedAt',
      debts: 'id, direction, updatedAt, deletedAt',
      installments: 'id, updatedAt, deletedAt',
      pendingPushes: 'id, enqueuedAt',
      employees: 'id, updatedAt, deletedAt',
      advances: 'id, employeeId, settled, updatedAt, deletedAt',
    });
    // v13: add user-editable auto-categorization rules. Matched against
    // transaction descriptions on create; first enabled rule in priority
    // order wins.
    this.version(13).stores({
      trips: 'id, updatedAt, deletedAt',
      meta: 'key',
      rateCache: 'key',
      deletedTrips: 'id',
      receiptPhotos: 'expenseId, updatedAt, deletedAt',
      transactions: 'id, date, type, updatedAt, deletedAt',
      userPreferences: 'id, updatedAt',
      accounts: 'id, type, sortOrder, updatedAt, deletedAt',
      budgets: 'id, type, updatedAt, deletedAt',
      goals: 'id, updatedAt, deletedAt',
      debts: 'id, direction, updatedAt, deletedAt',
      installments: 'id, updatedAt, deletedAt',
      pendingPushes: 'id, enqueuedAt',
      employees: 'id, updatedAt, deletedAt',
      advances: 'id, employeeId, settled, updatedAt, deletedAt',
      rules: 'id, priority, enabled, updatedAt, deletedAt',
    });
  }
}


const db = new SplitTripDB();

export { db };
export type { MetaRecord, RateCacheRecord, ReceiptPhotoRecord, Transaction, UserPreferences, Employee, Advance };
