import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Budget, Transaction } from '../types';
import {
  loadBudgets,
  addBudget as dbAddBudget,
  updateBudget as dbUpdateBudget,
  deleteBudget as dbDeleteBudget,
} from '../db/storage';
import { useRefreshOnRemote } from './useRefreshOnRemote';
import { deriveCommitmentState, planAutoConfirm } from '../utils/commitmentBudgets';

export interface BudgetWithSpending extends Budget {
  spent: number;
  remaining: number;
  percentage: number;

  // Only populated when isCommitment === true
  isPendingThisMonth?: boolean;
  nextDueDate?: string;
}

export function useBudgets(transactions: Transaction[]) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const b = await loadBudgets();
    setBudgets(b);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useRefreshOnRemote(refresh);

  const addBudget = useCallback(async (data: Omit<Budget, 'id' | 'createdAt'>) => {
    const budget: Budget = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await dbAddBudget(budget);
    setBudgets((prev) => [...prev, budget]);
    return budget;
  }, []);

  const editBudget = useCallback(async (id: string, updates: Partial<Budget>) => {
    await dbUpdateBudget(id, updates);
    setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }, []);

  const removeBudget = useCallback(async (id: string) => {
    await dbDeleteBudget(id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Calculate spending for each budget this month
  const budgetsWithSpending = useMemo((): BudgetWithSpending[] => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const nextMonth = month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, '0')}-01`;

    const thisMonthExpenses = transactions.filter(
      (t) => t.type === 'expense' && t.date >= monthStart && t.date < nextMonth
    );

    return budgets.map((budget) => {
      let spent = 0;
      if (budget.type === 'category' && budget.categoryKey) {
        spent = thisMonthExpenses
          .filter((t) => t.category === budget.categoryKey)
          .reduce((sum, t) => sum + t.amount, 0);
      } else if (budget.type === 'custom') {
        spent = thisMonthExpenses
          .filter((t) => t.budgetId === budget.id)
          .reduce((sum, t) => sum + t.amount, 0);
      }
      const remaining = Math.max(0, budget.monthlyLimit - spent);
      const percentage = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;

      const commitmentState = budget.isCommitment
        ? deriveCommitmentState(budget, now)
        : { isPendingThisMonth: false, nextDueDate: undefined };

      return {
        ...budget,
        spent,
        remaining,
        percentage,
        isPendingThisMonth: commitmentState.isPendingThisMonth,
        nextDueDate: commitmentState.nextDueDate,
      };
    });
  }, [budgets, transactions]);

  const runAutoConfirmOnce = useCallback(
    async (addTransactionIfAbsent: (txn: Omit<Transaction, 'createdAt'>) => Promise<boolean>) => {
      // Plan from the stored budgets, not React state: this runs after the
      // first sync pull, which may have just updated lastConfirmedMonth.
      const plan = planAutoConfirm(await loadBudgets(), new Date());
      if (plan.length === 0) return;
      for (const action of plan) {
        // Deterministic id + insert-if-absent: re-running a month (another
        // device posted it, or the app closed before lastConfirmedMonth was
        // saved) never creates a second copy of the bill.
        await addTransactionIfAbsent({ ...action.transaction, id: action.transactionId });
        await dbUpdateBudget(action.budgetId, { lastConfirmedMonth: action.newLastConfirmedMonth });
      }
      // Refresh local budget state to pick up lastConfirmedMonth stamps
      await refresh();
    },
    [refresh]
  );

  return { budgets: budgetsWithSpending, loading, addBudget, editBudget, removeBudget, runAutoConfirmOnce };
}
