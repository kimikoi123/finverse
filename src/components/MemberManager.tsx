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
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
          Members ({visibleMembers.length})
        </h3>
        <button
          onClick={() => setShowInput(!showInput)}
          aria-label={showInput ? 'Cancel adding member' : 'Add new member'}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-light transition-colors text-primary"
        >
          <UserPlus size={18} />
        </button>
      </div>

      {showInput && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="New member name"
            className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
          <button
            type="submit"
            aria-label="Add member"
            className="px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm"
          >
            <Plus size={16} />
          </button>
        </form>
      )}

      {visibleMembers.length === 0 ? (
        <p className="text-text-secondary text-xs py-2">Add members to start splitting expenses</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visibleMembers.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-2 bg-surface-light rounded-full pl-1 pr-2 py-1 group animate-scale-in"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: getAvatarColor(i) }}
              >
                {getInitials(m.name)}
              </div>
              <span className="text-sm text-text-primary">{m.name}</span>
              <button
                onClick={() => handleRemove(m)}
                aria-label={`Remove member: ${m.name}`}
                className="p-1.5 -mr-1 rounded-full text-text-secondary hover:text-danger transition-colors sm:opacity-0 sm:group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <InlineAlert message={removeError} onDismiss={dismissRemoveError} autoDismissMs={4000} />
    </div>
  );
}
