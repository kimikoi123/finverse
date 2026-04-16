# Commitment Budgets

## Context

Budgets today ship with preset tiles for subscriptions (Netflix, Spotify, ChatGPT…), Philippine telecoms (Globe, Smart, DITO, Converge), and utilities (Meralco, Manila Water, PrimeWater). These presets live under the "custom" budget type (`src/utils/budgetPresets.ts`), so they render like flexible month-to-date budgets with a spent-vs-limit progress bar.

That framing is wrong. Netflix is a fixed ₱549 recurring bill, not a flexible spending category. Meralco is a variable but mandatory monthly bill, not something you decide to spend up to. Neither is discretionary, and tracking them as flexible budgets hides the information the user actually wants: "when is the next charge, how much, did I pay it yet?"

This design reframes subscription/telecom/utility preset budgets as **commitment budgets** — fixed or variable recurring bills that the app tracks with a due-day and a pending-confirm flow, while keeping non-preset custom budgets and category budgets unchanged.

## Goals

- Treat preset subscription/telecom/utility budgets as recurring commitments, not flexible budgets.
- Automatically generate the matching expense transaction each month — silently for fixed bills, after user confirmation for variable bills.
- Surface pending bills clearly so the user knows which months still need action.
- Avoid introducing new sync entity types, background workers, or phantom transaction rows.

## Non-goals

- Push / notification reminders for pending bills.
- Multi-account bill splitting.
- Month-over-month bill history comparisons.
- Turning Food / Transport / Accommodation category budgets into commitments.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Auto-link budget to a recurring transaction? | **Yes.** Creating a commitment budget creates the matching monthly expense (virtually until confirmed). |
| 2 | How to handle actual vs expected amount for variable bills? | **Pending/draft state.** The transaction does not post until user confirms the actual amount. |
| 3 | Does the pending flow apply to flat subs like Netflix? | **User toggle per budget.** Default OFF for subscription presets, ON for telecom/utility presets. |
| 4 | What is required at create time? | **Monthly limit + due day required.** Source account optional. |

## Data Model

Extend `Budget` (`src/types.ts`) with optional commitment fields. All new fields are optional for backward compatibility.

```ts
export interface Budget {
  id: string;
  name: string;
  type: 'category' | 'custom';
  categoryKey?: string;
  monthlyLimit: number;        // for commitments: the *expected* amount
  currency: string;
  icon: string;
  color: string;
  preset?: string;
  createdAt: string;
  updatedAt?: number;
  deletedAt?: number;

  // Commitment fields — present iff isCommitment === true
  isCommitment?: boolean;
  dueDay?: number;             // 1-31; clamped to last day of month for short months
  varies?: boolean;            // true => pending-confirm flow; false => auto-confirm
  sourceAccountId?: string;    // wallet/card that the bill deducts from; optional
  lastConfirmedMonth?: string; // "YYYY-MM" — latest month confirmed or auto-confirmed
}
```

`lastConfirmedMonth` is how we idempotently skip months that are already handled. It guards both the auto-confirm loop (so the same month isn't posted twice across app opens) and the pending-state derivation (so a confirmed bill stops showing as pending).

No `Transaction` schema changes. Existing `budgetId?: string` already links expenses to budgets. Confirmed commitment bills are ordinary expense transactions with `budgetId` set.

No sync schema changes. `Budget` is already in `SyncEntityType`, and the added fields are optional.

## Derivation: pending and next-due

`useBudgets` extends `BudgetWithSpending` with two computed fields:

```ts
export interface BudgetWithSpending extends Budget {
  spent: number;
  remaining: number;
  percentage: number;

  // Only populated when isCommitment === true
  isPendingThisMonth?: boolean;
  nextDueDate?: string;  // ISO date ("YYYY-MM-DD")
}
```

Rules (added inside the existing `useMemo` in `useBudgets`):

- Non-commitment budgets: unchanged.
- Commitment budgets:
  - `spent` = sum of this-month expenses where `budgetId === budget.id` (same codepath as existing `type === 'custom'` branch — no change).
  - `thisMonthDueDate` = `min(dueDay, lastDayOfCurrentMonth)` resolved to an ISO date.
  - `nextDueDate` = `thisMonthDueDate` if `lastConfirmedMonth !== currentMonth`, else the clamped due-day of the following month.
  - `isPendingThisMonth` = `varies === true` AND `today >= thisMonthDueDate` AND `lastConfirmedMonth !== currentMonth`.

### Auto-confirm side effect

Runs once per `useBudgets` mount and on every refresh. For each commitment budget where `varies === false` AND `today >= thisMonthDueDate` AND `lastConfirmedMonth !== currentMonth`:

1. Insert a `Transaction`: `type='expense'`, `amount=monthlyLimit`, `date=thisMonthDueDate` (ISO), `budgetId=budget.id`, `accountId=sourceAccountId`, `category='bills'`, `description=budget.name`, `currency=budget.currency`.
2. Update the budget's `lastConfirmedMonth` to `currentMonth`.

**Multi-month backfill.** If the app hasn't been opened for several months, the loop advances month-by-month: `while (lastConfirmedMonth < currentMonth) { post that month's transaction; advance lastConfirmedMonth; }`. Each posted transaction uses that month's clamped due-day as its `date`.

**Isolation.** `deriveCommitmentState(budget, today, transactions)` — a pure function — returns `{ isPending, nextDueDate, autoConfirmPlan }`. The side-effect loop consumes `autoConfirmPlan` to do its writes. Keeps the logic testable without a DB.

## Create Flow

Entry point unchanged: Plan → Budgets → "+ Create a custom category" → preset grid. Picking a preset in the subscription / telecom / utility groups flips the budget into commitment mode. Picking the "Custom" tile (user-named) stays a flexible budget — no new fields, no new UI.

Step-2 form when in commitment mode:

```
  Name              [Netflix]                 prefilled, editable
  Expected amount   [₱ 549]                   renamed from "Monthly Limit"
  Due day           [ 15 ]                    NEW · required · 1–31 · default = today
  Varies each month [ OFF ]                   NEW · default: OFF for subscription,
                                              ON for telecom and utility
  Source account    [ None ▾ ]                NEW · optional
  Color             [ swatches ]              unchanged
```

`varies` default derives from `BUDGET_PRESETS[].category`. User can override either way.

Step-2 header copy when in commitment mode: "Set Up Commitment" instead of "Budget Details".

Editing an existing commitment budget: same form, all commitment fields editable. Changing `dueDay` or `varies` affects future months only. Already-confirmed transactions stay as-is.

**Upgrading a pre-migration preset budget.** A budget saved before this feature shipped has `preset` set but `isCommitment` unset. When the user opens such a budget in edit mode, the form shows commitment fields with empty defaults (no due-day prefilled, `varies` defaulted per preset category, no source account). Saving the form with a valid `dueDay` sets `isCommitment = true` on the budget (along with `dueDay`, `varies`, and optional `sourceAccountId`). Saving without a `dueDay` leaves the budget flexible (`isCommitment` stays unset). `isCommitment` remains the persistent marker queried by the derivation and auto-confirm logic.

Category budgets (Food, Transport, etc.): unchanged. Never become commitments.

## Budget List & Cards

`BudgetList.tsx` splits "custom" into commitments vs flexible. Sections become, in order:

1. **+ Create a custom category** button (unchanged).
2. **Commitments** (new section; shown when any exist).
3. **Your custom budgets** (existing; commitments filtered out).
4. **Built-in categories** (unchanged).

Any section with zero items is hidden.

### Commitment card

Differs from the flexible `BudgetCard`:

- Logo badge via `LogoBadge` (unchanged).
- Name.
- Secondary line replaces "spent / limit":
  - `varies=false`, not yet paid this month: `"Next: Apr 15 · auto-posts ₱549"`
  - `varies=true`, not yet due: `"Next: Apr 28 · est. ₱2,800"`
  - `varies=true`, pending (due-day passed, unconfirmed): `"Due today · tap to confirm"` with an amber pill, tappable.
  - Already confirmed this month: `"Paid ₱3,200 · next May 15"` with a check indicator.
- Progress bar removed for commitments (implies discretion that doesn't apply).
- Edit / delete buttons (unchanged).

### Pending entry points

1. Tapping a pending commitment card opens the Confirm dialog.
2. A banner at the top of `HomeDashboard` when any commitment is pending: `"N bills need confirmation ▸"` → opens the Confirm dialog, iterating through them in order.

The banner consumes `useBudgets()`'s output; no new data source.

## Confirm-Bill Dialog

Modal, one bill at a time. If multiple are pending, advance to the next after save.

```
  ✕  Confirm bill                              Skip
  ─────────────────────────────────────────────────
     [Meralco logo]
     Meralco
     Due Apr 15 · estimated ₱2,800

     ACTUAL AMOUNT
     [ ₱ 3,245.50 ]                  prefilled with estimate

     DATE PAID
     [ Apr 15, 2026 ▾ ]              defaults to due day

     SOURCE ACCOUNT
     [ BPI Savings ▾ ]               defaults to budget.sourceAccountId

     [ Confirm & save ]
```

### On confirm

1. Create a `Transaction`: `type='expense'`, `amount=<actual>`, `date=<date paid>`, `budgetId=budget.id`, `accountId=<selected>`, `category='bills'`, `description=budget.name`, `currency=budget.currency`.
2. Update the budget: `lastConfirmedMonth = "YYYY-MM"` of the date paid.
3. If another commitment is pending, reopen the dialog for it. Else close.

### On skip

No transaction created. `lastConfirmedMonth` not stamped. The bill stays in pending state for the user to return to later.

### Validation

- Actual amount > 0.
- Date is a valid ISO date.
- Account is optional.

### Editing later

A confirmed commitment bill is a regular `Transaction` and is edited via the existing transaction-edit flow (History, Account detail). No special-case code. Unsetting `budgetId` on a confirmed bill won't unstamp `lastConfirmedMonth` — we accept that edge case; the budget would just believe the month is paid with no backing transaction.

## Migration

Existing "custom" budgets with `preset` in the subscription / telecom / utility groups will not be automatically migrated. They remain flexible until the user edits them and sets `isCommitment`, `dueDay`, and `varies`.

Rationale: auto-setting a `dueDay` without knowing the user's real billing day would either generate phantom pending bills or require a one-time notice the user still has to act on. Opt-in is cleaner for a small installed base.

## Edge Cases

- **App unopened for multiple months** — auto-confirm loop backfills month-by-month using each month's clamped due-day.
- **Commitment budget deleted mid-month** — transactions with its `budgetId` become orphaned, same as existing flexible-custom delete behavior.
- **`dueDay` changed mid-month, month already confirmed** — change applies to next month; `lastConfirmedMonth` stamp prevents double-post.
- **`dueDay=31` in short months** — clamp to last day of that month (28/29/30).
- **Timezone / clock skew** — compare using `"YYYY-MM-DD"` strings in local time, consistent with existing transaction date handling.
- **Currency mismatch between budget and source account** — transaction takes the budget's currency; no conversion for v1.

## Testing

- **Unit: `deriveCommitmentState(budget, today, transactions)`** — pre-due, on-due, post-due, already-confirmed, multi-month backfill, varies vs non-varies.
- **Unit: due-day clamping** — 31 in Feb (28/29), 31 in Apr (30).
- **Unit: `useBudgets` spending calc** — commitment budgets sum expenses by `budgetId` (unchanged behavior, regression test).
- **Integration: Confirm dialog** — opening via pending card, submitting, verifying transaction creation + `lastConfirmedMonth` stamp + dialog close or advance.
- **Manual: auto-confirm** — set a non-varies commitment with `dueDay=<yesterday>`, refresh the hook, verify a transaction posts.

No visual regression tests required.

## Files Expected to Change

- `src/types.ts` — `Budget` gains commitment fields.
- `src/hooks/useBudgets.ts` — derivation, auto-confirm side effect.
- `src/utils/commitmentBudgets.ts` — NEW — pure `deriveCommitmentState`, due-day clamping helpers.
- `src/components/CreateBudgetFlow.tsx` — conditional commitment fields in step 2 when a preset in the subscription/telecom/utility groups is selected.
- `src/components/BudgetList.tsx` — three-section split, commitment card variant.
- `src/components/ConfirmBillDialog.tsx` — NEW — the confirm modal.
- `src/components/HomeDashboard.tsx` — pending-bills banner.
- Unit test files alongside the above.
