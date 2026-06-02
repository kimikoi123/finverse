import { useEffect, useRef, useState } from 'react';

interface Props {
  onDetect: (value: string) => void;
  onError?: (message: string) => void;
  active: boolean;
}

// Live webcam QR scanner. Prefers the native BarcodeDetector API (Chrome,
// Edge, Android) and falls back to jsqr (works everywhere including iOS
// Safari). Both paths are dynamically imported so the main bundle isn't
// taxed for users who never open the pair flow.
//
// Emits `onDetect` exactly once per mount — the caller is expected to
// tear the scanner down (set `active=false` or unmount) after success.
export default function QrScanner({ onDetect, onError, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const detectedRef = useRef(false);

  // Keep the latest callbacks in refs so the camera effect can depend only on
  // `active`. Otherwise a new onDetect/onError identity (e.g. an inline arrow
  // from the parent) tears down and re-acquires getUserMedia every render,
  // causing a visible camera flicker on iOS Safari.
  const onDetectRef = useRef(onDetect);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onDetectRef.current = onDetect;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let rafId = 0;

    async function start() {
      setStatus('starting');
      setErrorMessage(null);
      detectedRef.current = false;

      if (!navigator.mediaDevices?.getUserMedia) {
        emitError('Camera is not available in this browser.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        emitError(
          name === 'NotAllowedError'
            ? 'Camera permission denied. Grant access or enter the code by hand.'
            : 'Could not start camera. Enter the code by hand.',
        );
        return;
      }

      if (stopped || !videoRef.current) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        emitError('Could not start video playback.');
        return;
      }

      setStatus('scanning');

      // Prefer native BarcodeDetector when available — skips the jsqr cost.
      const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (init: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
        const tick = async () => {
          if (stopped || detectedRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const code = codes[0]?.rawValue;
            if (code) {
              handleDetection(code);
              return;
            }
          } catch {
            // Swallow transient errors and keep looping.
          }
          rafId = requestAnimationFrame(tick);
        };
        tick();
        return;
      }

      // jsqr fallback — extract each frame from a hidden canvas and decode.
      const jsqrModule = await import('jsqr');
      const jsQR = jsqrModule.default;
      if (stopped) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const tick = () => {
        if (stopped || detectedRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code?.data) {
            handleDetection(code.data);
            return;
          }
        }
        rafId = requestAnimationFrame(tick);
      };
      tick();
    }

    function handleDetection(value: string) {
      if (detectedRef.current) return;
      detectedRef.current = true;
      onDetectRef.current(value);
    }

    function emitError(message: string) {
      setStatus('error');
      setErrorMessage(message);
      onErrorRef.current?.(message);
    }

    void start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  return (
    <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-surface border border-border">
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      {status !== 'scanning' && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="text-xs text-text-secondary">
            {status === 'starting' && 'Starting camera…'}
            {status === 'idle' && 'Camera off'}
            {status === 'error' && (errorMessage ?? 'Camera error')}
          </p>
        </div>
      )}
      {status === 'scanning' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-2/3 aspect-square border-2 border-primary/70 rounded-2xl" />
        </div>
      )}
    </div>
  );
}

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}
