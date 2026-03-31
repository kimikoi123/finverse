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

interface BalanceEntry {
  id: string;
  amount: number;
}

/**
 * Full breakdown: every individual debt between pairs.
 */
export function calculateFullDebts(balances: Balances): Debt[] {
  const debts: Debt[] = [];
  const debtors: BalanceEntry[] = [];
  const creditors: BalanceEntry[] = [];

  Object.entries(balances).forEach(([id, balance]) => {
    if (balance < -0.01) {
      debtors.push({ id, amount: -balance });
    } else if (balance > 0.01) {
      creditors.push({ id, amount: balance });
    }
  });

  // Generate all pairs
  debtors.forEach((debtor) => {
    creditors.forEach((creditor) => {
      // Proportion-based assignment
      const totalDebt = debtors.reduce((s, d) => s + d.amount, 0);
      const totalCredit = creditors.reduce((s, c) => s + c.amount, 0);
      if (totalDebt > 0 && totalCredit > 0) {
        const debtProportion = debtor.amount / totalDebt;
        const creditProportion = creditor.amount / totalCredit;
        const amount = Math.min(debtor.amount, creditor.amount) * Math.min(debtProportion + creditProportion, 1);
        if (amount > 0.01) {
          debts.push({
            from: debtor.id,
            to: creditor.id,
            amount: amount,
          });
        }
      }
    });
  });

  return debts;
}

/**
 * Simplified debts: minimize number of transactions using greedy algorithm.
 */
export function calculateSimplifiedDebts(balances: Balances): Debt[] {
  const debts: Debt[] = [];
  const debtors: BalanceEntry[] = [];
  const creditors: BalanceEntry[] = [];

  Object.entries(balances).forEach(([id, balance]) => {
    if (balance < -0.01) {
      debtors.push({ id, amount: -balance });
    } else if (balance > 0.01) {
      creditors.push({ id, amount: balance });
    }
  });

  // Sort descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i]!.amount, creditors[j]!.amount);
    if (amount > 0.01) {
      debts.push({
        from: debtors[i]!.id,
        to: creditors[j]!.id,
        amount,
      });
    }

    debtors[i]!.amount -= amount;
    creditors[j]!.amount -= amount;

    if (debtors[i]!.amount < 0.01) i++;
    if (creditors[j]!.amount < 0.01) j++;
  }

  return debts;
}
