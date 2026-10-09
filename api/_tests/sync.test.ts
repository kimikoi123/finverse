// End-to-end tests for the sync endpoints against a real Postgres (PGlite,
// in-process), with the schema applied the way scripts/migrate.mjs does.
// Lives under api/_tests: Vercel doesn't turn `_`-prefixed paths into functions.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const holder = vi.hoisted(() => ({ sql: undefined as unknown }));
vi.mock('../_lib/db.js', () => ({ getSql: () => holder.sql }));

import createVault from '../vault/create.js';
import pairInit from '../vault/pair-init.js';
import pairComplete from '../vault/pair-complete.js';
import push from '../sync/push.js';
import pull from '../sync/pull.js';

type Rows = Record<string, unknown>[];
interface Query {
  text: string;
  params: unknown[];
}

// The slice of Neon's `sql` the handlers use: tagged templates are lazy
// thenables resolving to rows, and sql.transaction() runs a batch atomically.
function neonOver(pg: PGlite) {
  const sql = (strings: TemplateStringsArray, ...params: unknown[]) => {
    const text = strings.reduce((acc, part, i) => acc + (i > 0 ? `$${i}` : '') + part, '');
    const query: Query = { text, params };
    return {
      query,
      then<T, E = never>(resolve: (rows: Rows) => T, reject?: (err: unknown) => E) {
        return pg.query(text, params).then((r) => r.rows as Rows).then(resolve, reject);
      },
    };
  };
  sql.transaction = (queries: { query: Query }[]) =>
    pg.transaction(async (tx) => {
      const results: Rows[] = [];
      for (const { query } of queries) results.push((await tx.query(query.text, query.params)).rows as Rows);
      return results;
    });
  return sql;
}

const schema = readFileSync(new URL('../_lib/schema.sql', import.meta.url), 'utf8');

// Same split as scripts/migrate.mjs, which sends one statement per query.
function migrationStatements(text: string): string[] {
  return text
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(--[^\n]*\s*)+$/.test(s));
}

async function migrate(pg: PGlite): Promise<void> {
  for (const statement of migrationStatements(schema)) await pg.query(statement);
}

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

async function call<T>(handler: Handler, body: unknown, token?: string): Promise<{ status: number; body: T }> {
  const out = { status: 200, body: undefined as unknown };
  const res = {
    status(code: number) { out.status = code; return res; },
    json(payload: unknown) { out.body = payload; return res; },
    send(payload: unknown) { out.body = payload; return res; },
    setHeader() { return res; },
  };
  const req = { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body };
  await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
  return out as { status: number; body: T };
}

interface Credentials {
  vaultId: string;
  deviceId: string;
  deviceKey: string;
}
interface PulledEntity {
  entityType: string;
  entityId: string;
  data: unknown;
  updatedAt: number;
  deletedAt?: number;
}
interface CursorPage {
  entities: PulledEntity[];
  hasMore: boolean;
  nextCursor: number;
}
interface PushResult {
  applied: number;
  rejected: { entityId: string; reason: string }[];
}

const bearer = (c: Credentials) => `${c.vaultId}.${c.deviceId}.${c.deviceKey}`;

// A vault with two devices, created through the real endpoints.
async function phoneAndLaptop() {
  const phone = (await call<Credentials>(createVault, { deviceLabel: 'Phone' })).body;
  const { token } = (await call<{ token: string }>(pairInit, {}, bearer(phone))).body;
  const laptop = (await call<Credentials>(pairComplete, { token, deviceLabel: 'Laptop' })).body;
  return { phone, laptop };
}

function change(entityId: string, updatedAt: number, data: unknown = { note: entityId }) {
  return { entityType: 'transaction', entityId, data, updatedAt };
}

async function pushAs(device: Credentials, changes: unknown[]) {
  return (await call<PushResult>(push, { changes }, bearer(device))).body;
}

async function pullAs(device: Credentials, cursor: number, limit?: number) {
  return (await call<CursorPage>(pull, { cursor, limit }, bearer(device))).body;
}

let pg: PGlite;

// One database for the file (booting PGlite takes seconds), emptied per test.
beforeAll(async () => {
  pg = new PGlite();
  await migrate(pg);
  holder.sql = neonOver(pg);
});

beforeEach(async () => {
  await pg.exec('TRUNCATE vaults, vault_devices, entities, pair_tokens CASCADE');
});

describe('schema migration', () => {
  it('can be re-run', async () => {
    await expect(migrate(pg)).resolves.toBeUndefined();
  });

  it('backfills seq for rows written before the column existed', async () => {
    // Roll the table back to its pre-cursor shape, holding two rows.
    await pg.exec(`
      DROP INDEX entities_seq_idx;
      ALTER TABLE entities DROP COLUMN seq;
      DROP SEQUENCE entities_seq;
      INSERT INTO vaults (id) VALUES ('00000000-0000-0000-0000-000000000001');
      INSERT INTO entities (vault_id, entity_type, entity_id, data, updated_at) VALUES
        ('00000000-0000-0000-0000-000000000001', 'transaction', 'a', '{}', 1),
        ('00000000-0000-0000-0000-000000000001', 'transaction', 'b', '{}', 1);
    `);

    await migrate(pg);

    const { rows } = await pg.query<{ seq: number }>('SELECT seq FROM entities ORDER BY seq');
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.seq)).size).toBe(2);
  });
});

describe('cursor pulls', () => {
  it('deliver a change uploaded late to a device that already pulled past its timestamp', async () => {
    const { phone, laptop } = await phoneAndLaptop();
    await pushAs(phone, [change('x', 2_000)]);
    const first = await pullAs(laptop, 0);
    expect(first.entities.map((e) => e.entityId)).toEqual(['x']);

    // Edited on the phone while offline (older timestamp), uploaded only now.
    await pushAs(phone, [change('offline-edit', 1_000)]);

    const next = await pullAs(laptop, first.nextCursor);
    expect(next.entities.map((e) => e.entityId)).toEqual(['offline-edit']);
  });

  it('move an updated row past every cursor handed out before the update', async () => {
    const { phone, laptop } = await phoneAndLaptop();
    await pushAs(phone, [change('x', 1, { v: 1 })]);
    const first = await pullAs(laptop, 0);

    await pushAs(phone, [change('x', 2, { v: 2 })]);
    const second = await pullAs(laptop, first.nextCursor);
    expect(second.entities.map((e) => e.data)).toEqual([{ v: 2 }]);

    // A stale write is rejected and doesn't resurface the row.
    expect(await pushAs(phone, [change('x', 1, { v: 'stale' })])).toEqual({
      applied: 0,
      rejected: [{ entityId: 'x', reason: 'stale-write' }],
    });
    expect((await pullAs(laptop, second.nextCursor)).entities).toEqual([]);
  });

  it('page without skipping rows that share an updatedAt', async () => {
    const { phone, laptop } = await phoneAndLaptop();
    const ids = ['a', 'b', 'c', 'd', 'e'];
    await pushAs(phone, ids.map((id) => change(id, 500))); // e.g. one bulk import

    const seen: string[] = [];
    let cursor = 0;
    for (;;) {
      const page = await pullAs(laptop, cursor, 2);
      seen.push(...page.entities.map((e) => e.entityId));
      cursor = page.nextCursor;
      if (!page.hasMore) break;
    }
    expect(seen.sort()).toEqual(ids);
  });

  it('keep the cursor in place when there is nothing new', async () => {
    const { laptop } = await phoneAndLaptop();
    expect(await pullAs(laptop, 42)).toMatchObject({ entities: [], hasMore: false, nextCursor: 42 });
  });
});

describe('push', () => {
  it('keeps the newest copy when a batch names the same row twice', async () => {
    const { phone, laptop } = await phoneAndLaptop();
    expect((await pushAs(phone, [change('x', 5, { v: 'old' }), change('x', 6, { v: 'new' })])).applied).toBe(1);
    expect((await pullAs(laptop, 0)).entities.map((e) => e.data)).toEqual([{ v: 'new' }]);
  });

  it('rejects malformed rows without failing the rest of the batch', async () => {
    const { phone } = await phoneAndLaptop();
    const result = await pushAs(phone, [
      change('ok', 1),
      change('fractional', 1.5),
      { ...change('bogus-type', 1), entityType: 'nope' },
    ]);
    expect(result.applied).toBe(1);
    expect(result.rejected).toEqual([
      { entityId: 'fractional', reason: 'invalid-updated-at' },
      { entityId: 'bogus-type', reason: 'invalid-entity-type' },
    ]);
  });

  it('stores null data as JSON null', async () => {
    const { phone, laptop } = await phoneAndLaptop();
    expect((await pushAs(phone, [change('x', 1, null)])).applied).toBe(1);
    expect((await pullAs(laptop, 0)).entities.map((e) => e.data)).toEqual([null]);
  });
});

it('still serves timestamp pulls to app versions that predate the cursor', async () => {
  const { phone, laptop } = await phoneAndLaptop();
  await pushAs(phone, [change('x', 100)]);

  const legacy = (await call<{ entities: PulledEntity[]; nextSince: number }>(pull, { since: 0 }, bearer(laptop))).body;

  expect(legacy.entities.map((e) => e.entityId)).toEqual(['x']);
  expect(legacy.nextSince).toBeTypeOf('number');
});

it('updates last_seen_at for the devices list', async () => {
  const { phone } = await phoneAndLaptop();
  await pg.query(`UPDATE vault_devices SET last_seen_at = NOW() - INTERVAL '1 hour' WHERE id = $1`, [phone.deviceId]);

  await pullAs(phone, 0);

  const { rows } = await pg.query<{ fresh: boolean }>(
    `SELECT last_seen_at > NOW() - INTERVAL '1 minute' AS fresh FROM vault_devices WHERE id = $1`,
    [phone.deviceId],
  );
  expect(rows[0]?.fresh).toBe(true);
});
