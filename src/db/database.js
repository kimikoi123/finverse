import Dexie from 'dexie';

const db = new Dexie('splittrip');

db.version(1).stores({
  trips: 'id',
  meta: 'key',
  rateCache: 'key',
});

export { db };
