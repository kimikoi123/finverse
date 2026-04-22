// Pure helpers for commitment budgets. No DB, no React, no side effects.

import type { Budget, Transaction } from '../types';

export function clampDueDay(dueDay: number, year: number, month: number): number {
  // month is 1-12
  const lastDay = new Date(year, month, 0).getDate();
  return Math.min(Math.max(1, dueDay), lastDay);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function resolveDueDate(dueDay: number, year: number, month: number): string {
  const day = clampDueDay(dueDay, year, month);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function monthKey(date: Date | string): string {
  if (typeof date === 'string') {
    // Assume "YYYY-MM-DD"
    return date.slice(0, 7);
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export interface CommitmentState {
  isPendingThisMonth: boolean;
  nextDueDate?: string;
}

export function deriveCommitmentState(budget: Budget, today: Date): CommitmentState {
  if (!budget.isCommitment || budget.dueDay === undefined) {
    return { isPendingThisMonth: false };
  }

  const todayKey = monthKey(today);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;  // 1-12
  const thisMonthDueDate = resolveDueDate(budget.dueDay, year, month);
  const todayISO = `${year}-${pad2(month)}-${pad2(today.getDate())}`;
  const alreadyConfirmed = budget.lastConfirmedMonth === todayKey;

  let nextDueDate: string;
  if (alreadyConfirmed) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    nextDueDate = resolveDueDate(budget.dueDay, nextYear, nextMonth);
  } else {
    nextDueDate = thisMonthDueDate;
  }

  const isPendingThisMonth =
    budget.varies === true &&
    !alreadyConfirmed &&
    todayISO >= thisMonthDueDate;

  return { isPendingThisMonth, nextDueDate };
}

export interface AutoConfirmAction {
  budgetId: string;
  newLastConfirmedMonth: string;
  transaction: Omit<Transaction, 'id' | 'createdAt'>;
}

export function planAutoConfirm(budgets: Budget[], today: Date): AutoConfirmAction[] {
  const actions: AutoConfirmAction[] = [];
  const todayKey = monthKey(today);

  for (const b of budgets) {
    if (!b.isCommitment || b.varies !== false || b.dueDay === undefined) continue;

    // Determine starting month (first unconfirmed month, inclusive)
    let year: number;
    let month: number;  // 1-12
    if (b.lastConfirmedMonth) {
      const [ly, lm] = b.lastConfirmedMonth.split('-').map(Number);
      // Start at the month AFTER lastConfirmedMonth
      year = lm === 12 ? ly! + 1 : ly!;
      month = lm === 12 ? 1 : lm! + 1;
    } else {
      year = today.getFullYear();
      month = today.getMonth() + 1;
    }

    while (true) {
      const iterKey = `${year}-${pad2(month)}`;
      if (iterKey > todayKey) break;

      const dueDateISO = resolveDueDate(b.dueDay, year, month);
      const todayISO = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

      // For the current month, only post if due-day has arrived.
      // For past months (backfill), always post — the due-day is already in the past.
      if (iterKey === todayKey && todayISO < dueDateISO) break;

      actions.push({
        budgetId: b.id,
        newLastConfirmedMonth: iterKey,
        transaction: {
          type: 'expense',
          amount: b.monthlyLimit,
          currency: b.currency,
          category: b.type === 'category' && b.categoryKey ? b.categoryKey : 'bills',
          description: b.name,
          date: dueDateISO,
          budgetId: b.id,
          accountId: b.sourceAccountId,
        },
      });

      // Advance to next month
      if (month === 12) {
        year += 1;
        month = 1;
      } else {
        month += 1;
      }
    }
  }

  return actions;
}
