import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, LogOut, Smartphone } from 'lucide-react';
import { useSync } from '../../hooks/useSync';
import DevicesList from './DevicesList';
import PairEntryScreen from './PairEntryScreen';
import PairingModal from './PairingModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// The real "Sync & Devices" section used in Settings. Replaces the
// temporary SyncDevSection from Phase 3.
//
// Shape:
//   - No identity → offline-first message + two CTAs (Enable sync /
//     Pair with existing device).
//   - Has identity → status, vault id (short), pending count, devices
//     list with revoke, Pair new device, Sync now, Sign out.
export default function SyncSettingsSection() {
  const sync = useSync();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairEntryOpen, setPairEntryOpen] = useState(false);
  const [devicesRefreshKey, setDevicesRefreshKey] = useState(0);
  const [deviceCount, setDeviceCount] = useState(0);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  async function handleBootstrap() {
    setBusy(true);
    setLocalError(null);
    try {
      await sync.bootstrapNewVault(defaultDeviceLabel());
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncNow() {
    setBusy(true);
    setLocalError(null);
    try {
      await sync.syncNow();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = (() => {
    if (!sync.hasIdentity) return 'Offline only — sync is off';
    if (sync.uploadingReceipts > 0) {
      return `Uploading ${sync.uploadingReceipts} receipt${sync.uploadingReceipts === 1 ? '' : 's'}…`;
    }
    if (sync.status === 'syncing') return 'Syncing…';
    if (sync.status === 'offline') return 'Offline — will sync when online';
    if (sync.status === 'error') return 'Sync error';
    if (sync.lastSyncedAt) {
      const seconds = Math.max(0, Math.round((Date.now() - sync.lastSyncedAt) / 1000));
      if (seconds < 60) return `Synced ${seconds}s ago`;
      const minutes = Math.round(seconds / 60);
      if (minutes < 60) return `Synced ${minutes}m ago`;
      const hours = Math.round(minutes / 60);
      return `Synced ${hours}h ago`;
    }
    return 'Ready to sync';
  })();

  const StatusIcon =
    sync.hasIdentity && sync.status !== 'offline' && sync.status !== 'error' ? Cloud : CloudOff;
  const displayedError = localError ?? sync.error;

  return (
    <>
      <section>
        <h2 className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider mb-2 px-1">
          Sync &amp; Devices
        </h2>
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between py-3 px-4 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <StatusIcon size={16} className="text-text-secondary flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-text-primary truncate">{statusLabel}</div>
                {sync.vaultIdShort && (
                  <div className="text-[11px] text-text-secondary/60 mt-0.5 font-mono truncate">
                    Vault {sync.vaultIdShort}…
                    {sync.pendingCount > 0 ? ` · ${sync.pendingCount} pending` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {displayedError && (
            <div className="py-2 px-4 border-b border-border bg-danger/5">
              <p className="text-[11px] text-danger">{displayedError}</p>
            </div>
          )}

          {!sync.hasIdentity ? (
            <>
              <div className="py-2.5 px-4 border-b border-border bg-surface-light/40">
                <p className="text-[11px] text-text-secondary/80 leading-relaxed">
                  Finverse works fully offline. Sync is optional — enable it only if you want the
                  same data on more than one device. Your data stays on this device until you opt in.
                </p>
              </div>
              <button
                onClick={() => void handleBootstrap()}
                disabled={busy}
                className="flex justify-between items-center py-3 px-4 w-full text-left border-b border-border hover:bg-surface-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div>
                  <span className="text-sm text-text-primary">Enable sync on this device</span>
                  <p className="text-[11px] text-text-secondary/60 mt-0.5">
                    Creates a private vault. Your data uploads to Finverse cloud.
                  </p>
                </div>
                <Cloud size={16} className="text-primary" />
              </button>
              <button
                onClick={() => setPairEntryOpen(true)}
                className="flex justify-between items-center py-3 px-4 w-full text-left hover:bg-surface-light transition-colors"
              >
                <div>
                  <span className="text-sm text-text-primary">Pair with existing device</span>
                  <p className="text-[11px] text-text-secondary/60 mt-0.5">
                    Already have Finverse on another device? Join its vault.
                  </p>
                </div>
                <Smartphone size={16} className="text-text-secondary" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => void handleSyncNow()}
                disabled={busy || sync.status === 'syncing'}
                className="flex justify-between items-center py-3 px-4 border-b border-border w-full text-left hover:bg-surface-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-sm text-text-primary">Sync now</span>
                <RefreshCw
                  size={16}
                  className={`text-text-secondary ${sync.status === 'syncing' ? 'animate-spin' : ''}`}
                />
              </button>
              <button
                onClick={() => setPairingModalOpen(true)}
                className="flex justify-between items-center py-3 px-4 border-b border-border w-full text-left hover:bg-surface-light transition-colors"
              >
                <div>
                  <span className="text-sm text-text-primary">Pair new device</span>
                  <p className="text-[11px] text-text-secondary/60 mt-0.5">
                    Show a QR code for another device to join.
                  </p>
                </div>
                <Smartphone size={16} className="text-text-secondary" />
              </button>
              <div className="border-b border-border">
                <div className="px-4 py-2 text-[11px] text-text-secondary/60 uppercase tracking-wider font-semibold">
                  Paired devices
                </div>
                <DevicesList refreshKey={devicesRefreshKey} onCountChange={setDeviceCount} />
              </div>
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="flex justify-between items-center py-3 px-4 w-full text-left hover:bg-surface-light transition-colors"
              >
                <span className="text-sm text-danger">Sign out on this device</span>
                <LogOut size={16} className="text-danger" />
              </button>
            </>
          )}
        </div>
      </section>

      {pairingModalOpen && (
        <PairingModal
          initialDeviceCount={deviceCount}
          onClose={() => {
            setPairingModalOpen(false);
            // Bump refresh key so the devices list picks up the new arrival.
            setDevicesRefreshKey((k) => k + 1);
          }}
        />
      )}

      {pairEntryOpen && <PairEntryScreen onClose={() => setPairEntryOpen(false)} />}

      {showSignOutConfirm && (
        <ConfirmDialog
          title="Sign out on this device?"
          message="Your data stays here, and other paired devices are unaffected."
          confirmLabel="Sign out"
          onConfirm={() => {
            setShowSignOutConfirm(false);
            void sync.signOutLocal();
          }}
          onCancel={() => setShowSignOutConfirm(false)}
        />
      )}
    </>
  );
}

function defaultDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Device';
}
