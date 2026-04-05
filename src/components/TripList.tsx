import { useState } from 'react';
import { Plus, Trash2, Users, Receipt, ChevronRight, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { CURRENCIES } from '../utils/currencies';
import type { Trip, DeletedTrip } from '../types';

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

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-primary">Your Trips</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Trip
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-surface rounded-xl border border-border p-4 mb-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Trip name (e.g. Bali 2026)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Trip name"
            className="w-full bg-surface-light border border-border rounded-lg px-3 py-2.5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            autoFocus
          />
          <div className="flex gap-3">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Base currency"
              className="flex-1 min-w-0 bg-surface-light border border-border rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            >
              {Object.entries(CURRENCIES).map(([code, c]) => (
                <option key={code} value={code}>
                  {c.symbol} {code} — {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="shrink-0 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm font-medium"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {trips.length === 0 && deletedTrips.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center mx-auto mb-4">
            <Receipt size={32} className="text-text-secondary" />
          </div>
          <p className="text-text-primary text-sm font-medium mb-1">Ready to split some bills?</p>
          <p className="text-text-secondary text-xs">Create your first trip to get started</p>
        </div>
      ) : (
        <>
          {trips.filter((t) => !pendingDeletes.has(t.id)).length === 0 && deletedTrips.length > 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center mx-auto mb-4">
                <Receipt size={32} className="text-text-secondary" />
              </div>
              <p className="text-text-primary text-sm font-medium mb-1">No active trips</p>
              <p className="text-text-secondary text-xs">Check recently deleted below to restore a trip</p>
            </div>
          )}
          <div className="space-y-2">
            {trips.filter((t) => !pendingDeletes.has(t.id)).map((trip) => (
              <div
                key={trip.id}
                className="bg-surface rounded-xl border border-border hover:border-primary/40 hover:border-l-2 hover:border-l-primary transition-colors cursor-pointer group animate-fade-in"
              >
                <div
                  className="flex items-center justify-between p-4"
                  onClick={() => onSelect(trip.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary truncate">{trip.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {trip.members.length} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Receipt size={12} />
                        {trip.expenses.length} expenses
                      </span>
                      <span>{trip.baseCurrency}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(trip);
                      }}
                      aria-label={`Delete trip: ${trip.name}`}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className="text-text-secondary" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {deletedTrips.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowDeleted(!showDeleted)}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-3"
              >
                <Trash2 size={14} />
                <span>Recently Deleted ({deletedTrips.length})</span>
                {showDeleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showDeleted && (
                <div className="space-y-2 animate-fade-in">
                  {deletedTrips
                    .slice()
                    .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
                    .map(({ trip, deletedAt }) => (
                    <div
                      key={trip.id}
                      className="bg-surface/60 rounded-xl border border-border/60 group animate-fade-in"
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-text-secondary truncate">{trip.name}</h3>
                          <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary/70">
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {trip.members.length} members
                            </span>
                            <span className="flex items-center gap-1">
                              <Receipt size={12} />
                              {trip.expenses.length} expenses
                            </span>
                            <span>Deleted {timeAgo(deletedAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onRestore(trip.id)}
                            aria-label={`Restore trip: ${trip.name}`}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Restore"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button
                            onClick={() => onPermanentlyDelete(trip.id)}
                            aria-label={`Permanently delete trip: ${trip.name}`}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Delete permanently"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={onEmptyTrash}
                    className="w-full mt-2 py-2 text-xs text-text-secondary hover:text-danger transition-colors"
                  >
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
