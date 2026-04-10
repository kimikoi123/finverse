import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { getSql } from '../_lib/db.js';
import { generateDeviceKey, hashDeviceKey } from '../_lib/hash.js';
import { handleError, methodNotAllowed, readJson, sendJson } from '../_lib/http.js';

interface CreateBody {
  deviceLabel?: string;
}

// POST /api/vault/create — unauthenticated. Creates a brand new vault and
// its first device. Returns the device key ONCE; the client must persist it
// in localStorage. Lose it = lose the vault.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const body = readJson<CreateBody>(req);
    const vaultId = randomUUID();
    const deviceId = randomUUID();
    const deviceKey = generateDeviceKey();
    const label = sanitizeLabel(body.deviceLabel);

    const sql = getSql();
    await sql`INSERT INTO vaults (id) VALUES (${vaultId})`;
    await sql`
      INSERT INTO vault_devices (id, vault_id, device_key_hash, label)
      VALUES (${deviceId}, ${vaultId}, ${hashDeviceKey(deviceKey)}, ${label})
    `;

    sendJson(res, 200, { vaultId, deviceId, deviceKey });
  } catch (err) {
    handleError(res, err);
  }
}

function sanitizeLabel(label: string | undefined): string | null {
  if (!label) return null;
  const trimmed = label.trim().slice(0, 80);
  return trimmed || null;
}
