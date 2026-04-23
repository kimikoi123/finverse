import { useState, useEffect, useCallback, useRef } from 'react';
import { useTrip } from './hooks/useTrip';
import { useExchangeRates } from './hooks/useExchangeRates';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { usePrivacyMode } from './hooks/usePrivacyMode';
import { useTransactions } from './hooks/useTransactions';
import { useUserPreferences } from './hooks/useUserPreferences';
import { useAccounts } from './hooks/useAccounts';
import { useBudgets } from './hooks/useBudgets';
import type { BudgetWithSpending } from './hooks/useBudgets';
import Header from './components/Header';
import BottomTabBar from './components/BottomTabBar';
import type { TabId } from './components/BottomTabBar';
import ActionMenu from './components/ActionMenu';
import PlanTab from './components/PlanTab';
import WalletTab from './components/WalletTab';
import AccountDetail from './components/AccountDetail';
import AddAccountFlow from './components/AddAccountFlow';
import Onboarding from './components/Onboarding';
import TransactionForm from './components/TransactionForm';
import HomeDashboard from './components/HomeDashboard';
import HistoryTab from './components/HistoryTab';
import BudgetList from './components/BudgetList';
import CreateBudgetFlow from './components/CreateBudgetFlow';
import ShareImportBanner from './components/ShareImportBanner';
import OfflineBanner from './components/OfflineBanner';
import ToastContainer from './components/Toast';
import UpdatePrompt from './components/UpdatePrompt';
import TransferForm from './components/TransferForm';
import { getSharedTripFromUrl } from './utils/sharing';
import type { ParsedTransaction } from './utils/transactionParser';
import { fetchCryptoPrice } from './utils/cryptoPrices';
import { convertToBase } from './utils/currencies';
import GoalList from './components/GoalList';
import GoalForm from './components/GoalForm';
import DebtList from './components/DebtList';
import DebtForm from './components/DebtForm';
import InstallmentList from './components/InstallmentList';
import InstallmentForm from './components/InstallmentForm';
import PayrollList from './components/PayrollList';
import EmployeeForm from './components/EmployeeForm';
import EmployeeDetail from './components/EmployeeDetail';
import CashflowForecast from './components/CashflowForecast';
import PlannedPayments from './components/PlannedPayments';
import ConfirmBillDialog from './components/ConfirmBillDialog';
import SettingsScreen from './components/Settings';
import PHTaxCalculator from './components/PHTaxCalculator';
import RulesList from './components/RulesList';
import RuleForm from './components/RuleForm';
import { useRules } from './hooks/useRules';
import { useGoals } from './hooks/useGoals';
import { useDebts } from './hooks/useDebts';
import { useInstallments } from './hooks/useInstallments';
import { usePayroll } from './hooks/usePayroll';
import { start as startSyncEngine, stop as stopSyncEngine } from './sync/syncEngine';
import type { Trip, Account, Budget, Goal, DebtEntry, Installment, Employee, Rule, ThemePreference, Transaction } from './types';

function App() {
  const {
    loading,
    state,
    activeTrip,
    createTrip,
    deleteTrip,
    deletedTrips,
    restoreTrip,
    permanentlyDeleteTrip,
    emptyTrash,
    setActiveTrip,
    updateTrip,
    addMember,
    removeMember,
    addExpense,
    removeExpense,
    editExpense,
    exportData,
    importData,
    importSharedTrip,
  } = useTrip();

  const exchangeRates = useExchangeRates();
  const { isOnline } = useOnlineStatus();
  const { toasts, showToast, undoToast, dismissToast, duration } = useToast();
  const { theme, setTheme } = useTheme();
  const { privacyMode, togglePrivacyMode } = usePrivacyMode();
  const { transactions, addTransaction, editTransaction, removeTransaction } = useTransactions();
  const { preferences, loading: prefsLoading, updatePreferences } = useUserPreferences();
  const { accounts, netWorth, addAccount, editAccount, removeAccount, reorderAccounts } = useAccounts();
  const { budgets: budgetsWithSpending, loading: budgetsLoading, addBudget, editBudget, removeBudget, runAutoConfirmOnce } = useBudgets(transactions);

  const hasRunAutoConfirm = useRef(false);
  useEffect(() => {
    if (hasRunAutoConfirm.current) return;
    if (budgetsLoading) return;  // budgets still loading
    hasRunAutoConfirm.current = true;
    void runAutoConfirmOnce(addTransaction);
  }, [budgetsLoading, runAutoConfirmOnce, addTransaction]);
  const { goals, addGoal, editGoal, removeGoal } = useGoals();
  const { debts, addDebt, editDebt, removeDebt } = useDebts();
  const { installments, addInstallment, editInstallment, removeInstallment } = useInstallments();
  const {
    employees, addEmployee, editEmployee, removeEmployee,
    addAdvance, removeAdvance, settlePayday,
    totalPendingAdvances, advancesForEmployee,
  } = usePayroll();

  // Start the cloud sync engine once on mount. The engine is idempotent
  // (internal `started` flag), and we still return a cleanup so strict-mode
  // dev double-invocation cleanly tears down + re-installs its listeners
  // and intervals instead of leaving stale ones behind.
  useEffect(() => {
    startSyncEngine();
    return () => stopSyncEngine();
  }, []);

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState<{ type: 'income' | 'expense' } | null>(null);
  const [quickAddData, setQuickAddData] = useState<ParsedTransaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showAddAccountFlow, setShowAddAccountFlow] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [refreshingPrice, setRefreshingPrice] = useState(false);
  const [showBudgetList, setShowBudgetList] = useState(false);
  const [pendingConfirmBill, setPendingConfirmBill] = useState<BudgetWithSpending | null>(null);
  const [showCreateBudget, setShowCreateBudget] = useState<{ mode: 'category' | 'custom' } | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showGoalList, setShowGoalList] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showDebtList, setShowDebtList] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtEntry | null>(null);
  const [showInstallmentList, setShowInstallmentList] = useState(false);
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [showCashflowForecast, setShowCashflowForecast] = useState(false);
  const [showPlannedPayments, setShowPlannedPayments] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);
  const [showPayrollList, setShowPayrollList] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTaxCalculator, setShowTaxCalculator] = useState(false);
  const [showRulesList, setShowRulesList] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const { rules, addRule, editRule, removeRule } = useRules();
  const [pendingSharedTrip, setPendingSharedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (loading) return;
    const shared = getSharedTripFromUrl();
    if (shared) {
      setPendingSharedTrip(shared);
    }
  }, [loading]);

  const handleAcceptSharedTrip = useCallback(() => {
    if (!pendingSharedTrip) return;
    importSharedTrip(pendingSharedTrip);
    setPendingSharedTrip(null);
    setActiveTab('plan');
    window.history.replaceState(null, '', window.location.pathname);
  }, [pendingSharedTrip, importSharedTrip]);

  const handleDismissSharedTrip = useCallback(() => {
    setPendingSharedTrip(null);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const handleNewTrip = useCallback(() => {
    setShowActionMenu(false);
    setActiveTab('plan');
  }, []);

  const handleAddExpense = useCallback(() => {
    setShowActionMenu(false);
    setShowTransactionForm({ type: 'expense' });
  }, []);

  const handleAddIncome = useCallback(() => {
    setShowActionMenu(false);
    setShowTransactionForm({ type: 'income' });
  }, []);

  const handleAddAccount = useCallback(() => {
    setShowActionMenu(false);
    setEditingAccount(null);
    setShowAddAccountFlow(true);
  }, []);

  const handleSaveTransaction = useCallback(async (txn: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      await editTransaction(editingTransaction.id, txn);
      setEditingTransaction(null);
      setShowTransactionForm(null);
      showToast('Transaction updated', () => {});
    } else {
      await addTransaction(txn);
      setShowTransactionForm(null);
      showToast(txn.type === 'expense' ? 'Expense added' : 'Income added', () => {});
    }
    setQuickAddData(null);
  }, [addTransaction, editTransaction, editingTransaction, showToast]);

  const handleQuickAdd = useCallback((parsed: ParsedTransaction) => {
    setQuickAddData(parsed);
    setShowTransactionForm({ type: parsed.type });
  }, []);

  const handleSaveRule = useCallback(async (data: Omit<Rule, 'id' | 'createdAt'>) => {
    if (editingRule) {
      await editRule(editingRule.id, data);
      showToast('Rule updated', () => {});
    } else {
      await addRule(data);
      showToast('Rule saved', () => {});
    }
    setShowRuleForm(false);
    setEditingRule(null);
  }, [editingRule, editRule, addRule, showToast]);

  const handleApplyRulesToPast = useCallback(async (updates: { id: string; category: string }[]) => {
    for (const u of updates) {
      await editTransaction(u.id, { category: u.category });
    }
    showToast(`Recategorized ${updates.length} transaction${updates.length === 1 ? '' : 's'}`, () => {});
  }, [editTransaction, showToast]);

  const handleEditTransaction = useCallback((txn: Transaction) => {
    setEditingTransaction(txn);
    setShowTransactionForm({ type: txn.type });
  }, []);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    await removeTransaction(id);
  }, [removeTransaction]);

  const handleSaveAccount = useCallback(async (data: Omit<Account, 'id' | 'createdAt' | 'sortOrder'>) => {
    if (editingAccount) {
      await editAccount(editingAccount.id, data);
      setShowAddAccountFlow(false);
      setEditingAccount(null);
      showToast('Account updated', () => {});
    } else {
      await addAccount(data);
      setShowAddAccountFlow(false);
      showToast('Account added', () => {});
    }
  }, [editingAccount, editAccount, addAccount, showToast]);

  const handleEditAccount = useCallback((account: Account) => {
    setEditingAccount(account);
    setShowAddAccountFlow(true);
  }, []);

  const handleDeleteAccount = useCallback(async (id: string) => {
    await removeAccount(id);
    setSelectedAccountId(null);
    showToast('Account deleted', () => {});
  }, [removeAccount, showToast]);

  const handleTransfer = useCallback(async (fromId: string, toId: string, amount: number) => {
    const fromAcc = accounts.find((a) => a.id === fromId);
    const toAcc = accounts.find((a) => a.id === toId);
    if (!fromAcc || !toAcc) return;
    const tid = crypto.randomUUID();
    await addTransaction({
      type: 'expense',
      amount,
      currency: fromAcc.currency,
      category: 'other',
      description: `Transfer to ${toAcc.name}`,
      date: new Date().toISOString().split('T')[0] ?? '',
      accountId: fromId,
      transferId: tid,
    });
    await addTransaction({
      type: 'income',
      amount,
      currency: toAcc.currency,
      category: 'other-income',
      description: `Transfer from ${fromAcc.name}`,
      date: new Date().toISOString().split('T')[0] ?? '',
      accountId: toId,
      transferId: tid,
    });
    setShowTransferForm(false);
    showToast('Transfer completed', () => {});
  }, [accounts, addTransaction, showToast]);

  const handleRefreshCryptoPrice = useCallback(async () => {
    const account = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) : null;
    if (!account?.ticker) return;
    setRefreshingPrice(true);
    const usdPrice = await fetchCryptoPrice(account.ticker);
    setRefreshingPrice(false);
    if (usdPrice == null) {
      showToast('Could not fetch price, try again later', () => {});
      return;
    }
    // Convert USD price to account currency if needed
    let price = usdPrice;
    if (account.currency !== 'USD') {
      price = convertToBase(usdPrice, 'USD', account.currency, exchangeRates.rates);
    }
    await editAccount(account.id, { pricePerUnit: price });
    showToast('Price updated', () => {});
  }, [selectedAccountId, accounts, editAccount, exchangeRates.rates, showToast]);

  const handleUpdatePrice = useCallback(async (price: number) => {
    if (!selectedAccountId) return;
    await editAccount(selectedAccountId, { pricePerUnit: price });
    showToast('Price updated', () => {});
  }, [selectedAccountId, editAccount, showToast]);

  const handleSaveBudget = useCallback(async (data: Omit<Budget, 'id' | 'createdAt'>) => {
    if (editingBudget) {
      await editBudget(editingBudget.id, data);
      showToast('Budget updated', () => {});
    } else {
      await addBudget(data);
      showToast('Budget created', () => {});
    }
    setShowCreateBudget(null);
    setEditingBudget(null);
  }, [editingBudget, editBudget, addBudget, showToast]);

  const handleDeleteBudget = useCallback(async (id: string) => {
    await removeBudget(id);
    showToast('Budget deleted', () => {});
  }, [removeBudget, showToast]);

  // Goal handlers
  const handleSaveGoal = useCallback(async (data: Omit<Goal, 'id' | 'createdAt'>) => {
    if (editingGoal) { await editGoal(editingGoal.id, data); showToast('Goal updated', () => {}); }
    else { await addGoal(data); showToast('Goal created', () => {}); }
    setShowGoalForm(false); setEditingGoal(null);
  }, [editingGoal, editGoal, addGoal, showToast]);

  // Debt handlers
  const handleSaveDebt = useCallback(async (data: Omit<DebtEntry, 'id' | 'createdAt'>) => {
    if (editingDebt) { await editDebt(editingDebt.id, data); showToast('Debt updated', () => {}); }
    else { await addDebt(data); showToast('Debt added', () => {}); }
    setShowDebtForm(false); setEditingDebt(null);
  }, [editingDebt, editDebt, addDebt, showToast]);

  const handleRecordPayment = useCallback(async (id: string, amount: number) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;
    await editDebt(id, { paidAmount: debt.paidAmount + amount });
    showToast('Payment recorded', () => {});
  }, [debts, editDebt, showToast]);

  // Installment handlers
  const handleSaveInstallment = useCallback(async (data: Omit<Installment, 'id' | 'createdAt'>) => {
    if (editingInstallment) { await editInstallment(editingInstallment.id, data); showToast('Installment updated', () => {}); }
    else { await addInstallment(data); showToast('Installment added', () => {}); }
    setShowInstallmentForm(false); setEditingInstallment(null);
  }, [editingInstallment, editInstallment, addInstallment, showToast]);

  const handleMarkInstallmentPaid = useCallback(async (id: string) => {
    const inst = installments.find((i) => i.id === id);
    if (!inst || inst.paidMonths >= inst.totalMonths) return;
    await editInstallment(id, { paidMonths: inst.paidMonths + 1 });
    showToast('Month marked as paid', () => {});
  }, [installments, editInstallment, showToast]);

  const formatAmount = useCallback((amount: number, currency: string) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  }, []);

  // Employee handlers
  const handleSaveEmployee = useCallback(async (data: Omit<Employee, 'id' | 'createdAt'>) => {
    if (editingEmployee) {
      await editEmployee(editingEmployee.id, data);
      showToast('Employee updated', () => {});
    } else {
      await addEmployee(data);
      showToast('Employee added', () => {});
    }
    setShowEmployeeForm(false);
    setEditingEmployee(null);
  }, [editingEmployee, editEmployee, addEmployee, showToast]);

  const handleDeleteEmployee = useCallback(async (id: string) => {
    await removeEmployee(id);
    setSelectedEmployee(null);
    showToast('Employee deleted', () => {});
  }, [removeEmployee, showToast]);

  const handleOnboardingComplete = useCallback(async (prefs: { displayName: string; defaultCurrency: string; theme: ThemePreference }) => {
    setTheme(prefs.theme);
    await updatePreferences({
      displayName: prefs.displayName,
      defaultCurrency: prefs.defaultCurrency,
      theme: prefs.theme,
      onboardingComplete: true,
    });
  }, [setTheme, updatePreferences]);

  if (loading || prefsLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="bg-surface px-4 py-3.5 sm:px-6 border-b border-border/50">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl animate-shimmer" />
              <div className="space-y-2">
                <div className="h-4 w-20 rounded-lg animate-shimmer" />
                <div className="h-3 w-28 rounded-lg animate-shimmer" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="w-10 h-10 rounded-xl animate-shimmer" />
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl border border-border p-4">
              <div className="h-4 w-36 rounded-lg animate-shimmer mb-2.5" />
              <div className="h-3 w-48 rounded-lg animate-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!preferences.onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const selectedAccount = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) ?? null : null;
  const showTripNav = activeTab === 'plan' && activeTrip !== null;
  const showAccountDetail = activeTab === 'wallet' && selectedAccount !== null;

  return (
    <div className="min-h-screen bg-bg" style={{ paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
      <Header
        activeTrip={activeTrip}
        onBack={() => {
          if (showSettings) { setShowSettings(false); }
          else if (showAccountDetail) { setSelectedAccountId(null); }
          else { setActiveTrip(null); }
        }}
        onOpenSettings={() => setShowSettings(true)}
        showTripNav={showTripNav}
        showBackNav={showAccountDetail || showSettings}
        backLabel={showSettings ? 'Settings' : selectedAccount?.name}
        privacyMode={privacyMode}
        onTogglePrivacy={togglePrivacyMode}
      />
      {!isOnline && <OfflineBanner />}
      {pendingSharedTrip && (
        <ShareImportBanner
          tripName={pendingSharedTrip.name}
          memberCount={pendingSharedTrip.members.length}
          expenseCount={pendingSharedTrip.expenses.length}
          onAccept={handleAcceptSharedTrip}
          onDismiss={handleDismissSharedTrip}
        />
      )}

      <main className={showSettings ? '' : 'pb-20'}>
        {showSettings && !showRulesList && (
          <SettingsScreen
            preferences={preferences}
            onUpdate={updatePreferences}
            theme={theme}
            onThemeChange={setTheme}
            onExport={exportData}
            onImport={importData}
            onBack={() => setShowSettings(false)}
            privacyMode={privacyMode}
            onTogglePrivacy={togglePrivacyMode}
            onOpenTaxCalculator={() => setShowTaxCalculator(true)}
            onOpenRules={() => setShowRulesList(true)}
          />
        )}
        {showRulesList && (
          <RulesList
            rules={rules}
            accounts={accounts}
            transactions={transactions}
            onAdd={() => { setEditingRule(null); setShowRuleForm(true); }}
            onEdit={(r) => { setEditingRule(r); setShowRuleForm(true); }}
            onDelete={(id) => { void removeRule(id); }}
            onToggle={(id, enabled) => { void editRule(id, { enabled }); }}
            onApplyToPast={(updates) => { void handleApplyRulesToPast(updates); }}
            onNotify={(msg) => showToast(msg, () => {})}
            onBack={() => setShowRulesList(false)}
          />
        )}
        {showRuleForm && (
          <RuleForm
            editingRule={editingRule ?? undefined}
            accounts={accounts}
            nextPriority={rules.length === 0 ? 100 : Math.max(...rules.map((r) => r.priority)) + 10}
            onSave={handleSaveRule}
            onCancel={() => { setShowRuleForm(false); setEditingRule(null); }}
          />
        )}
        {showTaxCalculator && (
          <div className="fixed inset-0 z-50 bg-bg">
            <PHTaxCalculator onBack={() => setShowTaxCalculator(false)} />
          </div>
        )}
        {!showSettings && activeTab === 'home' && (
          <HomeDashboard
            displayName={preferences.displayName}
            transactions={transactions}
            defaultCurrency={preferences.defaultCurrency}
            paydayConfig={preferences.paydayConfig}
            onQuickAdd={handleQuickAdd}
            pendingCommitments={budgetsWithSpending.filter((b) => b.isPendingThisMonth === true)}
            onConfirmCommitment={(b) => setPendingConfirmBill(b)}
          />
        )}
        {!showSettings && activeTab === 'wallet' && (
          selectedAccount ? (
            <AccountDetail
              account={selectedAccount}
              transactions={transactions}
              defaultCurrency={preferences.defaultCurrency}
              onBack={() => setSelectedAccountId(null)}
              onEdit={() => handleEditAccount(selectedAccount)}
              onDelete={() => handleDeleteAccount(selectedAccount.id)}
              onTransfer={() => setShowTransferForm(true)}
              onUpdatePrice={handleUpdatePrice}
              onRefreshCryptoPrice={handleRefreshCryptoPrice}
              refreshingPrice={refreshingPrice}
            />
          ) : (
            <WalletTab
              accounts={accounts}
              netWorth={netWorth}
              defaultCurrency={preferences.defaultCurrency}
              onAddAccount={handleAddAccount}
              onSelectAccount={setSelectedAccountId}
              onReorderAccounts={reorderAccounts}
            />
          )
        )}
        {!showSettings && activeTab === 'plan' && (
          showCashflowForecast ? (
            <CashflowForecast
              transactions={transactions}
              installments={installments}
              debts={debts}
              accounts={accounts}
              budgets={budgetsWithSpending}
              defaultCurrency={preferences.defaultCurrency}
              paydayConfig={preferences.paydayConfig}
              exchangeRates={exchangeRates.rates}
              onBack={() => setShowCashflowForecast(false)}
            />
          ) : showPlannedPayments ? (
            <PlannedPayments
              transactions={transactions}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              onBack={() => setShowPlannedPayments(false)}
            />
          ) : showBudgetList ? (
            <BudgetList
              budgets={budgetsWithSpending}
              onCreateCategory={() => { setEditingBudget(null); setShowCreateBudget({ mode: 'category' }); }}
              onCreateCustom={() => { setEditingBudget(null); setShowCreateBudget({ mode: 'custom' }); }}
              onEdit={(b) => { setEditingBudget(b); setShowCreateBudget({ mode: b.type }); }}
              onDelete={handleDeleteBudget}
              onConfirmBill={(budget) => setPendingConfirmBill(budget)}
              onBack={() => setShowBudgetList(false)}
            />
          ) : showGoalList ? (
            <GoalList
              goals={goals}
              accounts={accounts}
              onAdd={() => { setEditingGoal(null); setShowGoalForm(true); }}
              onEdit={(g) => { setEditingGoal(g); setShowGoalForm(true); }}
              onDelete={async (id) => { await removeGoal(id); showToast('Goal deleted', () => {}); }}
              onBack={() => setShowGoalList(false)}
            />
          ) : showDebtList ? (
            <DebtList
              debts={debts}
              onAdd={() => { setEditingDebt(null); setShowDebtForm(true); }}
              onEdit={(d) => { setEditingDebt(d); setShowDebtForm(true); }}
              onDelete={async (id) => { await removeDebt(id); showToast('Debt deleted', () => {}); }}
              onRecordPayment={handleRecordPayment}
              onBack={() => setShowDebtList(false)}
            />
          ) : showInstallmentList ? (
            <InstallmentList
              installments={installments}
              accounts={accounts}
              onAdd={() => { setEditingInstallment(null); setShowInstallmentForm(true); }}
              onEdit={(i) => { setEditingInstallment(i); setShowInstallmentForm(true); }}
              onDelete={async (id) => { await removeInstallment(id); showToast('Installment deleted', () => {}); }}
              onMarkPaid={handleMarkInstallmentPaid}
              onBack={() => setShowInstallmentList(false)}
            />
          ) : showPayrollList && !selectedEmployee ? (
            <PayrollList
              employees={employees}
              totalPendingAdvances={totalPendingAdvances}
              onAdd={() => { setEditingEmployee(null); setShowEmployeeForm(true); }}
              onSelect={(emp) => setSelectedEmployee(emp)}
              onBack={() => setShowPayrollList(false)}
              formatAmount={formatAmount}
            />
          ) : selectedEmployee ? (
            <EmployeeDetail
              employee={selectedEmployee}
              advances={advancesForEmployee(selectedEmployee.id)}
              onBack={() => setSelectedEmployee(null)}
              onEdit={() => { setEditingEmployee(selectedEmployee); setShowEmployeeForm(true); }}
              onDelete={() => handleDeleteEmployee(selectedEmployee.id)}
              onAddAdvance={addAdvance}
              onRemoveAdvance={removeAdvance}
              onSettle={settlePayday}
              formatAmount={formatAmount}
            />
          ) : (
            <PlanTab
              trips={state.trips}
              activeTrip={activeTrip}
              deletedTrips={deletedTrips}
              exchangeRates={exchangeRates}
              transactions={transactions}
              budgets={budgetsWithSpending}
              goals={goals}
              debts={debts}
              installments={installments}
              employees={employees}
              onSelectTrip={setActiveTrip}
              onCreateTrip={createTrip}
              onDeleteTrip={deleteTrip}
              onRestoreTrip={restoreTrip}
              onPermanentlyDeleteTrip={permanentlyDeleteTrip}
              onEmptyTrash={emptyTrash}
              onAddMember={addMember}
              onRemoveMember={removeMember}
              onAddExpense={addExpense}
              onRemoveExpense={removeExpense}
              onEditExpense={editExpense}
              onUpdateTrip={(updates) => activeTrip && updateTrip(activeTrip.id, updates)}
              onOpenCashflow={() => setShowCashflowForecast(true)}
              onOpenPlannedPayments={() => setShowPlannedPayments(true)}
              onOpenBudgets={() => setShowBudgetList(true)}
              onOpenGoals={() => setShowGoalList(true)}
              onOpenDebts={() => setShowDebtList(true)}
              onOpenInstallments={() => setShowInstallmentList(true)}
              onOpenPayroll={() => setShowPayrollList(true)}
              showToast={showToast}
            />
          )
        )}
        {!showSettings && activeTab === 'history' && (
          <HistoryTab
            transactions={transactions}
            accounts={accounts}
            defaultCurrency={preferences.defaultCurrency}
            displayName={preferences.displayName}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            showToast={showToast}
          />
        )}
      </main>

      {!showSettings && (
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== 'wallet') setSelectedAccountId(null);
            if (tab !== 'plan') { setActiveTrip(null); setShowCashflowForecast(false); setShowPlannedPayments(false); setShowBudgetList(false); setShowGoalList(false); setShowDebtList(false); setShowInstallmentList(false); setShowPayrollList(false); setSelectedEmployee(null); }
          }}
          onFabClick={() => setShowActionMenu(!showActionMenu)}
          fabOpen={showActionMenu}
        />
      )}

      {showActionMenu && (
        <ActionMenu
          onAddExpense={handleAddExpense}
          onAddIncome={handleAddIncome}
          onNewTrip={handleNewTrip}
          onAddAccount={handleAddAccount}
          onClose={() => setShowActionMenu(false)}
        />
      )}

      {showTransactionForm && (
        <TransactionForm
          type={showTransactionForm.type}
          defaultCurrency={preferences.defaultCurrency}
          accounts={accounts}
          customBudgets={budgetsWithSpending.filter((b) => b.type === 'custom')}
          editingTransaction={editingTransaction ?? undefined}
          quickAddData={quickAddData ?? undefined}
          onSave={handleSaveTransaction}
          onCancel={() => { setShowTransactionForm(null); setEditingTransaction(null); setQuickAddData(null); }}
        />
      )}

      {showAddAccountFlow && (
        <AddAccountFlow
          onSave={handleSaveAccount}
          onCancel={() => { setShowAddAccountFlow(false); setEditingAccount(null); }}
          editingAccount={editingAccount ?? undefined}
        />
      )}

      {showTransferForm && selectedAccount && (
        <TransferForm
          fromAccount={selectedAccount}
          accounts={accounts}
          onSave={handleTransfer}
          onCancel={() => setShowTransferForm(false)}
        />
      )}

      {showCreateBudget && (
        <CreateBudgetFlow
          mode={showCreateBudget.mode}
          existingBudgets={budgetsWithSpending}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          onSave={handleSaveBudget}
          onCancel={() => { setShowCreateBudget(null); setEditingBudget(null); }}
          editingBudget={editingBudget ?? undefined}
        />
      )}

      {pendingConfirmBill && (
        <ConfirmBillDialog
          budget={pendingConfirmBill}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          onClose={() => setPendingConfirmBill(null)}
          onSkip={() => {
            const remaining = budgetsWithSpending.filter(
              (b) => b.isPendingThisMonth && b.id !== pendingConfirmBill.id
            );
            setPendingConfirmBill(remaining[0] ?? null);
          }}
          onConfirm={async (txn, newLastConfirmedMonth) => {
            await addTransaction(txn);
            await editBudget(pendingConfirmBill.id, { lastConfirmedMonth: newLastConfirmedMonth });
            const remaining = budgetsWithSpending.filter(
              (b) => b.isPendingThisMonth && b.id !== pendingConfirmBill.id
            );
            setPendingConfirmBill(remaining[0] ?? null);
          }}
        />
      )}

      {showGoalForm && (
        <GoalForm
          accounts={accounts}
          onSave={handleSaveGoal}
          onCancel={() => { setShowGoalForm(false); setEditingGoal(null); }}
          editingGoal={editingGoal ?? undefined}
        />
      )}

      {showDebtForm && (
        <DebtForm
          onSave={handleSaveDebt}
          onCancel={() => { setShowDebtForm(false); setEditingDebt(null); }}
          editingDebt={editingDebt ?? undefined}
        />
      )}

      {showInstallmentForm && (
        <InstallmentForm
          accounts={accounts}
          onSave={handleSaveInstallment}
          onCancel={() => { setShowInstallmentForm(false); setEditingInstallment(null); }}
          editingInstallment={editingInstallment ?? undefined}
        />
      )}

      {showEmployeeForm && (
        <EmployeeForm
          onSave={handleSaveEmployee}
          onCancel={() => { setShowEmployeeForm(false); setEditingEmployee(null); }}
          editingEmployee={editingEmployee ?? undefined}
          defaultCurrency={preferences.defaultCurrency}
        />
      )}

      <ToastContainer
        toasts={toasts}
        duration={duration}
        onUndo={undoToast}
        onDismiss={dismissToast}
      />
      <UpdatePrompt />
    </div>
  );
}

export default App;
