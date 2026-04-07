import { formatCurrency } from '../utils/currencies';
import type { Transaction } from '../types';

interface AccountChartsProps {
  transactions: Transaction[];
  accountId: string;
  accountColor: string;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function WeeklyBarChart({
  transactions,
  accountId,
  accountColor,
}: {
  transactions: Transaction[];
  accountId: string;
  accountColor: string;
}) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const expenseTransactions = transactions.filter(
    (t) => t.accountId === accountId && t.type === 'expense',
  );

  const dailyTotals = days.map((day) => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return expenseTransactions
      .filter((t) => t.date === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);
  });

  const maxTotal = Math.max(...dailyTotals);

  const hasData = expenseTransactions.length > 0;
  if (!hasData) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-4 flex items-center justify-center min-h-[140px]">
        <span className="text-xs text-text-secondary">No data yet</span>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-4">
      <div className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-3">
        Last 7 days
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 48 }}>
        {dailyTotals.map((total, i) => {
          const isToday = i === 6;
          const barHeight =
            maxTotal > 0 ? Math.max(2, (total / maxTotal) * 48) : 2;
          return (
            <div
              key={days[i]?.toISOString()}
              className={`flex-1 rounded-sm ${isToday ? '' : 'bg-border'}`}
              style={{
                height: barHeight,
                minHeight: 2,
                ...(isToday ? { backgroundColor: accountColor } : {}),
              }}
            />
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="flex-1 text-center text-[9px] text-text-secondary"
          >
            {DAY_LABELS[day.getDay()]}
          </div>
        ))}
      </div>
    </div>
  );
}

function IncomeExpenseDonut({
  transactions,
  accountId,
}: {
  transactions: Transaction[];
  accountId: string;
}) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthTransactions = transactions.filter((t) => {
    if (t.accountId !== accountId) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const hasData = monthTransactions.length > 0;

  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  if (!hasData) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-4 flex items-center justify-center min-h-[140px]">
        <span className="text-xs text-text-secondary">No data yet</span>
      </div>
    );
  }

  const total = income + expense;
  const incomePercent = total > 0 ? (income / total) * 100 : 50;
  const net = income - expense;
  const currency = monthTransactions[0]?.currency ?? 'USD';

  return (
    <div className="bg-surface rounded-2xl border border-border p-4 flex flex-col items-center">
      <div className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-3 self-start">
        This month
      </div>
      <div
        className="relative"
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: `conic-gradient(#16a34a ${incomePercent}%, #dc2626 ${incomePercent}% 100%)`,
        }}
      >
        <div className="absolute inset-2 rounded-full bg-surface flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-bold text-text-primary">
              {formatCurrency(Math.abs(net), currency)}
            </div>
            <div className="text-[9px] text-text-secondary">
              NET {income >= expense ? 'IN' : 'OUT'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountCharts({
  transactions,
  accountId,
  accountColor,
}: AccountChartsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
      <WeeklyBarChart
        transactions={transactions}
        accountId={accountId}
        accountColor={accountColor}
      />
      <IncomeExpenseDonut
        transactions={transactions}
        accountId={accountId}
      />
    </div>
  );
}
