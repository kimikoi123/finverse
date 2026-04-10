import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';
import { getSql } from '../_lib/db.js';
import { handleError, methodNotAllowed, readJson, sendJson } from '../_lib/http.js';

interface PullBody {
  since?: number;
  limit?: number;
}

interface EntityRow {
  entity_type: string;
  entity_id: string;
  data: unknown;
  updated_at: string; // bigint comes back as string from pg
  deleted_at: string | null;
}

const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 20000;

// POST /api/sync/pull — authed.
// Body: { since: number, limit?: number }
// Returns entities with updated_at > since, ordered by updated_at asc.
// Client uses `nextSince` as its next watermark. `hasMore` signals paging.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { vaultId } = await requireAuth(req);
    const body = readJson<PullBody>(req);
    const since = typeof body.since === 'number' && body.since >= 0 ? body.since : 0;
    const limit = clamp(body.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);

    const sql = getSql();
    const rows = (await sql`
      SELECT entity_type, entity_id, data, updated_at, deleted_at
      FROM entities
      WHERE vault_id = ${vaultId} AND updated_at > ${since}
      ORDER BY updated_at ASC
      LIMIT ${limit + 1}
    `) as EntityRow[];

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const entities = page.map((r) => ({
      entityType: r.entity_type,
      entityId: r.entity_id,
      data: r.data,
      updatedAt: Number(r.updated_at),
      deletedAt: r.deleted_at !== null ? Number(r.deleted_at) : undefined,
    }));

    // When there's more, the client must pass the last page's max updatedAt
    // as the next `since`. When there isn't, it advances to serverTime.
    const last = entities[entities.length - 1];
    const nextSince = hasMore && last ? last.updatedAt : Date.now();

    sendJson(res, 200, {
      entities,
      serverTime: Date.now(),
      hasMore,
      nextSince,
    });
  } catch (err) {
    handleError(res, err);
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
