import { bearerToken, clearIdentity, getIdentity } from './deviceIdentity';

// Thin HTTP client over the Phase 2 endpoints.
// - Injects the Bearer token on every authed call.
// - Retries network errors and 5xx responses with exponential backoff.
// - On 401, wipes the local identity and dispatches a 'finverse:sync-unauthed'
//   event so the app can route back to the pair screen. (Phase 4 hooks into it.)

const MAX_RETRIES = 3;

export class SyncUnauthedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'SyncUnauthedError';
  }
}

export class SyncHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SyncHttpError';
  }
}

interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  auth?: boolean;
}

async function fetchWithRetry(path: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(path, init);
      if (res.status >= 500 && res.status < 600 && attempt < MAX_RETRIES - 1) {
        await backoff(attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await backoff(attempt);
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('fetch failed');
}

function backoff(attempt: number): Promise<void> {
  const delay = 300 * 2 ** attempt + Math.random() * 100;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function request<T>(path: string, { method = 'POST', body, auth = true }: FetchOptions): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const identity = getIdentity();
    if (!identity) throw new SyncUnauthedError();
    headers.Authorization = `Bearer ${bearerToken(identity)}`;
  }

  const res = await fetchWithRetry(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearIdentity();
    window.dispatchEvent(new CustomEvent('finverse:sync-unauthed'));
    throw new SyncUnauthedError();
  }

  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const message = (parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as { error: unknown }).error === 'string'
      ? (parsed as { error: string }).error
      : res.statusText) ?? 'Request failed';
    throw new SyncHttpError(res.status, message);
  }
  return parsed as T;
}

// ---- Typed endpoint wrappers ----

export interface CreateVaultResponse {
  vaultId: string;
  deviceId: string;
  deviceKey: string;
}

export function createVault(deviceLabel?: string): Promise<CreateVaultResponse> {
  return request<CreateVaultResponse>('/api/vault/create', {
    body: { deviceLabel },
    auth: false,
  });
}

export interface PairInitResponse {
  token: string;
  expiresAt: string;
}

export function pairInit(): Promise<PairInitResponse> {
  return request<PairInitResponse>('/api/vault/pair-init', { body: {} });
}

export function pairComplete(token: string, deviceLabel?: string): Promise<CreateVaultResponse> {
  return request<CreateVaultResponse>('/api/vault/pair-complete', {
    body: { token, deviceLabel },
    auth: false,
  });
}

export interface DeviceSummary {
  id: string;
  label: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

export function listDevices(): Promise<{ devices: DeviceSummary[] }> {
  return request<{ devices: DeviceSummary[] }>('/api/vault/devices', { method: 'GET' });
}

export function revokeDevice(deviceId: string): Promise<{ ok: true }> {
  return request<{ ok: true }>('/api/vault/devices', { body: { deviceId } });
}

export interface PulledEntity {
  entityType: string;
  entityId: string;
  data: unknown;
  updatedAt: number;
  deletedAt?: number;
}

export interface PullResponse {
  entities: PulledEntity[];
  serverTime: number;
  hasMore: boolean;
  nextSince: number;
}

export function pullDelta(since: number, limit?: number): Promise<PullResponse> {
  return request<PullResponse>('/api/sync/pull', { body: { since, limit } });
}

export interface PushChange {
  entityType: string;
  entityId: string;
  data: unknown;
  updatedAt: number;
  deletedAt?: number;
}

export interface PushResponse {
  applied: number;
  rejected: { entityId: string; reason: string }[];
}

export function pushChanges(changes: PushChange[]): Promise<PushResponse> {
  return request<PushResponse>('/api/sync/push', { body: { changes } });
}

export interface UploadReceiptRequest {
  base64: string;
  expenseId: string;
}

export interface UploadReceiptResponse {
  key: string;
  url: string;
}

export function uploadReceiptBlob(body: UploadReceiptRequest): Promise<UploadReceiptResponse> {
  return request<UploadReceiptResponse>('/api/blob/upload', { body });
}

// Fetches a private blob's raw bytes through the authed proxy endpoint
// and returns a same-origin `blob:` ObjectURL suitable for <img src>.
// The receipt display cache in storage.ts owns the lifetime — callers
// must NOT revoke these URLs themselves.
export async function fetchPrivateBlobAsObjectUrl(key: string): Promise<string> {
  const identity = getIdentity();
  if (!identity) throw new SyncUnauthedError();
  const response = await fetch('/api/blob/fetch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken(identity)}`,
    },
    body: JSON.stringify({ key }),
  });
  if (response.status === 401) {
    clearIdentity();
    window.dispatchEvent(new CustomEvent('finverse:sync-unauthed'));
    throw new SyncUnauthedError();
  }
  if (!response.ok) {
    throw new SyncHttpError(response.status, `Blob fetch failed (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
