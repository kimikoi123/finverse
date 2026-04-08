import { useState, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { parseTransactionInput, type ParsedTransaction } from '../utils/transactionParser';

interface QuickAddBarProps {
  onParsed: (parsed: ParsedTransaction) => void;
}

const EXAMPLES = ['Coffee 150', 'Salary 30k', 'Uber 15.50'];

export default function QuickAddBar({ onParsed }: QuickAddBarProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const result = parseTransactionInput(value);
    if (result) {
      onParsed(result);
      setValue('');
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChipTap = (text: string) => {
    setValue(text);
    inputRef.current?.focus();
  };

  return (
    <div className="mb-4">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          enterKeyHint="go"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false); }}
          onKeyDown={handleKeyDown}
          placeholder='e.g. Coffee 150, Salary 30k...'
          className={`flex-1 min-w-0 bg-surface border rounded-xl py-2.5 px-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-1 transition-all ${
            error
              ? 'border-danger/50 focus:ring-danger/30 focus:border-danger/40'
              : 'border-border focus:ring-primary/30 focus:border-primary/40'
          }`}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="shrink-0 w-10 h-10 flex items-center justify-center bg-primary text-white rounded-xl transition-all active:scale-95 disabled:opacity-30"
        >
          <ArrowRight size={18} />
        </button>
      </div>
      {error && (
        <p className="text-danger text-xs mt-1.5 ml-1">Enter a description and amount</p>
      )}
      <div className="flex gap-1.5 mt-2 ml-0.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => handleChipTap(ex)}
            className="text-[10px] text-text-secondary/50 bg-surface-light border border-border/50 rounded-lg px-2 py-0.5 transition-all active:scale-95 hover:text-text-secondary"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
