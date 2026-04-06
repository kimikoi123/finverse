import { useState, useCallback } from 'react';
import { Plus, X, UserPlus } from 'lucide-react';
import { getInitials, getAvatarColor } from '../utils/helpers';
import InlineAlert from './ui/InlineAlert';
import type { Member, Expense } from '../types';

interface MemberManagerProps {
  members: Member[];
  expenses: Expense[];
  onAdd: (name: string) => Member | undefined;
  onRemove: (id: string) => boolean | undefined;
  showToast: (message: string, onCommit: () => void) => string;
}

export default function MemberManager({ members, expenses, onAdd, onRemove, showToast }: MemberManagerProps) {
  const [name, setName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [removeError, setRemoveError] = useState<string | null>(null);
  const dismissRemoveError = useCallback(() => setRemoveError(null), []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
  };

  const memberHasExpenses = (memberId: string) =>
    expenses.some((e) => e.paidBy === memberId || e.participants.includes(memberId));

  const handleRemove = (member: Member) => {
    if (memberHasExpenses(member.id)) {
      setRemoveError(`Can't remove ${member.name} — they have expenses.`);
      return;
    }

    setPendingDeletes((prev) => new Set(prev).add(member.id));

    showToast(`"${member.name}" removed`, () => {
      onRemove(member.id);
    });

    setTimeout(() => {
      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    }, 5500);
  };

  const visibleMembers = members.filter((m) => !pendingDeletes.has(m.id));

  return (
    <div className="bg-surface rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-medium text-text-secondary/50 uppercase tracking-widest" data-heading>
          Members ({visibleMembers.length})
        </h3>
        <button
          onClick={() => setShowInput(!showInput)}
          aria-label={showInput ? 'Cancel adding member' : 'Add new member'}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-surface-light transition-all text-primary/70 hover:text-primary"
        >
          <UserPlus size={17} />
        </button>
      </div>

      {showInput && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="New member name"
            className="flex-1 bg-surface-light/60 border border-border/60 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
            autoFocus
          />
          <button
            type="submit"
            aria-label="Add member"
            className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all text-sm shadow-sm shadow-primary/20 active:scale-[0.98]"
          >
            <Plus size={15} />
          </button>
        </form>
      )}

      {visibleMembers.length === 0 ? (
        <p className="text-text-secondary/40 text-xs py-3">Add members to start splitting expenses</p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {visibleMembers.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-2 bg-surface-light/50 rounded-full pl-1.5 pr-3 py-1.5 group animate-scale-in ring-1 ring-border/20"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ring-2 ring-surface"
                style={{ backgroundColor: getAvatarColor(i) }}
              >
                {getInitials(m.name)}
              </div>
              <span className="text-sm text-text-primary">{m.name}</span>
              <button
                onClick={() => handleRemove(m)}
                aria-label={`Remove member: ${m.name}`}
                className="p-1 -mr-1.5 rounded-full text-text-secondary/30 hover:text-danger transition-all sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <InlineAlert message={removeError} onDismiss={dismissRemoveError} autoDismissMs={4000} />
    </div>
  );
}
