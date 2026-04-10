import { db } from './database';
import type { Trip, TripState, DeletedTrip, ExchangeRates, Transaction, UserPreferences, Account, Budget, Goal, DebtEntry, Installment } from '../types';

// Sync helpers: every write goes through these so `updatedAt` is always stamped
// and deletes become tombstones instead of hard removals. The sync engine (Phase 3)
// relies on these invariants to build delta diffs.
const stampWrite = <T extends { updatedAt?: number }>(obj: T): T => ({
  ...obj,
  updatedAt: Date.now(),
});

const stampUpdate = <T extends object>(updates: T): T & { updatedAt: number } => ({
  ...updates,
  updatedAt: Date.now(),
});

const tombstoneUpdate = (): { deletedAt: number; updatedAt: number } => {
  const now = Date.now();
  return { deletedAt: now, updatedAt: now };
};

export async function loadState(): Promise<TripState> {
  const all = await db.trips.toArray();
  const trips = all.filter((t) => !t.deletedAt);
  const meta = await db.meta.get('activeTripId');
  return { trips, activeTripId: meta?.value ?? null };
}

export async function saveState(state: TripState): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.trips, db.meta, async () => {
    const existing = await db.trips.toArray();
    const newIds = new Set(state.trips.map((t) => t.id));
    const toSoftDelete = existing.filter((t) => !newIds.has(t.id) && !t.deletedAt);
    const toPut: Trip[] = state.trips.map((t) => {
      const copy: Trip = { ...t, updatedAt: now };
      if ('deletedAt' in copy) delete copy.deletedAt;
      return copy;
    });
    if (toPut.length > 0) {
      await db.trips.bulkPut(toPut);
    }
    for (const trip of toSoftDelete) {
      await db.trips.update(trip.id, { deletedAt: now, updatedAt: now });
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

// Receipt photo storage
export async function saveReceiptPhoto(expenseId: string, dataUrl: string): Promise<void> {
  await db.receiptPhotos.put({ expenseId, data: dataUrl });
}

export async function getReceiptPhoto(expenseId: string): Promise<string | undefined> {
  const record = await db.receiptPhotos.get(expenseId);
  return record?.data;
}

export async function deleteReceiptPhoto(expenseId: string): Promise<void> {
  await db.receiptPhotos.delete(expenseId);
}

export async function getReceiptPhotosForTrip(expenseIds: string[]): Promise<Map<string, string>> {
  const records = await db.receiptPhotos.where('expenseId').anyOf(expenseIds).toArray();
  return new Map(records.map((r) => [r.expenseId, r.data]));
}

// User Preferences (singleton — no tombstone path)
export async function loadUserPreferences(): Promise<UserPreferences | null> {
  return (await db.userPreferences.get('default')) ?? null;
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  await db.userPreferences.put(stampWrite({ ...prefs, id: 'default' }));
}

// Transactions
export async function addTransaction(txn: Transaction): Promise<void> {
  await db.transactions.put(stampWrite(txn));
}

export async function getTransactions(): Promise<Transaction[]> {
  const all = await db.transactions.orderBy('date').reverse().toArray();
  return all.filter((t) => !t.deletedAt);
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const all = await db.transactions.where('date').between(startDate, endDate, true, true).reverse().toArray();
  return all.filter((t) => !t.deletedAt);
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  await db.transactions.update(id, stampUpdate(updates));
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.update(id, tombstoneUpdate());
}

// Accounts
export async function loadAccounts(): Promise<Account[]> {
  const all = await db.accounts.orderBy('sortOrder').toArray();
  return all.filter((a) => !a.deletedAt);
}

export async function addAccount(account: Account): Promise<void> {
  await db.accounts.put(stampWrite(account));
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<void> {
  await db.accounts.update(id, stampUpdate(updates));
}

export async function deleteAccount(id: string): Promise<void> {
  await db.accounts.update(id, tombstoneUpdate());
}

export async function batchUpdateSortOrder(updates: { id: string; sortOrder: number }[]): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.accounts, async () => {
    for (const { id, sortOrder } of updates) {
      await db.accounts.update(id, { sortOrder, updatedAt: now });
    }
  });
}

// Budgets
export async function loadBudgets(): Promise<Budget[]> {
  const all = await db.budgets.toArray();
  return all.filter((b) => !b.deletedAt);
}

export async function addBudget(budget: Budget): Promise<void> {
  await db.budgets.put(stampWrite(budget));
}

export async function updateBudget(id: string, updates: Partial<Budget>): Promise<void> {
  await db.budgets.update(id, stampUpdate(updates));
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.update(id, tombstoneUpdate());
}

// Goals
export async function loadGoals(): Promise<Goal[]> {
  const all = await db.goals.toArray();
  return all.filter((g) => !g.deletedAt);
}
export async function addGoal(goal: Goal): Promise<void> {
  await db.goals.put(stampWrite(goal));
}
export async function updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
  await db.goals.update(id, stampUpdate(updates));
}
export async function deleteGoal(id: string): Promise<void> {
  await db.goals.update(id, tombstoneUpdate());
}

// Debts
export async function loadDebts(): Promise<DebtEntry[]> {
  const all = await db.debts.toArray();
  return all.filter((d) => !d.deletedAt);
}
export async function addDebt(debt: DebtEntry): Promise<void> {
  await db.debts.put(stampWrite(debt));
}
export async function updateDebt(id: string, updates: Partial<DebtEntry>): Promise<void> {
  await db.debts.update(id, stampUpdate(updates));
}
export async function deleteDebt(id: string): Promise<void> {
  await db.debts.update(id, tombstoneUpdate());
}

// Installments
export async function loadInstallments(): Promise<Installment[]> {
  const all = await db.installments.toArray();
  return all.filter((i) => !i.deletedAt);
}
export async function addInstallment(inst: Installment): Promise<void> {
  await db.installments.put(stampWrite(inst));
}
export async function updateInstallment(id: string, updates: Partial<Installment>): Promise<void> {
  await db.installments.update(id, stampUpdate(updates));
}
export async function deleteInstallment(id: string): Promise<void> {
  await db.installments.update(id, tombstoneUpdate());
}
