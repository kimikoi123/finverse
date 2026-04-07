import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/currencies';
import { getFinanceCategoryDef } from '../utils/categories';

interface HomeDashboardProps {
  displayName: string;
  transactions: Transaction[];
  defaultCurrency: string;
  paydayDay?: number;
  paydayAmount?: number;
  paydayCurrency?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatHeaderDate(date: Date): string {
  return date
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function getNextOccurrence(recurringDay: number): Date {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), recurringDay);
  if (thisMonth > today) return thisMonth;
  return new Date(today.getFullYear(), today.getMonth() + 1, recurringDay);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeDashboard({
  displayName,
  transactions,
  defaultCurrency,
  paydayDay,
  paydayAmount,
  paydayCurrency,
}: HomeDashboardProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  const now = new Date();
  const todayISO = isoDate(now);

  // Filter transactions matching default currency
  const currencyTxns = useMemo(
    () => transactions.filter((t) => t.currency === defaultCurrency),
    [transactions, defaultCurrency],
  );

  // --- Last 7 days bar chart data ---
  const last7Days = useMemo(() => {
    const today = startOfDay(now);
    const days: { iso: string; dayLabel: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ iso: isoDate(d), dayLabel: DAY_LABELS[d.getDay()] ?? '' });
    }

    const expenseByDate: Record<string, number> = {};
    for (const t of currencyTxns) {
      if (t.type === 'expense') {
        expenseByDate[t.date] = (expenseByDate[t.date] ?? 0) + t.amount;
      }
    }

    const bars = days.map((d) => ({
      iso: d.iso,
      dayLabel: d.dayLabel,
      total: expenseByDate[d.iso] ?? 0,
    }));

    const maxVal = Math.max(...bars.map((b) => b.total), 1);
    return { bars, maxVal };
  }, [currencyTxns, now.toDateString()]);

  // --- Period spending ---
  const periodTotal = useMemo(() => {
    const today = startOfDay(now);

    let startDate: Date;
    if (period === 'day') {
      startDate = today;
    } else if (period === 'week') {
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
    } else {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const startISO = isoDate(startDate);
    const endISO = todayISO;

    return currencyTxns
      .filter((t) => t.type === 'expense' && t.date >= startISO && t.date <= endISO)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currencyTxns, period, todayISO]);

  const periodLabel = period === 'day' ? 'Today' : period === 'week' ? 'This Week' : 'This Month';

  // --- Monthly totals ---
  const { monthExpenses, monthIncome } = useMemo(() => {
    const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = todayISO;
    let expenses = 0;
    let income = 0;
    for (const t of currencyTxns) {
      if (t.date >= monthStart && t.date <= monthEnd) {
        if (t.type === 'expense') expenses += t.amount;
        else income += t.amount;
      }
    }
    return { monthExpenses: expenses, monthIncome: income };
  }, [currencyTxns, todayISO]);

  // --- Recent transactions (last 10) ---
  const recentTxns = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10),
    [transactions],
  );

  // --- Payday countdown ---
  const paydayInfo = useMemo(() => {
    if (paydayDay == null) return null;
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    let daysUntilPayday: number;
    if (currentDay <= paydayDay) {
      daysUntilPayday = paydayDay - currentDay;
    } else {
      daysUntilPayday = daysInMonth - currentDay + paydayDay;
    }
    const nextPaydate = new Date(today);
    if (currentDay <= paydayDay) {
      nextPaydate.setDate(paydayDay);
    } else {
      nextPaydate.setMonth(nextPaydate.getMonth() + 1);
      nextPaydate.setDate(paydayDay);
    }
    return { daysUntilPayday, nextPaydate };
  }, [paydayDay]);

  // --- Upcoming recurring transactions ---
  const upcomingRecurring = useMemo(() => {
    const recurringTxns = transactions.filter(
      (t) => t.isRecurring && t.recurringDay != null,
    );
    if (recurringTxns.length === 0) return null;

    const withNext = recurringTxns.map((t) => ({
      txn: t,
      nextDate: getNextOccurrence(t.recurringDay!),
    }));
    withNext.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());

    const top = withNext.slice(0, 5);
    const income = top.filter((r) => r.txn.type === 'income');
    const expenses = top.filter((r) => r.txn.type === 'expense');
    return { income, expenses };
  }, [transactions]);

  const hasTransactions = transactions.length > 0;

  // --- Empty state ---
  if (!hasTransactions) {
    return (
      <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-fade-in">
        {/* Greeting header */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-text-secondary tracking-wider">
            {formatHeaderDate(now)}
          </p>
          <h1 className="text-2xl font-bold text-text-primary" data-heading>
            {getGreeting()}, {displayName}!
          </h1>
        </div>

        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">📊</span>
            <h2 className="text-xl font-bold text-text-primary" data-heading>
              No transactions yet
            </h2>
            <p className="text-sm text-text-secondary">
              Tap + to add your first expense or income
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-fade-in">
      {/* 1. Greeting Header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-text-secondary tracking-wider">
          {formatHeaderDate(now)}
        </p>
        <h1 className="text-2xl font-bold text-text-primary" data-heading>
          {getGreeting()}, {displayName}!
        </h1>
      </div>

      {/* 2. Spending Summary Row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Left card — Last 7 Days bar chart */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <p className="text-[10px] font-semibold text-text-secondary tracking-wider mb-3">
            LAST 7 DAYS
          </p>
          <div className="flex items-end gap-1 h-16 mb-1">
            {last7Days.bars.map((bar) => {
              const heightPct = last7Days.maxVal > 0
                ? Math.max((bar.total / last7Days.maxVal) * 100, 2)
                : 2;
              const isToday = bar.iso === todayISO;
              return (
                <div
                  key={bar.iso}
                  className="flex-1 flex flex-col justify-end h-full"
                >
                  <div
                    className={`rounded-sm min-h-[2px] ${isToday ? 'bg-primary' : 'bg-border'}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1">
            {last7Days.bars.map((bar) => (
              <span
                key={bar.iso}
                className="flex-1 text-center text-[9px] text-text-secondary"
              >
                {bar.dayLabel}
              </span>
            ))}
          </div>
        </div>

        {/* Right card — Period spending */}
        <div className="bg-surface rounded-2xl border border-border p-4 flex flex-col">
          <p className="text-base font-semibold text-text-primary" data-heading>
            {periodLabel}
          </p>
          <p className="text-2xl font-bold text-text-primary mt-1 mb-3" data-heading>
            {formatCurrency(periodTotal, defaultCurrency)}
          </p>
          <div className="flex gap-1 mt-auto">
            {(['day', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  period === p
                    ? 'bg-primary text-white'
                    : 'bg-surface-light text-text-secondary'
                }`}
              >
                {p === 'day' ? 'Day' : p === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payday Countdown */}
      {paydayInfo != null && (
        <div className="bg-surface rounded-2xl border border-border p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-text-secondary font-semibold tracking-wider">
                  DAYS UNTIL PAYDAY
                </p>
                {paydayInfo.daysUntilPayday === 0 ? (
                  <p className="text-xl font-bold text-primary">Payday!</p>
                ) : (
                  <p className="text-xl font-bold text-text-primary">
                    {paydayInfo.daysUntilPayday} day{paydayInfo.daysUntilPayday !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              {paydayAmount != null && (
                <p className="font-semibold text-primary">
                  {formatCurrency(paydayAmount, paydayCurrency ?? defaultCurrency)}
                </p>
              )}
              <p className="text-xs text-text-secondary">
                {formatShortDate(paydayInfo.nextPaydate)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Monthly Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-surface rounded-2xl border border-border p-4 text-center">
          <p className="text-[10px] font-semibold text-text-secondary tracking-wider mb-1">
            THIS MONTH
          </p>
          <p className="text-lg font-bold text-danger">
            {formatCurrency(monthExpenses, defaultCurrency)}
          </p>
          <p className="text-xs text-text-secondary">spent</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-4 text-center">
          <p className="text-[10px] font-semibold text-text-secondary tracking-wider mb-1">
            THIS MONTH
          </p>
          <p className="text-lg font-bold text-success">
            {formatCurrency(monthIncome, defaultCurrency)}
          </p>
          <p className="text-xs text-text-secondary">earned</p>
        </div>
      </div>

      {/* Upcoming Recurring */}
      {upcomingRecurring != null && (
        <div className="mb-6">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-text-primary" data-heading>
              Upcoming
            </h2>
            <p className="text-xs text-text-secondary">
              Planned and recurring money moves
            </p>
          </div>
          <div className="bg-surface rounded-2xl border border-border p-4">
            {upcomingRecurring.income.length > 0 && (
              <div className={upcomingRecurring.expenses.length > 0 ? 'mb-4' : ''}>
                <p className="text-[10px] uppercase text-primary font-semibold tracking-wider mb-2">
                  INCOME
                </p>
                <div className="flex flex-col">
                  {upcomingRecurring.income.map((r, idx) => {
                    const catDef = getFinanceCategoryDef(r.txn.category);
                    return (
                      <div
                        key={r.txn.id}
                        className={`flex items-center gap-3 py-2.5 ${
                          idx < upcomingRecurring.income.length - 1 ? 'border-b border-border-subtle' : ''
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center text-base shrink-0">
                          {catDef.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">
                            {r.txn.description || catDef.label}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {formatShortDate(r.nextDate)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-success shrink-0">
                          +{formatCurrency(r.txn.amount, r.txn.currency)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {upcomingRecurring.expenses.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-danger font-semibold tracking-wider mb-2">
                  EXPENSES
                </p>
                <div className="flex flex-col">
                  {upcomingRecurring.expenses.map((r, idx) => {
                    const catDef = getFinanceCategoryDef(r.txn.category);
                    const today = new Date();
                    const diffMs = r.nextDate.getTime() - today.getTime();
                    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    const showBadge = daysLeft >= 0 && daysLeft <= 7;
                    return (
                      <div
                        key={r.txn.id}
                        className={`flex items-center gap-3 py-2.5 ${
                          idx < upcomingRecurring.expenses.length - 1 ? 'border-b border-border-subtle' : ''
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-danger/10 flex items-center justify-center text-base shrink-0">
                          {catDef.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-text-primary truncate">
                              {r.txn.description || catDef.label}
                            </p>
                            {showBadge && (
                              <span className="text-[9px] bg-danger/10 text-danger px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap">
                                {daysLeft === 0 ? 'TODAY' : `${daysLeft} DAY${daysLeft !== 1 ? 'S' : ''} LEFT`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary">
                            {formatShortDate(r.nextDate)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-danger shrink-0">
                          -{formatCurrency(r.txn.amount, r.txn.currency)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Recent Transactions */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3" data-heading>
          Recent
        </h2>

        {recentTxns.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">
            No transactions yet
          </p>
        ) : (
          <div className="flex flex-col">
            {recentTxns.map((txn, idx) => {
              const catDef = getFinanceCategoryDef(txn.category);
              const isExpense = txn.type === 'expense';
              return (
                <div
                  key={txn.id}
                  className={`flex items-center gap-3 py-3 ${
                    idx < recentTxns.length - 1 ? 'border-b border-border-subtle' : ''
                  }`}
                >
                  {/* Category icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
                      isExpense ? 'bg-danger/10' : 'bg-success/10'
                    }`}
                  >
                    {catDef.emoji}
                  </div>

                  {/* Description + category */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {txn.description || catDef.label}
                    </p>
                    <p className="text-xs text-text-secondary">{catDef.label}</p>
                  </div>

                  {/* Amount */}
                  <p
                    className={`text-sm font-semibold shrink-0 ${
                      isExpense ? 'text-danger' : 'text-success'
                    }`}
                  >
                    {isExpense ? '-' : '+'}
                    {formatCurrency(txn.amount, txn.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
