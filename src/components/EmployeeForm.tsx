import { useState } from 'react';
import { X } from 'lucide-react';
import { parseAmountInput } from '../utils/amountParser';
import type { Employee } from '../types';

interface EmployeeFormProps {
  onSave: (data: Omit<Employee, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  editingEmployee?: Employee;
  defaultCurrency: string;
}

export default function EmployeeForm({ onSave, onCancel, editingEmployee, defaultCurrency }: EmployeeFormProps) {
  const [name, setName] = useState(editingEmployee?.name ?? '');
  const [salary, setSalary] = useState(editingEmployee ? String(editingEmployee.salary) : '');
  const [payDay, setPayDay] = useState(editingEmployee?.payDay ?? 30);

  const parsedSalary = parseAmountInput(salary);
  const canSave = name.trim().length > 0 && parsedSalary > 0 && payDay >= 1 && payDay <= 31;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      salary: parsedSalary,
      currency: editingEmployee?.currency ?? defaultCurrency,
      payDay,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col">
      <div className="flex-shrink-0 bg-primary/5" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-hover transition-colors" aria-label="Close">
            <X size={20} className="text-text-secondary" />
          </button>
          <h2 className="text-base font-bold text-text-primary">{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
          <div className="w-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">Name</label>
            <input
              type="text"
              placeholder="e.g. Maria"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Employee name"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">Monthly Salary</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              aria-label="Monthly salary"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-2 block">Pay Day (Day of Month)</label>
            <select
              value={payDay}
              onChange={(e) => setPayDay(Number(e.target.value))}
              aria-label="Pay day"
              className="w-full bg-surface border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 pt-3 pb-3 border-t border-border/30 bg-bg" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all bg-primary text-white hover:bg-primary-dark active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
        >
          {editingEmployee ? 'Save Changes' : 'Add Employee'}
        </button>
      </div>
    </div>
  );
}
