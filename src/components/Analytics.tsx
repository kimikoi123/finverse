import { useMemo } from 'react';
import { TrendingUp, Users, CalendarDays, BarChart3 } from 'lucide-react';
import { convertToBase, formatCurrency } from '../utils/currencies';
import { getCategoryIcon, getCategoryColor, getCategoryBarColor, getCategoryLabel } from '../utils/categories';
import type { Trip, ExchangeRates } from '../types';

interface AnalyticsProps {
  trip: Trip;
  exchangeRates: ExchangeRates;
}

export default function Analytics({ trip, exchangeRates }: AnalyticsProps) {
  const { members, baseCurrency } = trip;
  const expenses = useMemo(() => trip.expenses.filter(e => !e.isSettlement), [trip.expenses]);

  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const expense of expenses) {
      const base = convertToBase(expense.amount, expense.currency, baseCurrency, exchangeRates);
      const cat = expense.category || 'general';
      totals[cat] = (totals[cat] ?? 0) + base;
    }
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const grandTotal = entries.reduce((sum, [, v]) => sum + v, 0);
    const max = entries.length > 0 ? entries[0]![1] : 0;
    return { entries, grandTotal, max };
  }, [expenses, baseCurrency, exchangeRates]);

  const memberBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const expense of expenses) {
      const base = convertToBase(expense.amount, expense.currency, baseCurrency, exchangeRates);
      totals[expense.paidBy] = (totals[expense.paidBy] ?? 0) + base;
    }
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const max = entries.length > 0 ? entries[0]![1] : 0;
    return { entries, max };
  }, [expenses, baseCurrency, exchangeRates]);

  const dailyBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    let hasAnyDate = false;
    for (const expense of expenses) {
      if (expense.date) {
        hasAnyDate = true;
        const base = convertToBase(expense.amount, expense.currency, baseCurrency, exchangeRates);
        totals[expense.date] = (totals[expense.date] ?? 0) + base;
      }
    }
    if (!hasAnyDate) return null;
    const entries = Object.entries(totals).sort((a, b) => a[0].localeCompare(b[0]));
    const max = entries.length > 0 ? Math.max(...entries.map(([, v]) => v)) : 0;
    return { entries, max };
  }, [expenses, baseCurrency, exchangeRates]);

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';

  if (expenses.length === 0) {
    return (
      <div className="text-center py-10">
        <BarChart3 size={28} className="text-text-secondary/25 mx-auto mb-3" />
        <p className="text-text-secondary/50 text-sm">Add expenses to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section A: Per-Category Breakdown */}
      <div className="bg-surface rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp size={15} className="text-primary/70" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary tracking-tight">Spending by Category</h3>
        </div>
        <div className="space-y-3.5">
          {categoryBreakdown.entries.map(([category, amount]) => {
            const Icon = getCategoryIcon(category);
            const barColor = getCategoryBarColor(category);
            const textColor = getCategoryColor(category);
            const label = getCategoryLabel(category, trip.customCategories);
            const percentage = categoryBreakdown.max > 0 ? (amount / categoryBreakdown.max) * 100 : 0;
            const sharePercent = categoryBreakdown.grandTotal > 0 ? (amount / categoryBreakdown.grandTotal) * 100 : 0;

            return (
              <div key={category} className="hover:bg-surface-light/20 -mx-2 px-2 py-1.5 rounded-xl transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${textColor}`}>
                      <Icon size={13} />
                    </div>
                    <span className="text-sm text-text-primary">{label}</span>
                    <span className="text-[10px] text-text-secondary/35">{sharePercent.toFixed(0)}%</span>
                  </div>
                  <span className="text-sm font-medium text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(amount, baseCurrency)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-light/40 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${barColor} animate-bar-grow`}
                    style={{ '--target-width': `${percentage}%`, width: `${percentage}%`, opacity: 0.7 } as React.CSSProperties}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section B: Per-Member Spending */}
      <div className="bg-surface rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users size={15} className="text-primary/70" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary tracking-tight">Spending by Member</h3>
        </div>
        <div className="space-y-3.5">
          {memberBreakdown.entries.map(([memberId, amount]) => {
            const percentage = memberBreakdown.max > 0 ? (amount / memberBreakdown.max) * 100 : 0;

            return (
              <div key={memberId} className="hover:bg-surface-light/20 -mx-2 px-2 py-1.5 rounded-xl transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-text-primary">{getMemberName(memberId)}</span>
                  <span className="text-sm font-medium text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(amount, baseCurrency)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-light/40 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-primary animate-bar-grow"
                    style={{ '--target-width': `${percentage}%`, width: `${percentage}%`, opacity: 0.6 } as React.CSSProperties}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section C: Daily Spending */}
      {dailyBreakdown != null && (
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays size={15} className="text-primary/70" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">Daily Spending</h3>
          </div>
          <div className="space-y-3.5">
            {dailyBreakdown.entries.map(([date, amount]) => {
              const percentage = dailyBreakdown.max > 0 ? (amount / dailyBreakdown.max) * 100 : 0;
              const formatted = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={date} className="hover:bg-surface-light/20 -mx-2 px-2 py-1.5 rounded-xl transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-text-primary">{formatted}</span>
                    <span className="text-sm font-medium text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(amount, baseCurrency)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-light/40 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full bg-accent animate-bar-grow"
                      style={{ '--target-width': `${percentage}%`, width: `${percentage}%`, opacity: 0.6 } as React.CSSProperties}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
