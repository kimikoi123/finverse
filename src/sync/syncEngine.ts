import { db } from '../db/database';
import { subscribeMutations } from '../db/storage';
import type { SyncEntityType } from '../types';
import { REMOTE_APPLIED_EVENT } from '../hooks/useRefreshOnRemote';
import { applyRemoteBatch } from './applyRemote';
import { drainReceiptUploads } from './receiptUploader';
import {
  clearIdentity,
  getLastPulledAt,
  hasIdentity,
  setIdentity,
  setLastPulledAt,
  type DeviceIdentity,
} from './deviceIdentity';
import {
  createVault as apiCreateVault,
  pairComplete as apiPairComplete,
  pullDelta,
  pushChanges,
  SyncHttpError,
  SyncUnauthedError,
  type PushChange,
} from './syncApi';
import * as state from './syncState';

// Orchestrates push/pull cycles, mutex-gated so concurrent triggers coalesce,
// debounced on local mutations so typing doesn't spam the server, and
// subscribed to lifecycle events (online, visibilitychange, periodic).

const MUTATION_DEBOUNCE_MS = 2000;
const VISIBILITY_SYNC_MIN_GAP_MS = 30_000;
const PERIODIC_SYNC_INTERVAL_MS = 60_000;
const PUSH_BATCH_SIZE = 500;

let syncInFlight = false;
let nextSyncQueued = false;
let mutationDebounceHandle: ReturnType<typeof setTimeout> | null = null;
let periodicHandle: ReturnType<typeof setInterval> | null = null;
let unsubscribeMutations: (() => void) | null = null;
let started = false;

// One-time-per-device sync repairs. Each `if (at < N)` block runs once
// when the device's stored marker is below N. Bump SYNC_REPAIR_TARGET
// monotonically; never reuse a version number.
const SYNC_REPAIR_KEY = 'finverse.syncRepairVersion';
const SYNC_REPAIR_TARGET = 1;

async function runSyncRepairs(): Promise<void> {
  const raw = localStorage.getItem(SYNC_REPAIR_KEY);
  const parsed = raw ? Number(raw) : 0;
  const at = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  if (at >= SYNC_REPAIR_TARGET) return;

  // v1: payroll entities (employee/advance) were wired into push and
  // pull in commits 5a0ab16 → 246aaa9, 23 minutes apart. Devices that
  // pulled in the gap silently dropped payroll rows but still advanced
  // lastPulledAt past them, and the server's strict `updated_at > since`
  // filter means those rows can never be re-fetched. Fix: reset the
  // watermark so pull re-fetches everything (LWW preserves newer
  // locals), and re-enqueue every local row so any push-dropped ones
  // reach the server (LWW rejects stale writes cleanly).
  if (at < 1) {
    if (hasIdentity()) {
      setLastPulledAt(0);
      await enqueueAllLocalRows();
    }
  }

  localStorage.setItem(SYNC_REPAIR_KEY, String(SYNC_REPAIR_TARGET));
}

// Public: kick off background sync lifecycle. Idempotent.
export function start(): void {
  if (started) return;
  started = true;
  void refreshStateFromIdentity();
  installTriggers();
  void (async () => {
    try {
      await runSyncRepairs();
    } catch (err) {
      console.error('Sync repair failed:', err);
    }
    if (hasIdentity()) {
      void sync();
    }
  })();
}

export function stop(): void {
  if (!started) return;
  started = false;
  if (mutationDebounceHandle) {
    clearTimeout(mutationDebounceHandle);
    mutationDebounceHandle = null;
  }
  if (periodicHandle) {
    clearInterval(periodicHandle);
    periodicHandle = null;
  }
  if (unsubscribeMutations) {
    unsubscribeMutations();
    unsubscribeMutations = null;
  }
  window.removeEventListener('online', onOnline);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('finverse:sync-unauthed', onUnauthed);
}

// Public: manual trigger (e.g., Settings "Sync now" button or after vault
// creation). Resolves once the current cycle finishes.
export async function syncNow(): Promise<void> {
  await sync();
}

// Public: create a brand-new vault for this device and immediately enqueue
// all local rows for initial upload. Used by the bootstrap button in
// Settings and (later in Phase 4) the "Start fresh" onboarding flow.
export async function bootstrapNewVault(label?: string): Promise<void> {
  const response = await apiCreateVault(label);
  const identity: DeviceIdentity = {
    vaultId: response.vaultId,
    deviceId: response.deviceId,
    deviceKey: response.deviceKey,
  };
  setIdentity(identity);
  setLastPulledAt(0);
  await enqueueAllLocalRows();
  await refreshStateFromIdentity();
  await sync();
}

// Public: join an existing vault via a pair token (Phase 4 will wire this
// into the QR scan UI; exported now so the shape is stable).
export async function joinVaultWithToken(token: string, label?: string): Promise<void> {
  const response = await apiPairComplete(token, label);
  setIdentity({
    vaultId: response.vaultId,
    deviceId: response.deviceId,
    deviceKey: response.deviceKey,
  });
  setLastPulledAt(0);
  await refreshStateFromIdentity();
  await sync();
}

// Public: sign the current device out. Does NOT revoke on the server (the
// caller can do that separately if they're signing out from a device they
// still control). Wipes local identity + pull watermark + the pending-push
// queue (any unsent changes are local-only again). Does NOT wipe local
// Dexie data — user expectation is that offline data survives sign-out
// on the device that originated it. Returns a promise because clearing
// the queue is async, but safe to fire-and-forget from callers.
export async function signOutLocal(): Promise<void> {
  clearIdentity();
  await db.pendingPushes.clear();
  await refreshStateFromIdentity();
}

function installTriggers(): void {
  unsubscribeMutations = subscribeMutations(onMutation);
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('finverse:sync-unauthed', onUnauthed);
  periodicHandle = setInterval(() => {
    if (document.visibilityState === 'visible' && hasIdentity() && navigator.onLine) {
      void sync();
    }
  }, PERIODIC_SYNC_INTERVAL_MS);
}

function onMutation(): void {
  if (!hasIdentity()) return;
  if (mutationDebounceHandle) clearTimeout(mutationDebounceHandle);
  mutationDebounceHandle = setTimeout(() => {
    mutationDebounceHandle = null;
    // Mutation-triggered cycles are push-only; pull runs on the slower
    // periodic/visibility/online triggers.
    void sync({ pushOnly: true });
  }, MUTATION_DEBOUNCE_MS);
}

function onOnline(): void {
  if (hasIdentity()) void sync();
}

let lastVisibilitySync = 0;
function onVisibilityChange(): void {
  if (document.visibilityState !== 'visible') return;
  if (!hasIdentity()) return;
  if (Date.now() - lastVisibilitySync < VISIBILITY_SYNC_MIN_GAP_MS) return;
  lastVisibilitySync = Date.now();
  void sync();
}

function onUnauthed(): void {
  void refreshStateFromIdentity();
}

// Core cycle. Only one runs at a time; overlapping calls coalesce into a
// single follow-up cycle queued via `nextSyncQueued`.
async function sync(options: { pushOnly?: boolean } = {}): Promise<void> {
  if (!hasIdentity()) {
    state.update({ status: 'no-identity' });
    return;
  }
  if (!navigator.onLine) {
    state.update({ status: 'offline' });
    return;
  }
  if (syncInFlight) {
    nextSyncQueued = true;
    return;
  }
  syncInFlight = true;
  state.update({ status: 'syncing', error: null });
  try {
    if (!options.pushOnly) {
      await runPull();
    }
    // Drain any receipts that still need to ship bytes to Vercel Blob.
    // This happens BEFORE runPush so the fresh blobKey/blobUrl metadata
    // gets pushed in the same cycle.
    await drainReceiptUploads();
    await runPush();
    state.update({
      status: 'idle',
      lastSyncedAt: Date.now(),
      error: null,
      pendingCount: await db.pendingPushes.count(),
    });
  } catch (err) {
    if (err instanceof SyncUnauthedError) {
      await refreshStateFromIdentity();
    } else {
      const message = err instanceof Error ? err.message : String(err);
      state.update({ status: 'error', error: message });
      console.error('Sync failed:', err);
    }
  } finally {
    syncInFlight = false;
    if (nextSyncQueued) {
      nextSyncQueued = false;
      void sync();
    }
  }
}

async function runPull(): Promise<void> {
  let since = getLastPulledAt();
  let appliedAny = false;
  for (let safety = 0; safety < 20; safety++) {
    const page = await pullDelta(since);
    if (page.entities.length > 0) {
      await applyRemoteBatch(page.entities);
      appliedAny = true;
    }
    since = page.nextSince;
    setLastPulledAt(since);
    if (!page.hasMore) break;
  }
  // Tell data hooks (useTransactions, useAccounts, useUserPreferences, …)
  // to re-read from Dexie now that remote rows have landed. This is what
  // lets PairEntryScreen drop the window.location.reload() it used to do.
  if (appliedAny) {
    window.dispatchEvent(new CustomEvent(REMOTE_APPLIED_EVENT));
  }
}

async function runPush(): Promise<void> {
  const queue = await db.pendingPushes.toArray();
  if (queue.length === 0) return;

  // Snapshot the current state of each queued row. If a row has vanished
  // (shouldn't happen with soft-deletes, but handle defensively), skip it.
  for (let i = 0; i < queue.length; i += PUSH_BATCH_SIZE) {
    const slice = queue.slice(i, i + PUSH_BATCH_SIZE);
    const changes: PushChange[] = [];
    const rowLookup = new Map<string, string>(); // entityId → queueKey
    for (const q of slice) {
      const row = await fetchRow(q.entityType, q.entityId);
      if (!row || typeof row.updatedAt !== 'number') continue;
      const data = stripSyncFields(row, q.entityType);
      changes.push({
        entityType: q.entityType,
        entityId: q.entityId,
        data,
        updatedAt: row.updatedAt,
        deletedAt: typeof row.deletedAt === 'number' ? row.deletedAt : undefined,
      });
      rowLookup.set(q.entityId, q.id);
    }

    if (changes.length === 0) {
      await db.pendingPushes.bulkDelete(slice.map((q) => q.id));
      continue;
    }

    let response;
    try {
      response = await pushChanges(changes);
    } catch (err) {
      if (err instanceof SyncHttpError && err.status >= 400 && err.status < 500) {
        // Client-side error (413 batch too large, 400 validation). Drop
        // the batch from the queue to avoid infinite retries, but log it.
        console.error('Push rejected with client error, dropping batch:', err);
        await db.pendingPushes.bulkDelete(slice.map((q) => q.id));
        continue;
      }
      throw err;
    }

    const rejectedIds = new Set(response.rejected.map((r) => r.entityId));
    const toDelete: string[] = [];
    for (const [entityId, queueKey] of rowLookup.entries()) {
      if (!rejectedIds.has(entityId)) {
        toDelete.push(queueKey);
      }
    }
    if (toDelete.length > 0) {
      await db.pendingPushes.bulkDelete(toDelete);
    }

    // Stale-write rejections mean the server has a newer copy. Pulling
    // will bring it down and reconcile; skipping re-push of these rows
    // avoids the infinite loop.
    if (response.rejected.length > 0) {
      await runPull();
      // Re-enqueue? No — the newer server row now has a higher updatedAt
      // than what was in our queue snapshot, so we'd just reject again.
      // Drop the stale-rejected entries too.
      const rejectedKeys: string[] = [];
      for (const [entityId, queueKey] of rowLookup.entries()) {
        if (rejectedIds.has(entityId)) rejectedKeys.push(queueKey);
      }
      if (rejectedKeys.length > 0) {
        await db.pendingPushes.bulkDelete(rejectedKeys);
      }
    }
  }
}

async function fetchRow(entityType: SyncEntityType, entityId: string): Promise<Record<string, unknown> | undefined> {
  const table = (() => {
    switch (entityType) {
      case 'trip':
        return db.trips;
      case 'transaction':
        return db.transactions;
      case 'account':
        return db.accounts;
      case 'budget':
        return db.budgets;
      case 'goal':
        return db.goals;
      case 'debt':
        return db.debts;
      case 'installment':
        return db.installments;
      case 'userPreferences':
        return db.userPreferences;
      case 'employee':
        return db.employees;
      case 'advance':
        return db.advances;
      case 'rule':
        return db.rules;
      case 'receipt':
        return db.receiptPhotos;
    }
  })();
  return (await table.get(entityId)) as Record<string, unknown> | undefined;
}

function stripSyncFields(row: Record<string, unknown>, entityType: SyncEntityType): Record<string, unknown> {
  // Receipts never ship their `localBase64` field to the server — that
  // blob can be hundreds of KB and is purely a local cache. Only the
  // cloud reference (blobKey / blobUrl) needs to travel. Everything else
  // strips the usual sync metadata and primary-key fields.
  if (entityType === 'receipt') {
    const { updatedAt: _u, deletedAt: _d, expenseId: _e, localBase64: _b, data: _legacy, ...rest } = row;
    void _u;
    void _d;
    void _e;
    void _b;
    void _legacy;
    return rest;
  }
  const { updatedAt: _u, deletedAt: _d, id: _id, ...rest } = row;
  void _u;
  void _d;
  void _id;
  return rest;
}

// On first vault bootstrap, back-fill the pendingPushes queue with every
// existing row so the initial upload covers all local state.
async function enqueueAllLocalRows(): Promise<void> {
  const now = Date.now();
  const toQueueEntries = <T extends { id: string }>(entityType: SyncEntityType, rows: T[]) =>
    rows.map((r) => ({
      id: `${entityType}:${r.id}`,
      entityType,
      entityId: r.id,
      enqueuedAt: now,
    }));

  // Receipts use `expenseId` as their primary key — same queue shape,
  // just a different field on the row.
  const receiptRows = await db.receiptPhotos.toArray();
  const receiptEntries = receiptRows.map((r) => ({
    id: `receipt:${r.expenseId}`,
    entityType: 'receipt' as const,
    entityId: r.expenseId,
    enqueuedAt: now,
  }));

  const all = [
    ...toQueueEntries('trip', await db.trips.toArray()),
    ...toQueueEntries('transaction', await db.transactions.toArray()),
    ...toQueueEntries('account', await db.accounts.toArray()),
    ...toQueueEntries('budget', await db.budgets.toArray()),
    ...toQueueEntries('goal', await db.goals.toArray()),
    ...toQueueEntries('debt', await db.debts.toArray()),
    ...toQueueEntries('installment', await db.installments.toArray()),
    ...toQueueEntries('userPreferences', await db.userPreferences.toArray()),
    ...toQueueEntries('employee', await db.employees.toArray()),
    ...toQueueEntries('advance', await db.advances.toArray()),
    ...toQueueEntries('rule', await db.rules.toArray()),
    ...receiptEntries,
  ];

  if (all.length > 0) {
    await db.pendingPushes.bulkPut(all);
  }
}

async function refreshStateFromIdentity(): Promise<void> {
  if (!hasIdentity()) {
    state.update({ status: 'no-identity', error: null });
    return;
  }
  const pendingCount = await db.pendingPushes.count();
  state.update({ status: 'idle', pendingCount });
}
