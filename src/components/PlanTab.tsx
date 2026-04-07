import { BarChart3, Target, Banknote, CreditCard, ChevronRight } from 'lucide-react';
import TripList from './TripList';
import TripDashboard from './TripDashboard';
import type { Trip, DeletedTrip, Member, Expense, Goal, DebtEntry, Installment, ExchangeRates, RateSource } from '../types';
import type { BudgetWithSpending } from '../hooks/useBudgets';

interface ExchangeRateState {
  rates: ExchangeRates;
  status: 'loading' | 'ready' | 'error';
  lastUpdated: number | null;
  source: RateSource;
  refresh: () => Promise<void>;
}

interface PlanTabProps {
  trips: Trip[];
  activeTrip: Trip | null;
  deletedTrips: DeletedTrip[];
  exchangeRates: ExchangeRateState;
  budgets: BudgetWithSpending[];
  goals: Goal[];
  debts: DebtEntry[];
  installments: Installment[];
  onSelectTrip: (id: string | null) => void;
  onCreateTrip: (name: string, currency?: string) => Trip;
  onDeleteTrip: (id: string) => void;
  onRestoreTrip: (id: string) => void;
  onPermanentlyDeleteTrip: (id: string) => void;
  onEmptyTrash: () => void;
  onAddMember: (name: string) => Member | undefined;
  onRemoveMember: (id: string) => boolean | undefined;
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense | undefined;
  onRemoveExpense: (id: string) => void;
  onEditExpense: (id: string, updates: Partial<Expense>) => void;
  onUpdateTrip: (updates: Partial<Trip>) => void;
  onOpenBudgets: () => void;
  onOpenGoals: () => void;
  onOpenDebts: () => void;
  onOpenInstallments: () => void;
  showToast: (message: string, onCommit: () => void) => string;
}

export default function PlanTab({
  trips,
  activeTrip,
  deletedTrips,
  exchangeRates,
  budgets,
  goals,
  debts,
  installments,
  onSelectTrip,
  onCreateTrip,
  onDeleteTrip,
  onRestoreTrip,
  onPermanentlyDeleteTrip,
  onEmptyTrash,
  onAddMember,
  onRemoveMember,
  onAddExpense,
  onRemoveExpense,
  onEditExpense,
  onUpdateTrip,
  onOpenBudgets,
  onOpenGoals,
  onOpenDebts,
  onOpenInstallments,
  showToast,
}: PlanTabProps) {
  if (activeTrip) {
    return (
      <TripDashboard
        trip={activeTrip}
        exchangeRates={exchangeRates}
        onAddMember={onAddMember}
        onRemoveMember={onRemoveMember}
        onAddExpense={onAddExpense}
        onRemoveExpense={onRemoveExpense}
        onEditExpense={onEditExpense}
        onUpdateTrip={onUpdateTrip}
        showToast={showToast}
      />
    );
  }

  const planItems = [
    {
      icon: BarChart3,
      label: 'Category budgets',
      desc: budgets.length === 0 ? 'Set spending limits by category' : `${budgets.length} active budget${budgets.length !== 1 ? 's' : ''}`,
      onClick: onOpenBudgets,
    },
    {
      icon: Target,
      label: 'Personal goals',
      desc: goals.length === 0 ? 'Save toward your targets' : `${goals.length} goal${goals.length !== 1 ? 's' : ''} in progress`,
      onClick: onOpenGoals,
    },
    {
      icon: Banknote,
      label: 'Debts',
      desc: debts.length === 0 ? 'Track money owed' : `${debts.length} debt${debts.length !== 1 ? 's' : ''} tracked`,
      onClick: onOpenDebts,
    },
    {
      icon: CreditCard,
      label: 'Installments',
      desc: installments.length === 0 ? 'Track credit card installment plans' : `${installments.length} installment${installments.length !== 1 ? 's' : ''}`,
      onClick: onOpenInstallments,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 animate-fade-in">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-text-primary tracking-tight" data-heading>Plan</h2>
        <p className="text-sm text-text-secondary mt-1">Manage your budgets, goals, and more.</p>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {planItems.map(({ icon: Icon, label, desc, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="w-full flex items-center gap-3.5 p-4 bg-surface rounded-2xl border border-border hover:bg-surface-hover active:scale-[0.99] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon size={18} className="text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[15px] font-semibold text-text-primary">{label}</div>
              <div className="text-xs text-text-secondary">{desc}</div>
            </div>
            <ChevronRight size={16} className="text-text-secondary" />
          </button>
        ))}
      </div>

      <TripList
        trips={trips}
        deletedTrips={deletedTrips}
        onSelect={onSelectTrip}
        onCreate={onCreateTrip}
        onDelete={onDeleteTrip}
        onRestore={onRestoreTrip}
        onPermanentlyDelete={onPermanentlyDeleteTrip}
        onEmptyTrash={onEmptyTrash}
        showToast={showToast}
      />
    </div>
  );
}
