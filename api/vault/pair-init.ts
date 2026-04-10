import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.ts';
import { getSql } from '../_lib/db.ts';
import { generatePairToken } from '../_lib/hash.ts';
import { handleError, methodNotAllowed, sendJson } from '../_lib/http.ts';

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// POST /api/vault/pair-init — authed. An existing device asks the server
// for a short-lived pair token. Client displays it as a QR code + 6-char
// text so a second device can join the vault. Token is single-use and
// expires in 10 minutes.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { vaultId } = await requireAuth(req);
    const sql = getSql();

    // Collision is astronomically unlikely with 6 crockford-base32 chars
    // (~29 bits of entropy), but loop a few times just in case another
    // pair token happens to be active.
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const token = generatePairToken(6);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
      try {
        await sql`
          INSERT INTO pair_tokens (token, vault_id, expires_at)
          VALUES (${token}, ${vaultId}, ${expiresAt})
        `;
        sendJson(res, 200, { token, expiresAt });
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('duplicate key')) throw err;
      }
    }
    throw new Error('Failed to generate unique pair token');
  } catch (err) {
    handleError(res, err);
  }
}
