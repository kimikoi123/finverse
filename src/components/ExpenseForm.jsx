import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { CURRENCIES } from '../utils/currencies';

export default function ExpenseForm({ members, baseCurrency, onAdd, onCancel }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);
  const [paidBy, setPaidBy] = useState(members[0]?.id || '');
  const [splitType, setSplitType] = useState('equal');
  const [participants, setParticipants] = useState(members.map((m) => m.id));
  const [customAmounts, setCustomAmounts] = useState({});
  const [category, setCategory] = useState('general');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const CATEGORIES = [
    { value: 'food', label: 'Food & Drinks' },
    { value: 'transport', label: 'Transport' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'activities', label: 'Activities' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'general', label: 'General' },
  ];

  const toggleParticipant = (id) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || !paidBy || participants.length === 0) return;

    const expense = {
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      paidBy,
      splitType,
      participants,
      category,
      date,
      customAmounts: splitType === 'custom' ? customAmounts : {},
    };

    // Validate custom amounts
    if (splitType === 'custom') {
      const total = Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      if (Math.abs(total - parseFloat(amount)) > 0.01) {
        alert(`Custom amounts (${total.toFixed(2)}) must equal the total (${parseFloat(amount).toFixed(2)})`);
        return;
      }
    }

    onAdd(expense);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
          New Expense
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-surface-light transition-colors text-text-secondary"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="What was it for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="sm:col-span-2 bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          autoFocus
        />

        <div className="flex gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-24 bg-surface-light border border-border rounded-lg px-2 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {Object.entries(CURRENCIES).map(([code, c]) => (
              <option key={code} value={code}>
                {c.symbol} {code}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="sm:col-span-2 bg-surface-light border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text-secondary mb-2 block">Paid by</label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaidBy(m.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                paidBy === m.id
                  ? 'bg-primary text-white'
                  : 'bg-surface-light text-text-secondary hover:text-text-primary'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-text-secondary mb-2 block">Split type</label>
        <div className="flex gap-2">
          {['equal', 'custom'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSplitType(type)}
              className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                splitType === type
                  ? 'bg-primary text-white'
                  : 'bg-surface-light text-text-secondary hover:text-text-primary'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-text-secondary mb-2 block">
          Split between
        </label>
        {splitType === 'equal' ? (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleParticipant(m.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  participants.includes(m.id)
                    ? 'bg-success/20 text-success border border-success/30'
                    : 'bg-surface-light text-text-secondary hover:text-text-primary border border-transparent'
                }`}
              >
                {m.name}
                {participants.includes(m.id) && amount
                  ? ` (${CURRENCIES[currency]?.symbol || ''}${(parseFloat(amount) / participants.length).toFixed(2)})`
                  : ''}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="text-sm text-text-primary w-24 truncate">{m.name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={customAmounts[m.id] || ''}
                  onChange={(e) =>
                    setCustomAmounts((prev) => ({
                      ...prev,
                      [m.id]: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ))}
            {amount && (
              <p className="text-xs text-text-secondary">
                Assigned: {CURRENCIES[currency]?.symbol}
                {Object.values(customAmounts).reduce((s, v) => s + (v || 0), 0).toFixed(2)}
                {' / '}
                {CURRENCIES[currency]?.symbol}{parseFloat(amount).toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add Expense
      </button>
    </form>
  );
}
