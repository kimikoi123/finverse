import type { VercelRequest, VercelResponse } from '@vercel/node';

// Helpers for the traditional @vercel/node handler signature
// `(req: VercelRequest, res: VercelResponse) => void`. The dev server
// and production runtime both expect this — Web Standard `Request`/`Response`
// is NOT auto-detected for plain (non-framework) `api/` folders.

export function sendJson(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function sendError(res: VercelResponse, status: number, message: string): void {
  res.status(status).json({ error: message });
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]): void {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).send('Method Not Allowed');
}

// @vercel/node parses JSON bodies automatically into req.body when the
// Content-Type is application/json. Missing/invalid bodies surface as an
// empty object here; per-endpoint validation is the source of truth.
export function readJson<T = Record<string, unknown>>(req: VercelRequest): T {
  const body = req.body;
  if (body && typeof body === 'object') return body as T;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new HttpError(400, 'Invalid JSON body');
    }
  }
  return {} as T;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function handleError(res: VercelResponse, err: unknown): void {
  if (err instanceof HttpError) {
    sendError(res, err.status, err.message);
    return;
  }
  console.error('Unhandled error:', err);
  sendError(res, 500, 'Internal server error');
}
