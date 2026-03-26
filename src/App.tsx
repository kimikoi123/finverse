import { useState, useEffect, useCallback } from 'react';
import { useTrip } from './hooks/useTrip';
import { useExchangeRates } from './hooks/useExchangeRates';
import { useToast } from './hooks/useToast';
import Header from './components/Header';
import TripList from './components/TripList';
import TripDashboard from './components/TripDashboard';
import ShareImportBanner from './components/ShareImportBanner';
import ToastContainer from './components/Toast';
import { getSharedTripFromUrl } from './utils/sharing';
import type { Trip } from './types';

function App() {
  const {
    loading,
    state,
    activeTrip,
    createTrip,
    deleteTrip,
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
  const { toasts, showToast, undoToast, dismissToast, duration } = useToast();

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
    window.history.replaceState(null, '', window.location.pathname);
  }, [pendingSharedTrip, importSharedTrip]);

  const handleDismissSharedTrip = useCallback(() => {
    setPendingSharedTrip(null);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#13131f] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#13131f]" style={{ paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
      <Header
        activeTrip={activeTrip}
        onBack={() => setActiveTrip(null)}
        onExport={exportData}
        onImport={importData}
      />
      {pendingSharedTrip && (
        <ShareImportBanner
          tripName={pendingSharedTrip.name}
          memberCount={pendingSharedTrip.members.length}
          expenseCount={pendingSharedTrip.expenses.length}
          onAccept={handleAcceptSharedTrip}
          onDismiss={handleDismissSharedTrip}
        />
      )}
      {activeTrip ? (
        <TripDashboard
          trip={activeTrip}
          exchangeRates={exchangeRates}
          onAddMember={addMember}
          onRemoveMember={removeMember}
          onAddExpense={addExpense}
          onRemoveExpense={removeExpense}
          onEditExpense={editExpense}
          onUpdateTrip={(updates) => updateTrip(activeTrip.id, updates)}
          showToast={showToast}
        />
      ) : (
        <TripList
          trips={state.trips}
          onSelect={setActiveTrip}
          onCreate={createTrip}
          onDelete={deleteTrip}
          showToast={showToast}
        />
      )}
      <ToastContainer
        toasts={toasts}
        duration={duration}
        onUndo={undoToast}
        onDismiss={dismissToast}
      />
    </div>
  );
}

export default App;
