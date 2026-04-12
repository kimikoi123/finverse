import type { PaydayConfig } from '../types';

export interface PaydayOccurrence {
  date: Date;
  amount: number;
  currency: string;
}

export interface NearestPaydayInfo {
  date: Date;
  amount: number;
  currency: string;
  daysUntil: number;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function monthlyOccurrences(day: number, amount: number, currency: string, start: Date, end: Date): PaydayOccurrence[] {
  const results: PaydayOccurrence[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  for (let i = 0; i < 14; i++) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + i;
    const maxDay = new Date(y, m + 1, 0).getDate();
    const clamped = Math.min(day, maxDay);
    const d = new Date(y, m, clamped);
    d.setHours(0, 0, 0, 0);
    if (d > end) break;
    if (d >= start) results.push({ date: d, amount, currency });
  }
  return results;
}

function intervalOccurrences(refDateStr: string, stepDays: number, amount: number, currency: string, start: Date, end: Date): PaydayOccurrence[] {
  const ref = startOfDay(new Date(refDateStr));
  const results: PaydayOccurrence[] = [];
  const msStep = stepDays * 86400000;

  let cursor: Date;
  if (ref >= start) {
    cursor = ref;
  } else {
    const gap = Math.floor((start.getTime() - ref.getTime()) / msStep);
    cursor = new Date(ref.getTime() + gap * msStep);
    if (cursor < start) cursor = new Date(cursor.getTime() + msStep);
  }

  for (let i = 0; i < 53; i++) {
    const d = new Date(cursor.getTime() + i * msStep);
    d.setHours(0, 0, 0, 0);
    if (d > end) break;
    if (d >= start) results.push({ date: d, amount, currency });
  }
  return results;
}

export function getPaydayOccurrences(config: PaydayConfig, windowStart: Date, windowEnd: Date): PaydayOccurrence[] {
  switch (config.frequency) {
    case 'monthly':
      return monthlyOccurrences(config.day, config.amount, config.currency, windowStart, windowEnd);
    case 'semi-monthly': {
      const occ1 = monthlyOccurrences(config.day1, config.amount1, config.currency, windowStart, windowEnd);
      const occ2 = monthlyOccurrences(config.day2, config.amount2, config.currency, windowStart, windowEnd);
      return [...occ1, ...occ2].sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    case 'biweekly':
      return intervalOccurrences(config.refDate, 14, config.amount, config.currency, windowStart, windowEnd);
    case 'weekly':
      return intervalOccurrences(config.refDate, 7, config.amount, config.currency, windowStart, windowEnd);
  }
}

export function getNearestPayday(config: PaydayConfig | undefined): NearestPaydayInfo | null {
  if (!config) return null;
  const today = startOfDay(new Date());
  const farFuture = new Date(today);
  farFuture.setFullYear(farFuture.getFullYear() + 1);
  const occurrences = getPaydayOccurrences(config, today, farFuture);
  if (occurrences.length === 0) return null;
  const nearest = occurrences[0];
  const daysUntil = Math.round((nearest.date.getTime() - today.getTime()) / 86400000);
  return { date: nearest.date, amount: nearest.amount, currency: nearest.currency, daysUntil };
}
