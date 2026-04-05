import { useState, useEffect, useCallback } from 'react';
import { useTrip } from './hooks/useTrip';
import { useExchangeRates } from './hooks/useExchangeRates';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useToast } from './hooks/useToast';
import Header from './components/Header';
import TripList from './components/TripList';
import TripDashboard from './components/TripDashboard';
import ShareImportBanner from './components/ShareImportBanner';
import OfflineBanner from './components/OfflineBanner';
import ToastContainer from './components/Toast';
import UpdatePrompt from './components/UpdatePrompt';
import { getSharedTripFromUrl } from './utils/sharing';
import type { Trip } from './types';

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
      <div className="min-h-screen bg-[#13131f]">
        {/* Skeleton header */}
        <div className="bg-surface px-4 py-3 sm:px-6 border-b border-border">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg animate-shimmer" />
              <div className="space-y-1.5">
                <div className="h-4 w-24 rounded animate-shimmer" />
                <div className="h-3 w-32 rounded animate-shimmer" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-9 h-9 rounded-lg animate-shimmer" />
              <div className="w-9 h-9 rounded-lg animate-shimmer" />
            </div>
          </div>
        </div>
        {/* Skeleton content */}
        <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 w-28 rounded animate-shimmer" />
            <div className="h-9 w-24 rounded-lg animate-shimmer" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-xl border border-border p-4">
              <div className="h-4 w-40 rounded animate-shimmer mb-2" />
              <div className="h-3 w-56 rounded animate-shimmer" />
            </div>
          ))}
        </div>
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
          deletedTrips={deletedTrips}
          onSelect={setActiveTrip}
          onCreate={createTrip}
          onDelete={deleteTrip}
          onRestore={restoreTrip}
          onPermanentlyDelete={permanentlyDeleteTrip}
          onEmptyTrash={emptyTrash}
          showToast={showToast}
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
