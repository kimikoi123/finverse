# Payroll Feature — Design Spec

## Purpose

Track monthly salary payments to household help (maids, drivers, nannies) and manage salary advances they request throughout the month. Advances are automatically deducted from the next paycheck.

## Data Model

### Employee

| Field       | Type     | Description                              |
|-------------|----------|------------------------------------------|
| id          | string   | UUID                                     |
| name        | string   | Employee name                            |
| salary      | number   | Monthly salary amount                    |
| currency    | string   | Defaults to user's `defaultCurrency`     |
| payDay      | number   | Day of month (1-31) when salary is due   |
| createdAt   | number   | Timestamp                                |
| updatedAt   | number   | Timestamp (used by sync engine)          |
| deletedAt?  | number   | Soft delete timestamp (sync tombstone)   |

### Advance

| Field       | Type     | Description                              |
|-------------|----------|------------------------------------------|
| id          | string   | UUID                                     |
| employeeId  | string   | References Employee.id                   |
| amount      | number   | Advance amount                           |
| date        | string   | ISO date when advance was given          |
| settled     | boolean  | `false` = pending, `true` = deducted     |
| settledAt?  | string   | ISO date when deducted from paycheck     |
| createdAt   | number   | Timestamp                                |
| updatedAt   | number   | Timestamp (used by sync engine)          |
| deletedAt?  | number   | Soft delete timestamp (sync tombstone)   |

### Sync Integration

- Add `'employee'` and `'advance'` to `SyncEntityType` union.
- Both entities follow the existing `updatedAt` / `deletedAt` pattern.
- New Dexie tables: `employees` and `advances` (added as a new database version).

## Navigation & Layout

- Payroll lives as a **sub-tab inside the Plan tab**, alongside Budgets, Goals, Debts, and Installments.
- The Plan tab's sub-tab bar gains a "Payroll" entry.

## Screens

### Payroll List (Plan > Payroll sub-tab)

- Displays a list of employee cards.
- Each card shows: name, pay day, monthly salary, total pending advances, net pay.
- "+" button to add a new employee.
- Empty state with prompt to add first employee.

### Employee Form (Add/Edit)

- Fields: name (required), salary (required, uses existing amount parser with K notation), pay day (day picker 1-31).
- Currency defaults to user's `defaultCurrency` (not shown in form unless multi-currency is needed later).
- Edit mode accessible from employee detail screen.

### Employee Detail (Timeline-style)

- **Header**: Employee name, salary, pay day — styled with green gradient matching app design language.
- **"+ Advance" button** in the header for quick access.
- **Current month section** (highlighted, green left border):
  - Lists each pending advance with date and amount.
  - Shows net pay (salary - total advances).
  - "Settle" button visible on or after the pay day.
- **Past months** (gray left border, chronological descending):
  - Each month shows advances taken and settlement amount.
  - Months with no advances show "No advances" with full salary paid.

### Record Advance (Modal/Form)

- Single field: amount (uses existing amount parser).
- Date defaults to today.
- **Validation**: If `amount + totalPendingAdvances > salary`, show a warning and block submission. Message: "This advance would exceed [name]'s remaining salary of ₱X,XXX."

### Settle Payday (Confirmation)

- Shows summary: salary, itemized advances, net pay.
- On confirm: all pending advances for that employee get `settled: true` and `settledAt: today`.
- The employee's timeline advances to the next month with a clean slate.

## Core Logic

### Advance Stacking

Multiple advances taken before payday stack up. Total pending = sum of all advances where `settled === false` and `deletedAt` is undefined.

### Advance Cap Validation

Before saving a new advance, check:
```
totalPendingAdvances + newAdvanceAmount <= employee.salary
```
If exceeded, show warning and prevent submission.

### Settlement

Settlement is manual — triggered by the user tapping "Settle" on or after the employee's pay day. On settlement:
1. Query all advances for this employee where `settled === false`.
2. Set `settled = true` and `settledAt = today's ISO date` on each.
3. Update each advance's `updatedAt` to trigger sync.

### Month Grouping (Timeline)

Advances are grouped by their pay period for display:
- An advance belongs to the pay period of the next upcoming pay day at the time it was recorded.
- Past settled advances are grouped by their `settledAt` month.

## Out of Scope

- Automatic transaction creation (payroll is standalone).
- Tax calculations or formal payroll features.
- Semi-monthly, biweekly, or weekly pay frequencies (monthly only for now; data model can be extended later).
- Notifications or reminders for upcoming pay days.
- Partial settlement (always settles all pending advances at once).

## Files to Create/Modify

### New Files
- `src/types.ts` — Add `Employee` and `Advance` types, extend `SyncEntityType`.
- `src/db/database.ts` — Add new Dexie version with `employees` and `advances` tables.
- `src/db/storage.ts` — Add CRUD functions for employees and advances, with sync mutation hooks.
- `src/hooks/useEmployees.ts` — Employee and advance state management hook.
- `src/components/PayrollList.tsx` — Employee list view (Plan sub-tab content).
- `src/components/EmployeeForm.tsx` — Add/edit employee modal.
- `src/components/EmployeeDetail.tsx` — Timeline-style detail screen with advance recording and settlement.

### Modified Files
- `src/App.tsx` — Add payroll modal states and wire up navigation.
- `src/components/PlanTab.tsx` (or equivalent) — Add "Payroll" sub-tab entry.
- `src/sync/syncEngine.ts` — Register `employee` and `advance` entity types for push/pull.
- `api/sync/push.ts` — Handle new entity types in cloud push.
- `api/sync/pull.ts` — Handle new entity types in cloud pull.
