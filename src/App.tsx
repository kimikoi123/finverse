import { useTrip } from './hooks/useTrip';
import { useExchangeRates } from './hooks/useExchangeRates';
import { useToast } from './hooks/useToast';
import Header from './components/Header';
import TripList from './components/TripList';
import TripDashboard from './components/TripDashboard';
import ToastContainer from './components/Toast';

function App() {
  const {
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
    exportData,
    importData,
  } = useTrip();

  const exchangeRates = useExchangeRates();
  const { toasts, showToast, undoToast, dismissToast, duration } = useToast();

  return (
    <div className="min-h-screen bg-[#13131f]">
      <Header
        activeTrip={activeTrip}
        onBack={() => setActiveTrip(null)}
        onExport={exportData}
        onImport={importData}
      />
      {activeTrip ? (
        <TripDashboard
          trip={activeTrip}
          exchangeRates={exchangeRates}
          onAddMember={addMember}
          onRemoveMember={removeMember}
          onAddExpense={addExpense}
          onRemoveExpense={removeExpense}
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
