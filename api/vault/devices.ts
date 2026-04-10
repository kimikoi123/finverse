import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.ts';
import { getSql } from '../_lib/db.ts';
import { handleError, HttpError, methodNotAllowed, readJson, sendJson } from '../_lib/http.ts';

interface DeviceRow {
  id: string;
  label: string | null;
  created_at: string;
  last_seen_at: string;
}

interface RevokeBody {
  deviceId?: string;
}

// GET  /api/vault/devices          — list active devices in the caller's vault
// POST /api/vault/devices          — revoke a device (body: { deviceId })
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method === 'GET') {
      await listDevices(req, res);
      return;
    }
    if (req.method === 'POST') {
      await revokeDevice(req, res);
      return;
    }
    methodNotAllowed(res, ['GET', 'POST']);
  } catch (err) {
    handleError(res, err);
  }
}

async function listDevices(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { vaultId, deviceId: currentDeviceId } = await requireAuth(req);
  const sql = getSql();
  const rows = (await sql`
    SELECT id, label, created_at, last_seen_at
    FROM vault_devices
    WHERE vault_id = ${vaultId} AND revoked_at IS NULL
    ORDER BY created_at ASC
  `) as DeviceRow[];

  sendJson(res, 200, {
    devices: rows.map((r) => ({
      id: r.id,
      label: r.label,
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
      isCurrent: r.id === currentDeviceId,
    })),
  });
}

async function revokeDevice(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { vaultId } = await requireAuth(req);
  const body = readJson<RevokeBody>(req);
  const targetId = body.deviceId?.trim();
  if (!targetId) throw new HttpError(400, 'Missing deviceId');

  const sql = getSql();
  const result = (await sql`
    UPDATE vault_devices
    SET revoked_at = NOW()
    WHERE id = ${targetId} AND vault_id = ${vaultId} AND revoked_at IS NULL
    RETURNING id
  `) as { id: string }[];

  if (result.length === 0) {
    throw new HttpError(404, 'Device not found');
  }
  sendJson(res, 200, { ok: true });
}
