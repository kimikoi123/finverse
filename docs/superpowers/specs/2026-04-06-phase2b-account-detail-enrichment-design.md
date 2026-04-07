# Phase 2b: Account Detail Enrichment

## Context

Phase 2a added the core account system (CRUD, wallet tab, cards, detail view). Phase 2b enriches the account detail with charts, forecasting, live crypto prices, and transfers.

## Features

### 1. Recurring Transactions
- Add `isRecurring?: boolean` and `recurringDay?: number` to Transaction type
- Toggle in TransactionForm: "Repeat monthly" with day-of-month picker
- Used by forecast engine to project expected income/expenses

### 2. Account Detail Charts
- **Weekly bar chart**: 7-day expense totals from linked transactions, CSS bars, account color highlight
- **Income/Expense donut**: conic-gradient CSS donut showing monthly income vs expense ratio, net amount in center
- 2-column grid below card hero. "No data yet" placeholder when empty.

### 3. Transfer Between Accounts
- "Transfer money" button on account detail
- Form: from (current), to (dropdown, same currency only), amount
- Creates 2 linked transactions (expense from source, income to dest) with shared `transferId`
- New field: `transferId?: string` on Transaction

### 4. Live Crypto Prices
- `src/utils/cryptoPrices.ts` — CoinGecko free API, no key needed
- Maps tickers (BTC, ETH, SOL, etc.) to CoinGecko IDs
- "Refresh price" button on crypto account detail, updates pricePerUnit
- Stocks: manual "Update price" button with input field
- Loading spinner + error handling

### 5. Spendable + 30-Day Forecast
- Debit/ewallet/credit accounts only
- Spendable = balance + expected in - expected out (floor 0)
- Forecast: sum recurring transactions linked to account by type
- Two cards: "NET BALANCE" + "SPENDABLE", and "EXPECTED IN" + "EXPECTED OUT"
