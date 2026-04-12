# Flexible Pay Frequency

**Date:** 2026-04-12
**Approach:** Replace flat payday fields with a discriminated union `PaydayConfig` object

## Problem

The app currently supports only a single monthly payday (one day-of-month). Filipino workers are typically paid semi-monthly (15th & 30th), and other schedules like weekly and biweekly are common elsewhere. The current model cannot represent any of these.

## Data Model

Replace `paydayDay`, `paydayAmount`, `paydayCurrency` in `UserPreferences` with a single optional field:

```ts
type PaydayFrequency = 'monthly' | 'semi-monthly' | 'biweekly' | 'weekly';

type PaydayConfigMonthly = {
  frequency: 'monthly';
  day: number;          // 1-31
  amount: number;
  currency: string;
};

type PaydayConfigSemiMonthly = {
  frequency: 'semi-monthly';
  day1: number;         // 1-31
  amount1: number;
  day2: number;         // 1-31, must differ from day1
  amount2: number;
  currency: string;     // shared across both paydays
};

type PaydayConfigBiweekly = {
  frequency: 'biweekly';
  refDate: string;      // ISO date string of a known payday
  amount: number;
  currency: string;
};

type PaydayConfigWeekly = {
  frequency: 'weekly';
  refDate: string;      // ISO date string of a known payday
  amount: number;
  currency: string;
};

type PaydayConfig =
  | PaydayConfigMonthly
  | PaydayConfigSemiMonthly
  | PaydayConfigBiweekly
  | PaydayConfigWeekly;
```

`UserPreferences` changes:
- Remove: `paydayDay?: number`, `paydayAmount?: number`, `paydayCurrency?: string`
- Add: `paydayConfig?: PaydayConfig`

## Migration

On preferences load, detect old format and convert automatically:

- If `paydayDay` exists but `paydayConfig` does not: create `PaydayConfigMonthly` from old values, remove flat fields.
- If neither exists: no-op.
- Runs once transparently on app load. No user action needed.

## Settings UI

The Payday section in Settings gains a frequency selector as the first row:

**Frequency dropdown** — `Monthly | Semi-monthly | Biweekly | Weekly`

Conditional rows based on selected frequency:

| Frequency | Fields |
|-----------|--------|
| Monthly | Day of month (1-31), Amount, Currency |
| Semi-monthly | Day 1 (1-31) + Amount 1, Day 2 (1-31) + Amount 2, Currency (shared) |
| Biweekly | Reference date (date input), Amount, Currency |
| Weekly | Reference date (date input), Amount, Currency |

Validation rules:
- Day fields: integer 1-31
- Amount fields: number > 0
- Reference dates: valid date
- Semi-monthly: day1 must differ from day2
- All fields save on blur, consistent with current behavior

## Forecast (`computeTimeline`)

The function signature changes from three flat params (`paydayDay`, `paydayAmount`, `paydayCurrency`) to `paydayConfig?: PaydayConfig`.

Event generation by frequency:

- **Monthly:** One event via `getNextOccurrence(day)` — same as current behavior.
- **Semi-monthly:** Two events via `getNextOccurrence(day1)` and `getNextOccurrence(day2)`, each with its own amount.
- **Biweekly:** From `refDate`, generate every 14-day occurrence within the forecast window.
- **Weekly:** From `refDate`, generate every 7-day occurrence within the forecast window.

All events use `source: 'payday'`, description `'Payday'`, emoji `'💰'`.

## Dashboard Payday Countdown

The `paydayInfo` memo in `HomeDashboard` changes to accept `paydayConfig` instead of `paydayDay`.

It computes the **nearest upcoming payday** regardless of frequency:

- **Monthly:** Same as current — next occurrence of `day`.
- **Semi-monthly:** Compute next occurrence for both `day1` and `day2`, pick the closer one. Display that day's specific amount.
- **Biweekly/Weekly:** Walk forward from `refDate` by 14/7 days until finding the next occurrence >= today.

The card UI stays the same: one countdown, one amount, one date. Only the underlying calculation changes.

## Files Changed

| File | Change |
|------|--------|
| `src/types.ts` | Add `PaydayConfig` types, update `UserPreferences` |
| `src/utils/forecast.ts` | Update `computeTimeline` signature and payday event generation |
| `src/components/Settings.tsx` | Add frequency selector, conditional field rendering |
| `src/components/HomeDashboard.tsx` | Update `paydayInfo` memo to use `PaydayConfig` |
| `src/components/CashflowForecast.tsx` | Pass `paydayConfig` instead of flat fields |
| `src/App.tsx` | Pass `paydayConfig` instead of flat fields, add migration on load |
