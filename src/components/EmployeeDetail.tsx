import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Check, Trash2 } from 'lucide-react';
import { parseAmountInput } from '../utils/amountParser';
import type { Employee, Advance } from '../types';
import ConfirmDialog from './ui/ConfirmDialog';

interface EmployeeDetailProps {
  employee: Employee;
  advances: Advance[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddAdvance: (employeeId: string, amount: number) => Promise<Advance>;
  onRemoveAdvance: (id: string) => Promise<void>;
  onSettle: (employeeId: string) => Promise<void>;
  formatAmount: (amount: number, currency: string) => string;
}

interface MonthGroup {
  label: string;
  isCurrent: boolean;
  advances: Advance[];
  netPay: number;
  settledAt?: string;
}

function groupAdvancesByMonth(advances: Advance[], salary: number): MonthGroup[] {
  const now = new Date();
  const currentMonth = now.getFullYear() * 12 + now.getMonth();

  const groups = new Map<string, { advances: Advance[]; settledAt?: string }>();

  for (const adv of advances) {
    const d = new Date(adv.settledAt ?? adv.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const existing = groups.get(key) ?? { advances: [], settledAt: undefined };
    existing.advances.push(adv);
    if (adv.settledAt && !existing.settledAt) existing.settledAt = adv.settledAt;
    groups.set(key, existing);
  }

  // Ensure current month always exists
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!groups.has(currentKey)) {
    groups.set(currentKey, { advances: [], settledAt: undefined });
  }

  const sorted = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return sorted.map(([key, { advances: monthAdvances, settledAt }]) => {
    const [yearStr, monthStr] = key.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const monthKey = year * 12 + month;
    const isCurrent = monthKey === currentMonth;
    const totalAdvances = monthAdvances.reduce((s, a) => s + a.amount, 0);
    const date = new Date(year, month);
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return {
      label,
      isCurrent,
      advances: monthAdvances.sort((a, b) => a.date.localeCompare(b.date)),
      netPay: salary - totalAdvances,
      settledAt,
    };
  });
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0]!;
}

export default function EmployeeDetail({
  employee,
  advances,
  onBack,
  onEdit,
  onDelete,
  onAddAdvance,
  onRemoveAdvance,
  onSettle,
  formatAmount,
}: EmployeeDetailProps) {
  const [showAdvanceInput, setShowAdvanceInput] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);

  const pendingAdvances = useMemo(
    () => advances.filter((a) => !a.settled),
    [advances],
  );
  const totalPending = pendingAdvances.reduce((s, a) => s + a.amount, 0);
  const remaining = employee.salary - totalPending;
  const monthGroups = useMemo(
    () => groupAdvancesByMonth(advances, employee.salary),
    [advances, employee.salary],
  );

  const parsedAdvance = parseAmountInput(advanceAmount);
  const advanceExceedsSalary = parsedAdvance > 0 && parsedAdvance > remaining;
  const canAddAdvance = parsedAdvance > 0 && !advanceExceedsSalary;

  const handleAddAdvance = async () => {
    if (!canAddAdvance) return;
    await onAddAdvance(employee.id, parsedAdvance);
    setAdvanceAmount('');
    setShowAdvanceInput(false);
  };

  const handleSettle = async () => {
    await onSettle(employee.id);
    setShowSettleConfirm(false);
  };

  return (
    <div className="max-w-2xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary-dark text-white px-4 pt-3 pb-5 rounded-b-3xl" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors">
              Edit
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors">
              Delete
            </button>
          </div>
        </div>
        <div className="text-[11px] uppercase tracking-widest opacity-80">Monthly Salary</div>
        <div className="text-3xl font-bold mt-1">{formatAmount(employee.salary, employee.currency)}</div>
        <div className="text-sm opacity-80 mt-1">{employee.name} &middot; Pay day: {employee.payDay}{ordinalSuffix(employee.payDay)}</div>
      </div>

      <div className="px-4 py-4">
        {/* Advance input */}
        {showAdvanceInput ? (
          <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">Advance Amount</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              autoFocus
              className="w-full bg-bg border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all mb-2"
            />
            {advanceExceedsSalary && (
              <p className="text-xs text-danger mb-2">
                This would exceed {employee.name}&apos;s remaining salary of {formatAmount(remaining, employee.currency)}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAddAdvance}
                disabled={!canAddAdvance}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                Record Advance
              </button>
              <button
                onClick={() => { setShowAdvanceInput(false); setAdvanceAmount(''); }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-surface-hover text-text-secondary hover:bg-border/50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowAdvanceInput(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all"
            >
              <Plus size={16} /> Record Advance
            </button>
            {pendingAdvances.length > 0 && new Date().getDate() >= employee.payDay && (
              <button
                onClick={() => setShowSettleConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.98] transition-all"
              >
                <Check size={16} /> Settle Payday
              </button>
            )}
          </div>
        )}

        {/* Timeline */}
        {monthGroups.map((group) => (
          <div key={group.label} className={`border-l-2 ${group.isCurrent ? 'border-primary' : 'border-border'} pl-3 mb-5`}>
            <div className={`text-xs font-semibold mb-2 ${group.isCurrent ? 'text-primary' : 'text-text-secondary'}`}>
              {group.label.toUpperCase()}{group.isCurrent ? ' · CURRENT' : ''}
            </div>
            {group.advances.length === 0 ? (
              <div className="text-xs text-text-secondary">No advances</div>
            ) : (
              group.advances.map((adv) => (
                <div key={adv.id} className="flex items-center justify-between text-sm mb-1.5">
                  <div className="text-text-secondary">
                    {new Date(adv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' — Advance '}
                    <span className="font-medium text-text-primary">{formatAmount(adv.amount, employee.currency)}</span>
                  </div>
                  {!adv.settled && group.isCurrent && (
                    <button
                      onClick={() => onRemoveAdvance(adv.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors"
                      aria-label="Delete advance"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
            {group.settledAt && !group.isCurrent && (
              <div className="text-xs text-text-secondary mt-1">
                Settled {new Date(group.settledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — Paid {formatAmount(group.netPay, employee.currency)}
              </div>
            )}
            {group.isCurrent && pendingAdvances.length > 0 && (
              <div className="text-sm font-semibold text-primary mt-2">
                Net: {formatAmount(employee.salary - totalPending, employee.currency)}
              </div>
            )}
          </div>
        ))}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Employee"
          message={`Remove ${employee.name} and all their advance records?`}
          confirmLabel="Delete"
          onConfirm={() => { onDelete(); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {showSettleConfirm && (
        <ConfirmDialog
          title="Settle Payday"
          message={`Pay ${employee.name} ${formatAmount(employee.salary - totalPending, employee.currency)}? (Salary ${formatAmount(employee.salary, employee.currency)} minus ${formatAmount(totalPending, employee.currency)} in advances)`}
          confirmLabel="Settle"
          onConfirm={handleSettle}
          onCancel={() => setShowSettleConfirm(false)}
        />
      )}
    </div>
  );
}
