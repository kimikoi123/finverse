import { useState, useMemo, useRef, useCallback } from 'react';
import { X, Upload, FileText, ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { Transaction, Account } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getFinanceCategoryDef } from '../utils/categories';
import { formatCurrency } from '../utils/currencies';
import {
  parseStatement,
  generateSignature,
  type ParseResult,
  type ParsedStatementRow,
} from '../utils/bankStatementParser';

interface ImportStatementSheetProps {
  accounts: Account[];
  existingTransactions: Transaction[];
  defaultCurrency: string;
  onImport: (txns: Omit<Transaction, 'id' | 'createdAt'>[]) => Promise<unknown>;
  onClose: () => void;
  showToast?: (message: string, onCommit?: () => void) => string;
}

type Step = 'source' | 'preview';
type PasswordState = 'none' | 'needed' | 'incorrect';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

export default function ImportStatementSheet({
  accounts,
  existingTransactions,
  defaultCurrency,
  onImport,
  onClose,
  showToast,
}: ImportStatementSheetProps) {
  useEscapeKey(onClose);

  const [step, setStep] = useState<Step>('source');
  const [accountId, setAccountId] = useState<string>('');
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [csvText, setCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  // For PDF uploads we keep the raw buffer and defer text extraction until
  // the user clicks Parse — that way we can prompt for a password without
  // a wasted round-trip through pdfjs first.
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfPassword, setPdfPassword] = useState<string>('');
  const [passwordState, setPasswordState] = useState<PasswordState>('none');
  const [extracting, setExtracting] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string>('');
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [overrides, setOverrides] = useState<Map<number, { category?: string; type?: 'income' | 'expense' }>>(new Map());
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Pre-compute signatures of existing transactions for dedup highlighting
  const existingSignatures = useMemo(() => {
    const s = new Set<string>();
    for (const t of existingTransactions) {
      if (t.deletedAt) continue;
      s.add(generateSignature(t.date, t.amount, t.description));
    }
    return s;
  }, [existingTransactions]);

  // When the user picks an account, default the currency to that account's currency
  const handleAccountChange = (id: string) => {
    setAccountId(id);
    if (id) {
      const acc = accounts.find((a) => a.id === id);
      if (acc) setCurrency(acc.currency);
    }
  };

  const handleFile = useCallback(async (file: File) => {
    setParseError('');
    setPasswordState('none');
    setPdfPassword('');
    if (file.size > MAX_FILE_BYTES) {
      setParseError('File is too large (max 10 MB).');
      return;
    }
    try {
      if (isPdfFile(file)) {
        const buffer = await file.arrayBuffer();
        setPdfBuffer(buffer);
        setCsvText('');
        setFileName(file.name);
      } else {
        const text = await file.text();
        setCsvText(text);
        setPdfBuffer(null);
        setFileName(file.name);
      }
    } catch {
      setParseError('Could not read the file. Try pasting the contents instead.');
    }
  }, []);

  const handleParse = async () => {
    setParseError('');

    let textToParse = csvText;

    // PDF path: extract text first (with optional password). The extractor
    // module is dynamically imported so users who only paste CSV don't
    // pay the bundle cost of pdfjs.
    if (pdfBuffer) {
      setExtracting(true);
      try {
        const { extractStatementText, PdfPasswordRequiredError } = await import('../utils/pdfStatementExtractor');
        try {
          const opts = pdfPassword ? { password: pdfPassword } : {};
          textToParse = await extractStatementText(pdfBuffer, opts);
          setCsvText(textToParse);
          setPdfBuffer(null);
          setPasswordState('none');
        } catch (err) {
          if (err instanceof PdfPasswordRequiredError) {
            setPasswordState(err.reason);
            setExtracting(false);
            return;
          }
          throw err;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        setParseError(
          msg
            ? `Could not read this PDF: ${msg}`
            : 'Could not read this PDF. It may be damaged or use an unsupported format.',
        );
        setExtracting(false);
        return;
      }
      setExtracting(false);
    }

    if (!textToParse.trim()) {
      setParseError('Paste a CSV, drop a file, or upload a PDF first.');
      return;
    }

    const result = parseStatement(textToParse);
    if (result.rows.length === 0) {
      const first = result.errors[0]?.message;
      const total = result.errors.length;
      setParseError(
        total > 1 && first
          ? `Could not parse ${total} rows. First error: ${first}`
          : first ?? 'Could not find any transactions in this file. Make sure it has a header row with a date and description column.',
      );
      return;
    }
    setParseResult(result);
    const autoSkip = new Set<number>();
    result.rows.forEach((r, i) => {
      if (existingSignatures.has(r.signature)) autoSkip.add(i);
    });
    setSkipped(autoSkip);
    setOverrides(new Map());
    setStep('preview');
  };

  const toggleSkip = (idx: number) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const setRowCategory = (idx: number, value: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(idx) ?? {};
      // Categories carry an implicit type — switching to an income category
      // flips the row to income, and vice versa.
      const isIncomeCat = INCOME_CATEGORIES.some((c) => c.value === value);
      next.set(idx, { ...existing, category: value, type: isIncomeCat ? 'income' : 'expense' });
      return next;
    });
  };

  const effectiveRow = (row: ParsedStatementRow, idx: number): ParsedStatementRow => {
    const o = overrides.get(idx);
    if (!o) return row;
    return { ...row, category: o.category ?? row.category, type: o.type ?? row.type };
  };

  const importable = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.rows
      .map((r, i) => ({ row: effectiveRow(r, i), idx: i }))
      .filter(({ idx }) => !skipped.has(idx));
  }, [parseResult, skipped, overrides]); // eslint-disable-line react-hooks/exhaustive-deps

  const duplicateCount = useMemo(() => {
    if (!parseResult) return 0;
    return parseResult.rows.filter((r) => existingSignatures.has(r.signature)).length;
  }, [parseResult, existingSignatures]);

  const handleImport = async () => {
    if (!parseResult || importable.length === 0) return;
    setImporting(true);
    try {
      const txns: Omit<Transaction, 'id' | 'createdAt'>[] = importable.map(({ row }) => ({
        type: row.type,
        amount: row.amount,
        currency,
        category: row.category,
        description: row.description,
        date: row.date,
        ...(accountId ? { accountId } : {}),
      }));
      await onImport(txns);
      if (showToast) {
        showToast(`Imported ${txns.length} transaction${txns.length === 1 ? '' : 's'}`);
      }
      onClose();
    } catch {
      setParseError('Could not save the imported transactions. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center sm:justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative w-full sm:max-w-2xl bg-surface sm:rounded-2xl border-0 sm:border border-border flex flex-col h-full sm:max-h-[90vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-border"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
        >
          {step === 'preview' ? (
            <button
              type="button"
              onClick={() => setStep('source')}
              aria-label="Back"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <h2 className="text-base font-bold text-text-primary">
            {step === 'source' ? 'Import Transactions' : 'Review & Import'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {step === 'source' ? (
            <SourceStep
              accounts={accounts}
              accountId={accountId}
              onAccountChange={handleAccountChange}
              currency={currency}
              onCurrencyChange={setCurrency}
              csvText={csvText}
              onCsvTextChange={setCsvText}
              fileName={fileName}
              hasPdf={pdfBuffer !== null}
              onFile={handleFile}
              fileInputRef={fileInputRef}
              passwordState={passwordState}
              pdfPassword={pdfPassword}
              onPasswordChange={setPdfPassword}
              parseError={parseError}
            />
          ) : (
            <PreviewStep
              parseResult={parseResult!}
              skipped={skipped}
              onToggleSkip={toggleSkip}
              onCategoryChange={setRowCategory}
              effectiveRow={effectiveRow}
              currency={currency}
              existingSignatures={existingSignatures}
              duplicateCount={duplicateCount}
              parseError={parseError}
            />
          )}
        </div>

        {/* Footer */}
        <div
          className="border-t border-border p-4 bg-surface"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          {step === 'source' ? (
            <button
              type="button"
              onClick={handleParse}
              disabled={(!csvText.trim() && !pdfBuffer) || extracting}
              className="w-full bg-primary text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {extracting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Reading PDF...
                </>
              ) : passwordState !== 'none' ? (
                <>
                  <Lock size={16} />
                  Unlock & parse
                </>
              ) : (
                'Parse statement'
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              disabled={importable.length === 0 || importing}
              className="w-full bg-primary text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${importable.length} transaction${importable.length === 1 ? '' : 's'}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Source step ---

interface SourceStepProps {
  accounts: Account[];
  accountId: string;
  onAccountChange: (id: string) => void;
  currency: string;
  onCurrencyChange: (c: string) => void;
  csvText: string;
  onCsvTextChange: (s: string) => void;
  fileName: string;
  hasPdf: boolean;
  onFile: (f: File) => void | Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  passwordState: PasswordState;
  pdfPassword: string;
  onPasswordChange: (s: string) => void;
  parseError: string;
}

function SourceStep({
  accounts,
  accountId,
  onAccountChange,
  currency,
  onCurrencyChange,
  csvText,
  onCsvTextChange,
  fileName,
  hasPdf,
  onFile,
  fileInputRef,
  passwordState,
  pdfPassword,
  onPasswordChange,
  parseError,
}: SourceStepProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Upload a CSV or PDF statement, or paste CSV text. We'll auto-detect the format and let you review before saving.
      </p>

      {/* Account picker */}
      {accounts.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Assign to account (optional)
          </label>
          <select
            value={accountId}
            onChange={(e) => onAccountChange(e.target.value)}
            className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          >
            <option value="">No account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Currency */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">Currency</label>
        <input
          type="text"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value.toUpperCase())}
          maxLength={3}
          className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void onFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ' +
          (dragOver ? 'border-primary bg-primary/5' : 'border-border bg-surface-light hover:border-primary/50')
        }
      >
        <Upload size={24} className="mx-auto text-text-secondary mb-2" />
        {fileName ? (
          <>
            <p className="text-sm font-medium text-text-primary">{fileName}</p>
            <p className="text-xs text-text-secondary mt-1">Tap to choose a different file</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-text-primary">Tap to upload, or drag & drop</p>
            <p className="text-xs text-text-secondary mt-1">CSV or PDF from BPI, BDO, GCash, Maya, UnionBank, etc.</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.pdf,text/csv,text/plain,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Password prompt — appears only when an uploaded PDF is encrypted */}
      {passwordState !== 'none' && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Lock size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                {passwordState === 'incorrect' ? 'Incorrect password' : 'This PDF is password-protected'}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Enter the password your bank uses (often the last 4 digits of your card or your birthdate).
              </p>
            </div>
          </div>
          <input
            type="password"
            value={pdfPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="PDF password"
            autoFocus
            autoComplete="off"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          />
        </div>
      )}

      {/* Or paste — hidden when a PDF is queued, since text paste would be ignored */}
      {!hasPdf && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Or paste CSV directly
          </label>
          <textarea
            value={csvText}
            onChange={(e) => onCsvTextChange(e.target.value)}
            rows={6}
            placeholder={'Date,Description,Amount\n2026-01-15,GRAB FOOD,-250.00\n...'}
            className="w-full bg-surface-light border border-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-primary font-mono resize-none"
          />
        </div>
      )}

      {parseError && (
        <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-xl p-3 text-sm text-danger">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{parseError}</span>
        </div>
      )}

      <details className="bg-surface-light border border-border rounded-xl p-3">
        <summary className="text-xs font-medium text-text-secondary cursor-pointer">
          Supported columns
        </summary>
        <div className="mt-2 text-xs text-text-secondary space-y-1">
          <p><strong className="text-text-primary">Date:</strong> Transaction Date, Posting Date, Date and Time, Date</p>
          <p><strong className="text-text-primary">Description:</strong> Description, Particulars, Details, Merchant, Memo</p>
          <p><strong className="text-text-primary">Amount:</strong> Amount (signed), or split Debit / Credit / Withdrawal / Deposit columns</p>
          <p>Common date formats are auto-detected: <code>2026-01-15</code>, <code>01/15/2026</code>, <code>15 Jan 2026</code>.</p>
        </div>
      </details>
    </div>
  );
}

// --- Preview step ---

interface PreviewStepProps {
  parseResult: ParseResult;
  skipped: Set<number>;
  onToggleSkip: (idx: number) => void;
  onCategoryChange: (idx: number, value: string) => void;
  effectiveRow: (row: ParsedStatementRow, idx: number) => ParsedStatementRow;
  currency: string;
  existingSignatures: Set<string>;
  duplicateCount: number;
  parseError: string;
}

function PreviewStep({
  parseResult,
  skipped,
  onToggleSkip,
  onCategoryChange,
  effectiveRow,
  currency,
  existingSignatures,
  duplicateCount,
  parseError,
}: PreviewStepProps) {
  const totalRows = parseResult.rows.length;
  const includedCount = totalRows - skipped.size;

  return (
    <div className="space-y-3">
      {/* Detected format banner */}
      <div className="flex items-start gap-2 bg-primary/10 border border-primary/30 rounded-xl p-3 text-sm">
        <FileText size={16} className="text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="text-text-primary">
            <strong>Detected:</strong> {parseResult.formatLabel}
            {parseResult.isCreditCard ? ' · Credit Card' : ''}
          </span>
          {parseResult.isCreditCard && (
            <p className="text-xs text-text-secondary mt-0.5">
              Charges are imported as expenses. Payments to the card show as income — re-categorize or skip if you'll record the bank-side transfer separately.
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <SummaryTile label="To import" value={includedCount} accent="primary" />
        <SummaryTile label="Duplicates" value={duplicateCount} accent={duplicateCount > 0 ? 'accent' : 'muted'} />
        <SummaryTile label="Errors" value={parseResult.errors.length} accent={parseResult.errors.length > 0 ? 'accent' : 'muted'} />
      </div>

      {duplicateCount > 0 && (
        <p className="text-xs text-text-secondary">
          {duplicateCount} row{duplicateCount === 1 ? '' : 's'} match an existing transaction and {duplicateCount === 1 ? 'is' : 'are'} skipped by default. Tap to include anyway.
        </p>
      )}

      {parseResult.errors.length > 0 && (
        <details className="bg-accent/10 border border-accent/30 rounded-xl p-3">
          <summary className="text-xs font-medium text-accent cursor-pointer">
            {parseResult.errors.length} row{parseResult.errors.length === 1 ? '' : 's'} could not be parsed
          </summary>
          <ul className="mt-2 text-xs text-text-secondary space-y-1">
            {parseResult.errors.slice(0, 10).map((e, i) => (
              <li key={i}>
                Line {e.line}: {e.message}
              </li>
            ))}
            {parseResult.errors.length > 10 && (
              <li>...and {parseResult.errors.length - 10} more</li>
            )}
          </ul>
        </details>
      )}

      {/* Row list */}
      <div className="bg-surface-light border border-border rounded-xl divide-y divide-border-subtle">
        {parseResult.rows.map((r, i) => {
          const isSkipped = skipped.has(i);
          const isDuplicate = existingSignatures.has(r.signature);
          const eff = effectiveRow(r, i);
          const cat = getFinanceCategoryDef(eff.category);
          const isExpense = eff.type === 'expense';
          return (
            <div
              key={i}
              className={
                'flex items-start gap-2 p-3 ' +
                (isSkipped ? 'opacity-40' : '')
              }
            >
              <input
                type="checkbox"
                checked={!isSkipped}
                onChange={() => onToggleSkip(i)}
                aria-label={isSkipped ? 'Include row' : 'Skip row'}
                className="mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {eff.description}
                  </p>
                  <span
                    className={
                      'text-sm font-semibold shrink-0 ' +
                      (isExpense ? 'text-danger' : 'text-success')
                    }
                  >
                    {isExpense ? '-' : '+'}
                    {formatCurrency(eff.amount, currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-text-secondary">{eff.date}</span>
                  <span className="text-xs text-text-secondary">·</span>
                  <select
                    value={eff.category}
                    onChange={(e) => onCategoryChange(i, e.target.value)}
                    className="text-xs bg-surface border border-border rounded-md px-2 py-0.5 text-text-primary outline-none focus:border-primary"
                  >
                    <optgroup label="Expense">
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Income">
                      {INCOME_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                      ))}
                    </optgroup>
                  </select>
                  {isDuplicate && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                      Duplicate
                    </span>
                  )}
                  {r.warnings.length > 0 && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-text-secondary bg-surface px-1.5 py-0.5 rounded" title={r.warnings.join('; ')}>
                      {r.warnings[0]}
                    </span>
                  )}
                  {!isExpense && !isSkipped && (
                    <CheckCircle2 size={12} className="text-success" aria-label={`${cat.label} income`} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {parseError && (
        <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 rounded-xl p-3 text-sm text-danger">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{parseError}</span>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: number; accent: 'primary' | 'accent' | 'muted' }) {
  const color =
    accent === 'primary' ? 'text-primary' :
    accent === 'accent' ? 'text-accent' :
    'text-text-secondary';
  return (
    <div className="bg-surface-light border border-border rounded-xl p-2">
      <p className={'text-lg font-bold ' + color}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-text-secondary">{label}</p>
    </div>
  );
}
