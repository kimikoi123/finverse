import { db } from './database';
import type { Trip, TripState, DeletedTrip, ExchangeRates, Transaction, UserPreferences, Account, Budget, Goal, DebtEntry, Installment } from '../types';

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

// User Preferences
export async function loadUserPreferences(): Promise<UserPreferences | null> {
  return (await db.userPreferences.get('default')) ?? null;
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  await db.userPreferences.put({ ...prefs, id: 'default' });
}

// Transactions
export async function addTransaction(txn: Transaction): Promise<void> {
  await db.transactions.put(txn);
}

export async function getTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy('date').reverse().toArray();
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  return db.transactions.where('date').between(startDate, endDate, true, true).reverse().toArray();
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  await db.transactions.update(id, updates);
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

// Accounts
export async function loadAccounts(): Promise<Account[]> {
  return db.accounts.orderBy('sortOrder').toArray();
}

export async function addAccount(account: Account): Promise<void> {
  await db.accounts.put(account);
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<void> {
  await db.accounts.update(id, updates);
}

export async function deleteAccount(id: string): Promise<void> {
  await db.accounts.delete(id);
}

// Budgets
export async function loadBudgets(): Promise<Budget[]> {
  return db.budgets.toArray();
}

export async function addBudget(budget: Budget): Promise<void> {
  await db.budgets.put(budget);
}

export async function updateBudget(id: string, updates: Partial<Budget>): Promise<void> {
  await db.budgets.update(id, updates);
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

// Goals
export async function loadGoals(): Promise<Goal[]> {
  return db.goals.toArray();
}
export async function addGoal(goal: Goal): Promise<void> {
  await db.goals.put(goal);
}
export async function updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
  await db.goals.update(id, updates);
}
export async function deleteGoal(id: string): Promise<void> {
  await db.goals.delete(id);
}

// Debts
export async function loadDebts(): Promise<DebtEntry[]> {
  return db.debts.toArray();
}
export async function addDebt(debt: DebtEntry): Promise<void> {
  await db.debts.put(debt);
}
export async function updateDebt(id: string, updates: Partial<DebtEntry>): Promise<void> {
  await db.debts.update(id, updates);
}
export async function deleteDebt(id: string): Promise<void> {
  await db.debts.delete(id);
}

// Installments
export async function loadInstallments(): Promise<Installment[]> {
  return db.installments.toArray();
}
export async function addInstallment(inst: Installment): Promise<void> {
  await db.installments.put(inst);
}
export async function updateInstallment(id: string, updates: Partial<Installment>): Promise<void> {
  await db.installments.update(id, updates);
}
export async function deleteInstallment(id: string): Promise<void> {
  await db.installments.delete(id);
}
