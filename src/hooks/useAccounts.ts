import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Account } from '../types';
import {
  loadAccounts,
  addAccount as dbAddAccount,
  updateAccount as dbUpdateAccount,
  deleteAccount as dbDeleteAccount,
} from '../db/storage';

export const ACCOUNT_COLORS = [
  '#2d6a4f', '#0891b2', '#65a30d', '#2563eb',
  '#ea580c', '#9333ea', '#475569', '#e11d48',
];

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts().then((accs) => {
      setAccounts(accs);
      setLoading(false);
    });
  }, []);

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

  return { accounts, loading, addAccount, editAccount, removeAccount, netWorth };
}
