import { useState, useEffect, useCallback } from 'react';
import type { UserPreferences } from '../types';
import { loadUserPreferences, saveUserPreferences } from '../db/storage';

const DEFAULT_PREFERENCES: UserPreferences = {
  id: 'default',
  displayName: '',
  defaultCurrency: 'PHP',
  theme: 'system',
  onboardingComplete: false,
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserPreferences().then((prefs) => {
      if (prefs) setPreferences(prefs);
      setLoading(false);
    });
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...updates, id: 'default' } as UserPreferences;
    setPreferences(updated);
    await saveUserPreferences(updated);
    return updated;
  }, [preferences]);

  return { preferences, loading, updatePreferences };
}
