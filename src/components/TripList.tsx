import { useState } from 'react';
import { Plus, Trash2, Users, Receipt, ChevronRight, RotateCcw, ChevronDown, ChevronUp, PlaneTakeoff } from 'lucide-react';
import { CURRENCIES } from '../utils/currencies';
import type { Trip, DeletedTrip } from '../types';

const TRIP_ACCENT_COLORS = ['#2d6a4f', '#f5a623', '#30a46c', '#e5484d', '#3e93f8', '#d864d8', '#2ebde5'];

interface TripListProps {
  trips: Trip[];
  deletedTrips: DeletedTrip[];
  onSelect: (id: string | null) => void;
  onCreate: (name: string, currency?: string) => Trip;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
  onEmptyTrash: () => void;
  showToast: (message: string, onCommit: () => void) => string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function TripList({
  trips,
  deletedTrips,
  onSelect,
  onCreate,
  onDelete,
  onRestore,
  onPermanentlyDelete,
  onEmptyTrash,
  showToast,
}: TripListProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [showDeleted, setShowDeleted] = useState(false);

  const handleDelete = (trip: Trip) => {
    setPendingDeletes((prev) => new Set(prev).add(trip.id));

    showToast(`"${trip.name}" deleted`, () => {
      onDelete(trip.id);
    });

    setTimeout(() => {
      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.delete(trip.id);
        return next;
      });
    }, 5500);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), currency);
    setName('');
    setCurrency('USD');
    setShowForm(false);
  };

  const activeTrips = trips.filter((t) => !pendingDeletes.has(t.id));

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-semibold text-text-primary" data-heading>Your Trips</h2>
          {trips.length > 0 && (
            <p className="text-xs text-text-secondary/60 mt-0.5">{trips.length} trip{trips.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-all text-sm font-medium"
        >
          <Plus size={15} />
          New Trip
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-surface rounded-2xl border border-border p-5 mb-5 space-y-4 animate-scale-in"
        >
          <p className="text-[10px] uppercase tracking-widest text-text-secondary/50 font-medium" data-heading>Create Trip</p>
          <input
            type="text"
            placeholder="Trip name (e.g. Bali 2026)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Trip name"
            className="w-full bg-surface-light/60 border border-border/60 rounded-xl px-4 py-3 text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 focus:bg-surface-light text-sm transition-all"
            autoFocus
          />
          <div className="flex gap-3">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Base currency"
              className="flex-1 min-w-0 bg-surface-light/60 border border-border/60 rounded-xl px-3 py-3 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 text-sm transition-all"
            >
              {Object.entries(CURRENCIES).map(([code, c]) => (
                <option key={code} value={code}>
                  {c.symbol} {code} — {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="shrink-0 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all text-sm font-medium shadow-sm shadow-primary/20 active:scale-[0.98]"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {trips.length === 0 && deletedTrips.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/8 to-accent/5 border border-dashed border-border/50 flex items-center justify-center mx-auto mb-5">
            <PlaneTakeoff size={36} className="text-primary/40" />
          </div>
          <p className="text-base font-medium text-text-primary mb-1.5">No trips yet</p>
          <p className="text-sm text-text-secondary mb-6">Create your first trip to start splitting expenses</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-all text-sm font-medium"
          >
            <Plus size={15} />
            New Trip
          </button>
        </div>
      ) : (
        <>
          {activeTrips.length === 0 && deletedTrips.length > 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/6 to-surface-light border border-dashed border-border/40 flex items-center justify-center mx-auto mb-4">
                <Receipt size={28} className="text-text-secondary/40" />
              </div>
              <p className="text-sm font-medium text-text-primary mb-1">No active trips</p>
              <p className="text-xs text-text-secondary">Check recently deleted below to restore a trip</p>
            </div>
          )}
          <div className="space-y-2.5">
            {activeTrips.map((trip, index) => (
              <div
                key={trip.id}
                className="bg-surface rounded-2xl border border-border hover:bg-surface-light/30 transition-all cursor-pointer group animate-fade-in"
                style={{ borderLeftWidth: '3px', borderLeftColor: TRIP_ACCENT_COLORS[index % TRIP_ACCENT_COLORS.length] }}
              >
                <div
                  className="flex items-center justify-between p-4"
                  onClick={() => onSelect(trip.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary truncate text-[15px]">{trip.name}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-text-secondary/70">
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {trip.members.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Receipt size={11} />
                        {trip.expenses.filter(e => !e.isSettlement).length}
                      </span>
                      <span className="bg-surface-lighter/60 rounded-full px-2 py-0.5 text-[10px] text-text-secondary/60">{trip.baseCurrency}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(trip);
                      }}
                      aria-label={`Delete trip: ${trip.name}`}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:text-danger hover:bg-danger/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ChevronRight size={16} className="text-text-secondary/30 group-hover:text-text-secondary/60 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {deletedTrips.length > 0 && (
            <div className="mt-10">
              <div className="border-t border-border/40 mb-5" />
              <button
                onClick={() => setShowDeleted(!showDeleted)}
                className="flex items-center gap-2 text-sm text-text-secondary/60 hover:text-text-secondary transition-colors mb-3"
              >
                <Trash2 size={13} />
                <span>Recently Deleted</span>
                <span className="bg-surface-light rounded-full px-2 py-0.5 text-[10px] text-text-secondary/50">{deletedTrips.length}</span>
                {showDeleted ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showDeleted && (
                <div className="space-y-2 animate-fade-in">
                  {deletedTrips
                    .slice()
                    .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
                    .map(({ trip, deletedAt }) => (
                    <div
                      key={trip.id}
                      className="bg-surface/40 rounded-2xl border border-border/40 group animate-fade-in opacity-60"
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-text-secondary truncate">{trip.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary/50">
                            <span className="flex items-center gap-1">
                              <Users size={11} />
                              {trip.members.length}
                            </span>
                            <span className="flex items-center gap-1">
                              <Receipt size={11} />
                              {trip.expenses.length}
                            </span>
                            <span>Deleted {timeAgo(deletedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onRestore(trip.id)}
                            aria-label={`Restore trip: ${trip.name}`}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
                            title="Restore"
                          >
                            <RotateCcw size={15} />
                          </button>
                          <button
                            onClick={() => onPermanentlyDelete(trip.id)}
                            aria-label={`Permanently delete trip: ${trip.name}`}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:text-danger hover:bg-danger/10 transition-all"
                            title="Delete permanently"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={onEmptyTrash}
                    className="w-full mt-2 py-2.5 text-xs text-text-secondary/40 hover:text-danger/70 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={11} />
                    Empty trash
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
