import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Account, AccountGradient } from '../types';
import {
  loadAccounts,
  addAccount as dbAddAccount,
  updateAccount as dbUpdateAccount,
  deleteAccount as dbDeleteAccount,
  batchUpdateSortOrder,
} from '../db/storage';
import { useRefreshOnRemote } from './useRefreshOnRemote';

// Legacy solid palette — retained for backwards compatibility with existing
// accounts whose `color` field stores a single hex. Card rendering now prefers
// `gradient` via buildCardBackground().
export const ACCOUNT_COLORS = [
  '#2d6a4f', '#0891b2', '#65a30d', '#2563eb',
  '#ea580c', '#9333ea', '#475569', '#e11d48',
];

export interface GradientPreset extends AccountGradient {
  label: string;
}

// Curated two-stop diagonal gradients. All use 135° for a consistent
// "light hitting the top-left" feel that reads as premium card stock.
export const ACCOUNT_GRADIENTS: GradientPreset[] = [
  // Jewel tones
  { id: 'emerald',   label: 'Emerald',   from: '#064e3b', to: '#10b981', angle: 135 },
  { id: 'sapphire',  label: 'Sapphire',  from: '#1e3a8a', to: '#3b82f6', angle: 135 },
  { id: 'amethyst',  label: 'Amethyst',  from: '#4c1d95', to: '#a855f7', angle: 135 },
  { id: 'ruby',      label: 'Ruby',      from: '#7f1d1d', to: '#ef4444', angle: 135 },
  // Warm tones
  { id: 'sunset',    label: 'Sunset',    from: '#7c2d12', to: '#f97316', angle: 135 },
  { id: 'peach',     label: 'Peach',     from: '#9a3412', to: '#fb923c', angle: 135 },
  { id: 'coral',     label: 'Coral',     from: '#9f1239', to: '#fb7185', angle: 135 },
  { id: 'gold',      label: 'Gold',      from: '#713f12', to: '#eab308', angle: 135 },
  // Cool tones
  { id: 'midnight',  label: 'Midnight',  from: '#0f172a', to: '#334155', angle: 135 },
  { id: 'slate',     label: 'Slate',     from: '#1e293b', to: '#64748b', angle: 135 },
  { id: 'ocean',     label: 'Ocean',     from: '#164e63', to: '#06b6d4', angle: 135 },
  { id: 'mint',      label: 'Mint',      from: '#065f46', to: '#34d399', angle: 135 },
  // Extended
  { id: 'rosegold',  label: 'Rose Gold', from: '#881337', to: '#fda4af', angle: 135 },
  { id: 'indigo',    label: 'Indigo',    from: '#312e81', to: '#6366f1', angle: 135 },
  { id: 'teal',      label: 'Teal',      from: '#134e4a', to: '#14b8a6', angle: 135 },
  { id: 'forest',    label: 'Forest',    from: '#14532d', to: '#22c55e', angle: 135 },
];

export const DEFAULT_GRADIENT: GradientPreset = ACCOUNT_GRADIENTS[0]!;

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const accs = await loadAccounts();
    setAccounts(accs);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useRefreshOnRemote(refresh);

  const addAccount = useCallback(async (data: Omit<Account, 'id' | 'createdAt' | 'sortOrder'>) => {
    const account: Account = {
      ...data,
      id: crypto.randomUUID(),
      sortOrder: accounts.length,
      createdAt: new Date().toISOString(),
    };
    await dbAddAccount(account);
    setAccounts((prev) => [...prev, account]);
    return account;
  }, [accounts.length]);

  const editAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    await dbUpdateAccount(id, updates);
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const removeAccount = useCallback(async (id: string) => {
    await dbDeleteAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const reorderAccounts = useCallback(async (activeId: string, overId: string) => {
    const oldIndex = accounts.findIndex((a) => a.id === activeId);
    const newIndex = accounts.findIndex((a) => a.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = [...accounts];
    const [moved] = reordered.splice(oldIndex, 1);
    if (!moved) return;
    reordered.splice(newIndex, 0, moved);

    const updated = reordered.map((a, i) => ({ ...a, sortOrder: i }));
    setAccounts(updated);

    await batchUpdateSortOrder(updated.map((a) => ({ id: a.id, sortOrder: a.sortOrder })));
  }, [accounts]);

  const netWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      if (acc.type === 'credit') {
        return sum - acc.balance; // credit balance is amount owed
      }
      if (acc.type === 'stocks' || acc.type === 'crypto') {
        return sum + (acc.units ?? 0) * (acc.pricePerUnit ?? 0);
      }
      return sum + acc.balance;
    }, 0);
  }, [accounts]);

  return { accounts, loading, addAccount, editAccount, removeAccount, reorderAccounts, netWorth };
}
