// Separate file from syncEngine.test.ts: start() and the initial-sync signal
// are module-level state, so this needs a fresh copy of the engine.
import { enableSync } from '../test/browserEnv';
import { expect, it, vi } from 'vitest';
import type { PullResponse, PushChange, PushResponse } from './syncApi';

const api = vi.hoisted(() => ({
  pullDelta: vi.fn<(cursor: number) => Promise<PullResponse>>(async (cursor) => ({
    entities: [],
    serverTime: 0,
    hasMore: false,
    nextCursor: cursor,
  })),
  pushChanges: vi.fn<(changes: PushChange[]) => Promise<PushResponse>>(async (changes) => ({
    applied: changes.length,
    rejected: [],
  })),
}));
vi.mock('./syncApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./syncApi')>()),
  pullDelta: api.pullDelta,
  pushChanges: api.pushChanges,
}));

import { db } from '../db/database';
import { setPullCursor } from './deviceIdentity';
import { start, stop, whenInitialSyncSettled } from './syncEngine';

vi.stubGlobal('document', {
  visibilityState: 'visible',
  addEventListener: () => {},
  removeEventListener: () => {},
});

it('on first start after the cursor change, re-pulls from zero and re-sends every local row', async () => {
  enableSync();
  localStorage.setItem('finverse.syncRepairVersion', '1'); // v1 already ran
  setPullCursor(500);
  // A row the old push path dropped from the queue: stored, but not queued.
  await db.transactions.put({
    id: 'dropped-edit',
    type: 'expense',
    amount: 200,
    currency: 'PHP',
    category: 'food',
    description: 'edited while a push was in flight',
    date: '2026-10-07',
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: 10,
  });

  start();
  await whenInitialSyncSettled(5_000);
  stop();

  expect(api.pullDelta.mock.calls[0]?.[0]).toBe(0);
  const pushedIds = api.pushChanges.mock.calls.flatMap(([changes]) => changes.map((c) => c.entityId));
  expect(pushedIds).toContain('dropped-edit');
  expect(localStorage.getItem('finverse.syncRepairVersion')).toBe('2');
});
