import type { Table } from 'dexie';
import { db } from '../db/database';
import type { SyncEntityType } from '../types';
import type { PulledEntity } from './syncApi';

// Writes remote entities into Dexie without stamping updatedAt and without
// enqueueing a push. The server is the source of truth for these rows, so
// re-stamping would start a thrash loop (push → pulled back → stamped →
// pushed again → …). LWW is enforced at write time: if the local row has
// a higher updatedAt, we skip the remote change (local wins, and the next
// push will send the newer version back up).

// Most entities use `id` as their primary key; receipts use `expenseId`.
// Both are strings; we leave the key column unnamed here and let each
// branch in `applyRemoteEntity` assign the right field.
type AnyRow = Record<string, unknown> & { updatedAt?: number };
// Each Dexie table is generically typed (Table<Trip, string>, etc.). We
// accept the loss of type safety at the sync boundary because remote data
// is already untyped JSONB — validating the shape is the server's job via
// its entity-type whitelist. Cast once, use uniformly.
type GenericTable = Table<AnyRow, string>;

export async function applyRemoteEntity(entity: PulledEntity): Promise<void> {
  const entityType = entity.entityType as SyncEntityType;
  const table = tableFor(entityType);
  if (!table) {
    console.warn(`applyRemoteEntity: unknown entityType "${entity.entityType}"`);
    return;
  }
  const existing = await table.get(entity.entityId);
  if (existing && typeof existing.updatedAt === 'number' && existing.updatedAt > entity.updatedAt) {
    // Local is newer than the server copy we just pulled. Skip — a later
    // push will send our local version up.
    return;
  }
  // Receipts use `expenseId` as their primary key, not `id`. Also,
  // `localBase64` is device-local-only — we preserve whatever the local
  // row had (so the capturing device keeps its cache) instead of
  // overwriting it from the remote, which never includes base64.
  if (entityType === 'receipt') {
    const row: AnyRow = {
      ...(entity.data as Record<string, unknown>),
      expenseId: entity.entityId,
      updatedAt: entity.updatedAt,
    };
    if (existing && 'localBase64' in existing && existing.localBase64) {
      row.localBase64 = existing.localBase64;
    }
    if (entity.deletedAt !== undefined) {
      row.deletedAt = entity.deletedAt;
      // Soft-deleted receipts free their local cache too.
      delete row.localBase64;
    } else {
      delete row.deletedAt;
    }
    await table.put(row);
    return;
  }

  const row: AnyRow = {
    ...(entity.data as Record<string, unknown>),
    id: entity.entityId,
    updatedAt: entity.updatedAt,
  };
  if (entity.deletedAt !== undefined) {
    row.deletedAt = entity.deletedAt;
  } else {
    delete row.deletedAt;
  }
  await table.put(row);
}

export async function applyRemoteBatch(entities: PulledEntity[]): Promise<void> {
  for (const entity of entities) {
    await applyRemoteEntity(entity);
  }
}

function tableFor(type: SyncEntityType): GenericTable | null {
  switch (type) {
    case 'trip':
      return db.trips as unknown as GenericTable;
    case 'transaction':
      return db.transactions as unknown as GenericTable;
    case 'account':
      return db.accounts as unknown as GenericTable;
    case 'budget':
      return db.budgets as unknown as GenericTable;
    case 'goal':
      return db.goals as unknown as GenericTable;
    case 'debt':
      return db.debts as unknown as GenericTable;
    case 'employee':
      return db.employees as unknown as GenericTable;
    case 'advance':
      return db.advances as unknown as GenericTable;
    case 'installment':
      return db.installments as unknown as GenericTable;
    case 'userPreferences':
      return db.userPreferences as unknown as GenericTable;
    case 'rule':
      return db.rules as unknown as GenericTable;
    case 'receipt':
      return db.receiptPhotos as unknown as GenericTable;
    default: {
      const exhaustive: never = type;
      void exhaustive;
      return null;
    }
  }
}
