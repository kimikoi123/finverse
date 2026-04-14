import { ArrowLeft, Plus, Users } from 'lucide-react';
import type { Employee } from '../types';

interface PayrollListProps {
  employees: Employee[];
  totalPendingAdvances: (employeeId: string) => number;
  onAdd: () => void;
  onSelect: (employee: Employee) => void;
  onBack: () => void;
  formatAmount: (amount: number, currency: string) => string;
}

function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0]!;
}

export default function PayrollList({ employees, totalPendingAdvances, onAdd, onSelect, onBack, formatAmount }: PayrollListProps) {
  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-hover transition-colors" aria-label="Back">
          <ArrowLeft size={18} className="text-text-secondary" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Payroll</h2>
          <p className="text-xs text-text-secondary">Manage employee payments</p>
        </div>
        <button
          onClick={onAdd}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors"
          aria-label="Add employee"
        >
          <Plus size={18} />
        </button>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-1">No employees yet</h3>
          <p className="text-sm text-text-secondary mb-4">Add someone you pay regularly to get started.</p>
          <button
            onClick={onAdd}
            className="px-5 py-2.5 rounded-2xl text-sm font-bold bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all"
          >
            Add Employee
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {employees.map((emp) => {
            const pending = totalPendingAdvances(emp.id);
            return (
              <button
                key={emp.id}
                onClick={() => onSelect(emp)}
                className="w-full flex items-center gap-3.5 p-4 bg-surface rounded-2xl border border-border hover:bg-surface-hover active:scale-[0.98] transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{emp.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-text-primary truncate">{emp.name}</div>
                  <div className="text-xs text-text-secondary">Pay day: {emp.payDay}{ordinalSuffix(emp.payDay)}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-text-primary">{formatAmount(emp.salary, emp.currency)}</div>
                  {pending > 0 ? (
                    <>
                      <div className="text-[11px] text-danger font-medium">-{formatAmount(pending, emp.currency)} advances</div>
                      <div className="text-[11px] text-text-secondary">Net: {formatAmount(emp.salary - pending, emp.currency)}</div>
                    </>
                  ) : (
                    <div className="text-[11px] text-success font-medium">No advances</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
