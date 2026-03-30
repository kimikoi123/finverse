import { useState } from 'react';
import { Plus, Receipt, Scale, Users as UsersIcon, BarChart3, RefreshCw, Wifi, WifiOff, Share2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MemberManager from './MemberManager';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import Settlement from './Settlement';
import Analytics from './Analytics';
import ShareDialog from './ShareDialog';
import { CURRENCIES, convertToBase } from '../utils/currencies';
import { generateShareUrl } from '../utils/sharing';
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
  onEditExpense: (id: string, updates: Partial<Expense>) => void;
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
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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
  onEditExpense,
  showToast,
}: TripDashboardProps) {
  const [activeTab, setActiveTab] = useState('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const handleAddExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    onAddExpense(expense);
    setShowExpenseForm(false);
  };

  const handleEditExpense = (id: string, updates: Omit<Expense, 'id' | 'createdAt'>) => {
    onEditExpense(id, updates);
    setEditingExpense(null);
    setShowExpenseForm(false);
  };

  const handleStartEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleCancelForm = () => {
    setEditingExpense(null);
    setShowExpenseForm(false);
  };

  const handleMarkPaid = (from: string, to: string, amount: number) => {
    const fromMember = trip.members.find(m => m.id === from);
    const toMember = trip.members.find(m => m.id === to);
    onAddExpense({
      description: `Settlement: ${fromMember?.name ?? 'Unknown'} → ${toMember?.name ?? 'Unknown'}`,
      amount,
      currency: trip.baseCurrency,
      paidBy: from,
      splitType: 'custom',
      participants: [to],
      customAmounts: { [to]: amount },
      category: 'settlement',
      isSettlement: true,
    });
  };

  const handleShare = () => {
    const url = generateShareUrl(trip);
    setShareUrl(url);
    setShowShareDialog(true);
  };

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
      {/* Share Button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-light border border-border transition-colors"
        >
          <Share2 size={14} />
          Share Trip
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="bg-surface rounded-xl border border-border p-3 text-center">
          <p className="text-lg font-bold text-text-primary">{trip.members.length}</p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wide" data-heading>Members</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3 text-center">
          <p className="text-lg font-bold text-text-primary">{trip.expenses.filter(e => !e.isSettlement).length}</p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wide" data-heading>Expenses</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20 p-3 text-center">
          <p className="text-base sm:text-lg font-bold text-accent truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {CURRENCIES[trip.baseCurrency]?.symbol}
            {trip.expenses
              .filter(e => !e.isSettlement)
              .reduce((sum, e) => convertToBase(e.amount, e.currency, trip.baseCurrency, exchangeRates.rates) + sum, 0)
              .toFixed(2)}
          </p>
          <p className="text-[10px] text-text-secondary uppercase tracking-wide" data-heading>Total ({trip.baseCurrency})</p>
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
            aria-label="Refresh exchange rates"
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Refresh rates"
          >
            <RefreshCw size={10} className={exchangeRates.status === 'loading' ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-surface rounded-xl border border-border p-1 mb-4" role="tablist" aria-label="Trip sections">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              id={`tab-${tab.id}`}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              {isActive && (
                <span className="sm:hidden absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'expenses' && (
        <div id="tabpanel-expenses" role="tabpanel" aria-labelledby="tab-expenses" className="space-y-4 animate-fade-in">
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
              key={editingExpense?.id ?? 'new'}
              members={trip.members}
              baseCurrency={trip.baseCurrency}
              onAdd={handleAddExpense}
              onCancel={handleCancelForm}
              editingExpense={editingExpense ?? undefined}
              onEdit={handleEditExpense}
            />
          )}

          <ExpenseList
            expenses={trip.expenses}
            members={trip.members}
            onRemove={onRemoveExpense}
            onEdit={handleStartEdit}
            showToast={showToast}
          />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div id="tabpanel-analytics" role="tabpanel" aria-labelledby="tab-analytics" className="animate-fade-in">
          <Analytics trip={trip} exchangeRates={exchangeRates.rates} />
        </div>
      )}

      {activeTab === 'settle' && (
        <div id="tabpanel-settle" role="tabpanel" aria-labelledby="tab-settle" className="animate-fade-in">
        <Settlement
          expenses={trip.expenses}
          members={trip.members}
          baseCurrency={trip.baseCurrency}
          rates={exchangeRates.rates}
          onMarkPaid={handleMarkPaid}
          onUnmarkPaid={onRemoveExpense}
        />
        </div>
      )}

      {activeTab === 'members' && (
        <div id="tabpanel-members" role="tabpanel" aria-labelledby="tab-members" className="animate-fade-in">
        <MemberManager
          members={trip.members}
          expenses={trip.expenses}
          onAdd={onAddMember}
          onRemove={onRemoveMember}
          showToast={showToast}
        />
        </div>
      )}

      {showShareDialog && (
        <ShareDialog
          shareUrl={shareUrl}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </div>
  );
}
