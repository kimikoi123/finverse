import { useMemo } from 'react';
import { Utensils, Car, Home, Ticket, ShoppingBag, ReceiptText, TrendingUp, Users, CalendarDays, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { convertToBase, formatCurrency } from '../utils/currencies';
import type { Trip, ExchangeRates } from '../types';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  activities: Ticket,
  shopping: ShoppingBag,
  general: ReceiptText,
};

const CATEGORY_BAR_COLORS: Record<string, string> = {
  food: 'bg-orange-400',
  transport: 'bg-blue-400',
  accommodation: 'bg-purple-400',
  activities: 'bg-green-400',
  shopping: 'bg-pink-400',
  general: 'bg-gray-400',
};

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  food: 'text-orange-400 bg-orange-400/15',
  transport: 'text-blue-400 bg-blue-400/15',
  accommodation: 'text-purple-400 bg-purple-400/15',
  activities: 'text-green-400 bg-green-400/15',
  shopping: 'text-pink-400 bg-pink-400/15',
  general: 'text-gray-400 bg-gray-400/15',
};

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  transport: 'Transport',
  accommodation: 'Accommodation',
  activities: 'Activities',
  shopping: 'Shopping',
  general: 'General',
};

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
      <div className="text-center py-8">
        <BarChart3 size={32} className="text-text-secondary mx-auto mb-2" />
        <p className="text-text-secondary text-sm">Add expenses to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section A: Per-Category Breakdown */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Spending by Category</h3>
        </div>
        <div className="space-y-3">
          {categoryBreakdown.entries.map(([category, amount]) => {
            const Icon = CATEGORY_ICONS[category] ?? ReceiptText;
            const barColor = CATEGORY_BAR_COLORS[category] ?? 'bg-gray-400';
            const textColor = CATEGORY_TEXT_COLORS[category] ?? CATEGORY_TEXT_COLORS['general']!;
            const label = CATEGORY_LABELS[category] ?? category;
            const percentage = categoryBreakdown.max > 0 ? (amount / categoryBreakdown.max) * 100 : 0;
            const sharePercent = categoryBreakdown.grandTotal > 0 ? (amount / categoryBreakdown.grandTotal) * 100 : 0;

            return (
              <div key={category} className="hover:bg-surface-light/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${textColor}`}>
                      <Icon size={14} />
                    </div>
                    <span className="text-sm text-text-primary">{label}</span>
                    <span className="text-xs text-text-secondary">{sharePercent.toFixed(0)}%</span>
                  </div>
                  <span className="text-sm font-medium text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(amount, baseCurrency)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-light overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${barColor} animate-bar-grow shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]`}
                    style={{ '--target-width': `${percentage}%`, width: `${percentage}%` } as React.CSSProperties}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section B: Per-Member Spending */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Spending by Member</h3>
        </div>
        <div className="space-y-3">
          {memberBreakdown.entries.map(([memberId, amount]) => {
            const percentage = memberBreakdown.max > 0 ? (amount / memberBreakdown.max) * 100 : 0;

            return (
              <div key={memberId} className="hover:bg-surface-light/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-primary">{getMemberName(memberId)}</span>
                  <span className="text-sm font-medium text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(amount, baseCurrency)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-light overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-primary animate-bar-grow shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                    style={{ '--target-width': `${percentage}%`, width: `${percentage}%` } as React.CSSProperties}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section C: Daily Spending */}
      {dailyBreakdown != null && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Daily Spending</h3>
          </div>
          <div className="space-y-3">
            {dailyBreakdown.entries.map(([date, amount]) => {
              const percentage = dailyBreakdown.max > 0 ? (amount / dailyBreakdown.max) * 100 : 0;
              const formatted = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={date} className="hover:bg-surface-light/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-primary">{formatted}</span>
                    <span className="text-sm font-medium text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(amount, baseCurrency)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-light overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-accent animate-bar-grow shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                      style={{ '--target-width': `${percentage}%`, width: `${percentage}%` } as React.CSSProperties}
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
