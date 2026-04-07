# Phase 3: Budget Categories

## Context
Phase 1-2 built navigation, transactions, accounts, charts, and forecasting. The Plan tab has "Category Budgets" grayed out. Phase 3 activates it with monthly spending limits and progress tracking.

## Data Model

### Budget type
```typescript
interface Budget {
  id: string;
  name: string;
  type: 'category' | 'custom';
  categoryKey?: string;       // for category budgets: matches transaction.category
  monthlyLimit: number;
  currency: string;
  icon: string;               // emoji or initial
  color: string;
  preset?: string;            // key from preset list
  createdAt: string;
}
```

- Category budgets: auto-track via transaction.category matching
- Custom budgets: manual link via transaction.budgetId
- Transaction gets `budgetId?: string` field
- Dexie schema v6: add `budgets` table

## Features

### Budget List (in Plan tab)
- Replaces grayed-out "Category Budgets" item
- Two sections: category budgets + custom budgets
- Each shows progress bar (spent/limit), amounts, remaining
- Progress colors: green (normal), yellow (80%+), red (over budget)
- Edit/delete per budget

### Create Category Budget
- Pick from unused transaction categories
- Set monthly limit
- Auto-tracks from transaction.category

### Create Custom Budget
- Step 1: Preset grid (3-col) with subscriptions, telecom, utilities + Custom option
- Step 2: Name, monthly limit, currency, color picker
- Presets: Netflix, Spotify, YouTube Premium, Disney+, Prime Video, Apple Music, ChatGPT, Canva, Google One, Dropbox, Microsoft 365, Adobe, Globe, Smart, DITO, Converge, Meralco, Manila Water, PrimeWater

### Transaction Form Update
- "Budget" dropdown for expense transactions only
- Shows custom budgets + "None"
- Sets budgetId on transaction
