import { useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction } from '../types';
import { formatCurrency, isPrivacyMode } from '../utils/currencies';

interface SpendingHeatmapProps {
  transactions: Transaction[];
  defaultCurrency: string;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getIntensityLevel(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (amount === 0) return 0;
  const ratio = amount / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

const INTENSITY_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-surface-light',
  1: 'bg-primary/15',
  2: 'bg-primary/30',
  3: 'bg-primary/50',
  4: 'bg-primary/75',
};

export default function SpendingHeatmap({
  transactions,
  defaultCurrency,
}: SpendingHeatmapProps) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { days, maxSpending, monthTotal, daysInMonth, firstDayOffset } =
    useMemo(() => {
      const dim = getDaysInMonth(viewMonth.year, viewMonth.month);
      const offset = getFirstDayOfWeek(viewMonth.year, viewMonth.month);

      const expenseByDate: Record<string, number> = {};
      const monthStart = isoDate(viewMonth.year, viewMonth.month, 1);
      const monthEnd = isoDate(viewMonth.year, viewMonth.month, dim);

      for (const t of transactions) {
        if (
          t.type === 'expense' &&
          t.date >= monthStart &&
          t.date <= monthEnd
        ) {
          expenseByDate[t.date] = (expenseByDate[t.date] ?? 0) + t.amount;
        }
      }

      let total = 0;
      const dayList: { day: number; iso: string; total: number }[] = [];
      for (let d = 1; d <= dim; d++) {
        const iso = isoDate(viewMonth.year, viewMonth.month, d);
        const dayTotal = expenseByDate[iso] ?? 0;
        total += dayTotal;
        dayList.push({ day: d, iso, total: dayTotal });
      }

      const max = Math.max(...dayList.map((d) => d.total), 1);

      return {
        days: dayList,
        maxSpending: max,
        monthTotal: total,
        daysInMonth: dim,
        firstDayOffset: offset,
      };
    }, [transactions, viewMonth.year, viewMonth.month]);

  const todayISO = isoDate(now.getFullYear(), now.getMonth(), now.getDate());
  const isCurrentMonth =
    viewMonth.year === now.getFullYear() &&
    viewMonth.month === now.getMonth();

  const trailingCells =
    (7 - ((firstDayOffset + daysInMonth) % 7)) % 7;

  function navigateMonth(delta: number) {
    setSelectedDay(null);
    setViewMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const selectedDayData =
    selectedDay != null ? days.find((d) => d.day === selectedDay) : null;

  return (
    <div className="mb-4">
      <div className="bg-surface rounded-2xl border border-border p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays size={15} className="text-primary/70" />
            </div>
            <p className="text-[10px] font-semibold text-text-secondary tracking-wider">
              SPENDING HEATMAP
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              aria-label="Previous month"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-light transition-colors active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-text-primary min-w-[110px] text-center">
              {formatMonthYear(viewMonth.year, viewMonth.month)}
            </span>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              aria-label="Next month"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-light transition-colors active:scale-95"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Month total */}
        <p className="text-lg font-bold text-text-primary mb-3">
          {formatCurrency(monthTotal, defaultCurrency)}
        </p>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="text-center text-[9px] text-text-secondary font-medium"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {/* Empty offset cells */}
          {Array.from({ length: firstDayOffset }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {days.map((day) => {
            const level = isPrivacyMode() ? 0 : getIntensityLevel(day.total, maxSpending);
            const isToday = isCurrentMonth && day.iso === todayISO;
            const isSelected = selectedDay === day.day;
            const dateLabel = new Date(viewMonth.year, viewMonth.month, day.day)
              .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const tooltip = isPrivacyMode()
              ? dateLabel
              : day.total > 0
                ? `${dateLabel} — spent ${formatCurrency(day.total, defaultCurrency)}`
                : `${dateLabel} — no spending`;
            return (
              <button
                key={day.day}
                type="button"
                title={tooltip}
                onClick={() =>
                  setSelectedDay(isSelected ? null : day.day)
                }
                className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium transition-all ${INTENSITY_CLASSES[level]} ${
                  isToday ? 'ring-2 ring-primary' : ''
                } ${
                  isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                } ${
                  level >= 3
                    ? 'text-white'
                    : level >= 1
                      ? 'text-text-primary'
                      : 'text-text-secondary'
                }`}
              >
                {day.day}
              </button>
            );
          })}

          {/* Trailing empty cells */}
          {Array.from({ length: trailingCells }, (_, i) => (
            <div key={`trail-${i}`} />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <span className="text-[9px] text-text-secondary">Less</span>
          {([1, 2, 3, 4] as const).map((level) => (
            <div
              key={level}
              className={`w-3 h-3 rounded-sm ${INTENSITY_CLASSES[level]}`}
            />
          ))}
          <span className="text-[9px] text-text-secondary">More</span>
        </div>

        {/* Selected day detail */}
        {selectedDayData != null && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-sm text-text-primary">
              {new Date(
                viewMonth.year,
                viewMonth.month,
                selectedDayData.day,
              ).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {selectedDayData.total > 0 ? (
              <span className="text-sm font-semibold text-danger">
                -{formatCurrency(selectedDayData.total, defaultCurrency)}
              </span>
            ) : (
              <span className="text-sm text-text-secondary">No spending</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
