# Phase 5: Dashboard Enrichment + UI Polish

## Dashboard Enrichment

### Payday
- Add to UserPreferences: paydayDay?, paydayAmount?, paydayCurrency?
- Auto-suggest from largest recurring income transaction if fields empty
- Payday countdown card on HomeDashboard: "X days" + amount + date
- "Payday!" state when today is the day
- Hidden if no payday configured

### Upcoming Recurring
- Section on HomeDashboard below payday, above recent transactions
- Next 5 recurring transactions sorted by next occurrence
- Split: INCOME / EXPENSES sub-headers
- Each: emoji, description, next date, amount
- "X DAYS LEFT" badge for expenses within 7 days

### Settings Screen
- Gear icon in header (non-drill-down views)
- Sections: name, currency, payday (day + amount), theme, export/import
- Move export/import from header into settings

## UI Polish

### Cards: rounded-2xl, border-border, p-4, hover:bg-surface-hover, active:scale-[0.99]
### Typography: consistent heading/label/gap rhythm
### Transitions: animate-fade-in on tabs, animate-slide-in-right on drill-downs
### Empty states: consistent emoji + heading + subtitle + action pattern
### Tab bar: dot indicator on active, shadow-glow-primary on FAB
### Header: gear icon for settings, clean up export/import buttons
