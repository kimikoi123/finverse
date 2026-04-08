import { useState, useCallback, useEffect } from 'react';
import { setPrivacyMode } from '../utils/currencies';

export function usePrivacyMode() {
  const [privacyMode, setPrivacyModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('privacy-mode') === 'true';
    } catch {
      return false;
    }
  });

  // Sync module-level flag on mount
  useEffect(() => {
    setPrivacyMode(privacyMode);
  }, [privacyMode]);

  const togglePrivacyMode = useCallback(() => {
    setPrivacyModeState((prev) => {
      const next = !prev;
      localStorage.setItem('privacy-mode', String(next));
      setPrivacyMode(next);
      return next;
    });
  }, []);

  return { privacyMode, togglePrivacyMode };
}
