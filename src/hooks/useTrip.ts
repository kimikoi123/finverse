import { useState, useCallback, useEffect } from 'react';
import { generateId } from '../utils/helpers';
import type { Trip, TripState, DeletedTrip, Member, Expense } from '../types';
import { loadState, saveTripChanges, loadDeletedTrips, addDeletedTrip, removeDeletedTrip, clearAllDeletedTrips } from '../db/storage';
import type { TripChanges } from '../db/storage';
import { migrateFromLocalStorage } from '../db/migrate';
import { useRefreshOnRemote } from './useRefreshOnRemote';

const INITIAL_STATE: TripState = {
  trips: [],
  activeTripId: null,
};

export function useTrip() {
  const [state, setState] = useState<TripState>(INITIAL_STATE);
  const [deletedTrips, setDeletedTrips] = useState<DeletedTrip[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-read trips + deleted-trips from Dexie. Called on mount and again
  // whenever the sync engine applies a remote pull batch.
  const refresh = useCallback(async () => {
    const stored = await loadState();
    if (stored.trips.length > 0 || stored.activeTripId) {
      setState(stored);
    }
    const deleted = await loadDeletedTrips();
    setDeletedTrips(deleted);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      // Legacy localStorage migration runs once on first mount only —
      // we don't want to re-run it on every remote-applied event.
      const migrated = await migrateFromLocalStorage();
      if (migrated && !cancelled) {
        setState(migrated);
        const deleted = await loadDeletedTrips();
        if (!cancelled) setDeletedTrips(deleted);
      } else if (!cancelled) {
        await refresh();
      }
      if (!cancelled) setLoading(false);
    }
    void init();
    return () => { cancelled = true; };
  }, [refresh]);

  useRefreshOnRemote(refresh);

  // Applies an in-memory state change and persists only what the operation
  // touched — see TripChanges in storage.ts for why that matters for sync.
  const commit = useCallback((newState: TripState, changes: TripChanges) => {
    setState(newState);
    saveTripChanges(changes).catch((err: unknown) => {
      console.error('Failed to persist state to IndexedDB:', err);
    });
  }, []);

  const activeTrip = state.trips.find((t) => t.id === state.activeTripId) ?? null;

  const createTrip = useCallback((name: string, baseCurrency = 'USD'): Trip => {
    const trip: Trip = {
      id: generateId(),
      name,
      baseCurrency,
      members: [],
      expenses: [],
      createdAt: new Date().toISOString(),
    };
    const newState: TripState = {
      trips: [...state.trips, trip],
      activeTripId: trip.id,
    };
    commit(newState, { put: [trip], activeTripId: trip.id });
    return trip;
  }, [state, commit]);

  const deleteTrip = useCallback((tripId: string) => {
    const trip = state.trips.find((t) => t.id === tripId);
    const newTrips = state.trips.filter((t) => t.id !== tripId);
    const activeTripId = state.activeTripId === tripId ? null : state.activeTripId;
    commit({ trips: newTrips, activeTripId }, { remove: [tripId], activeTripId });
    if (trip) {
      const deletedAt = new Date().toISOString();
      setDeletedTrips((prev) => [...prev, { trip, deletedAt }]);
      addDeletedTrip(trip).catch((err: unknown) => {
        console.error('Failed to save deleted trip:', err);
      });
    }
  }, [state, commit]);

  const restoreTrip = useCallback((tripId: string) => {
    const entry = deletedTrips.find((d) => d.trip.id === tripId);
    if (!entry) return;
    setDeletedTrips((prev) => prev.filter((d) => d.trip.id !== tripId));
    removeDeletedTrip(tripId).catch((err: unknown) => {
      console.error('Failed to remove from deleted trips:', err);
    });
    commit(
      { trips: [...state.trips, entry.trip], activeTripId: state.activeTripId },
      { put: [entry.trip] },
    );
  }, [deletedTrips, state, commit]);

  const permanentlyDeleteTrip = useCallback((tripId: string) => {
    setDeletedTrips((prev) => prev.filter((d) => d.trip.id !== tripId));
    removeDeletedTrip(tripId).catch((err: unknown) => {
      console.error('Failed to permanently delete trip:', err);
    });
  }, []);

  const emptyTrash = useCallback(() => {
    setDeletedTrips([]);
    clearAllDeletedTrips().catch((err: unknown) => {
      console.error('Failed to empty trash:', err);
    });
  }, []);

  const setActiveTrip = useCallback((tripId: string | null) => {
    commit({ ...state, activeTripId: tripId }, { activeTripId: tripId });
  }, [state, commit]);

  const updateTrip = useCallback((tripId: string, updates: Partial<Trip>) => {
    const current = state.trips.find((t) => t.id === tripId);
    if (!current) return;
    const updated: Trip = { ...current, ...updates };
    const newTrips = state.trips.map((t) => (t.id === tripId ? updated : t));
    commit({ ...state, trips: newTrips }, { put: [updated] });
  }, [state, commit]);

  // Member operations
  const addMember = useCallback((name: string): Member | undefined => {
    if (!activeTrip) return;
    const member: Member = { id: generateId(), name };
    const newMembers = [...activeTrip.members, member];
    updateTrip(activeTrip.id, { members: newMembers });
    return member;
  }, [activeTrip, updateTrip]);

  const removeMember = useCallback((memberId: string): boolean | undefined => {
    if (!activeTrip) return;
    const hasExpenses = activeTrip.expenses.some(
      (e) => e.paidBy === memberId || e.participants.includes(memberId)
    );
    if (hasExpenses) return false;
    const newMembers = activeTrip.members.filter((m) => m.id !== memberId);
    updateTrip(activeTrip.id, { members: newMembers });
    return true;
  }, [activeTrip, updateTrip]);

  // Expense operations
  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'createdAt'>): Expense | undefined => {
    if (!activeTrip) return;
    const newExpense: Expense = {
      ...expense,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const newExpenses = [...activeTrip.expenses, newExpense];
    updateTrip(activeTrip.id, { expenses: newExpenses });
    return newExpense;
  }, [activeTrip, updateTrip]);

  const removeExpense = useCallback((expenseId: string) => {
    if (!activeTrip) return;
    const newExpenses = activeTrip.expenses.filter((e) => e.id !== expenseId);
    updateTrip(activeTrip.id, { expenses: newExpenses });
  }, [activeTrip, updateTrip]);

  const editExpense = useCallback((expenseId: string, updates: Partial<Expense>) => {
    if (!activeTrip) return;
    const newExpenses = activeTrip.expenses.map((e) =>
      e.id === expenseId ? { ...e, ...updates } : e
    );
    updateTrip(activeTrip.id, { expenses: newExpenses });
  }, [activeTrip, updateTrip]);

  // Import a shared trip (creates a new trip with fresh ID to avoid conflicts)
  const importSharedTrip = useCallback((sharedTrip: Trip): Trip => {
    const trip: Trip = {
      ...sharedTrip,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const newState: TripState = {
      trips: [...state.trips, trip],
      activeTripId: trip.id,
    };
    commit(newState, { put: [trip], activeTripId: trip.id });
    return trip;
  }, [state, commit]);

  // Export/Import
  const exportData = useCallback(() => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splittrip-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importData = useCallback((jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString) as unknown;
      if (data && typeof data === 'object' && 'trips' in data && Array.isArray((data as TripState).trips)) {
        const imported = data as TripState;
        const activeTripId = imported.activeTripId ?? null;
        const importedIds = new Set(imported.trips.map((t) => t.id));
        // Import replaces the trip list: trips missing from the file are removed.
        commit({ trips: imported.trips, activeTripId }, {
          put: imported.trips,
          remove: state.trips.filter((t) => !importedIds.has(t.id)).map((t) => t.id),
          activeTripId,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [state, commit]);

  return {
    loading,
    state,
    activeTrip,
    deletedTrips,
    createTrip,
    deleteTrip,
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
  };
}
