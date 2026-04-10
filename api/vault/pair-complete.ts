import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { getSql } from '../_lib/db.js';
import { generateDeviceKey, hashDeviceKey } from '../_lib/hash.js';
import { handleError, HttpError, methodNotAllowed, readJson, sendJson } from '../_lib/http.js';

interface PairBody {
  token?: string;
  deviceLabel?: string;
}

interface TokenRow {
  vault_id: string;
  expires_at: string;
  used_at: string | null;
}

// POST /api/vault/pair-complete — unauthenticated. A new device submits a
// pair token obtained via QR/manual entry. If valid, server mints a new
// device key scoped to the same vault and returns the credentials.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const body = readJson<PairBody>(req);
    const token = body.token?.trim().toUpperCase();
    if (!token) throw new HttpError(400, 'Missing pair token');

    const sql = getSql();
    const tokenRows = (await sql`
      SELECT vault_id, expires_at, used_at
      FROM pair_tokens
      WHERE token = ${token}
      LIMIT 1
    `) as TokenRow[];

    const row = tokenRows[0];
    if (!row) throw new HttpError(401, 'Invalid pair token');
    if (row.used_at !== null) throw new HttpError(401, 'Pair token already used');
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new HttpError(401, 'Pair token expired');
    }

    const deviceId = randomUUID();
    const deviceKey = generateDeviceKey();
    const label = sanitizeLabel(body.deviceLabel);

    // Mint the device first, then atomically mark the token used. If
    // another racer consumed the token between our SELECT and UPDATE,
    // the UPDATE's WHERE clause returns zero rows and we roll back.
    await sql`
      INSERT INTO vault_devices (id, vault_id, device_key_hash, label)
      VALUES (${deviceId}, ${row.vault_id}, ${hashDeviceKey(deviceKey)}, ${label})
    `;
    const updated = (await sql`
      UPDATE pair_tokens
      SET used_at = NOW()
      WHERE token = ${token} AND used_at IS NULL
      RETURNING token
    `) as { token: string }[];

    if (updated.length === 0) {
      await sql`DELETE FROM vault_devices WHERE id = ${deviceId}`;
      throw new HttpError(409, 'Pair token already consumed');
    }

    sendJson(res, 200, { vaultId: row.vault_id, deviceId, deviceKey });
  } catch (err) {
    handleError(res, err);
  }
}

function sanitizeLabel(label: string | undefined): string | null {
  if (!label) return null;
  const trimmed = label.trim().slice(0, 80);
  return trimmed || null;
}
