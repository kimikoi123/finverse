import { useState, useEffect, useCallback } from 'react';
import type { Transaction } from '../types';
import {
  addTransaction as dbAddTransaction,
  addTransactionIfAbsent as dbAddTransactionIfAbsent,
  addTransactionsBulk as dbAddTransactionsBulk,
  getTransactions,
  deleteTransaction as dbDeleteTransaction,
  updateTransaction as dbUpdateTransaction,
} from '../db/storage';
import { useRefreshOnRemote } from './useRefreshOnRemote';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const txns = await getTransactions();
    setTransactions(txns);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useRefreshOnRemote(refresh);

  // `id` is optional: pass one only when the record has a natural id (a
  // confirmed bill); an existing row with that id is replaced.
  const addTransaction = useCallback(async (txn: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => {
    const newTxn: Transaction = {
      ...txn,
      id: txn.id ?? crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await dbAddTransaction(newTxn);
    setTransactions((prev) => [newTxn, ...prev.filter((t) => t.id !== newTxn.id)]);
    return newTxn;
  }, []);

  // Inserts an app-generated row (auto-posted bill) unless one with the same
  // id already exists. See addTransactionIfAbsent in storage.ts.
  const addTransactionIfAbsent = useCallback(async (txn: Omit<Transaction, 'createdAt'>) => {
    const newTxn: Transaction = { ...txn, createdAt: new Date().toISOString() };
    const added = await dbAddTransactionIfAbsent(newTxn);
    if (added) setTransactions((prev) => [newTxn, ...prev]);
    return added;
  }, []);

  const addTransactions = useCallback(async (txns: Omit<Transaction, 'id' | 'createdAt'>[]) => {
    if (txns.length === 0) return [];
    const now = new Date().toISOString();
    const newTxns: Transaction[] = txns.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      createdAt: now,
    }));
    await dbAddTransactionsBulk(newTxns);
    setTransactions((prev) => [...newTxns, ...prev]);
    return newTxns;
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    await dbDeleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const editTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    await dbUpdateTransaction(id, updates);
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  return { transactions, loading, addTransaction, addTransactionIfAbsent, addTransactions, removeTransaction, editTransaction };
}
