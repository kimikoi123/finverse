import { useState, useMemo } from 'react';
import { X, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { Transaction, Account } from '../types';
import { todayISO } from '../utils/dates';
import InlineAlert from './ui/InlineAlert';
import {
  filterTransactionsForExport,
  generateCSV,
  generatePDF,
  downloadFile,
} from '../utils/exportStatement';

interface ExportSheetProps {
  transactions: Transaction[];
  accounts: Account[];
  defaultCurrency: string;
  displayName: string;
  onClose: () => void;
}

type Format = 'pdf' | 'csv';

function getDefaultDateFrom(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function ExportSheet({
  transactions,
  accounts,
  defaultCurrency,
  displayName,
  onClose,
}: ExportSheetProps) {
  useEscapeKey(onClose);

  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo, setDateTo] = useState(todayISO);
  const [accountId, setAccountId] = useState('all');
  const [format, setFormat] = useState<Format>('csv');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidRange = dateFrom > dateTo;

  const filtered = useMemo(
    () => filterTransactionsForExport(transactions, dateFrom, dateTo, accountId),
    [transactions, dateFrom, dateTo, accountId],
  );

  const handleExport = async () => {
    if (filtered.length === 0 || invalidRange) return;
    setExporting(true);
    setError(null);

    try {
      const dateTag = `${dateFrom}_${dateTo}`;
      if (format === 'csv') {
        const csv = generateCSV(filtered, accounts, defaultCurrency);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        downloadFile(blob, `statement-${dateTag}.csv`);
      } else {
        const blob = await generatePDF(filtered, accounts, {
          dateFrom,
          dateTo,
          accountId,
          displayName,
          defaultCurrency,
        });
        downloadFile(blob, `statement-${dateTag}.pdf`);
      }
      onClose();
    } catch {
      setError('Could not generate the export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg bg-surface rounded-t-2xl border border-border border-b-0 p-4 sm:p-5 max-h-[90dvh] overflow-y-auto overscroll-contain animate-scale-in"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">Export Statement</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Account filter */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-secondary mb-1">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Format toggle */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-secondary mb-1">Format</label>
          <div className="flex gap-2">
            {([
              { id: 'csv' as const, label: 'CSV', icon: FileSpreadsheet },
              { id: 'pdf' as const, label: 'PDF', icon: FileText },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFormat(id)}
                className={
                  format === id
                    ? 'flex items-center gap-1.5 bg-primary text-white rounded-xl px-4 py-1.5 text-xs font-semibold'
                    : 'flex items-center gap-1.5 bg-surface-light border border-border rounded-xl px-4 py-1.5 text-xs text-text-secondary'
                }
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview count */}
        <p className={`text-xs mb-4 ${invalidRange ? 'text-danger' : 'text-text-secondary'}`}>
          {invalidRange
            ? 'The “From” date is after the “To” date.'
            : filtered.length === 0
            ? 'No transactions in this range'
            : `${filtered.length} transaction${filtered.length === 1 ? '' : 's'} found`}
        </p>

        <InlineAlert message={error} onDismiss={() => setError(null)} />

        {/* Export button */}
        <button
          type="button"
          onClick={handleExport}
          disabled={filtered.length === 0 || exporting || invalidRange}
          className="w-full bg-primary text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {exporting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            `Export ${format.toUpperCase()}`
          )}
        </button>
      </div>
    </div>
  );
}
