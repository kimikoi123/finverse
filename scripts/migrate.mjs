// Apply api/_lib/schema.sql to the Neon database referenced by DATABASE_URL.
// Idempotent — every statement uses IF NOT EXISTS.
//
// Run with env loaded from .env.local:
//   node --env-file=.env.local scripts/migrate.mjs

import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Did you forget --env-file=.env.local?');
  process.exit(1);
}

const schemaPath = new URL('../api/_lib/schema.sql', import.meta.url);
const schema = await readFile(schemaPath, 'utf8');

// Neon HTTP driver accepts one statement per query() call. Split on
// top-level semicolons (naive but sufficient for DDL without PL/pgSQL).
// Do NOT filter leading-comment statements: Postgres handles `-- comment`
// prefixes natively, and dropping them accidentally removes the real SQL
// underneath.
const statements = schema
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !/^(--[^\n]*\s*)+$/.test(s));

const sql = neon(url);

console.log(`Applying ${statements.length} statements…`);
for (const [i, stmt] of statements.entries()) {
  const preview = stmt.split('\n')[0].slice(0, 60);
  process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}… `);
  try {
    await sql.query(stmt);
    console.log('ok');
  } catch (err) {
    console.log('FAILED');
    console.error(err);
    process.exit(1);
  }
}
console.log('Done.');
