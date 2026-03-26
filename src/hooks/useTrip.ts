import { useState, useCallback, useEffect } from 'react';
import { generateId } from '../utils/helpers';
import type { Trip, TripState, Member, Expense } from '../types';
import { loadState, saveState } from '../db/storage';
import { migrateFromLocalStorage } from '../db/migrate';

const INITIAL_STATE: TripState = {
  trips: [],
  activeTripId: null,
};

export function useTrip() {
  const [state, setState] = useState<TripState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const migrated = await migrateFromLocalStorage();
      if (migrated && !cancelled) {
        setState(migrated);
        setLoading(false);
        return;
      }
      const stored = await loadState();
      if (!cancelled) {
        if (stored.trips.length > 0 || stored.activeTripId) {
          setState(stored);
        }
        setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((newState: TripState) => {
    setState(newState);
    saveState(newState).catch((err: unknown) => {
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
    persist(newState);
    return trip;
  }, [state, persist]);

  const deleteTrip = useCallback((tripId: string) => {
    const newTrips = state.trips.filter((t) => t.id !== tripId);
    persist({
      trips: newTrips,
      activeTripId: state.activeTripId === tripId ? null : state.activeTripId,
    });
  }, [state, persist]);

  const setActiveTrip = useCallback((tripId: string | null) => {
    persist({ ...state, activeTripId: tripId });
  }, [state, persist]);

  const updateTrip = useCallback((tripId: string, updates: Partial<Trip>) => {
    const newTrips = state.trips.map((t) =>
      t.id === tripId ? { ...t, ...updates } : t
    );
    persist({ ...state, trips: newTrips });
  }, [state, persist]);

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
        persist(data as TripState);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [persist]);

  return {
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
  };
}
