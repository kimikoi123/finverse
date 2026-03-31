import { describe, it, expect } from 'vitest';
import { calculateBalances, calculateSimplifiedDebts, calculateFullDebts } from './settlement';
import type { Member, Expense, Balances, Debt, SplitType } from '../types';

function makeMember(id: string, name?: string): Member {
  return { id, name: name || id };
}

function makeExpense({
  id = 'exp-1',
  description = 'Test',
  amount = 0,
  currency = 'USD',
  paidBy = '',
  splitType = 'equal' as SplitType,
  participants = [] as string[],
  customAmounts = {} as Record<string, number>,
  advancePayments = {} as Record<string, number>,
  category = 'food',
} = {}): Expense {
  return { id, description, amount, currency, paidBy, splitType, participants, customAmounts, advancePayments, category, createdAt: new Date().toISOString() };
}

// Invariant: sum of all balances must equal 0
function expectBalancesSum(balances: Balances): void {
  const sum = Object.values(balances).reduce((s, v) => s + v, 0);
  expect(sum).toBeCloseTo(0, 10);
}

// Verify debts fully settle all balances
function expectDebtsSettleBalances(debts: Debt[], originalBalances: Balances): void {
  const settled: Balances = { ...originalBalances };
  debts.forEach(({ from, to, amount }) => {
    settled[from] = (settled[from] || 0) + amount;
    settled[to] = (settled[to] || 0) - amount;
  });
  Object.values(settled).forEach(v => {
    expect(Math.abs(v)).toBeLessThan(0.02);
  });
}

describe('calculateBalances', () => {
  it('equal split, 2 members: Alice pays 100, split [Alice, Bob]', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const expenses = [
      makeExpense({ amount: 100, paidBy: 'Alice', participants: ['Alice', 'Bob'] }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', { USD: 1 });
    expect(balances.Alice).toBeCloseTo(50, 2);
    expect(balances.Bob).toBeCloseTo(-50, 2);
    expectBalancesSum(balances);
  });

  it('equal split, 3 members: Alice pays 90, split [A, B, C]', () => {
    const members = [makeMember('Alice'), makeMember('Bob'), makeMember('Carol')];
    const expenses = [
      makeExpense({ amount: 90, paidBy: 'Alice', participants: ['Alice', 'Bob', 'Carol'] }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', { USD: 1 });
    expect(balances.Alice).toBeCloseTo(60, 2);
    expect(balances.Bob).toBeCloseTo(-30, 2);
    expect(balances.Carol).toBeCloseTo(-30, 2);
    expectBalancesSum(balances);
  });

  it('multiple expenses different payers', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const expenses = [
      makeExpense({ id: 'exp-1', amount: 60, paidBy: 'Alice', participants: ['Alice', 'Bob'] }),
      makeExpense({ id: 'exp-2', amount: 30, paidBy: 'Bob', participants: ['Alice', 'Bob'] }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', { USD: 1 });
    // Alice: +60 -30 -15 = +15, Bob: +30 -30 -15 = -15
    expect(balances.Alice).toBeCloseTo(15, 2);
    expect(balances.Bob).toBeCloseTo(-15, 2);
    expectBalancesSum(balances);
  });

  it('custom split: Alice pays 100, customAmounts { Alice: 30, Bob: 70 }', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const expenses = [
      makeExpense({
        amount: 100,
        paidBy: 'Alice',
        splitType: 'custom',
        participants: ['Alice', 'Bob'],
        customAmounts: { Alice: 30, Bob: 70 },
      }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', { USD: 1 });
    expect(balances.Alice).toBeCloseTo(70, 2);
    expect(balances.Bob).toBeCloseTo(-70, 2);
    expectBalancesSum(balances);
  });

  it('custom split proportional: Alice pays 200, customAmounts { Bob: 1, Carol: 3 }', () => {
    const members = [makeMember('Alice'), makeMember('Bob'), makeMember('Carol')];
    const expenses = [
      makeExpense({
        amount: 200,
        paidBy: 'Alice',
        splitType: 'custom',
        participants: ['Alice', 'Bob', 'Carol'],
        customAmounts: { Bob: 1, Carol: 3 },
      }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', { USD: 1 });
    // Total custom = 4. Bob share = (1/4)*200 = 50. Carol share = (3/4)*200 = 150.
    // Alice paid 200, debited 0 from custom -> Alice: +200
    expect(balances.Alice).toBeCloseTo(200, 2);
    expect(balances.Bob).toBeCloseTo(-50, 2);
    expect(balances.Carol).toBeCloseTo(-150, 2);
    expectBalancesSum(balances);
  });

  it('multi-currency: Alice pays 100 EUR, Bob pays 200 USD, baseCurrency USD', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const rates = { EUR: 0.92, USD: 1 };
    const expenses = [
      makeExpense({ id: 'exp-1', amount: 100, currency: 'EUR', paidBy: 'Alice', participants: ['Alice', 'Bob'] }),
      makeExpense({ id: 'exp-2', amount: 200, currency: 'USD', paidBy: 'Bob', participants: ['Alice', 'Bob'] }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', rates);
    // Alice paid 100 EUR = 100/0.92 * 1 ~= 108.70 USD
    // Bob paid 200 USD
    // Total = ~308.70, each share = ~154.35
    // Alice: 108.70 - 154.35 = -45.65
    // Bob: 200 - 154.35 = +45.65
    expectBalancesSum(balances);
  });

  it('member not in participants: 3 members, expense splits among 2', () => {
    const members = [makeMember('Alice'), makeMember('Bob'), makeMember('Carol')];
    const expenses = [
      makeExpense({ amount: 100, paidBy: 'Alice', participants: ['Alice', 'Bob'] }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', { USD: 1 });
    expect(balances.Carol).toBeCloseTo(0, 2);
    expectBalancesSum(balances);
  });

  it('empty expenses: 2 members, both 0', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const balances = calculateBalances([], members, 'USD', { USD: 1 });
    expect(balances.Alice).toBeCloseTo(0, 2);
    expect(balances.Bob).toBeCloseTo(0, 2);
    expectBalancesSum(balances);
  });

  it('advance payment: Bob pays full share in advance', () => {
    const members = [makeMember('Alice'), makeMember('Bob'), makeMember('Carol')];
    const expenses = [
      makeExpense({
        amount: 300,
        paidBy: 'Alice',
        participants: ['Alice', 'Bob', 'Carol'],
        advancePayments: { Bob: 100 },
      }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', { USD: 1 });
    expect(balances.Alice).toBeCloseTo(100, 2);
    expect(balances.Bob).toBeCloseTo(0, 2);
    expect(balances.Carol).toBeCloseTo(-100, 2);
    expectBalancesSum(balances);
  });

  it('advance payment: no advancePayments field (backward compat)', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const expenses = [
      makeExpense({ amount: 100, paidBy: 'Alice', participants: ['Alice', 'Bob'] }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', { USD: 1 });
    expect(balances.Alice).toBeCloseTo(50, 2);
    expect(balances.Bob).toBeCloseTo(-50, 2);
    expectBalancesSum(balances);
  });

  it('advance payment: partial advance', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const expenses = [
      makeExpense({
        amount: 100,
        paidBy: 'Alice',
        participants: ['Alice', 'Bob'],
        advancePayments: { Bob: 30 },
      }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', { USD: 1 });
    expect(balances.Alice).toBeCloseTo(20, 2);
    expect(balances.Bob).toBeCloseTo(-20, 2);
    expectBalancesSum(balances);
  });

  it('advance payment: multiple members pay in advance', () => {
    const members = [makeMember('Alice'), makeMember('Bob'), makeMember('Carol')];
    const expenses = [
      makeExpense({
        amount: 300,
        paidBy: 'Alice',
        participants: ['Alice', 'Bob', 'Carol'],
        advancePayments: { Bob: 100, Carol: 50 },
      }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', { USD: 1 });
    expect(balances.Alice).toBeCloseTo(50, 2);
    expect(balances.Bob).toBeCloseTo(0, 2);
    expect(balances.Carol).toBeCloseTo(-50, 2);
    expectBalancesSum(balances);
  });

  it('advance payment: multi-currency (EUR expense, USD base)', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const rates = { EUR: 0.92, USD: 1 };
    const expenses = [
      makeExpense({
        amount: 100,
        currency: 'EUR',
        paidBy: 'Alice',
        participants: ['Alice', 'Bob'],
        advancePayments: { Bob: 50 },
      }),
    ];
    const balances = calculateBalances(expenses, members, 'USD', rates);
    // 100 EUR in USD = 100/0.92 ~= 108.70. Each share ~= 54.35.
    // Bob advance 50 EUR in USD = 50/0.92 ~= 54.35.
    // Alice: 108.70 - 54.35 - 54.35 = 0, Bob: -54.35 + 54.35 = 0
    expect(balances.Alice).toBeCloseTo(0, 0);
    expect(balances.Bob).toBeCloseTo(0, 0);
    expectBalancesSum(balances);
  });
});

describe('calculateSimplifiedDebts', () => {
  it('two people: { A: 50, B: -50 } -> single debt B->A for 50', () => {
    const debts = calculateSimplifiedDebts({ A: 50, B: -50 });
    expect(debts).toHaveLength(1);
    expect(debts[0]!.from).toBe('B');
    expect(debts[0]!.to).toBe('A');
    expect(debts[0]!.amount).toBeCloseTo(50, 2);
  });

  it('three people, 1 creditor 2 debtors: { A: 100, B: -60, C: -40 }', () => {
    const balances = { A: 100, B: -60, C: -40 };
    const debts = calculateSimplifiedDebts(balances);
    expect(debts).toHaveLength(2);
    expectDebtsSettleBalances(debts, balances);
  });

  it('three people, 2 creditors 1 debtor: { A: 60, B: 40, C: -100 }', () => {
    const balances = { A: 60, B: 40, C: -100 };
    const debts = calculateSimplifiedDebts(balances);
    expect(debts).toHaveLength(2);
    expectDebtsSettleBalances(debts, balances);
  });

  it('already balanced: { A: 0, B: 0 } -> empty array', () => {
    const debts = calculateSimplifiedDebts({ A: 0, B: 0 });
    expect(debts).toHaveLength(0);
  });

  it('within threshold: { A: 0.005, B: -0.005 } -> empty array', () => {
    const debts = calculateSimplifiedDebts({ A: 0.005, B: -0.005 });
    expect(debts).toHaveLength(0);
  });

  it('five people: verify settles and length <= 4', () => {
    const balances = { A: 100, B: 50, C: -70, D: -50, E: -30 };
    const debts = calculateSimplifiedDebts(balances);
    expect(debts.length).toBeLessThanOrEqual(4);
    expectDebtsSettleBalances(debts, balances);
  });

  it('floating point edge: { A: 33.33, B: 33.34, C: -66.67 }', () => {
    const balances = { A: 33.33, B: 33.34, C: -66.67 };
    const debts = calculateSimplifiedDebts(balances);
    expectDebtsSettleBalances(debts, balances);
  });
});

describe('calculateFullDebts', () => {
  it('two people: { A: 50, B: -50 } -> has debt from B to A with amount > 0', () => {
    const debts = calculateFullDebts({ A: 50, B: -50 });
    expect(debts.length).toBeGreaterThanOrEqual(1);
    const debt = debts.find(d => d.from === 'B' && d.to === 'A');
    expect(debt).toBeDefined();
    expect(debt!.amount).toBeGreaterThan(0);
  });

  it('all balanced: { A: 0, B: 0 } -> empty array', () => {
    const debts = calculateFullDebts({ A: 0, B: 0 });
    expect(debts).toHaveLength(0);
  });

  it('three people: { A: 60, B: -20, C: -40 } -> debtors are B,C and creditor is A', () => {
    const debts = calculateFullDebts({ A: 60, B: -20, C: -40 });
    const fromIds = debts.map(d => d.from);
    const toIds = debts.map(d => d.to);
    // All from IDs should be debtors (B, C)
    fromIds.forEach(id => {
      expect(['B', 'C']).toContain(id);
    });
    // All to IDs should be creditors (A)
    toIds.forEach(id => {
      expect(id).toBe('A');
    });
    // All amounts > 0
    debts.forEach(d => {
      expect(d.amount).toBeGreaterThan(0);
    });
  });
});
