import { db } from './database';
import { hasIdentity } from '../sync/deviceIdentity';
import { fetchPrivateBlobAsObjectUrl } from '../sync/syncApi';
import type { Trip, TripState, DeletedTrip, ExchangeRates, Transaction, UserPreferences, Account, Budget, Goal, DebtEntry, Installment, Employee, Advance, Rule, SyncEntityType } from '../types';

// Sync helpers: every write goes through these so `updatedAt` is always stamped
// and deletes become tombstones instead of hard removals. The sync engine relies
// on `pendingPushes` (enqueued here) to know which rows still need uploading.
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

// Enqueue a row into the push queue. Duplicate keys dedupe naturally
// (Dexie put() upserts by primary key), so rapid repeated edits of the
// same row only produce one queue entry until the sync engine drains it.
//
// IMPORTANT: Finverse is an offline-first app — cloud sync is strictly
// opt-in. Users who never create a vault should have ZERO cloud-related
// side effects, including queue growth. So every enqueue first checks
// whether an identity exists; if not, the write still happens locally
// (via Dexie put/update in the caller), but nothing is queued.
async function enqueuePush(entityType: SyncEntityType, entityId: string): Promise<void> {
  if (!hasIdentity()) return;
  await db.pendingPushes.put({
    id: `${entityType}:${entityId}`,
    entityType,
    entityId,
    enqueuedAt: Date.now(),
  });
  notifySyncEngine();
}

// Every write calls this after enqueueing; the sync engine subscribes and
// triggers a debounced push. Decoupled via a tiny listener array so storage.ts
// has no direct dependency on src/sync/*.
type MutationListener = () => void;
const mutationListeners: MutationListener[] = [];

export function subscribeMutations(listener: MutationListener): () => void {
  mutationListeners.push(listener);
  return () => {
    const idx = mutationListeners.indexOf(listener);
    if (idx >= 0) mutationListeners.splice(idx, 1);
  };
}

function notifySyncEngine(): void {
  for (const listener of mutationListeners) {
    try {
      listener();
    } catch (err) {
      console.error('Mutation listener threw:', err);
    }
  }
}

export async function loadState(): Promise<TripState> {
  const all = await db.trips.toArray();
  const trips = all.filter((t) => !t.deletedAt);
  const meta = await db.meta.get('activeTripId');
  return { trips, activeTripId: meta?.value ?? null };
}

export async function saveState(state: TripState): Promise<void> {
  const now = Date.now();
  const changedIds: string[] = [];
  const syncEnabled = hasIdentity();
  await db.transaction('rw', db.trips, db.meta, db.pendingPushes, async () => {
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
      for (const t of toPut) changedIds.push(t.id);
    }
    for (const trip of toSoftDelete) {
      await db.trips.update(trip.id, { deletedAt: now, updatedAt: now });
      changedIds.push(trip.id);
    }
    await db.meta.put({ key: 'activeTripId', value: state.activeTripId });
    if (syncEnabled && changedIds.length > 0) {
      await db.pendingPushes.bulkPut(
        changedIds.map((id) => ({
          id: `trip:${id}`,
          entityType: 'trip' as const,
          entityId: id,
          enqueuedAt: now,
        })),
      );
    }
  });
  if (syncEnabled && changedIds.length > 0) notifySyncEngine();
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

// Receipt photo storage — consumers still see `string | undefined` for
// backward compatibility. Under the hood we return `localBase64` when
// it exists (instant display on the device that captured it) and
// otherwise lazily fetch the private blob through the server proxy and
// cache a same-origin ObjectURL for future renders. The cache key is
// the Vercel Blob pathname (`blobKey`), which is stable per receipt.
const blobObjectUrlCache = new Map<string, string>();

async function resolveReceiptUrl(record: { localBase64?: string; blobKey?: string; deletedAt?: number } | undefined): Promise<string | undefined> {
  if (!record || record.deletedAt) return undefined;
  if (record.localBase64) return record.localBase64;
  if (!record.blobKey) return undefined;
  const cached = blobObjectUrlCache.get(record.blobKey);
  if (cached) return cached;
  try {
    const objectUrl = await fetchPrivateBlobAsObjectUrl(record.blobKey);
    blobObjectUrlCache.set(record.blobKey, objectUrl);
    return objectUrl;
  } catch (err) {
    console.warn(`Could not fetch receipt blob for ${record.blobKey}:`, err);
    return undefined;
  }
}

export async function saveReceiptPhoto(expenseId: string, dataUrl: string): Promise<void> {
  const existing = await db.receiptPhotos.get(expenseId);
  const now = Date.now();
  // Swapping a receipt resets the cloud reference so the uploader picks
  // up the fresh bytes on the next sync cycle.
  await db.receiptPhotos.put({
    expenseId,
    localBase64: dataUrl,
    updatedAt: now,
    deletedAt: undefined,
    blobKey: existing?.blobKey && existing.localBase64 === dataUrl ? existing.blobKey : undefined,
    blobUrl: existing?.blobUrl && existing.localBase64 === dataUrl ? existing.blobUrl : undefined,
  });
  await enqueuePush('receipt', expenseId);
}

export async function getReceiptPhoto(expenseId: string): Promise<string | undefined> {
  const record = await db.receiptPhotos.get(expenseId);
  return resolveReceiptUrl(record);
}

export async function deleteReceiptPhoto(expenseId: string): Promise<void> {
  const existing = await db.receiptPhotos.get(expenseId);
  if (!existing) return;
  const now = Date.now();
  await db.receiptPhotos.put({
    ...existing,
    localBase64: undefined, // free the local cache immediately on delete
    deletedAt: now,
    updatedAt: now,
  });
  await enqueuePush('receipt', expenseId);
}

export async function getReceiptPhotosForTrip(expenseIds: string[]): Promise<Map<string, string>> {
  const records = await db.receiptPhotos.where('expenseId').anyOf(expenseIds).toArray();
  const out = new Map<string, string>();
  // Resolve in parallel so list views don't serialise a dozen proxy
  // fetches. The ObjectURL cache inside resolveReceiptUrl dedupes so a
  // second render is instant.
  const resolved = await Promise.all(
    records.map(async (r) => ({ id: r.expenseId, url: await resolveReceiptUrl(r) })),
  );
  for (const { id, url } of resolved) {
    if (url !== undefined) out.set(id, url);
  }
  return out;
}

// User Preferences (singleton — no tombstone path)
export async function loadUserPreferences(): Promise<UserPreferences | null> {
  return (await db.userPreferences.get('default')) ?? null;
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  await db.userPreferences.put(stampWrite({ ...prefs, id: 'default' }));
  await enqueuePush('userPreferences', 'default');
}

// Transactions
export async function addTransaction(txn: Transaction): Promise<void> {
  await db.transactions.put(stampWrite(txn));
  await enqueuePush('transaction', txn.id);
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
  await enqueuePush('transaction', id);
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.update(id, tombstoneUpdate());
  await enqueuePush('transaction', id);
}

// Accounts
export async function loadAccounts(): Promise<Account[]> {
  const all = await db.accounts.orderBy('sortOrder').toArray();
  return all.filter((a) => !a.deletedAt);
}

export async function addAccount(account: Account): Promise<void> {
  await db.accounts.put(stampWrite(account));
  await enqueuePush('account', account.id);
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<void> {
  await db.accounts.update(id, stampUpdate(updates));
  await enqueuePush('account', id);
}

export async function deleteAccount(id: string): Promise<void> {
  await db.accounts.update(id, tombstoneUpdate());
  await enqueuePush('account', id);
}

export async function batchUpdateSortOrder(updates: { id: string; sortOrder: number }[]): Promise<void> {
  const now = Date.now();
  const syncEnabled = hasIdentity();
  await db.transaction('rw', db.accounts, db.pendingPushes, async () => {
    for (const { id, sortOrder } of updates) {
      await db.accounts.update(id, { sortOrder, updatedAt: now });
      if (syncEnabled) {
        await db.pendingPushes.put({
          id: `account:${id}`,
          entityType: 'account',
          entityId: id,
          enqueuedAt: now,
        });
      }
    }
  });
  if (syncEnabled && updates.length > 0) notifySyncEngine();
}

// Budgets
export async function loadBudgets(): Promise<Budget[]> {
  const all = await db.budgets.toArray();
  return all.filter((b) => !b.deletedAt);
}

export async function addBudget(budget: Budget): Promise<void> {
  await db.budgets.put(stampWrite(budget));
  await enqueuePush('budget', budget.id);
}

export async function updateBudget(id: string, updates: Partial<Budget>): Promise<void> {
  await db.budgets.update(id, stampUpdate(updates));
  await enqueuePush('budget', id);
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.update(id, tombstoneUpdate());
  await enqueuePush('budget', id);
}

// Goals
export async function loadGoals(): Promise<Goal[]> {
  const all = await db.goals.toArray();
  return all.filter((g) => !g.deletedAt);
}
export async function addGoal(goal: Goal): Promise<void> {
  await db.goals.put(stampWrite(goal));
  await enqueuePush('goal', goal.id);
}
export async function updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
  await db.goals.update(id, stampUpdate(updates));
  await enqueuePush('goal', id);
}
export async function deleteGoal(id: string): Promise<void> {
  await db.goals.update(id, tombstoneUpdate());
  await enqueuePush('goal', id);
}

// Debts
export async function loadDebts(): Promise<DebtEntry[]> {
  const all = await db.debts.toArray();
  return all.filter((d) => !d.deletedAt);
}
export async function addDebt(debt: DebtEntry): Promise<void> {
  await db.debts.put(stampWrite(debt));
  await enqueuePush('debt', debt.id);
}
export async function updateDebt(id: string, updates: Partial<DebtEntry>): Promise<void> {
  await db.debts.update(id, stampUpdate(updates));
  await enqueuePush('debt', id);
}
export async function deleteDebt(id: string): Promise<void> {
  await db.debts.update(id, tombstoneUpdate());
  await enqueuePush('debt', id);
}

// Installments
export async function loadInstallments(): Promise<Installment[]> {
  const all = await db.installments.toArray();
  return all.filter((i) => !i.deletedAt);
}
export async function addInstallment(inst: Installment): Promise<void> {
  await db.installments.put(stampWrite(inst));
  await enqueuePush('installment', inst.id);
}
export async function updateInstallment(id: string, updates: Partial<Installment>): Promise<void> {
  await db.installments.update(id, stampUpdate(updates));
  await enqueuePush('installment', id);
}
export async function deleteInstallment(id: string): Promise<void> {
  await db.installments.update(id, tombstoneUpdate());
  await enqueuePush('installment', id);
}

// Employees
export async function loadEmployees(): Promise<Employee[]> {
  const all = await db.employees.toArray();
  return all.filter((e) => !e.deletedAt);
}
export async function addEmployee(employee: Employee): Promise<void> {
  await db.employees.put(stampWrite(employee));
  await enqueuePush('employee', employee.id);
}
export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<void> {
  await db.employees.update(id, stampUpdate(updates));
  await enqueuePush('employee', id);
}
export async function deleteEmployee(id: string): Promise<void> {
  await db.employees.update(id, tombstoneUpdate());
  await enqueuePush('employee', id);
}

// Advances
export async function loadAdvances(): Promise<Advance[]> {
  const all = await db.advances.toArray();
  return all.filter((a) => !a.deletedAt);
}
export async function addAdvance(advance: Advance): Promise<void> {
  await db.advances.put(stampWrite(advance));
  await enqueuePush('advance', advance.id);
}
export async function updateAdvance(id: string, updates: Partial<Advance>): Promise<void> {
  await db.advances.update(id, stampUpdate(updates));
  await enqueuePush('advance', id);
}
export async function deleteAdvance(id: string): Promise<void> {
  await db.advances.update(id, tombstoneUpdate());
  await enqueuePush('advance', id);
}
export async function settleAdvances(ids: string[]): Promise<void> {
  const now = new Date().toISOString();
  for (const id of ids) {
    await db.advances.update(id, stampUpdate({ settled: true, settledAt: now }));
    await enqueuePush('advance', id);
  }
}

// Rules
export async function loadRules(): Promise<Rule[]> {
  const all = await db.rules.toArray();
  return all.filter((r) => !r.deletedAt);
}
export async function addRule(rule: Rule): Promise<void> {
  await db.rules.put(stampWrite(rule));
  await enqueuePush('rule', rule.id);
}
export async function updateRule(id: string, updates: Partial<Rule>): Promise<void> {
  await db.rules.update(id, stampUpdate(updates));
  await enqueuePush('rule', id);
}
export async function deleteRule(id: string): Promise<void> {
  await db.rules.update(id, tombstoneUpdate());
  await enqueuePush('rule', id);
}
