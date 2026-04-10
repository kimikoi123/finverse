import type { VercelRequest, VercelResponse } from '@vercel/node';
import { get } from '@vercel/blob';
import { requireAuth } from '../_lib/auth.js';
import { handleError, HttpError, methodNotAllowed, readJson } from '../_lib/http.js';

interface FetchBody {
  key?: string;
}

// POST /api/blob/fetch — authed.
// Body: { key: "vault-<vaultId>/receipt-<uuid>.<ext>" }
// Streams the raw bytes of a private blob back to the client. The key
// MUST be prefixed with the caller's own `vault-<vaultId>/` so one vault
// can never read another vault's blobs, even with a leaked pathname.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const { vaultId } = await requireAuth(req);
    const body = readJson<FetchBody>(req);
    const key = body.key?.trim();
    if (!key) throw new HttpError(400, 'Missing key');

    // Critical authorization invariant: a device from vault A must not
    // be able to read vault B's receipts even if it has somehow learned
    // the pathname. The key is scoped by construction in upload.ts.
    const expectedPrefix = `vault-${vaultId}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new HttpError(403, 'Not your blob');
    }

    const result = await get(key, { access: 'private' });
    if (!result) {
      throw new HttpError(404, 'Blob not found');
    }

    const { stream, headers } = result;
    if (!stream) {
      throw new HttpError(502, 'Blob stream unavailable');
    }
    const contentType = headers.get('content-type') ?? 'application/octet-stream';
    const contentLength = headers.get('content-length');
    res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Cache-Control', 'private, max-age=300');

    // Pipe the @vercel/blob ReadableStream through to the Node res.
    // The stream exposes a standard Web ReadableStream; we convert it
    // via getReader() + write() to avoid pulling in extra deps.
    const reader = stream.getReader();
    res.status(200);
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } catch (err) {
    handleError(res, err);
  }
}
