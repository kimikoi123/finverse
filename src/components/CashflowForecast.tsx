import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Transaction, Installment, DebtEntry, Account, Budget, ExchangeRates, PaydayConfig } from '../types';
import { formatCurrency } from '../utils/currencies';
import { computeTimeline, type ForecastEvent, type DailyBalance } from '../utils/forecast';
import { convertToBase } from '../utils/currencies';

interface CashflowForecastProps {
  transactions: Transaction[];
  installments: Installment[];
  debts: DebtEntry[];
  accounts: Account[];
  budgets: Budget[];
  defaultCurrency: string;
  paydayConfig?: PaydayConfig;
  exchangeRates: ExchangeRates | null;
  onBack: () => void;
}

function formatDateHeader(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const SOURCE_LABELS: Record<string, string> = {
  recurring: 'Recurring',
  payday: 'Payday',
  installment: 'Installment',
  debt: 'Debt',
  'credit-card': 'Credit Card',
  bill: 'Bill',
  scheduled: 'Scheduled',
};

function getDaysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function UrgencyBadge({ daysUntil, isReminder }: { daysUntil: number; isReminder?: boolean }) {
  if (isReminder) {
    return (
      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap">
        REMINDER
      </span>
    );
  }
  if (daysUntil < 0) {
    return (
      <span className="text-[9px] bg-danger/10 text-danger px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap">
        OVERDUE
      </span>
    );
  }
  if (daysUntil === 0) {
    return (
      <span className="text-[9px] bg-danger/10 text-danger px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap">
        TODAY
      </span>
    );
  }
  if (daysUntil <= 3) {
    return (
      <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap">
        SOON
      </span>
    );
  }
  return null;
}

function BalanceSparkline({
  daily,
  worstDate,
}: {
  daily: DailyBalance[];
  worstDate: Date | null;
}) {
  if (daily.length < 2) return null;

  const W = 320;
  const H = 64;
  const padX = 4;
  const padY = 8;

  const values = daily.map((d) => d.balance);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const minY = Math.min(0, dataMin);
  const maxY = Math.max(0, dataMax);
  const range = maxY - minY || 1;

  const toX = (i: number) => padX + (i / (daily.length - 1)) * (W - 2 * padX);
  const toY = (v: number) => H - padY - ((v - minY) / range) * (H - 2 * padY);

  const linePath = daily
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(2)} ${toY(d.balance).toFixed(2)}`)
    .join(' ');

  const areaPath =
    `M ${toX(0).toFixed(2)} ${toY(0).toFixed(2)} ` +
    daily.map((d, i) => `L ${toX(i).toFixed(2)} ${toY(d.balance).toFixed(2)}`).join(' ') +
    ` L ${toX(daily.length - 1).toFixed(2)} ${toY(0).toFixed(2)} Z`;

  const zeroY = toY(0);
  const anyNegative = dataMin < 0;

  const startPt = { x: toX(0), y: toY(daily[0]!.balance) };
  const endIdx = daily.length - 1;
  const endPt = { x: toX(endIdx), y: toY(daily[endIdx]!.balance) };
  const endPositive = daily[endIdx]!.balance >= 0;

  let worstPt: { x: number; y: number; balance: number } | null = null;
  if (worstDate) {
    const idx = daily.findIndex(
      (d) =>
        d.date.getFullYear() === worstDate.getFullYear() &&
        d.date.getMonth() === worstDate.getMonth() &&
        d.date.getDate() === worstDate.getDate(),
    );
    if (idx >= 0) {
      worstPt = { x: toX(idx), y: toY(daily[idx]!.balance), balance: daily[idx]!.balance };
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full h-16 mt-3"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {anyNegative && (
        <line
          x1={padX}
          x2={W - padX}
          y1={zeroY}
          y2={zeroY}
          strokeDasharray="2 3"
          className="stroke-text-tertiary"
          strokeWidth="1"
          opacity="0.5"
        />
      )}
      <path d={areaPath} className={endPositive ? 'text-success' : 'text-danger'} fill="url(#sparkFill)" />
      <path
        d={linePath}
        fill="none"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={endPositive ? 'stroke-success' : 'stroke-danger'}
      />
      <circle cx={startPt.x} cy={startPt.y} r="2.5" className="fill-text-secondary" />
      <circle
        cx={endPt.x}
        cy={endPt.y}
        r="3"
        className={endPositive ? 'fill-success' : 'fill-danger'}
      />
      {worstPt && worstPt.balance < 0 && (
        <circle cx={worstPt.x} cy={worstPt.y} r="3" className="fill-danger stroke-bg" strokeWidth="1.5" />
      )}
    </svg>
  );
}

function EventRow({ event, isLast }: { event: ForecastEvent; isLast: boolean }) {
  const isInflow = event.amount > 0;
  const daysUntil = getDaysUntil(event.date);

  return (
    <div
      className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-border-subtle' : ''}`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${
          isInflow ? 'bg-success/10' : 'bg-danger/10'
        }`}
      >
        {event.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-text-primary truncate">{event.description}</p>
          <UrgencyBadge daysUntil={daysUntil} isReminder={event.isReminder} />
        </div>
        <span className="text-[9px] bg-surface-lighter text-text-secondary px-1.5 py-0.5 rounded-md font-medium">
          {SOURCE_LABELS[event.source] ?? event.source}
        </span>
      </div>
      <p
        className={`text-sm font-semibold shrink-0 ${isInflow ? 'text-success' : 'text-danger'}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {isInflow ? '+' : '-'}{formatCurrency(Math.abs(event.amount), event.currency)}
      </p>
    </div>
  );
}

export default function CashflowForecast({
  transactions,
  installments,
  debts,
  accounts,
  budgets,
  defaultCurrency,
  paydayConfig,
  exchangeRates,
  onBack,
}: CashflowForecastProps) {
  const timeline = useMemo(
    () =>
      computeTimeline({
        transactions,
        paydayConfig,
        installments,
        debts,
        accounts,
        budgets,
        defaultCurrency,
        exchangeRates,
      }),
    [transactions, paydayConfig, installments, debts, accounts, budgets, defaultCurrency, exchangeRates],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; events: ForecastEvent[] }>();
    for (const event of timeline.events) {
      const key = dateKey(event.date);
      if (!map.has(key)) {
        map.set(key, { label: formatDateHeader(event.date), events: [] });
      }
      map.get(key)!.events.push(event);
    }
    return Array.from(map.values());
  }, [timeline.events]);

  const netPositive = timeline.net >= 0;
  const projectedPositive = timeline.projectedBalance >= 0;

  const creditDebt = useMemo(
    () =>
      accounts
        .filter((a) => a.type === 'credit' && a.balance > 0)
        .reduce((sum, a) => {
          const bal = a.currency === defaultCurrency
            ? a.balance
            : convertToBase(a.balance, a.currency, defaultCurrency, exchangeRates);
          return sum + bal;
        }, 0),
    [accounts, defaultCurrency, exchangeRates],
  );

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface border border-border hover:bg-surface-hover active:scale-[0.98] transition-all shrink-0"
        >
          <ArrowLeft size={18} className="text-text-primary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary" data-heading>
            Cashflow Forecast
          </h1>
          <p className="text-xs text-text-secondary">Next 30 days</p>
        </div>
      </div>

      {/* Projected balance hero card */}
      <div className="bg-surface rounded-2xl border border-border p-4 sm:p-5 mb-4">
        <p className="text-[10px] font-semibold text-text-secondary tracking-wider mb-3">
          PROJECTED BALANCE
        </p>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-text-secondary mb-0.5">Cash today</p>
            <p
              className={`text-lg font-bold ${timeline.startingBalance >= 0 ? 'text-text-primary' : 'text-danger'}`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {timeline.startingBalance < 0 && '-'}{formatCurrency(Math.abs(timeline.startingBalance), defaultCurrency)}
            </p>
            {creditDebt > 0 && (
              <p className="text-[10px] text-text-tertiary mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                −{formatCurrency(creditDebt, defaultCurrency)} on cards
              </p>
            )}
          </div>
          <div className="text-text-tertiary text-lg shrink-0">→</div>
          <div className="min-w-0 text-right">
            <p className="text-xs text-text-secondary mb-0.5">In 30 days</p>
            <p
              className={`text-lg font-bold ${projectedPositive ? 'text-success' : 'text-danger'}`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {!projectedPositive && '-'}{formatCurrency(Math.abs(timeline.projectedBalance), defaultCurrency)}
            </p>
          </div>
        </div>
        <BalanceSparkline
          daily={timeline.dailyBalances}
          worstDate={timeline.minBalanceDate}
        />
        <div className="flex items-center justify-between gap-2 mt-1">
          {timeline.estimatedMonthlyOut > 0 ? (
            <span
              className="text-[10px] text-text-tertiary"
              style={{ fontVariantNumeric: 'tabular-nums' }}
              title="Estimated from your last 3 months of variable spending"
            >
              ≈ -{formatCurrency(timeline.estimatedMonthlyOut, defaultCurrency)}/mo est. spend
            </span>
          ) : <span />}
          <span
            className={`text-xs font-semibold ${netPositive ? 'text-success' : 'text-danger'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {netPositive ? '↑' : '↓'} {netPositive ? '+' : '-'}{formatCurrency(Math.abs(timeline.net), defaultCurrency)}
          </span>
        </div>
        {timeline.minBalance < 0 && (
          <div className="mt-3 bg-danger/10 rounded-xl px-3 py-2">
            <p className="text-xs font-medium text-danger">
              {timeline.minBalanceDate
                ? `Dips to -${formatCurrency(Math.abs(timeline.minBalance), defaultCurrency)} on ${formatDateHeader(timeline.minBalanceDate)}`
                : 'You may run short — starting balance is already negative'}
            </p>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        <div className="bg-surface rounded-2xl border border-border p-3 text-center">
          <p className="text-[10px] font-semibold text-text-secondary tracking-wider mb-1">
            EXPECTED IN
          </p>
          <p className="text-base font-bold text-success" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(timeline.totalIn, defaultCurrency)}
          </p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-3 text-center">
          <p className="text-[10px] font-semibold text-text-secondary tracking-wider mb-1">
            EXPECTED OUT
          </p>
          <p className="text-base font-bold text-danger" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(timeline.totalOut, defaultCurrency)}
          </p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-3 text-center">
          <p className="text-[10px] font-semibold text-text-secondary tracking-wider mb-1">
            NET
          </p>
          <p
            className={`text-base font-bold ${netPositive ? 'text-success' : 'text-danger'}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {netPositive ? '+' : '-'}{formatCurrency(Math.abs(timeline.net), defaultCurrency)}
          </p>
        </div>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">📅</span>
            <h2 className="text-xl font-bold text-text-primary" data-heading>
              No upcoming events
            </h2>
            <p className="text-sm text-text-secondary max-w-xs">
              Set up recurring transactions, installments, or a payday to see your cashflow forecast
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-text-secondary tracking-wider uppercase mb-2">
                {group.label}
              </p>
              <div className="bg-surface rounded-2xl border border-border p-4">
                {group.events.map((event, idx) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    isLast={idx === group.events.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
