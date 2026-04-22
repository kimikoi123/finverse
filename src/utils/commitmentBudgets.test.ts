import { describe, it, expect } from 'vitest';
import { clampDueDay, resolveDueDate, monthKey, deriveCommitmentState, planAutoConfirm } from './commitmentBudgets';
import type { Budget } from '../types';

describe('clampDueDay', () => {
  it('returns dueDay unchanged when within the month', () => {
    expect(clampDueDay(15, 2026, 4)).toBe(15);  // April has 30 days
    expect(clampDueDay(1, 2026, 4)).toBe(1);
    expect(clampDueDay(30, 2026, 4)).toBe(30);
  });

  it('clamps to last day of short months', () => {
    expect(clampDueDay(31, 2026, 2)).toBe(28);  // Feb 2026 non-leap
    expect(clampDueDay(31, 2024, 2)).toBe(29);  // Feb 2024 leap
    expect(clampDueDay(31, 2026, 4)).toBe(30);  // April
    expect(clampDueDay(31, 2026, 6)).toBe(30);  // June
  });
});

describe('resolveDueDate', () => {
  it('returns ISO date for a given month and dueDay', () => {
    expect(resolveDueDate(15, 2026, 4)).toBe('2026-04-15');
    expect(resolveDueDate(1, 2026, 1)).toBe('2026-01-01');
  });

  it('clamps short months', () => {
    expect(resolveDueDate(31, 2026, 2)).toBe('2026-02-28');
    expect(resolveDueDate(31, 2024, 2)).toBe('2024-02-29');
  });
});

describe('monthKey', () => {
  it('formats Date objects as YYYY-MM', () => {
    expect(monthKey(new Date(2026, 3, 16))).toBe('2026-04');  // April = month 3
    expect(monthKey(new Date(2026, 0, 1))).toBe('2026-01');
    expect(monthKey(new Date(2026, 11, 31))).toBe('2026-12');
  });

  it('formats ISO date strings as YYYY-MM', () => {
    expect(monthKey('2026-04-16')).toBe('2026-04');
    expect(monthKey('2026-12-01')).toBe('2026-12');
  });
});

function makeCommitment(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    name: 'Meralco',
    type: 'custom',
    monthlyLimit: 2800,
    currency: 'PHP',
    icon: 'M',
    color: '#f7941d',
    preset: 'meralco',
    createdAt: '2026-01-01T00:00:00.000Z',
    isCommitment: true,
    dueDay: 15,
    varies: true,
    ...overrides,
  };
}

describe('deriveCommitmentState', () => {
  it('returns null fields for non-commitment budgets', () => {
    const flexible = makeCommitment({ isCommitment: false });
    const today = new Date(2026, 3, 16);
    const state = deriveCommitmentState(flexible, today);
    expect(state.isPendingThisMonth).toBe(false);
    expect(state.nextDueDate).toBeUndefined();
  });

  it('is pending when varies=true, due-day passed, and not confirmed this month', () => {
    const b = makeCommitment({ dueDay: 15, varies: true });
    const today = new Date(2026, 3, 16);  // Apr 16
    const state = deriveCommitmentState(b, today);
    expect(state.isPendingThisMonth).toBe(true);
    expect(state.nextDueDate).toBe('2026-04-15');
  });

  it('is not pending before due-day', () => {
    const b = makeCommitment({ dueDay: 15, varies: true });
    const today = new Date(2026, 3, 10);  // Apr 10
    const state = deriveCommitmentState(b, today);
    expect(state.isPendingThisMonth).toBe(false);
    expect(state.nextDueDate).toBe('2026-04-15');
  });

  it('is not pending when varies=false (auto-confirm path)', () => {
    const b = makeCommitment({ dueDay: 15, varies: false });
    const today = new Date(2026, 3, 20);
    const state = deriveCommitmentState(b, today);
    expect(state.isPendingThisMonth).toBe(false);
  });

  it('is not pending when already confirmed this month', () => {
    const b = makeCommitment({ dueDay: 15, varies: true, lastConfirmedMonth: '2026-04' });
    const today = new Date(2026, 3, 20);
    const state = deriveCommitmentState(b, today);
    expect(state.isPendingThisMonth).toBe(false);
    expect(state.nextDueDate).toBe('2026-05-15');  // next month's due-day
  });

  it('points nextDueDate to next month after confirmation, clamping short months', () => {
    const b = makeCommitment({ dueDay: 31, varies: false, lastConfirmedMonth: '2026-01' });
    const today = new Date(2026, 0, 31);
    const state = deriveCommitmentState(b, today);
    expect(state.nextDueDate).toBe('2026-02-28');
  });
});

describe('planAutoConfirm', () => {
  it('returns no actions for non-commitment budgets', () => {
    const flexible = makeCommitment({ isCommitment: false });
    const plan = planAutoConfirm([flexible], new Date(2026, 3, 20));
    expect(plan).toEqual([]);
  });

  it('returns no actions for varies=true (user must confirm)', () => {
    const b = makeCommitment({ varies: true });
    const plan = planAutoConfirm([b], new Date(2026, 3, 20));
    expect(plan).toEqual([]);
  });

  it('returns no actions before due-day', () => {
    const b = makeCommitment({ varies: false, dueDay: 20 });
    const plan = planAutoConfirm([b], new Date(2026, 3, 10));
    expect(plan).toEqual([]);
  });

  it('plans a single auto-confirm when due-day passed and not confirmed', () => {
    const b = makeCommitment({ id: 'b1', name: 'Netflix', monthlyLimit: 549, varies: false, dueDay: 15 });
    const plan = planAutoConfirm([b], new Date(2026, 3, 20));
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({
      budgetId: 'b1',
      newLastConfirmedMonth: '2026-04',
      transaction: {
        type: 'expense',
        amount: 549,
        currency: 'PHP',
        date: '2026-04-15',
        category: 'bills',
        description: 'Netflix',
        budgetId: 'b1',
      },
    });
  });

  it('backfills multiple months when lastConfirmedMonth is old', () => {
    const b = makeCommitment({
      id: 'b1',
      name: 'Netflix',
      monthlyLimit: 549,
      varies: false,
      dueDay: 15,
      lastConfirmedMonth: '2026-01',
    });
    const plan = planAutoConfirm([b], new Date(2026, 3, 20));  // April 20
    expect(plan.map((a) => a.transaction.date)).toEqual([
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ]);
    expect(plan[plan.length - 1]!.newLastConfirmedMonth).toBe('2026-04');
  });

  it('does not re-plan months already confirmed', () => {
    const b = makeCommitment({ varies: false, dueDay: 15, lastConfirmedMonth: '2026-04' });
    const plan = planAutoConfirm([b], new Date(2026, 3, 20));
    expect(plan).toEqual([]);
  });

  it('includes sourceAccountId when set', () => {
    const b = makeCommitment({ varies: false, dueDay: 15, sourceAccountId: 'acct-1' });
    const plan = planAutoConfirm([b], new Date(2026, 3, 20));
    expect(plan[0]!.transaction.accountId).toBe('acct-1');
  });

  it('tags auto-posted transaction with categoryKey for category commitments', () => {
    const b = makeCommitment({
      id: 'cat-1',
      name: 'Transport',
      type: 'category',
      categoryKey: 'transport',
      preset: undefined,
      varies: false,
      dueDay: 15,
    });
    const plan = planAutoConfirm([b], new Date(2026, 3, 20));
    expect(plan).toHaveLength(1);
    expect(plan[0]!.transaction.category).toBe('transport');
    expect(plan[0]!.transaction.budgetId).toBe('cat-1');
  });

  it('keeps bills category for non-category (custom) commitments', () => {
    const b = makeCommitment({ varies: false, dueDay: 15 });
    const plan = planAutoConfirm([b], new Date(2026, 3, 20));
    expect(plan[0]!.transaction.category).toBe('bills');
  });
});

describe('deriveCommitmentState (category commitments)', () => {
  it('is pending for a category-type commitment past due-day, unconfirmed, varies=true', () => {
    const b = makeCommitment({
      type: 'category',
      categoryKey: 'transport',
      preset: undefined,
      dueDay: 15,
      varies: true,
    });
    const today = new Date(2026, 3, 16);
    const state = deriveCommitmentState(b, today);
    expect(state.isPendingThisMonth).toBe(true);
    expect(state.nextDueDate).toBe('2026-04-15');
  });
});
