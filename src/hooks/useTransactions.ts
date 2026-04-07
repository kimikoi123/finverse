import { useState, useEffect, useCallback } from 'react';
import type { Transaction } from '../types';
import {
  addTransaction as dbAddTransaction,
  getTransactions,
  deleteTransaction as dbDeleteTransaction,
  updateTransaction as dbUpdateTransaction,
} from '../db/storage';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransactions().then((txns) => {
      setTransactions(txns);
      setLoading(false);
    });
  }, []);

  const addTransaction = useCallback(async (txn: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTxn: Transaction = {
      ...txn,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await dbAddTransaction(newTxn);
    setTransactions((prev) => [newTxn, ...prev]);
    return newTxn;
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

  return { transactions, loading, addTransaction, removeTransaction, editTransaction };
}
