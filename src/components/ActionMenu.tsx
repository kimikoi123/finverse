import { TrendingDown, TrendingUp, PlaneTakeoff, Wallet } from 'lucide-react';

interface ActionMenuProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
  onNewTrip: () => void;
  onAddAccount: () => void;
  onClose: () => void;
}

export default function ActionMenu({ onAddExpense, onAddIncome, onNewTrip, onAddAccount, onClose }: ActionMenuProps) {
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl p-5 animate-slide-up border-t border-border">
        <div className="w-9 h-1 bg-border rounded-full mx-auto mb-5" />
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          <button
            onClick={onAddExpense}
            className="flex items-center gap-3.5 px-4 py-3.5 bg-surface-light rounded-2xl border border-border hover:bg-surface-hover transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
              <TrendingDown size={18} className="text-danger" />
            </div>
            <div className="text-left">
              <div className="text-[15px] font-semibold text-text-primary">Add Expense</div>
              <div className="text-xs text-text-secondary">Track money going out</div>
            </div>
          </button>
          <button
            onClick={onAddIncome}
            className="flex items-center gap-3.5 px-4 py-3.5 bg-surface-light rounded-2xl border border-border hover:bg-surface-hover transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-success" />
            </div>
            <div className="text-left">
              <div className="text-[15px] font-semibold text-text-primary">Add Income</div>
              <div className="text-xs text-text-secondary">Track money coming in</div>
            </div>
          </button>
          <button
            onClick={onNewTrip}
            className="flex items-center gap-3.5 px-4 py-3.5 bg-surface-light rounded-2xl border border-border hover:bg-surface-hover transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <PlaneTakeoff size={18} className="text-primary" />
            </div>
            <div className="text-left">
              <div className="text-[15px] font-semibold text-text-primary">New Trip</div>
              <div className="text-xs text-text-secondary">Split expenses with friends</div>
            </div>
          </button>
          <button
            onClick={onAddAccount}
            className="flex items-center gap-3.5 px-4 py-3.5 bg-surface-light rounded-2xl border border-border hover:bg-surface-hover transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet size={18} className="text-primary" />
            </div>
            <div className="text-left">
              <div className="text-[15px] font-semibold text-text-primary">Add Account</div>
              <div className="text-xs text-text-secondary">Track a wallet or bank account</div>
            </div>
          </button>
          <button
            onClick={onClose}
            className="mt-1 py-3.5 text-center text-sm font-medium text-text-secondary bg-surface-light rounded-2xl border border-border hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
