import { enableSync, resetBrowserState } from '../test/browserEnv';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { addTransactionIfAbsent, deleteTransaction, saveTripChanges } from './storage';
import type { Transaction, Trip } from '../types';

function trip(id: string): Trip {
  return { id, name: id, baseCurrency: 'PHP', members: [], expenses: [], createdAt: '2026-10-01T00:00:00.000Z' };
}

async function queuedIds(): Promise<string[]> {
  return (await db.pendingPushes.toArray()).map((q) => q.id).sort();
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 2));

beforeEach(async () => {
  await resetBrowserState();
  enableSync();
});

describe('saveTripChanges', () => {
  it('writes no trip rows when only the active trip changes', async () => {
    await saveTripChanges({ put: [trip('A'), trip('B')], activeTripId: 'A' });
    await db.pendingPushes.clear();
    const before = await db.trips.toArray();
    await tick();

    // What leaving the Plan tab does: setActiveTrip(null).
    await saveTripChanges({ activeTripId: null });

    expect(await db.trips.toArray()).toEqual(before);
    expect(await queuedIds()).toEqual([]);
    expect((await db.meta.get('activeTripId'))?.value).toBeNull();
  });

  it('stamps and queues only the trips it is given', async () => {
    await saveTripChanges({ put: [trip('A'), trip('B')] });
    await db.pendingPushes.clear();
    const bBefore = (await db.trips.get('B'))!.updatedAt;
    await tick();

    await saveTripChanges({ put: [{ ...trip('A'), name: 'Renamed' }] });

    expect((await db.trips.get('A'))!.name).toBe('Renamed');
    expect((await db.trips.get('B'))!.updatedAt).toBe(bBefore);
    expect(await queuedIds()).toEqual(['trip:A']);
  });

  it('soft-deletes only the trips it is told to remove', async () => {
    await saveTripChanges({ put: [trip('A'), trip('B')] });
    // A trip another device created that this device's in-memory list
    // doesn't have yet must survive this device's next trip save.
    await db.trips.put({ ...trip('from-other-device'), updatedAt: 1 });
    await db.pendingPushes.clear();

    await saveTripChanges({ remove: ['A'], activeTripId: null });

    expect((await db.trips.get('A'))!.deletedAt).toBeTypeOf('number');
    expect((await db.trips.get('B'))!.deletedAt).toBeUndefined();
    expect((await db.trips.get('from-other-device'))!.deletedAt).toBeUndefined();
    expect(await queuedIds()).toEqual(['trip:A']);
  });

  it('clears deletedAt when a removed trip is put back (restore from trash)', async () => {
    await saveTripChanges({ put: [trip('A')] });
    await saveTripChanges({ remove: ['A'] });

    await saveTripChanges({ put: [trip('A')] });

    expect((await db.trips.get('A'))!.deletedAt).toBeUndefined();
  });

  it('queues nothing when sync is off', async () => {
    localStorage.clear();

    await saveTripChanges({ put: [trip('A')] });

    expect(await db.trips.get('A')).toBeDefined();
    expect(await queuedIds()).toEqual([]);
  });
});

describe('addTransactionIfAbsent', () => {
  const bill: Transaction = {
    id: 'bill-b1-2026-10',
    type: 'expense',
    amount: 549,
    currency: 'PHP',
    category: 'bills',
    description: 'Netflix',
    date: '2026-10-05',
    createdAt: '2026-10-07T00:00:00.000Z',
    budgetId: 'b1',
  };

  it('inserts the row with updatedAt 0, so any copy already uploaded wins', async () => {
    expect(await addTransactionIfAbsent(bill)).toBe(true);

    expect((await db.transactions.get(bill.id))!.updatedAt).toBe(0);
    expect(await queuedIds()).toEqual([`transaction:${bill.id}`]);
  });

  it('leaves an existing row alone, edited or deleted', async () => {
    await db.transactions.put({ ...bill, amount: 600, updatedAt: 5 });
    expect(await addTransactionIfAbsent(bill)).toBe(false);
    expect((await db.transactions.get(bill.id))!.amount).toBe(600);

    await deleteTransaction(bill.id);
    await db.pendingPushes.clear();
    expect(await addTransactionIfAbsent(bill)).toBe(false);
    expect((await db.transactions.get(bill.id))!.deletedAt).toBeTypeOf('number');
    expect(await queuedIds()).toEqual([]);
  });
});
