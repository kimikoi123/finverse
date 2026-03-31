import type { Expense, Member, ExchangeRates, Balances, Debt } from '../types';
import { convertToBase } from './currencies';

/**
 * Calculate net balances for all members.
 * Positive = owed money, Negative = owes money.
 */
export function calculateBalances(expenses: Expense[], members: Member[], baseCurrency: string, rates: ExchangeRates): Balances {
  const balances: Balances = {};
  members.forEach((m) => (balances[m.id] = 0));

  expenses.forEach((expense) => {
    const amountInBase = convertToBase(expense.amount, expense.currency, baseCurrency, rates);
    const payer = expense.paidBy;

    // Payer gets credit
    if (balances[payer] !== undefined) {
      balances[payer] += amountInBase;
    }

    // Each participant gets debited
    if (expense.splitType === 'equal') {
      const participants = expense.participants;
      const share = amountInBase / participants.length;
      participants.forEach((pid) => {
        if (balances[pid] !== undefined) {
          balances[pid] -= share;
        }
      });
    } else if (expense.splitType === 'custom') {
      const totalCustom = Object.values(expense.customAmounts ?? {}).reduce((s, v) => s + v, 0);
      if (totalCustom > 0) {
        Object.entries(expense.customAmounts ?? {}).forEach(([pid, customAmt]) => {
          const share = (customAmt / totalCustom) * amountInBase;
          if (balances[pid] !== undefined) {
            balances[pid] -= share;
          }
        });
      }
    }

    // Apply advance payments: member who paid in advance gets credit, payer's credit is reduced
    if (expense.advancePayments) {
      Object.entries(expense.advancePayments).forEach(([pid, advanceAmt]) => {
        if (advanceAmt > 0) {
          const advanceInBase = convertToBase(advanceAmt, expense.currency, baseCurrency, rates);
          if (balances[pid] !== undefined) {
            balances[pid] += advanceInBase;
          }
          if (balances[payer] !== undefined) {
            balances[payer] -= advanceInBase;
          }
        }
      });
    }
  });

  return balances;
}

/**
 * Calculate direct per-payer debts.
 * Each participant owes the person who actually paid, with per-pair netting.
 */
export function calculateDirectDebts(expenses: Expense[], _members: Member[], baseCurrency: string, rates: ExchangeRates): Debt[] {
  const debtMap = new Map<string, number>();

  const addDebt = (from: string, to: string, amount: number) => {
    if (from === to || amount === 0) return;
    const key = `${from}:${to}`;
    debtMap.set(key, (debtMap.get(key) ?? 0) + amount);
  };

  expenses.forEach((expense) => {
    const amountInBase = convertToBase(expense.amount, expense.currency, baseCurrency, rates);
    if (amountInBase === 0) return;
    const payer = expense.paidBy;

    if (expense.splitType === 'equal') {
      const share = amountInBase / expense.participants.length;
      expense.participants.forEach((pid) => {
        addDebt(pid, payer, share);
      });
    } else if (expense.splitType === 'custom') {
      const totalCustom = Object.values(expense.customAmounts ?? {}).reduce((s, v) => s + v, 0);
      if (totalCustom > 0) {
        Object.entries(expense.customAmounts ?? {}).forEach(([pid, customAmt]) => {
          const share = (customAmt / totalCustom) * amountInBase;
          addDebt(pid, payer, share);
        });
      }
    }

    // Advance payments reduce the participant's debt to the payer
    if (expense.advancePayments) {
      Object.entries(expense.advancePayments).forEach(([pid, advanceAmt]) => {
        if (advanceAmt > 0) {
          const advanceInBase = convertToBase(advanceAmt, expense.currency, baseCurrency, rates);
          // The advancer already paid part, so reduce their debt to payer
          // (adding debt in reverse direction for netting)
          addDebt(payer, pid, advanceInBase);
        }
      });
    }
  });

  // Per-pair netting
  const debts: Debt[] = [];
  const processed = new Set<string>();

  debtMap.forEach((_, key) => {
    const [a, b] = key.split(':');
    if (!a || !b) return;
    const pairKey = [a, b].sort().join(':');
    if (processed.has(pairKey)) return;
    processed.add(pairKey);

    const aToB = debtMap.get(`${a}:${b}`) ?? 0;
    const bToA = debtMap.get(`${b}:${a}`) ?? 0;
    const net = aToB - bToA;

    if (net > 0.01) {
      debts.push({ from: a, to: b, amount: Math.round(net * 100) / 100 });
    } else if (net < -0.01) {
      debts.push({ from: b, to: a, amount: Math.round(-net * 100) / 100 });
    }
  });

  return debts;
}
