import { db } from '../db/database';
import { hasIdentity } from './deviceIdentity';
import { uploadReceiptBlob } from './syncApi';

// Drains any receipts that are still local-only (have `localBase64` but
// no `blobKey`) to Vercel Blob. Called from inside the sync engine as
// part of every sync cycle, BEFORE runPush so the freshly-minted
// `blobKey`/`blobUrl` metadata goes out in the same push.
//
// Concurrency is deliberately small (3) so a first-sync with a huge
// backlog doesn't hammer the connection.

const UPLOAD_CONCURRENCY = 3;

interface PendingRow {
  expenseId: string;
  localBase64: string;
}

export async function drainReceiptUploads(): Promise<number> {
  if (!hasIdentity()) return 0;

  const all = await db.receiptPhotos.toArray();
  const pending: PendingRow[] = [];
  for (const row of all) {
    if (row.deletedAt) continue;
    if (row.blobKey) continue;
    if (!row.localBase64) continue;
    pending.push({ expenseId: row.expenseId, localBase64: row.localBase64 });
  }
  if (pending.length === 0) return 0;

  let uploaded = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < pending.length) {
      const index = cursor++;
      const item = pending[index];
      if (!item) break;
      try {
        const result = await uploadReceiptBlob({
          base64: item.localBase64,
          expenseId: item.expenseId,
        });
        const now = Date.now();
        await db.receiptPhotos.update(item.expenseId, {
          blobKey: result.key,
          blobUrl: result.url,
          updatedAt: now,
        });
        // Enqueue for sync push so peers learn the URL. Direct put
        // avoids the storage.ts helper circular import; the sync engine
        // picks this up at the end of the current cycle.
        await db.pendingPushes.put({
          id: `receipt:${item.expenseId}`,
          entityType: 'receipt',
          entityId: item.expenseId,
          enqueuedAt: now,
        });
        uploaded++;
      } catch (err) {
        console.warn(`Receipt upload failed for ${item.expenseId}:`, err);
        // Leave the row unchanged; next sync cycle will retry.
      }
    }
  }

  const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, pending.length) }, () => worker());
  await Promise.all(workers);
  return uploaded;
}
