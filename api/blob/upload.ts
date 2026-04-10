import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { requireAuth } from '../_lib/auth.js';
import { handleError, HttpError, methodNotAllowed, readJson, sendJson } from '../_lib/http.js';

interface UploadBody {
  base64?: string;
  expenseId?: string;
}

// Hard cap on the decoded bytes we'll accept for a single receipt.
// Larger than any realistic phone-camera JPEG but well under the
// default Vercel request body limit.
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

// POST /api/blob/upload — authed.
// Body: { base64: "data:image/jpeg;base64,…", expenseId: "uuid" }
// Decodes the data URL, uploads to Vercel Blob with `access: 'public'`
// under a vault-scoped path, and returns { key, url }. The URL has
// Vercel Blob's built-in random suffix, so it's unguessable; the
// capability token IS the URL, and only devices that pulled the
// vault's sync deltas can see it.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { vaultId } = await requireAuth(req);
    const body = readJson<UploadBody>(req);
    if (!body.base64 || !body.expenseId) {
      throw new HttpError(400, 'Missing base64 or expenseId');
    }

    const match = /^data:([^;]+);base64,(.+)$/.exec(body.base64);
    if (!match || match.length < 3) {
      throw new HttpError(400, 'Invalid data URL');
    }
    const mimeType = match[1]!;
    const payload = match[2]!;
    const buffer = Buffer.from(payload, 'base64');
    if (buffer.byteLength > MAX_BYTES) {
      throw new HttpError(413, `Receipt too large (max ${MAX_BYTES} bytes)`);
    }

    const extension = mimeType.split('/')[1]?.split('+')[0] ?? 'bin';
    const path = `vault-${vaultId}/receipt-${body.expenseId}.${extension}`;

    // Private store: bytes are only retrievable via a Bearer-authed
    // server fetch (see api/blob/fetch.ts). We return the pathname
    // under `key`; the client stores it and later passes it back to
    // /api/blob/fetch to retrieve the raw bytes.
    const result = await put(path, buffer, {
      access: 'private',
      contentType: mimeType,
      addRandomSuffix: true,
    });

    sendJson(res, 200, { key: result.pathname, url: result.url });
  } catch (err) {
    handleError(res, err);
  }
}
