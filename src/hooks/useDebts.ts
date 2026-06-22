import { useState, useEffect, useCallback } from 'react';
import type { DebtEntry, DebtPayment } from '../types';
import {
  loadDebts,
  addDebt as dbAdd,
  updateDebt as dbUpdate,
  deleteDebt as dbDelete,
  loadDebtPayments,
  addDebtPayment as dbAddPayment,
  updateDebtPayment as dbUpdatePayment,
  deleteDebtPayment as dbDeletePayment,
} from '../db/storage';
import { useRefreshOnRemote } from './useRefreshOnRemote';

// Derive each debt's cached `paidAmount` from the sum of its non-deleted
// payments. Keeps the in-memory debts authoritative even if a remote sync
// wrote payments without recomputing the local debt row.
function withDerivedPaid(debts: DebtEntry[], payments: DebtPayment[]): DebtEntry[] {
  const totals = new Map<string, number>();
  for (const p of payments) {
    totals.set(p.debtId, (totals.get(p.debtId) ?? 0) + p.amount);
  }
  return debts.map((d) =>
    totals.has(d.id) ? { ...d, paidAmount: totals.get(d.id)! } : d,
  );
}

export function useDebts() {
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [d, p] = await Promise.all([loadDebts(), loadDebtPayments()]);
    setPayments(p);
    setDebts(withDerivedPaid(d, p));
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useRefreshOnRemote(refresh);

  // Re-derive a single debt's paidAmount from the given payment list.
  const applyDerived = useCallback((debtId: string, nextPayments: DebtPayment[]) => {
    const total = nextPayments
      .filter((p) => p.debtId === debtId)
      .reduce((sum, p) => sum + p.amount, 0);
    setDebts((prev) => prev.map((d) => (d.id === debtId ? { ...d, paidAmount: total } : d)));
  }, []);

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
    setPayments((prev) => prev.filter((p) => p.debtId !== id));
  }, []);

  const paymentsFor = useCallback(
    (debtId: string) => payments.filter((p) => p.debtId === debtId),
    [payments],
  );

  const addPayment = useCallback(async (debtId: string, amount: number, notes?: string) => {
    const payment: DebtPayment = {
      id: crypto.randomUUID(),
      debtId,
      amount,
      date: new Date().toISOString().slice(0, 10),
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await dbAddPayment(payment);
    const next = [...payments, payment];
    setPayments(next);
    applyDerived(debtId, next);
    return payment;
  }, [payments, applyDerived]);

  const editPayment = useCallback(
    async (id: string, updates: { amount?: number; date?: string; notes?: string }) => {
      const existing = payments.find((p) => p.id === id);
      if (!existing) return;
      const patch: Partial<DebtPayment> = { ...updates, editedAt: new Date().toISOString() };
      await dbUpdatePayment(id, patch);
      const next = payments.map((p) => (p.id === id ? { ...p, ...patch } : p));
      setPayments(next);
      applyDerived(existing.debtId, next);
    },
    [payments, applyDerived],
  );

  const removePayment = useCallback(async (id: string) => {
    const existing = payments.find((p) => p.id === id);
    if (!existing) return;
    await dbDeletePayment(id);
    const next = payments.filter((p) => p.id !== id);
    setPayments(next);
    applyDerived(existing.debtId, next);
  }, [payments, applyDerived]);

  return {
    debts,
    loading,
    addDebt,
    editDebt,
    removeDebt,
    paymentsFor,
    addPayment,
    editPayment,
    removePayment,
  };
}
