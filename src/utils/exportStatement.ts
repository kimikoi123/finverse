import type { Transaction, Account } from '../types';
import { getFinanceCategoryDef } from './categories';
import { formatCurrencyRaw } from './currencies';

type FilterType = 'all' | 'income' | 'expense';

export interface ExportOptions {
  dateFrom: string;
  dateTo: string;
  accountId?: string;
  type?: FilterType;
  displayName: string;
  defaultCurrency: string;
}

export interface StatementSummary {
  totalIncome: number;
  totalExpenses: number;
  net: number;
  count: number;
}

export function filterTransactionsForExport(
  transactions: Transaction[],
  dateFrom: string,
  dateTo: string,
  accountId?: string,
  type?: FilterType,
): Transaction[] {
  return transactions
    .filter((t) => {
      if (t.date < dateFrom || t.date > dateTo) return false;
      if (accountId && accountId !== 'all' && t.accountId !== accountId) return false;
      if (type && type !== 'all' && t.type !== type) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export function computeSummary(transactions: Transaction[]): StatementSummary {
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const t of transactions) {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpenses += t.amount;
  }
  return {
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    count: transactions.length,
  };
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateCSV(
  transactions: Transaction[],
  accounts: Account[],
  defaultCurrency: string,
): string {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const header = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency', 'Account'];
  const rows = transactions.map((t) => [
    t.date,
    escapeCSV(t.description),
    escapeCSV(getFinanceCategoryDef(t.category).label),
    t.type === 'income' ? 'Income' : 'Expense',
    t.type === 'expense' ? `-${t.amount.toFixed(2)}` : t.amount.toFixed(2),
    t.currency || defaultCurrency,
    escapeCSV(t.accountId ? (accountMap.get(t.accountId) ?? '') : ''),
  ]);

  const BOM = '\uFEFF';
  return BOM + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function formatDateRange(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

export async function generatePDF(
  transactions: Transaction[],
  accounts: Account[],
  options: ExportOptions,
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Statement', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  let y = 28;

  if (options.displayName) {
    doc.text(options.displayName, 14, y);
    y += 5;
  }

  doc.text(formatDateRange(options.dateFrom, options.dateTo), 14, y);
  y += 5;

  if (options.accountId && options.accountId !== 'all') {
    const acc = accountMap.get(options.accountId);
    if (acc) {
      doc.text(`Account: ${acc.name} (${acc.type})`, 14, y);
      y += 5;
    }
  }

  // Separator line
  y += 2;
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Table
  const tableData = transactions.map((t) => {
    const cat = getFinanceCategoryDef(t.category);
    const dateStr = new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const sign = t.type === 'expense' ? '-' : '+';
    const amount = `${sign}${formatCurrencyRaw(t.amount, t.currency || options.defaultCurrency)}`;
    return [dateStr, t.description, cat.label, amount];
  });

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Category', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [51, 51, 51],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 24 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        const raw = data.row.raw as string[];
        if (raw[3]?.startsWith('-')) {
          data.cell.styles.textColor = [220, 38, 38];
        } else {
          data.cell.styles.textColor = [22, 163, 74];
        }
      }
    },
  });

  // Summary
  const summary = computeSummary(transactions);
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51);
  doc.text('Summary', 14, finalY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const currency = options.defaultCurrency;
  const lines = [
    `Total Income:     ${formatCurrencyRaw(summary.totalIncome, currency)}`,
    `Total Expenses:   ${formatCurrencyRaw(summary.totalExpenses, currency)}`,
    `Net:              ${formatCurrencyRaw(summary.net, currency)}`,
    `Transactions:     ${summary.count}`,
  ];
  lines.forEach((line, i) => {
    doc.text(line, 14, finalY + 7 + i * 5);
  });

  // Footer
  const footerY = finalY + 7 + lines.length * 5 + 8;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    14,
    footerY,
  );

  return doc.output('blob');
}

export function downloadFile(blob: Blob, filename: string): void {
  const file = new File([blob], filename, { type: blob.type });

  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {
      // User cancelled share - fall through to download
      triggerDownload(blob, filename);
    });
  } else {
    triggerDownload(blob, filename);
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
