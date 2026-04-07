# Phase 4: Goals, Debts & Installments

## Context
Phases 1-3 built navigation, transactions, accounts, charts, forecasts, and budgets. The Plan tab still has "Personal Goals" and "Debt & Receivables" grayed out. Phase 4 activates them and adds installment tracking.

## Data Models

### Goal
- id, name, targetAmount, savedAmount, linkedAccountId?, currency, deadline?, color, createdAt
- Progress: manual (savedAmount/target) or account-linked (account.balance/target)

### DebtEntry
- id, personName, direction ('i_owe' | 'owed_to_me'), amount, paidAmount, currency, dueDate?, notes?, createdAt
- Quick "Record payment" action

### Installment
- id, itemName, totalAmount, monthlyPayment, totalMonths, paidMonths, startDate, creditCardAccountId?, currency, notes?, createdAt
- Quick "Mark month paid" action

### Database
Dexie schema v7: add goals, debts, installments tables.

## Screens

### Goals: List + Add/Edit form
- Progress bars, account-linked badge, deadline, color accent
- Form: name, target, saved amount (or account link), deadline, color

### Debts: Unified list + Add/Edit form
- Filter: All / I Owe / Owed to Me
- Cards: person avatar, direction badge, progress, due date warning
- Form: person name, direction toggle, amount, paid, due date, notes
- Quick payment button on each card

### Installments: List + Add/Edit form
- Cards: item name, monthly payment, months progress, remaining balance
- Form: item name, total, monthly payment, months, paid months, start date, credit card link
- Quick "mark month paid" button
