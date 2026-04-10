import type { VercelRequest } from '@vercel/node';
import { getSql } from './db.js';
import { verifyDeviceKey } from './hash.js';
import { HttpError } from './http.js';

export interface AuthContext {
  vaultId: string;
  deviceId: string;
}

interface DeviceRow {
  id: string;
  vault_id: string;
  device_key_hash: string;
  revoked_at: string | null;
}

// Bearer token format: "<vaultId>.<deviceId>.<deviceKey>".
// UUIDs and base64url-encoded keys contain no dots, so "." is an unambiguous
// separator. The server looks up the device row by (vaultId, deviceId) and
// verifies the key hash in constant time.
export async function requireAuth(req: VercelRequest): Promise<AuthContext> {
  const raw = req.headers.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    throw new HttpError(401, 'Missing bearer token');
  }
  const token = header.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new HttpError(401, 'Malformed token');
  }
  const [vaultId, deviceId, deviceKey] = parts as [string, string, string];
  if (!vaultId || !deviceId || !deviceKey) {
    throw new HttpError(401, 'Malformed token');
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT id, vault_id, device_key_hash, revoked_at
    FROM vault_devices
    WHERE id = ${deviceId} AND vault_id = ${vaultId}
    LIMIT 1
  `) as DeviceRow[];

  const device = rows[0];
  if (!device || device.revoked_at !== null) {
    throw new HttpError(401, 'Invalid credentials');
  }
  if (!verifyDeviceKey(deviceKey, device.device_key_hash)) {
    throw new HttpError(401, 'Invalid credentials');
  }

  // Touch last_seen_at — fire-and-forget, don't block the request on it.
  void sql`UPDATE vault_devices SET last_seen_at = NOW() WHERE id = ${deviceId}`;

  return { vaultId, deviceId };
}
