import { describe, it, expect } from 'vitest';
import { estimateMonthlyBaseline } from './baseline';
import type { Transaction, Budget } from '../types';

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'expense',
    amount: 100,
    currency: 'PHP',
    category: 'food',
    description: '',
    date: '2026-03-15',
    createdAt: '2026-03-15T00:00:00.000Z',
    ...overrides,
  };
}

function makeCommitment(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    name: 'Netflix',
    type: 'custom',
    monthlyLimit: 549,
    currency: 'PHP',
    icon: 'N',
    color: '#000',
    createdAt: '2026-01-01T00:00:00.000Z',
    isCommitment: true,
    dueDay: 15,
    varies: false,
    ...overrides,
  };
}

describe('estimateMonthlyBaseline', () => {
  const today = new Date(2026, 3, 22); // Apr 22
  const baseParams = {
    today,
    defaultCurrency: 'PHP',
    exchangeRates: null,
  };

  it('returns zero for empty history', () => {
    const result = estimateMonthlyBaseline({
      ...baseParams,
      transactions: [],
      budgets: [],
    });
    expect(result.totalMonthly).toBe(0);
    expect(result.byCategory).toEqual({});
    expect(result.monthsUsed).toBe(0);
  });

  it('averages across observed months per category', () => {
    const result = estimateMonthlyBaseline({
      ...baseParams,
      transactions: [
        makeTxn({ id: 't1', amount: 1000, category: 'food', date: '2026-02-10' }),
        makeTxn({ id: 't2', amount: 1500, category: 'food', date: '2026-03-10' }),
        makeTxn({ id: 't3', amount: 500, category: 'food', date: '2026-04-01' }),
      ],
      budgets: [],
    });
    // food: 3 months, total 3000, avg 1000
    expect(result.byCategory.food).toBe(1000);
    expect(result.totalMonthly).toBe(1000);
    expect(result.monthsUsed).toBe(3);
  });

  it('uses per-category month count, not global', () => {
    const result = estimateMonthlyBaseline({
      ...baseParams,
      transactions: [
        // food: 2 months (Feb, Apr)
        makeTxn({ id: 't1', amount: 1000, category: 'food', date: '2026-02-10' }),
        makeTxn({ id: 't2', amount: 1000, category: 'food', date: '2026-04-01' }),
        // transport: 1 month (Mar)
        makeTxn({ id: 't3', amount: 300, category: 'transport', date: '2026-03-15' }),
      ],
      budgets: [],
    });
    expect(result.byCategory.food).toBe(1000); // 2000 / 2
    expect(result.byCategory.transport).toBe(300); // 300 / 1
    expect(result.totalMonthly).toBe(1300);
    expect(result.monthsUsed).toBe(3); // Feb, Mar, Apr all seen globally
  });

  it('excludes recurring transactions', () => {
    const result = estimateMonthlyBaseline({
      ...baseParams,
      transactions: [
        makeTxn({ id: 't1', amount: 500, isRecurring: true, date: '2026-03-10' }),
        makeTxn({ id: 't2', amount: 200, date: '2026-03-10' }),
      ],
      budgets: [],
    });
    expect(result.totalMonthly).toBe(200);
  });

  it('excludes transactions linked to commitment budgets', () => {
    const result = estimateMonthlyBaseline({
      ...baseParams,
      transactions: [
        makeTxn({ id: 't1', amount: 549, budgetId: 'b1', date: '2026-03-15' }),
        makeTxn({ id: 't2', amount: 300, date: '2026-03-15' }),
      ],
      budgets: [makeCommitment({ id: 'b1' })],
    });
    expect(result.totalMonthly).toBe(300);
  });

  it('includes transactions linked to non-commitment budgets', () => {
    const result = estimateMonthlyBaseline({
      ...baseParams,
      transactions: [makeTxn({ amount: 400, budgetId: 'b2', date: '2026-03-10' })],
      budgets: [makeCommitment({ id: 'b2', isCommitment: false })],
    });
    expect(result.totalMonthly).toBe(400);
  });

  it('excludes income and same-day/future transactions', () => {
    const result = estimateMonthlyBaseline({
      ...baseParams,
      transactions: [
        makeTxn({ id: 't1', type: 'income', amount: 10000, date: '2026-03-10' }),
        makeTxn({ id: 't2', amount: 300, date: '2026-04-22' }), // today → excluded
        makeTxn({ id: 't3', amount: 500, date: '2026-05-01' }), // future → excluded
        makeTxn({ id: 't4', amount: 200, date: '2026-03-10' }),
      ],
      budgets: [],
    });
    expect(result.totalMonthly).toBe(200);
  });

  it('honors monthsLookback window', () => {
    const result = estimateMonthlyBaseline({
      ...baseParams,
      monthsLookback: 1,
      transactions: [
        makeTxn({ id: 't1', amount: 500, date: '2026-02-10' }), // outside 1-month lookback
        makeTxn({ id: 't2', amount: 300, date: '2026-04-01' }),
      ],
      budgets: [],
    });
    expect(result.totalMonthly).toBe(300);
  });
});
