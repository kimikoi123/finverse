import { describe, it, expect } from 'vitest';
import { calculateBalances, calculateDirectDebts } from './settlement';
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
  isSettlement,
}: {
  id?: string;
  description?: string;
  amount?: number;
  currency?: string;
  paidBy?: string;
  splitType?: SplitType;
  participants?: string[];
  customAmounts?: Record<string, number>;
  advancePayments?: Record<string, number>;
  category?: string;
  isSettlement?: boolean;
} = {}): Expense {
  return { id, description, amount, currency, paidBy, splitType, participants, customAmounts, advancePayments, category, isSettlement, createdAt: new Date().toISOString() };
}

// Invariant: sum of all balances must equal 0
function expectBalancesSum(balances: Balances): void {
  const sum = Object.values(balances).reduce((s, v) => s + v, 0);
  expect(sum).toBeCloseTo(0, 10);
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

describe('calculateDirectDebts', () => {
  const findDebt = (debts: Debt[], from: string, to: string) =>
    debts.find(d => d.from === from && d.to === to);

  it('equal split, 2 members: Bob owes Alice 50', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const expenses = [
      makeExpense({ amount: 100, paidBy: 'Alice', participants: ['Alice', 'Bob'] }),
    ];
    const debts = calculateDirectDebts(expenses, members, 'USD', { USD: 1 });
    expect(debts).toHaveLength(1);
    expect(findDebt(debts, 'Bob', 'Alice')?.amount).toBeCloseTo(50, 2);
  });

  it('equal split, 3 members: Bob and Carol each owe Alice 100', () => {
    const members = [makeMember('Alice'), makeMember('Bob'), makeMember('Carol')];
    const expenses = [
      makeExpense({ amount: 300, paidBy: 'Alice', participants: ['Alice', 'Bob', 'Carol'] }),
    ];
    const debts = calculateDirectDebts(expenses, members, 'USD', { USD: 1 });
    expect(debts).toHaveLength(2);
    expect(findDebt(debts, 'Bob', 'Alice')?.amount).toBeCloseTo(100, 2);
    expect(findDebt(debts, 'Carol', 'Alice')?.amount).toBeCloseTo(100, 2);
  });

  it('multiple payers with per-pair netting', () => {
    const members = [makeMember('Alice'), makeMember('Bob'), makeMember('Carol')];
    const expenses = [
      makeExpense({ id: 'e1', amount: 300, paidBy: 'Alice', participants: ['Alice', 'Bob', 'Carol'] }),
      makeExpense({ id: 'e2', amount: 150, paidBy: 'Bob', participants: ['Alice', 'Bob', 'Carol'] }),
    ];
    const debts = calculateDirectDebts(expenses, members, 'USD', { USD: 1 });
    // Alice paid 300 (3-way): Bob owes Alice 100, Carol owes Alice 100
    // Bob paid 150 (3-way): Alice owes Bob 50, Carol owes Bob 50
    // Net Alice<->Bob: Bob owes Alice 100, Alice owes Bob 50 -> Bob owes Alice 50
    expect(findDebt(debts, 'Bob', 'Alice')?.amount).toBeCloseTo(50, 2);
    expect(findDebt(debts, 'Carol', 'Alice')?.amount).toBeCloseTo(100, 2);
    expect(findDebt(debts, 'Carol', 'Bob')?.amount).toBeCloseTo(50, 2);
    expect(debts).toHaveLength(3);
  });

  it('custom split: Alice pays 100, Bob:70 Alice:30', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const expenses = [
      makeExpense({
        amount: 100, paidBy: 'Alice', splitType: 'custom',
        participants: ['Alice', 'Bob'], customAmounts: { Alice: 30, Bob: 70 },
      }),
    ];
    const debts = calculateDirectDebts(expenses, members, 'USD', { USD: 1 });
    expect(debts).toHaveLength(1);
    expect(findDebt(debts, 'Bob', 'Alice')?.amount).toBeCloseTo(70, 2);
  });

  it('advance payment: Bob pays full share in advance', () => {
    const members = [makeMember('Alice'), makeMember('Bob'), makeMember('Carol')];
    const expenses = [
      makeExpense({
        amount: 300, paidBy: 'Alice', participants: ['Alice', 'Bob', 'Carol'],
        advancePayments: { Bob: 100 },
      }),
    ];
    const debts = calculateDirectDebts(expenses, members, 'USD', { USD: 1 });
    // Bob's share is 100, advance is 100 -> Bob owes Alice 0
    // Carol owes Alice 100
    expect(debts).toHaveLength(1);
    expect(findDebt(debts, 'Carol', 'Alice')?.amount).toBeCloseTo(100, 2);
    expect(findDebt(debts, 'Bob', 'Alice')).toBeUndefined();
  });

  it('advance payment: partial advance', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const expenses = [
      makeExpense({
        amount: 100, paidBy: 'Alice', participants: ['Alice', 'Bob'],
        advancePayments: { Bob: 30 },
      }),
    ];
    const debts = calculateDirectDebts(expenses, members, 'USD', { USD: 1 });
    // Bob share 50, advance 30 -> Bob owes Alice 20
    expect(debts).toHaveLength(1);
    expect(findDebt(debts, 'Bob', 'Alice')?.amount).toBeCloseTo(20, 2);
  });

  it('multi-currency: Alice pays 100 EUR, base USD', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const rates = { EUR: 0.92, USD: 1 };
    const expenses = [
      makeExpense({ amount: 100, currency: 'EUR', paidBy: 'Alice', participants: ['Alice', 'Bob'] }),
    ];
    const debts = calculateDirectDebts(expenses, members, 'USD', rates);
    expect(debts).toHaveLength(1);
    // 100 EUR = 100/0.92 ~= 108.70 USD. Bob owes ~54.35
    expect(findDebt(debts, 'Bob', 'Alice')?.amount).toBeCloseTo(54.35, 0);
  });

  it('settlement expense cancels debt', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const expenses = [
      makeExpense({ id: 'e1', amount: 100, paidBy: 'Alice', participants: ['Alice', 'Bob'] }),
      makeExpense({
        id: 'e2', amount: 50, paidBy: 'Bob', splitType: 'custom',
        participants: ['Alice'], customAmounts: { Alice: 50 }, isSettlement: true,
      }),
    ];
    const debts = calculateDirectDebts(expenses, members, 'USD', { USD: 1 });
    // Bob owes Alice 50, settlement: Alice owes Bob 50 -> net 0
    expect(debts).toHaveLength(0);
  });

  it('empty expenses: no debts', () => {
    const members = [makeMember('Alice'), makeMember('Bob')];
    const debts = calculateDirectDebts([], members, 'USD', { USD: 1 });
    expect(debts).toHaveLength(0);
  });

  it('payer not a participant: full amount owed', () => {
    const members = [makeMember('Alice'), makeMember('Bob'), makeMember('Carol')];
    const expenses = [
      makeExpense({ amount: 100, paidBy: 'Alice', participants: ['Bob', 'Carol'] }),
    ];
    const debts = calculateDirectDebts(expenses, members, 'USD', { USD: 1 });
    expect(debts).toHaveLength(2);
    expect(findDebt(debts, 'Bob', 'Alice')?.amount).toBeCloseTo(50, 2);
    expect(findDebt(debts, 'Carol', 'Alice')?.amount).toBeCloseTo(50, 2);
  });
});
