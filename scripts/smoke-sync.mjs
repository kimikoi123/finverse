// End-to-end smoke test for the Phase 2 sync endpoints.
// Assumes `vercel dev --listen 3456` is running.
//
// Flow:
//   1. create vault       → {vaultId, deviceId, deviceKey} for device A
//   2. push one entity    → applied: 1
//   3. pull with since=0  → that entity comes back
//   4. pair-init          → {token}
//   5. pair-complete      → device B credentials
//   6. list devices       → 2 devices, B is current on B's request
//   7. revoke device B    → ok
//   8. device B push      → 401 (auth fails)

const BASE = process.env.BASE ?? 'http://localhost:3456';
const trail = [];

function log(step, data) {
  trail.push({ step, data });
  console.log(`\n[${step}]`, JSON.stringify(data, null, 2));
}

async function req(path, { method = 'POST', body, auth } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

function token({ vaultId, deviceId, deviceKey }) {
  return `${vaultId}.${deviceId}.${deviceKey}`;
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`\nASSERT FAILED: ${msg}`);
    console.error('Trail so far:');
    for (const t of trail) console.error(` - ${t.step}: ${JSON.stringify(t.data)}`);
    process.exit(1);
  }
}

const a = await req('/api/vault/create', { body: { deviceLabel: 'Smoke A' } });
log('1. create vault', a);
assert(a.status === 200 && a.body.vaultId, 'create vault failed');

const deviceA = a.body;
const now = Date.now();
const testEntityId = `smoke-${now}`;

const push1 = await req('/api/sync/push', {
  auth: token(deviceA),
  body: {
    changes: [{
      entityType: 'transaction',
      entityId: testEntityId,
      data: { amount: 1234, currency: 'PHP', description: 'smoke test' },
      updatedAt: now,
    }],
  },
});
log('2. push entity', push1);
assert(push1.status === 200 && push1.body.applied === 1, 'push did not apply');

const pull1 = await req('/api/sync/pull', {
  auth: token(deviceA),
  body: { since: 0 },
});
log('3. pull entity', pull1);
assert(pull1.status === 200, 'pull failed');
const found = pull1.body.entities.find((e) => e.entityId === testEntityId);
assert(found, 'pulled entities missing our push');
assert(found.data.amount === 1234, 'pulled data mismatch');

const pairInit = await req('/api/vault/pair-init', { auth: token(deviceA) });
log('4. pair-init', pairInit);
assert(pairInit.status === 200 && pairInit.body.token, 'pair-init failed');

const pairComplete = await req('/api/vault/pair-complete', {
  body: { token: pairInit.body.token, deviceLabel: 'Smoke B' },
});
log('5. pair-complete', pairComplete);
assert(pairComplete.status === 200 && pairComplete.body.deviceId, 'pair-complete failed');
assert(pairComplete.body.vaultId === deviceA.vaultId, 'pair-complete bound to wrong vault');

const deviceB = pairComplete.body;

const listB = await req('/api/vault/devices', { method: 'GET', auth: token(deviceB) });
log('6. devices (from B)', listB);
assert(listB.status === 200 && listB.body.devices.length === 2, 'devices list wrong length');
const bEntry = listB.body.devices.find((d) => d.id === deviceB.deviceId);
assert(bEntry && bEntry.isCurrent, 'device B not flagged as current');

const revoke = await req('/api/vault/devices', {
  auth: token(deviceA),
  body: { deviceId: deviceB.deviceId },
});
log('7. revoke device B', revoke);
assert(revoke.status === 200, 'revoke failed');

const pushAfterRevoke = await req('/api/sync/push', {
  auth: token(deviceB),
  body: { changes: [] },
});
log('8. push after revoke', pushAfterRevoke);
assert(pushAfterRevoke.status === 401, `expected 401, got ${pushAfterRevoke.status}`);

console.log('\n✅ All smoke tests passed.');
