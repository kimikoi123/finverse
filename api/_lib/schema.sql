-- Finverse sync schema — apply once against the Neon database.
-- Run either via the Neon SQL editor (paste this file) or via:
--   node --env-file=.env.local scripts/migrate.mjs
-- Safe to re-run: every CREATE uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS vaults (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_devices (
  id UUID PRIMARY KEY,
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  device_key_hash TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS vault_devices_active_idx
  ON vault_devices(vault_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS entities (
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT,
  PRIMARY KEY (vault_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS entities_delta_idx
  ON entities(vault_id, updated_at);

CREATE TABLE IF NOT EXISTS pair_tokens (
  token TEXT PRIMARY KEY,
  vault_id UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pair_tokens_expires_idx
  ON pair_tokens(expires_at) WHERE used_at IS NULL;
