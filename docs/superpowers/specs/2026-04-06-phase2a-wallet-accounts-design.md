# Phase 2a: Wallet & Accounts System

## Context

Phase 1 added personal transaction tracking, navigation shell, and light/dark theme. The Wallet tab is currently a placeholder. Phase 2a replaces it with a full account management system — multiple accounts (cash, bank, credit, stocks, crypto), net worth, a preset PH bank grid, and basic account detail views. Phase 2b will layer on charts, forecasts, live prices, and transfers.

## Data Model

### New `Account` type

```typescript
interface Account {
  id: string;
  name: string;                    // "GoTyme Bank", "Cash", "RCBC Visa"
  type: 'debit' | 'credit' | 'ewallet' | 'stocks' | 'crypto';
  institution?: string;            // key from preset list (e.g. "gotyme", "gcash")
  currency: string;                // "PHP", "USD"
  balance: number;                 // current balance (manual)
  color: string;                   // card background color hex
  creditLimit?: number;            // credit cards only
  dueDay?: number;                 // credit cards: payment due day (1-31)
  ticker?: string;                 // stocks/crypto: "AAPL", "BTC"
  units?: number;                  // stocks/crypto: number of units
  pricePerUnit?: number;           // stocks/crypto: last known price
  interestRate?: number;           // annual % (e.g. 1.25)
  notes?: string;
  sortOrder: number;               // manual reordering
  createdAt: string;
}
```

### Transaction linking

Add optional `accountId?: string` to existing `Transaction` type. Non-breaking — existing transactions continue working.

### Database

Dexie schema v5: add `accounts` table indexed by `id, type, sortOrder`.

## Wallet Tab

- **Header**: "Accounts" title + "+ Add Account" button
- **Net Worth**: Large bold amount = sum(debit + ewallet balances) + sum(investment values) - sum(credit used). Subtitle: "Debit balances and investments"
- **Filters**: All / Debit / Credit / Investments pill toggles
- **Cards Grid**: 2-column layout, colored background per account
  - Debit/Cash/E-wallet: name, type + currency, balance
  - Credit: name, usage bar, % used, remaining, used amount
  - Stocks/Crypto: name, balance in local currency, units + price per unit
- **Empty State**: "Add your first account" centered message with button

### Card Colors

8 presets: `#2d6a4f` (dark green), `#0891b2` (teal), `#65a30d` (lime), `#2563eb` (blue), `#ea580c` (orange), `#9333ea` (purple), `#475569` (slate), `#e11d48` (coral)

## Add Account Flow

3-step full-screen flow:

**Step 1 — Type selection:**
Cash, Bank Account, Credit Card, Stocks, Crypto. Each with icon + description.

**Step 2 — Institution selection (bank/credit/ewallet only):**
3-column grid of PH banks/e-wallets with logos. Preset list: GCash, Maya, BPI, BDO, Chinabank, CIMB, CTBC, EastWest, GoTyme, HSBC, Komo, Landbank, Metrobank, PNB, PSBank, RCBC, SecurityBank, UnionBank, ShopeePay, GrabPay. Plus "Other" option for custom name. Skip for Cash/Stocks/Crypto.

**Step 3 — Details form:**
- Account name (pre-filled from institution, editable)
- Currency selector (reuses CURRENCIES list)
- Starting balance (large input)
- Card color picker (8 swatches)
- Credit-specific: credit limit, due day
- Stocks-specific: ticker symbol, units
- Crypto-specific: coin symbol, units

### Institution Logos

Store as PNGs in `public/banks/{key}.png`. Fallback: colored circle with initials.

## Account Detail View

Tapping a card opens detail screen:

- **Header**: Back button, Edit + Delete buttons
- **Card Hero**: Large colored card with logo, name, type badge, balance
- **Info section** (varies by type):
  - Debit/Cash/E-wallet: net balance, interest rate
  - Credit: limit, usage bar, % used, remaining, due day
  - Stocks/Crypto: units, price per unit, total value, FX conversion
- **Linked Transactions**: Recent transactions with matching accountId, or empty state
- **Actions**: Edit (reopens form pre-filled), Delete (with confirmation)

## Transaction Form Update

Add optional "Account" dropdown to existing TransactionForm. Shows user's accounts + "None". Selected account's ID saved as `accountId` on the transaction.

## Screens Summary

1. **Wallet Tab** (replaces placeholder)
2. **Add Account — Type Selection**
3. **Add Account — Institution Grid**
4. **Add Account — Details Form**
5. **Account Detail View**
6. **Edit Account** (reuses add form, pre-filled)
7. **Updated Transaction Form** (+ account selector)
