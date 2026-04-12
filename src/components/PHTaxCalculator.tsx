import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { computePhTax } from '../utils/phTax';

interface PHTaxCalculatorProps {
  onBack: () => void;
}

function formatPhp(n: number): string {
  return n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PHTaxCalculator({ onBack }: PHTaxCalculatorProps) {
  const [grossInput, setGrossInput] = useState('');

  const gross = useMemo(() => {
    const parsed = parseFloat(grossInput.replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [grossInput]);

  const breakdown = useMemo(() => computePhTax(gross), [gross]);
  const hasResult = gross > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border/30 bg-bg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="p-2 -ml-2 rounded-lg text-text-primary hover:bg-surface-light transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold text-text-primary">PH Tax Calculator</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full">
          {/* Amount input */}
          <div className="flex flex-col items-center py-8 px-4">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-3">
              Monthly Gross Salary (PHP)
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={grossInput}
              onChange={(e) => setGrossInput(e.target.value)}
              aria-label="Monthly gross salary"
              className="w-full text-7xl md:text-8xl lg:text-9xl font-bold text-text-primary text-center bg-transparent border-none outline-none placeholder:text-text-secondary/30 tracking-tight"
              autoFocus
            />
          </div>

          {/* Results */}
          {hasResult && (
            <div className="px-4 pb-6">
              <section className="bg-surface rounded-2xl border border-border overflow-hidden">
                <Row label="SSS" value={breakdown.sss} />
                <Row label="PhilHealth" value={breakdown.philHealth} />
                <Row label="Pag-IBIG" value={breakdown.pagIbig} />
                <Row label="Total Contributions" value={breakdown.totalContributions} subtle />
                <Row label="Taxable Income" value={breakdown.taxableIncome} />
                <Row label="Withholding Tax" value={breakdown.withholdingTax} />
                <div className="flex justify-between items-center px-4 py-4 bg-primary/10">
                  <span className="text-sm font-semibold text-text-primary">Net Take-Home</span>
                  <span className="text-xl font-bold text-primary">
                    ₱ {formatPhp(breakdown.netTakeHome)}
                  </span>
                </div>
              </section>

              <p className="text-[11px] text-text-secondary mt-4 px-1 leading-relaxed">
                Based on current BIR / SSS / PhilHealth / Pag-IBIG rates. For estimation only — verify against your official payslip.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  value: number;
  subtle?: boolean;
}

function Row({ label, value, subtle }: RowProps) {
  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-border last:border-b-0">
      <span className={`text-sm ${subtle ? 'text-text-secondary' : 'text-text-primary'}`}>
        {label}
      </span>
      <span className={`text-sm ${subtle ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
        ₱ {formatPhp(value)}
      </span>
    </div>
  );
}
