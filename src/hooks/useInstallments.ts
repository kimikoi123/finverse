import { useState, useEffect, useCallback } from 'react';
import type { Installment } from '../types';
import { loadInstallments, addInstallment as dbAdd, updateInstallment as dbUpdate, deleteInstallment as dbDelete } from '../db/storage';

export function useInstallments() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadInstallments().then((i) => { setInstallments(i); setLoading(false); }); }, []);

  const addInstallment = useCallback(async (data: Omit<Installment, 'id' | 'createdAt'>) => {
    const inst: Installment = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    await dbAdd(inst);
    setInstallments((prev) => [...prev, inst]);
    return inst;
  }, []);

  const editInstallment = useCallback(async (id: string, updates: Partial<Installment>) => {
    await dbUpdate(id, updates);
    setInstallments((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }, []);

  const removeInstallment = useCallback(async (id: string) => {
    await dbDelete(id);
    setInstallments((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { installments, loading, addInstallment, editInstallment, removeInstallment };
}
