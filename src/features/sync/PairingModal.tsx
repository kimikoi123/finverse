import { useCallback, useEffect, useRef, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { listDevices, pairInit, type PairInitResponse } from '../../sync/syncApi';
import QrCodeDisplay from './QrCodeDisplay';

interface Props {
  onClose: () => void;
  initialDeviceCount: number;
}

// Modal shown on the ALREADY-SIGNED-IN device when the user wants to add
// another device. Calls pair-init to mint a fresh token, renders the QR
// + 6-char code, and polls the devices list every 3 seconds to detect
// when the new device has joined. Auto-closes on detection.
export default function PairingModal({ onClose, initialDeviceCount }: Props) {
  const [token, setToken] = useState<PairInitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const initialCountRef = useRef(initialDeviceCount);

  const mintToken = useCallback(async () => {
    setError(null);
    setToken(null);
    try {
      const res = await pairInit();
      setToken(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start pairing');
    }
  }, []);

  // Mint a token on mount. Auto-refresh on expiry.
  useEffect(() => {
    void mintToken();
  }, [mintToken]);

  useEffect(() => {
    if (!token) return;
    const ms = new Date(token.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      void mintToken();
      return;
    }
    const handle = setTimeout(() => {
      void mintToken();
    }, ms);
    return () => clearTimeout(handle);
  }, [token, mintToken]);

  // Poll devices list to detect the new arrival.
  useEffect(() => {
    if (!token || joined) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { devices } = await listDevices();
        if (cancelled) return;
        if (devices.length > initialCountRef.current) {
          setJoined(true);
        }
      } catch {
        // Swallow — we'll retry on the next tick.
      }
    };
    const handle = setInterval(() => {
      void poll();
    }, 3000);
    // Also do an immediate poll so fast pairs are noticed quickly.
    void poll();
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [token, joined]);

  // Auto-close a moment after a join is detected so the user gets a brief
  // confirmation before the modal disappears.
  useEffect(() => {
    if (!joined) return;
    const handle = setTimeout(onClose, 1500);
    return () => clearTimeout(handle);
  }, [joined, onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-bg rounded-2xl border border-border shadow-xl overflow-y-auto max-h-[90dvh] overscroll-contain">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Pair new device</h2>
          <button
            onClick={onClose}
            aria-label="Close pair dialog"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-6 flex flex-col items-center gap-5">
          {joined ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-base font-semibold text-text-primary mb-1">Device joined!</h3>
              <p className="text-xs text-text-secondary">Your data will sync to the new device shortly.</p>
            </div>
          ) : token ? (
            <>
              <QrCodeDisplay value={token.token} size={200} label="Pair code QR" />
              <div className="w-full flex flex-col items-center gap-1">
                <p className="text-[11px] text-text-secondary uppercase tracking-wider">
                  Or type this code
                </p>
                <p className="text-2xl font-mono font-semibold text-text-primary tracking-widest">
                  {token.token}
                </p>
                <p className="text-[11px] text-text-secondary/70 mt-1">
                  Expires in 10 minutes · single use
                </p>
              </div>
              <p className="text-xs text-text-secondary text-center leading-relaxed max-w-xs">
                On your other device, open Finverse → Settings → Sync and choose
                <span className="text-text-primary"> Pair with existing device</span>.
              </p>
              <div className="w-full flex items-center justify-center gap-2 text-[11px] text-text-secondary/70">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Waiting for new device…
              </div>
            </>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-danger mb-3">{error}</p>
              <button
                onClick={() => void mintToken()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-sm text-text-primary hover:bg-surface-light transition-colors"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          ) : (
            <div className="py-12 text-xs text-text-secondary">Generating code…</div>
          )}
        </div>
      </div>
    </div>
  );
}
