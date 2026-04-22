import type { Transaction, Installment, DebtEntry, Account, ExchangeRates, RecurringFrequency, PaydayConfig, Budget } from '../types';
import { getFinanceCategoryDef } from './categories';
import { convertToBase } from './currencies';
import { getPaydayOccurrences } from './payday';
import { resolveDueDate } from './commitmentBudgets';

// --- Recurring occurrence helpers ---

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function resolveFrequency(txn: Transaction): RecurringFrequency {
  return txn.recurringFrequency ?? 'monthly';
}

export function getRecurringOccurrences(
  txn: Transaction,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  if (!txn.isRecurring) return [];
  const freq = resolveFrequency(txn);
  const endLimit = txn.recurringEndDate ? new Date(txn.recurringEndDate + 'T23:59:59') : null;
  const results: Date[] = [];

  const effectiveEnd = endLimit && endLimit < windowEnd ? endLimit : windowEnd;

  switch (freq) {
    case 'daily': {
      const cursor = new Date(Math.max(windowStart.getTime(), startOfToday().getTime()));
      cursor.setHours(0, 0, 0, 0);
      const maxIter = Math.ceil((effectiveEnd.getTime() - cursor.getTime()) / 86400000) + 1;
      for (let i = 0; i < maxIter && i < 366; i++) {
        const d = new Date(cursor);
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        if (d > effectiveEnd) break;
        if (d >= windowStart) results.push(d);
      }
      break;
    }
    case 'weekly':
    case 'biweekly': {
      const step = freq === 'biweekly' ? 14 : 7;
      const targetDay = txn.recurringDayOfWeek ?? new Date(txn.date).getDay();
      // Anchor from the transaction date to maintain cadence
      const anchor = new Date(txn.date);
      anchor.setHours(0, 0, 0, 0);
      // Find first occurrence of targetDay on or after anchor
      const anchorDow = anchor.getDay();
      const diff = (targetDay - anchorDow + 7) % 7;
      anchor.setDate(anchor.getDate() + diff);
      // Step forward to reach the window
      if (anchor < windowStart) {
        const gap = Math.floor((windowStart.getTime() - anchor.getTime()) / (step * 86400000));
        anchor.setDate(anchor.getDate() + gap * step);
      }
      for (let i = 0; i < 53; i++) {
        const d = new Date(anchor);
        d.setDate(d.getDate() + i * step);
        d.setHours(0, 0, 0, 0);
        if (d > effectiveEnd) break;
        if (d >= windowStart) results.push(d);
      }
      break;
    }
    case 'monthly': {
      const day = txn.recurringDay ?? new Date(txn.date).getDate();
      const start = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
      for (let i = 0; i < 13; i++) {
        const y = start.getFullYear();
        const m = start.getMonth() + i;
        const clamped = clampDay(new Date(y, m, 1).getFullYear(), new Date(y, m, 1).getMonth(), day);
        const d = new Date(y, m, clamped);
        d.setHours(0, 0, 0, 0);
        if (d > effectiveEnd) break;
        if (d >= windowStart) results.push(d);
      }
      break;
    }
    case 'quarterly': {
      const day = txn.recurringDay ?? new Date(txn.date).getDate();
      // Anchor quarter from the transaction date
      const txnDate = new Date(txn.date);
      const anchorMonth = txnDate.getMonth();
      // Go back far enough to find the right quarter phase
      for (let m = anchorMonth - 12; m < anchorMonth + 48; m += 3) {
        const y = txnDate.getFullYear();
        const d = new Date(y, m, clampDay(new Date(y, m, 1).getFullYear(), new Date(y, m, 1).getMonth(), day));
        d.setHours(0, 0, 0, 0);
        if (d > effectiveEnd) break;
        if (d >= windowStart) results.push(d);
      }
      break;
    }
    case 'yearly': {
      const month = (txn.recurringMonth ?? (new Date(txn.date).getMonth() + 1)) - 1; // 0-indexed
      const day = txn.recurringDay ?? new Date(txn.date).getDate();
      for (let y = windowStart.getFullYear(); y <= windowEnd.getFullYear() + 1; y++) {
        const clamped = clampDay(y, month, day);
        const d = new Date(y, month, clamped);
        d.setHours(0, 0, 0, 0);
        if (d > effectiveEnd) break;
        if (d >= windowStart) results.push(d);
      }
      break;
    }
    case 'custom': {
      const dates = txn.recurringCustomDates ?? [];
      for (const iso of dates) {
        const d = new Date(iso);
        d.setHours(0, 0, 0, 0);
        if (d >= windowStart && d <= effectiveEnd) results.push(d);
      }
      results.sort((a, b) => a.getTime() - b.getTime());
      break;
    }
  }

  return results;
}

export function getNextRecurringDate(txn: Transaction): Date | null {
  if (!txn.isRecurring) return null;
  const today = startOfToday();
  const farFuture = new Date(today);
  farFuture.setFullYear(farFuture.getFullYear() + 1);
  const occ = getRecurringOccurrences(txn, today, farFuture);
  return occ[0] ?? null;
}

export function formatRecurringLabel(txn: Transaction): string {
  const freq = resolveFrequency(txn);
  switch (freq) {
    case 'daily':
      return 'Every day';
    case 'weekly': {
      const dow = txn.recurringDayOfWeek ?? new Date(txn.date).getDay();
      return `Every ${DAY_NAMES[dow]}`;
    }
    case 'biweekly': {
      const dow = txn.recurringDayOfWeek ?? new Date(txn.date).getDay();
      return `Every 2 weeks on ${DAY_NAMES[dow]}`;
    }
    case 'monthly':
      return `Every month on day ${txn.recurringDay ?? new Date(txn.date).getDate()}`;
    case 'quarterly':
      return `Every 3 months on day ${txn.recurringDay ?? new Date(txn.date).getDate()}`;
    case 'yearly': {
      const m = (txn.recurringMonth ?? (new Date(txn.date).getMonth() + 1)) - 1;
      const d = txn.recurringDay ?? new Date(txn.date).getDate();
      return `Every year on ${MONTH_NAMES[m]} ${d}`;
    }
    case 'custom': {
      const count = txn.recurringCustomDates?.length ?? 0;
      return count === 0 ? 'Custom dates' : `On ${count} specific date${count !== 1 ? 's' : ''}`;
    }
    default:
      return 'Recurring';
  }
}

// --- Account-level forecast ---

export interface ForecastResult {
  expectedIn: number;
  expectedOut: number;
  spendable: number;
}

export function computeForecast(
  transactions: Transaction[],
  accountId: string,
  currentBalance: number
): ForecastResult {
  const today = startOfToday();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  const recurring = transactions.filter(
    (t) => t.accountId === accountId && t.isRecurring
  );

  let expectedIn = 0;
  let expectedOut = 0;

  for (const t of recurring) {
    const count = getRecurringOccurrences(t, today, endDate).length;
    if (t.type === 'income') {
      expectedIn += t.amount * count;
    } else {
      expectedOut += t.amount * count;
    }
  }

  const spendable = Math.max(0, currentBalance + expectedIn - expectedOut);

  return { expectedIn, expectedOut, spendable };
}

// --- Cashflow timeline ---

export type ForecastEventSource = 'recurring' | 'payday' | 'installment' | 'debt' | 'credit-card' | 'bill' | 'scheduled';

export interface ForecastEvent {
  id: string;
  date: Date;
  description: string;
  amount: number;        // positive = inflow, negative = outflow
  currency: string;
  source: ForecastEventSource;
  emoji: string;
  isReminder?: boolean;
}

export interface ForecastTimeline {
  events: ForecastEvent[];
  totalIn: number;
  totalOut: number;
  net: number;
  startingBalance: number;
  projectedBalance: number;
  minBalance: number;           // lowest running balance reached in the window
  minBalanceDate: Date | null;  // null means the starting balance is the minimum
}

/** Monthly-only next occurrence (used for payday, installments, credit cards) */
export function getNextOccurrence(recurringDay: number, fromDate?: Date): Date {
  const base = fromDate ? new Date(fromDate) : new Date();
  base.setHours(0, 0, 0, 0);
  const thisMonth = new Date(base.getFullYear(), base.getMonth(), recurringDay);
  if (thisMonth >= base) return thisMonth;
  return new Date(base.getFullYear(), base.getMonth() + 1, recurringDay);
}

export function computeTimeline(params: {
  transactions: Transaction[];
  paydayConfig?: PaydayConfig;
  installments: Installment[];
  debts: DebtEntry[];
  accounts: Account[];
  budgets?: Budget[];
  defaultCurrency: string;
  exchangeRates: ExchangeRates | null;
  windowDays?: number;
  today?: Date; // override for testing
}): ForecastTimeline {
  const {
    transactions,
    paydayConfig,
    installments,
    debts,
    accounts,
    budgets = [],
    defaultCurrency,
    exchangeRates,
    windowDays = 30,
    today: todayOpt,
  } = params;

  const today = todayOpt ? (() => { const d = new Date(todayOpt); d.setHours(0, 0, 0, 0); return d; })() : startOfToday();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + windowDays);

  const events: ForecastEvent[] = [];

  // 1. Recurring transactions (all frequencies)
  for (const t of transactions) {
    if (!t.isRecurring) continue;
    const occurrences = getRecurringOccurrences(t, today, endDate);
    const catDef = getFinanceCategoryDef(t.category);
    for (const occ of occurrences) {
      events.push({
        id: `recurring-${t.id}-${dateKey(occ)}`,
        date: occ,
        description: t.description || catDef.label,
        amount: t.type === 'income' ? t.amount : -t.amount,
        currency: t.currency,
        source: 'recurring',
        emoji: catDef.emoji,
      });
    }
  }

  // 2. Payday
  if (paydayConfig) {
    const occurrences = getPaydayOccurrences(paydayConfig, today, endDate);
    for (const occ of occurrences) {
      events.push({
        id: `payday-${dateKey(occ.date)}`,
        date: occ.date,
        description: 'Payday',
        amount: occ.amount,
        currency: occ.currency,
        source: 'payday',
        emoji: '💰',
      });
    }
  }

  // 3. Installments (active ones with remaining months) — may appear multiple times per window
  for (const inst of installments) {
    if (inst.paidMonths >= inst.totalMonths) continue;
    const dayOfMonth = new Date(inst.startDate).getDate();
    let year = today.getFullYear();
    let month = today.getMonth();
    let emittedSoFar = 0;
    for (let i = 0; i < 6; i++) {
      const maxDay = new Date(year, month + 1, 0).getDate();
      const clamped = Math.min(dayOfMonth, maxDay);
      const occ = new Date(year, month, clamped);
      occ.setHours(0, 0, 0, 0);
      if (occ > endDate) break;
      if (occ >= today && inst.paidMonths + emittedSoFar < inst.totalMonths) {
        events.push({
          id: `installment-${inst.id}-${year}-${String(month + 1).padStart(2, '0')}`,
          date: occ,
          description: inst.itemName,
          amount: -inst.monthlyPayment,
          currency: inst.currency,
          source: 'installment',
          emoji: '📦',
        });
        emittedSoFar++;
      }
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
  }

  // 4. Debts with due dates
  for (const debt of debts) {
    if (!debt.dueDate || debt.paidAmount >= debt.amount) continue;
    const due = new Date(debt.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due >= today && due <= endDate) {
      const remaining = debt.amount - debt.paidAmount;
      events.push({
        id: `debt-${debt.id}`,
        date: due,
        description: debt.personName,
        amount: debt.direction === 'i_owe' ? -remaining : remaining,
        currency: debt.currency,
        source: 'debt',
        emoji: '🤝',
      });
    }
  }

  // 5. Credit card due dates (reminders only)
  for (const acc of accounts) {
    if (acc.type !== 'credit' || acc.dueDay == null || acc.balance <= 0) continue;
    const next = getNextOccurrence(acc.dueDay, today);
    if (next >= today && next <= endDate) {
      events.push({
        id: `credit-${acc.id}`,
        date: next,
        description: `${acc.name} payment`,
        amount: -acc.balance,
        currency: acc.currency,
        source: 'credit-card',
        emoji: '💳',
        isReminder: true,
      });
    }
  }

  // 6. Commitment budgets (recurring bills)
  for (const budget of budgets) {
    if (!budget.isCommitment || budget.dueDay === undefined) continue;
    const catDef = budget.type === 'category' && budget.categoryKey
      ? getFinanceCategoryDef(budget.categoryKey)
      : getFinanceCategoryDef('bills');
    let year = today.getFullYear();
    let month = today.getMonth() + 1; // 1-12
    for (let i = 0; i < 14; i++) {
      const iterKey = `${year}-${String(month).padStart(2, '0')}`;
      // Skip if the month has already been confirmed (auto or manual) — the transaction is real.
      if (!budget.lastConfirmedMonth || iterKey > budget.lastConfirmedMonth) {
        const dueDateISO = resolveDueDate(budget.dueDay, year, month);
        const [iy, im, id] = dueDateISO.split('-').map(Number);
        const due = new Date(iy!, im! - 1, id!);
        due.setHours(0, 0, 0, 0);
        if (due > endDate) break;
        if (due >= today) {
          events.push({
            id: `bill-${budget.id}-${iterKey}`,
            date: due,
            description: budget.name,
            amount: -budget.monthlyLimit,
            currency: budget.currency,
            source: 'bill',
            emoji: catDef.emoji,
          });
        }
      }
      month += 1;
      if (month > 12) { month = 1; year += 1; }
    }
  }

  // 7. Scheduled (future-dated) one-time transactions
  const todayISO = dateKey(today);
  const endDateISO = dateKey(endDate);
  for (const t of transactions) {
    if (t.isRecurring) continue;
    if (t.date <= todayISO) continue;
    if (t.date > endDateISO) continue;
    const [y, m, d] = t.date.split('-').map(Number);
    const eventDate = new Date(y!, m! - 1, d!);
    eventDate.setHours(0, 0, 0, 0);
    const catDef = getFinanceCategoryDef(t.category);
    events.push({
      id: `scheduled-${t.id}`,
      date: eventDate,
      description: t.description || catDef.label,
      amount: t.type === 'income' ? t.amount : -t.amount,
      currency: t.currency,
      source: 'scheduled',
      emoji: catDef.emoji,
    });
  }

  // Sort by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Compute summary totals in default currency
  let totalIn = 0;
  let totalOut = 0;
  for (const e of events) {
    if (e.isReminder) continue;
    const converted = e.currency === defaultCurrency
      ? Math.abs(e.amount)
      : convertToBase(Math.abs(e.amount), e.currency, defaultCurrency, exchangeRates);
    if (e.amount > 0) {
      totalIn += converted;
    } else {
      totalOut += converted;
    }
  }

  const startingBalance = accounts
    .filter(a => a.type === 'debit' || a.type === 'ewallet')
    .reduce((sum, a) => {
      const bal = a.currency === defaultCurrency
        ? a.balance
        : convertToBase(a.balance, a.currency, defaultCurrency, exchangeRates);
      return sum + bal;
    }, 0);
  const net = totalIn - totalOut;

  // Running-balance walk — find the worst-day point within the window.
  let running = startingBalance;
  let minBalance = startingBalance;
  let minBalanceDate: Date | null = null;
  for (const e of events) {
    if (e.isReminder) continue;
    const converted = e.currency === defaultCurrency
      ? e.amount
      : convertToBase(e.amount, e.currency, defaultCurrency, exchangeRates);
    running += converted;
    if (running < minBalance) {
      minBalance = running;
      minBalanceDate = e.date;
    }
  }

  return {
    events,
    totalIn,
    totalOut,
    net,
    startingBalance,
    projectedBalance: startingBalance + net,
    minBalance,
    minBalanceDate,
  };
}
