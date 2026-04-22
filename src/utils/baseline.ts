// Historical-baseline estimator for the cashflow forecast.
//
// Looks at past expenses that AREN'T already covered by recurring transactions
// or commitment budgets, and produces a per-category monthly average. Used
// to bleed "typical variable spend" into the forecast so unmarked grocery /
// fuel / coffee spending doesn't invisibly distort the projection.

import type { Transaction, Budget, ExchangeRates } from '../types';
import { convertToBase } from './currencies';

export interface BaselineEstimate {
  totalMonthly: number;                   // sum in defaultCurrency
  byCategory: Record<string, number>;     // per-category monthly avg in defaultCurrency
  monthsUsed: number;                     // total distinct months observed in the window
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function estimateMonthlyBaseline(params: {
  transactions: Transaction[];
  budgets: Budget[];
  today: Date;
  defaultCurrency: string;
  exchangeRates: ExchangeRates | null;
  monthsLookback?: number;
}): BaselineEstimate {
  const {
    transactions,
    budgets,
    today,
    defaultCurrency,
    exchangeRates,
    monthsLookback = 3,
  } = params;

  const commitmentBudgetIds = new Set(
    budgets.filter((b) => b.isCommitment).map((b) => b.id)
  );

  // Window: [today - monthsLookback months, today)
  const windowStart = new Date(today);
  windowStart.setMonth(windowStart.getMonth() - monthsLookback);
  const startISO = dateKey(windowStart);
  const todayISO = dateKey(today);

  const byCategoryTotal: Record<string, number> = {};
  const byCategoryMonths: Record<string, Set<string>> = {};
  const allMonthsSeen = new Set<string>();

  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (t.isRecurring) continue;
    if (t.budgetId && commitmentBudgetIds.has(t.budgetId)) continue;
    if (t.date < startISO || t.date >= todayISO) continue;

    const amt = t.currency === defaultCurrency
      ? t.amount
      : convertToBase(t.amount, t.currency, defaultCurrency, exchangeRates);

    byCategoryTotal[t.category] = (byCategoryTotal[t.category] ?? 0) + amt;
    if (!byCategoryMonths[t.category]) byCategoryMonths[t.category] = new Set();
    byCategoryMonths[t.category]!.add(t.date.slice(0, 7));
    allMonthsSeen.add(t.date.slice(0, 7));
  }

  const byCategory: Record<string, number> = {};
  let totalMonthly = 0;
  for (const [cat, total] of Object.entries(byCategoryTotal)) {
    const monthCount = byCategoryMonths[cat]?.size ?? 1;
    const avg = total / monthCount;
    byCategory[cat] = avg;
    totalMonthly += avg;
  }

  return {
    totalMonthly,
    byCategory,
    monthsUsed: allMonthsSeen.size,
  };
}
