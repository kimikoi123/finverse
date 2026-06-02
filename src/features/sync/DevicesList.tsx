import { useCallback, useEffect, useState } from 'react';
import { Smartphone, Laptop, Monitor, Trash2 } from 'lucide-react';
import { listDevices, revokeDevice, type DeviceSummary } from '../../sync/syncApi';

interface Props {
  refreshKey?: number;
  onCountChange?: (count: number) => void;
}

export default function DevicesList({ refreshKey = 0, onCountChange }: Props) {
  const [devices, setDevices] = useState<DeviceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { devices: fetched } = await listDevices();
      setDevices(fetched);
      onCountChange?.(fetched.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load devices');
    }
  }, [onCountChange]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const handleRevoke = async (device: DeviceSummary) => {
    if (device.isCurrent) {
      if (!confirm('This is the current device. Revoking it signs you out of sync here. Continue?')) return;
    } else {
      if (!confirm(`Revoke ${device.label ?? 'this device'}? It won't be able to sync anymore.`)) return;
    }
    setRevokingId(device.id);
    try {
      await revokeDevice(device.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revoke failed');
    } finally {
      setRevokingId(null);
    }
  };

  if (error) {
    return (
      <div className="py-3 px-4 text-[11px] text-danger">{error}</div>
    );
  }

  if (devices === null) {
    return <div className="py-3 px-4 text-[11px] text-text-secondary/60">Loading devices…</div>;
  }

  if (devices.length === 0) {
    return <div className="py-3 px-4 text-[11px] text-text-secondary/60">No devices found.</div>;
  }

  return (
    <ul className="divide-y divide-border">
      {devices.map((d) => (
        <li key={d.id} className="flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <DeviceIcon label={d.label} />
            <div className="min-w-0">
              <div className="text-sm text-text-primary truncate">
                {d.label ?? 'Unnamed device'}
                {d.isCurrent && (
                  <span className="ml-2 text-[10px] font-semibold text-primary uppercase tracking-wider">
                    This device
                  </span>
                )}
              </div>
              <div className="text-[11px] text-text-secondary/60 mt-0.5">
                Added {formatDate(d.createdAt)} · last seen {formatRelative(d.lastSeenAt)}
              </div>
            </div>
          </div>
          <button
            onClick={() => void handleRevoke(d)}
            disabled={revokingId === d.id}
            aria-label={`Revoke ${d.label ?? 'device'}`}
            className="-my-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-secondary/60 hover:text-danger hover:bg-surface-light transition-colors disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function DeviceIcon({ label }: { label: string | null }) {
  const lower = (label ?? '').toLowerCase();
  if (lower.includes('iphone') || lower.includes('android') || lower.includes('mobile')) {
    return <Smartphone size={16} className="text-text-secondary" />;
  }
  if (lower.includes('mac') || lower.includes('linux') || lower.includes('win') || lower.includes('laptop')) {
    return <Laptop size={16} className="text-text-secondary" />;
  }
  return <Monitor size={16} className="text-text-secondary" />;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
