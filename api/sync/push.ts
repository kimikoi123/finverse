import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.ts';
import { getSql } from '../_lib/db.ts';
import { handleError, HttpError, methodNotAllowed, readJson, sendJson } from '../_lib/http.ts';

interface PushChange {
  entityType?: string;
  entityId?: string;
  data?: unknown;
  updatedAt?: number;
  deletedAt?: number;
}

interface PushBody {
  changes?: PushChange[];
}

// Whitelist of syncable entity types. Keeps clients from polluting the
// store with arbitrary strings.
const ALLOWED_TYPES = new Set([
  'trip',
  'transaction',
  'account',
  'budget',
  'goal',
  'debt',
  'installment',
  'userPreferences',
  'receipt',
]);

const MAX_BATCH = 1000;

// POST /api/sync/push — authed.
// Body: { changes: [{ entityType, entityId, data, updatedAt, deletedAt? }] }
// Upserts each change with last-write-wins: the server keeps the existing
// row if its updated_at >= incoming updated_at. Rejected rows are reported
// back so the client can reconcile.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { vaultId } = await requireAuth(req);
    const body = readJson<PushBody>(req);
    const changes = Array.isArray(body.changes) ? body.changes : [];
    if (changes.length === 0) {
      sendJson(res, 200, { applied: 0, rejected: [] });
      return;
    }
    if (changes.length > MAX_BATCH) {
      throw new HttpError(413, `Batch too large (max ${MAX_BATCH})`);
    }

    const sql = getSql();
    let applied = 0;
    const rejected: { entityId: string; reason: string }[] = [];

    for (const change of changes) {
      const validation = validate(change);
      if (!validation.ok) {
        rejected.push({ entityId: change.entityId ?? '', reason: validation.reason });
        continue;
      }
      const { entityType, entityId, data, updatedAt, deletedAt } = validation.value;

      const result = (await sql`
        INSERT INTO entities (vault_id, entity_type, entity_id, data, updated_at, deleted_at)
        VALUES (
          ${vaultId}, ${entityType}, ${entityId},
          ${JSON.stringify(data)}::jsonb,
          ${updatedAt},
          ${deletedAt ?? null}
        )
        ON CONFLICT (vault_id, entity_type, entity_id) DO UPDATE
          SET data = EXCLUDED.data,
              updated_at = EXCLUDED.updated_at,
              deleted_at = EXCLUDED.deleted_at
          WHERE entities.updated_at < EXCLUDED.updated_at
        RETURNING entity_id
      `) as { entity_id: string }[];

      if (result.length === 0) {
        rejected.push({ entityId, reason: 'stale-write' });
      } else {
        applied++;
      }
    }

    void sql`UPDATE vaults SET last_active_at = NOW() WHERE id = ${vaultId}`;

    sendJson(res, 200, { applied, rejected });
  } catch (err) {
    handleError(res, err);
  }
}

type ValidChange = {
  entityType: string;
  entityId: string;
  data: unknown;
  updatedAt: number;
  deletedAt?: number;
};

function validate(change: PushChange): { ok: true; value: ValidChange } | { ok: false; reason: string } {
  if (!change.entityType || !ALLOWED_TYPES.has(change.entityType)) {
    return { ok: false, reason: 'invalid-entity-type' };
  }
  if (!change.entityId || typeof change.entityId !== 'string') {
    return { ok: false, reason: 'missing-entity-id' };
  }
  if (typeof change.updatedAt !== 'number' || !Number.isFinite(change.updatedAt)) {
    return { ok: false, reason: 'invalid-updated-at' };
  }
  if (change.deletedAt !== undefined && (typeof change.deletedAt !== 'number' || !Number.isFinite(change.deletedAt))) {
    return { ok: false, reason: 'invalid-deleted-at' };
  }
  if (change.data === undefined) {
    return { ok: false, reason: 'missing-data' };
  }
  return {
    ok: true,
    value: {
      entityType: change.entityType,
      entityId: change.entityId,
      data: change.data,
      updatedAt: change.updatedAt,
      deletedAt: change.deletedAt,
    },
  };
}
