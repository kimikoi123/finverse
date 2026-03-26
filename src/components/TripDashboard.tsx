import { useState } from 'react';
import { Plus, Receipt, Scale, Users as UsersIcon, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MemberManager from './MemberManager';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import Settlement from './Settlement';
import { CURRENCIES, convertToBase } from '../utils/currencies';
import type { Trip, Member, Expense, ExchangeRates, RateSource } from '../types';

interface ExchangeRateState {
  rates: ExchangeRates;
  status: 'loading' | 'ready' | 'error';
  lastUpdated: number | null;
  source: RateSource;
  refresh: () => Promise<void>;
}

interface TripDashboardProps {
  trip: Trip;
  exchangeRates: ExchangeRateState;
  onAddMember: (name: string) => Member | undefined;
  onRemoveMember: (id: string) => boolean | undefined;
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense | undefined;
  onRemoveExpense: (id: string) => void;
  onUpdateTrip: (updates: Partial<Trip>) => void;
  showToast: (message: string, onCommit: () => void) => string;
}

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'settle', label: 'Settle Up', icon: Scale },
  { id: 'members', label: 'Members', icon: UsersIcon },
];

export default function TripDashboard({
  trip,
  exchangeRates,
  onAddMember,
  onRemoveMember,
  onAddExpense,
  onRemoveExpense,
  showToast,
}: TripDashboardProps) {
  const [activeTab, setActiveTab] = useState('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const handleAddExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    onAddExpense(expense);
    setShowExpenseForm(false);
  };

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-surface rounded-xl border border-border p-3 text-center">
          <p className="text-lg font-bold text-text-primary">{trip.members.length}</p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wide">Members</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3 text-center">
          <p className="text-lg font-bold text-text-primary">{trip.expenses.length}</p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wide">Expenses</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3 text-center">
          <p className="text-lg font-bold text-accent">
            {CURRENCIES[trip.baseCurrency]?.symbol}
            {trip.expenses
              .reduce((sum, e) => convertToBase(e.amount, e.currency, trip.baseCurrency, exchangeRates.rates) + sum, 0)
              .toFixed(2)}
          </p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wide">Total ({trip.baseCurrency})</p>
        </div>
      </div>

      {/* Exchange Rate Status */}
      <div className="flex items-center justify-center gap-1.5 mb-4">
        {exchangeRates.source === 'fallback' ? (
          <WifiOff size={10} className="text-text-secondary" />
        ) : (
          <Wifi size={10} className="text-success" />
        )}
        <span className="text-[10px] text-text-secondary">
          {exchangeRates.source === 'api' && 'Live rates'}
          {exchangeRates.source === 'cache' && 'Cached rates'}
          {exchangeRates.source === 'fallback' && 'Offline rates'}
          {exchangeRates.lastUpdated && ` \u00b7 ${new Date(exchangeRates.lastUpdated).toLocaleTimeString()}`}
        </span>
        {exchangeRates.source !== 'api' && (
          <button
            onClick={exchangeRates.refresh}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Refresh rates"
          >
            <RefreshCw size={10} className={exchangeRates.status === 'loading' ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-surface rounded-xl border border-border p-1 mb-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {trip.members.length >= 2 && !showExpenseForm && (
            <button
              onClick={() => setShowExpenseForm(true)}
              className="w-full py-3 border-2 border-dashed border-border hover:border-primary/50 rounded-xl text-sm text-text-secondary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Expense
            </button>
          )}

          {trip.members.length < 2 && (
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 text-center">
              <p className="text-sm text-accent">
                Add at least 2 members before creating expenses
              </p>
              <button
                onClick={() => setActiveTab('members')}
                className="mt-2 text-xs text-accent underline"
              >
                Go to Members
              </button>
            </div>
          )}

          {showExpenseForm && (
            <ExpenseForm
              members={trip.members}
              baseCurrency={trip.baseCurrency}
              onAdd={handleAddExpense}
              onCancel={() => setShowExpenseForm(false)}
            />
          )}

          <ExpenseList
            expenses={trip.expenses}
            members={trip.members}
            onRemove={onRemoveExpense}
            showToast={showToast}
          />
        </div>
      )}

      {activeTab === 'settle' && (
        <Settlement
          expenses={trip.expenses}
          members={trip.members}
          baseCurrency={trip.baseCurrency}
          rates={exchangeRates.rates}
        />
      )}

      {activeTab === 'members' && (
        <MemberManager
          members={trip.members}
          expenses={trip.expenses}
          onAdd={onAddMember}
          onRemove={onRemoveMember}
          showToast={showToast}
        />
      )}
    </div>
  );
}
