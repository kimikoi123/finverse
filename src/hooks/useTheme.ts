import { useState, useEffect, useCallback } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    try {
      // Tolerate both the raw value this hook writes ("dark") and the legacy
      // JSON-quoted form ('"dark"') that older builds persisted — the boot
      // script in index.html already accepts both. Without this, a quoted
      // value silently falls through to 'system' and the theme resets.
      const raw = localStorage.getItem('user-theme');
      const stored = raw?.replace(/^"|"$/g, '');
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {}
    return 'system';
  });

  const getResolved = useCallback((pref: ThemePreference): ResolvedTheme => {
    if (pref === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return pref;
  }, []);

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => getResolved(theme));

  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setResolvedTheme(resolved);
  }, []);

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    localStorage.setItem('user-theme', newTheme);
    applyTheme(getResolved(newTheme));
  }, [applyTheme, getResolved]);

  // Apply on mount and listen for system changes
  useEffect(() => {
    applyTheme(getResolved(theme));

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme, applyTheme, getResolved]);

  return { theme, setTheme, resolvedTheme };
}
