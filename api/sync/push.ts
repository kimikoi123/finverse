import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';
import { getSql } from '../_lib/db.js';
import { handleError, HttpError, methodNotAllowed, readJson, sendJson } from '../_lib/http.js';

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
  'employee',
  'advance',
  'rule',
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
      const { value, reason } = validate(change);
      if (reason !== undefined || value === undefined) {
        rejected.push({ entityId: change.entityId ?? '', reason: reason ?? 'invalid' });
        continue;
      }
      const { entityType, entityId, data, updatedAt, deletedAt } = value;

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

// Returns { value } on success or { reason } on failure — the two fields
// are mutually exclusive by convention but NOT by TypeScript type, which
// means downstream code can read either field without needing to narrow
// a discriminated union. Deliberate: Vercel's remote build pipeline uses
// a separate tsconfig for api/*.ts files and was dropping the narrowing
// for the former `{ ok: true } | { ok: false }` shape.
interface ValidationResult {
  value?: ValidChange;
  reason?: string;
}

function validate(change: PushChange): ValidationResult {
  if (!change.entityType || !ALLOWED_TYPES.has(change.entityType)) {
    return { reason: 'invalid-entity-type' };
  }
  if (!change.entityId || typeof change.entityId !== 'string') {
    return { reason: 'missing-entity-id' };
  }
  if (typeof change.updatedAt !== 'number' || !Number.isFinite(change.updatedAt)) {
    return { reason: 'invalid-updated-at' };
  }
  if (change.deletedAt !== undefined && (typeof change.deletedAt !== 'number' || !Number.isFinite(change.deletedAt))) {
    return { reason: 'invalid-deleted-at' };
  }
  if (change.data === undefined) {
    return { reason: 'missing-data' };
  }
  return {
    value: {
      entityType: change.entityType,
      entityId: change.entityId,
      data: change.data,
      updatedAt: change.updatedAt,
      deletedAt: change.deletedAt,
    },
  };
}
