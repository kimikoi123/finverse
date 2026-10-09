import { enableSync, resetBrowserState } from '../test/browserEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PulledEntity, PullResponse, PushChange, PushResponse } from './syncApi';

const api = vi.hoisted(() => ({
  pullDelta: vi.fn<(cursor: number) => Promise<PullResponse>>(),
  pushChanges: vi.fn<(changes: PushChange[]) => Promise<PushResponse>>(),
}));
vi.mock('./syncApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./syncApi')>()),
  pullDelta: api.pullDelta,
  pushChanges: api.pushChanges,
}));

import { db } from '../db/database';
import { addTransaction, updateTransaction } from '../db/storage';
import { getPullCursor, setPullCursor } from './deviceIdentity';
import { syncNow } from './syncEngine';
import type { Transaction } from '../types';

function txn(id: string, amount = 100): Transaction {
  return {
    id,
    type: 'expense',
    amount,
    currency: 'PHP',
    category: 'food',
    description: id,
    date: '2026-10-07',
    createdAt: '2026-10-07T00:00:00.000Z',
  };
}

function remote(id: string): PulledEntity {
  const { id: _id, ...data } = txn(id);
  void _id;
  return { entityType: 'transaction', entityId: id, data, updatedAt: 5 };
}

async function queued(): Promise<string[]> {
  return (await db.pendingPushes.toArray()).map((q) => q.id).sort();
}

function pushedAmounts(): number[] {
  return api.pushChanges.mock.calls.flatMap(([changes]) =>
    changes.map((c) => (c.data as { amount: number }).amount),
  );
}

beforeEach(async () => {
  await resetBrowserState();
  enableSync();
  api.pullDelta.mockReset().mockImplementation(async (cursor) => ({
    entities: [],
    serverTime: 0,
    hasMore: false,
    nextCursor: cursor,
  }));
  api.pushChanges.mockReset().mockImplementation(async (changes) => ({
    applied: changes.length,
    rejected: [],
  }));
});

describe('push', () => {
  it('removes rows from the queue once they are pushed', async () => {
    await addTransaction(txn('t1'));

    await syncNow();

    expect(pushedAmounts()).toEqual([100]);
    expect(await queued()).toEqual([]);
  });

  it('keeps a row queued when it is edited while its push is in flight', async () => {
    await addTransaction(txn('t1', 100));
    api.pushChanges.mockImplementationOnce(async (changes) => {
      await updateTransaction('t1', { amount: 200 }); // edit lands mid-request
      return { applied: changes.length, rejected: [] };
    });

    await syncNow();
    expect(await queued()).toEqual(['transaction:t1']);

    // The next cycle uploads the edit, and only then is the row dequeued.
    await syncNow();
    expect(pushedAmounts()).toEqual([100, 200]);
    expect(await queued()).toEqual([]);
  });

  it('keeps a stale-rejected row queued when it was edited during the push', async () => {
    await addTransaction(txn('t1', 100));
    api.pushChanges.mockImplementationOnce(async () => {
      await updateTransaction('t1', { amount: 300 });
      return { applied: 0, rejected: [{ entityId: 't1', reason: 'stale-write' }] };
    });

    await syncNow();

    expect(await queued()).toEqual(['transaction:t1']);
  });
});

describe('pull', () => {
  it('pulls by cursor page by page and remembers where it stopped', async () => {
    setPullCursor(10);
    api.pullDelta
      .mockResolvedValueOnce({ entities: [remote('r1')], serverTime: 0, hasMore: true, nextCursor: 11 })
      .mockResolvedValueOnce({ entities: [remote('r2')], serverTime: 0, hasMore: false, nextCursor: 12 });

    await syncNow();

    expect(api.pullDelta.mock.calls.map(([cursor]) => cursor)).toEqual([10, 11]);
    expect(getPullCursor()).toBe(12);
    expect(await db.transactions.get('r1')).toBeDefined();
    expect(await db.transactions.get('r2')).toBeDefined();
  });

  it('rejects a response without a cursor and keeps its place', async () => {
    setPullCursor(7);
    // Shape of the pre-cursor endpoint: { nextSince } and no nextCursor.
    api.pullDelta.mockResolvedValueOnce({
      entities: [remote('r1')],
      serverTime: 0,
      hasMore: false,
      nextSince: 1,
    } as unknown as PullResponse);

    await syncNow();

    expect(getPullCursor()).toBe(7);
    expect(await db.transactions.get('r1')).toBeUndefined();
  });
});
