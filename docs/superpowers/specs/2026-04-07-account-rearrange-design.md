# Press-and-Hold Account Rearranging

## Summary

Add drag-and-drop reordering to the account cards grid in WalletTab. Users long-press (500ms) an account card to pick it up, drag it to a new position, and drop it. The new order persists to IndexedDB via the existing `sortOrder` field.

## Dependencies

Install three packages from the `@dnd-kit` family:

- `@dnd-kit/core` -- DndContext, sensors, collision detection
- `@dnd-kit/sortable` -- SortableContext, useSortable, arrayMove, rectSortingStrategy
- `@dnd-kit/utilities` -- CSS utility for applying transforms

## UX Flow

1. Hint text below filter pills: "Press and hold an account card to rearrange it." (light gray, small text)
2. Long-press (500ms) activates drag -- card lifts with scale + shadow
3. Card follows finger/cursor; other cards animate to show insertion point
4. On drop, cards settle into new positions; `sortOrder` batch-updated in Dexie
5. Normal short taps still navigate to account detail (no interference)

## Sensor Configuration

- **TouchSensor**: `activationConstraint: { delay: 500, tolerance: 5 }` -- 500ms long-press for mobile, 5px tolerance to avoid accidental activation during scroll
- **MouseSensor**: `activationConstraint: { distance: 8 }` -- 8px drag distance for desktop

## Component Changes

### WalletTab.tsx

Wrap the account cards grid section:

```
DndContext (sensors, collisionDetection: closestCenter, onDragStart, onDragEnd)
  SortableContext (items: filtered account ids, strategy: rectSortingStrategy)
    grid div
      SortableAccountCard (for each filtered account)
  DragOverlay
    AccountCard (clone of dragged card)
```

- `onDragStart`: store active account id in local state (for DragOverlay rendering)
- `onDragEnd`: call `reorderAccounts(activeId, overId)`, clear active state

### SortableAccountCard (new, inside WalletTab.tsx)

Thin wrapper component (not a separate file):

- Calls `useSortable({ id: account.id })`
- Applies `transform` and `transition` from the hook via CSS utility
- When `isDragging` is true: reduces opacity to 0.4 (ghost placeholder)
- Passes through to existing `AccountCard` component
- Existing DebitCard, CreditCard, InvestmentCard components remain unchanged

### Visual Feedback

- **Drag overlay (lifted card)**: `scale(1.05)`, elevated box-shadow, full opacity, rounded corners match existing cards
- **Ghost (original position)**: opacity 0.4
- **Neighboring cards**: smooth CSS transition as they reposition (handled by @dnd-kit)

## Data Layer Changes

### useAccounts.ts

Add `reorderAccounts` callback:

```
reorderAccounts(activeId: string, overId: string):
  1. Find old/new indices in current accounts array
  2. Compute new array using arrayMove (from @dnd-kit/sortable)
  3. Optimistic state update: setAccounts(newArray with recalculated sortOrder)
  4. Batch persist: call batchUpdateSortOrder with new id->sortOrder mapping
```

Expose `reorderAccounts` in the hook's return value.

### storage.ts

Add one new function:

```typescript
batchUpdateSortOrder(updates: Array<{ id: string; sortOrder: number }>): Promise<void>
```

Uses a Dexie transaction to update all affected accounts' `sortOrder` in a single atomic operation.

### WalletTab Props

Add `onReorderAccounts: (activeId: string, overId: string) => void` to `WalletTabProps`. Called from `onDragEnd` handler.

## Filter Interaction

Reordering works within the currently filtered view. The `sortOrder` values are global (not per-filter), so reordering in the "Debit" filter moves those accounts relative to all accounts. This matches user expectation since `sortOrder` determines position in "All" view.

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Add @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities |
| `src/components/WalletTab.tsx` | Add DndContext, SortableContext, DragOverlay, SortableAccountCard wrapper, hint text |
| `src/hooks/useAccounts.ts` | Add reorderAccounts callback |
| `src/db/storage.ts` | Add batchUpdateSortOrder function |

## Out of Scope

- Reordering across different filter tabs (reorder only within current view)
- Haptic feedback (navigator.vibrate is unreliable across iOS/Android)
- Keyboard drag-and-drop accessibility (can be added later)
- Undo reorder
