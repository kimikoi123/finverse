import { useState, useEffect, useCallback } from 'react';
import type { DebtEntry } from '../types';
import { loadDebts, addDebt as dbAdd, updateDebt as dbUpdate, deleteDebt as dbDelete } from '../db/storage';

export function useDebts() {
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDebts().then((d) => { setDebts(d); setLoading(false); }); }, []);

  const addDebt = useCallback(async (data: Omit<DebtEntry, 'id' | 'createdAt'>) => {
    const debt: DebtEntry = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    await dbAdd(debt);
    setDebts((prev) => [...prev, debt]);
    return debt;
  }, []);

  const editDebt = useCallback(async (id: string, updates: Partial<DebtEntry>) => {
    await dbUpdate(id, updates);
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  }, []);

  const removeDebt = useCallback(async (id: string) => {
    await dbDelete(id);
    setDebts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { debts, loading, addDebt, editDebt, removeDebt };
}
