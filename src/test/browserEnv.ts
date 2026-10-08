// Browser stand-ins for tests that exercise Dexie storage and the sync engine
// in Node: an in-memory IndexedDB, localStorage, and the bits of window /
// navigator the sync code touches. Import before anything that imports the db.
import 'fake-indexeddb/auto';
import { db } from '../db/database';

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  },
});
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} },
});

const IDENTITY_KEY = 'finverse.identity';

// With an identity stored, writes are queued for push (cloud sync is opt-in).
export function enableSync(): void {
  store.set(IDENTITY_KEY, JSON.stringify({ vaultId: 'vault-1', deviceId: 'device-1', deviceKey: 'key-1' }));
}

export async function resetBrowserState(): Promise<void> {
  store.clear();
  await Promise.all(db.tables.map((table) => table.clear()));
}
