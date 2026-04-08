import { useState, useRef } from 'react';
import { Plus, Receipt, Scale, Users as UsersIcon, BarChart3, RefreshCw, Wifi, WifiOff, Share2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MemberManager from './MemberManager';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import Settlement from './Settlement';
import Analytics from './Analytics';
import ShareDialog from './ShareDialog';
import { CURRENCIES, convertToBase, isPrivacyMode } from '../utils/currencies';
import { generateShareUrl } from '../utils/sharing';
import { saveReceiptPhoto, deleteReceiptPhoto } from '../db/storage';
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
  onUpdateTrip,
  showToast,
}: TripDashboardProps) {
  const [activeTab, setActiveTab] = useState('expenses');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const pendingReceiptRef = useRef<string | null>(null);

  const handleAddExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const created = onAddExpense(expense);
    if (created && pendingReceiptRef.current) {
      saveReceiptPhoto(created.id, pendingReceiptRef.current);
      pendingReceiptRef.current = null;
    }
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
      description: `Settlement: ${fromMember?.name ?? 'Unknown'} \u2192 ${toMember?.name ?? 'Unknown'}`,
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

  const handleSaveReceipt = (expenseId: string, dataUrl: string | null) => {
    if (dataUrl) {
      saveReceiptPhoto(expenseId, dataUrl);
    } else {
      deleteReceiptPhoto(expenseId);
    }
  };

  const handleRemoveExpense = (id: string) => {
    onRemoveExpense(id);
    deleteReceiptPhoto(id);
  };

  const handleAddCategory = (name: string) => {
    const existing = trip.customCategories ?? [];
    if (!existing.includes(name)) {
      onUpdateTrip({ customCategories: [...existing, name] });
    }
  };

  const handleShare = () => {
    const url = generateShareUrl(trip);
    setShareUrl(url);
    setShowShareDialog(true);
  };

  const nonSettlementExpenses = trip.expenses.filter(e => !e.isSettlement);
  const totalAmount = nonSettlementExpenses.reduce(
    (sum, e) => convertToBase(e.amount, e.currency, trip.baseCurrency, exchangeRates.rates) + sum,
    0,
  );

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
      {/* Share Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-text-secondary/60 hover:text-text-primary hover:bg-surface-light/50 border border-border/40 hover:border-border transition-all"
        >
          <Share2 size={13} />
          <span className="hidden sm:inline">Share Trip</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-5">
        <div className="bg-surface rounded-2xl border border-border p-4 relative overflow-hidden">
          <UsersIcon size={32} className="absolute top-3 right-3 text-text-secondary/[0.06]" />
          <p className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight" data-heading>{trip.members.length}</p>
          <p className="text-[10px] text-text-secondary/50 uppercase tracking-wider mt-1 font-medium" data-heading>Members</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-4 relative overflow-hidden">
          <Receipt size={32} className="absolute top-3 right-3 text-text-secondary/[0.06]" />
          <p className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight" data-heading>{nonSettlementExpenses.length}</p>
          <p className="text-[10px] text-text-secondary/50 uppercase tracking-wider mt-1 font-medium" data-heading>Expenses</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-primary/8 via-surface to-accent/5 rounded-2xl border border-primary/15 p-4 relative overflow-hidden">
          <p className="text-xl sm:text-2xl font-bold text-accent truncate tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }} data-heading>
            {isPrivacyMode() ? '••••' : `${CURRENCIES[trip.baseCurrency]?.symbol}${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] text-text-secondary/50 uppercase tracking-wider font-medium" data-heading>Total ({trip.baseCurrency})</p>
            {/* Inline exchange rate status */}
            <span className="text-[9px] text-text-secondary/30 flex items-center gap-1">
              {exchangeRates.source === 'fallback' ? (
                <WifiOff size={8} />
              ) : (
                <Wifi size={8} className="text-success/50" />
              )}
              {exchangeRates.source === 'api' && 'Live'}
              {exchangeRates.source === 'cache' && 'Cached'}
              {exchangeRates.source === 'fallback' && 'Offline'}
              {exchangeRates.source !== 'api' && (
                <button
                  onClick={exchangeRates.refresh}
                  aria-label="Refresh exchange rates"
                  className="hover:text-text-secondary transition-colors"
                  title="Refresh rates"
                >
                  <RefreshCw size={8} className={exchangeRates.status === 'loading' ? 'animate-spin' : ''} />
                </button>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-light/40 rounded-2xl p-1 mb-5 gap-0.5" role="tablist" aria-label="Trip sections">
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
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                isActive
                  ? 'bg-surface-elevated text-text-primary shadow-layered-sm ring-1 ring-white/[0.04]'
                  : 'text-text-secondary/50 hover:text-text-secondary'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline text-[13px]">{tab.label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary sm:hidden" />
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
              className="w-full py-3.5 border border-dashed border-border/50 hover:border-primary/40 rounded-2xl text-sm text-text-secondary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              <Plus size={15} />
              Add Expense
            </button>
          )}

          {trip.members.length < 2 && (
            <div className="bg-accent/8 border border-accent/20 rounded-2xl p-4 text-center">
              <p className="text-sm text-accent/80">
                Add at least 2 members before creating expenses
              </p>
              <button
                onClick={() => setActiveTab('members')}
                className="mt-2 text-xs text-accent/60 hover:text-accent underline transition-colors"
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
              customCategories={trip.customCategories}
              onAdd={handleAddExpense}
              onCancel={handleCancelForm}
              onAddCategory={handleAddCategory}
              editingExpense={editingExpense ?? undefined}
              onEdit={handleEditExpense}
              onSaveReceipt={handleSaveReceipt}
              onPendingReceipt={(dataUrl) => { pendingReceiptRef.current = dataUrl; }}
            />
          )}

          <ExpenseList
            expenses={trip.expenses}
            members={trip.members}
            customCategories={trip.customCategories}
            onRemove={handleRemoveExpense}
            onEdit={handleStartEdit}
            onQuickEdit={onEditExpense}
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
