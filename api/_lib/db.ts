import { neon } from '@neondatabase/serverless';

// Lazy singleton. Per vercel-storage guidance we do NOT wrap the client in a
// Proxy — libraries that introspect the DB adapter break through proxies.
// Instantiating at module scope would throw at build time if DATABASE_URL
// isn't set yet (first deploy before Marketplace provisioning), so we defer.
let _sql: ReturnType<typeof neon> | null = null;

export function getSql(): ReturnType<typeof neon> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set. Provision Neon via Vercel Marketplace.');
    }
    _sql = neon(url);
  }
  return _sql;
}
