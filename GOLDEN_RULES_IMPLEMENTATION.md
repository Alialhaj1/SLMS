# §17 القواعد الذهبية للمطور — Implementation Report

## Summary

| Section | Rule | Status | Implementation |
|---------|------|--------|----------------|
| **§17.1 Security** | | | |
| 17.1.1 | Tenant isolation in queries | ✅ EXISTS | `backend/src/middleware/tenantIsolation.ts` |
| 17.1.2 | Never trust tenant_id from body | ✅ NEW | `goldenRules.ts → sanitizeTenantFromBody` |
| 17.1.3 | Backend permission checks | ✅ EXISTS | `rbac.ts` (508 lines, requirePermission/requireAnyPermission) |
| 17.1.4 | Audit logging for mutations | ✅ EXISTS | 3-tier: auditLog + globalAuditLog + enhancedAuditLog |
| 17.1.5 | Protect super_admin (ali@alhajco.com) | ✅ NEW | `goldenRules.ts → protectSuperAdmin` |
| **§17.2 Code Quality** | | | |
| 17.2.1 | TypeScript everywhere | ✅ EXISTS | Backend + Frontend both TS |
| 17.2.2 | Typed props/interfaces | ✅ EXISTS | All components use typed interfaces |
| 17.2.3 | API hooks (not inline fetch) | ✅ EXISTS | `apiClient.ts`, `useAuth`, `useMasterData` etc. |
| 17.2.4 | Reusable components | ✅ EXISTS | `components/ui/` library (Button, Input, Modal, DataTablePro, etc.) |
| 17.2.5 | Dark mode support | ✅ EXISTS | Tailwind `dark:` classes, ThemeContext |
| 17.2.6 | Loading states | ✅ EXISTS | Button loading, skeleton loaders, StatCard loading |
| 17.2.7 | Error boundaries | ✅ EXISTS | ErrorBoundary in `_app.tsx` |
| **§17.3 Performance** | | | |
| 17.3.1 | Virtual scroll for 100+ rows | ✅ NEW | `hooks/useVirtualScroll.ts` (threshold: 100) |
| 17.3.2 | Lazy loading (dynamic import) | ✅ EXISTS | Next.js dynamic() used across pages |
| 17.3.3 | Debounce 300ms on search | ✅ NEW | `hooks/useDebounce.ts` (default 300ms) |
| 17.3.4 | React Query style caching | ✅ NEW | `hooks/useCachedQuery.ts` (stale-while-revalidate) |
| 17.3.5 | Optimistic updates | ✅ NEW | `useCachedQuery.mutate()` with rollback |
| **§17.4 UX** | | | |
| 17.4.1 | Delete confirmation dialog | ✅ EXISTS | `ConfirmDialog` + `ConfirmActionModal` |
| 17.4.2 | Auto-save drafts (30s) | ✅ NEW | `hooks/useAutoSave.ts` (localStorage) |
| 17.4.3 | Unsaved changes warning | ✅ NEW | `hooks/useUnsavedChanges.ts` (beforeunload + router) |
| 17.4.4 | Keyboard shortcuts | ✅ NEW | `hooks/useKeyboardShortcuts.ts` |
| 17.4.5 | Print-friendly styles | ✅ NEW | `hooks/usePrint.ts` (A4/Letter, portrait/landscape) |
| 17.4.6 | Excel export for tables | ✅ NEW | `hooks/useExcelExport.ts` (xlsx + CSV fallback) |
| 17.4.7 | Global search (Ctrl+K) | ✅ NEW | `components/ui/CommandPalette.tsx` (wired in MainLayout) |

## New Files Created

### Backend
| File | Purpose | Lines |
|------|---------|-------|
| `backend/src/middleware/goldenRules.ts` | Security guards: body sanitizer, super_admin protection, tenant query builder | ~190 |

### Frontend Hooks
| File | Purpose | Lines |
|------|---------|-------|
| `hooks/useDebounce.ts` | Debounce values + callbacks (300ms default) | ~55 |
| `hooks/useCachedQuery.ts` | Lightweight React Query with global cache, dedup, stale-while-revalidate | ~230 |
| `hooks/useVirtualScroll.ts` | Virtual scroll for tables >100 rows | ~95 |
| `hooks/useAutoSave.ts` | Auto-save drafts to localStorage every 30s | ~100 |
| `hooks/useUnsavedChanges.ts` | Warn before leaving unsaved forms | ~55 |
| `hooks/useKeyboardShortcuts.ts` | Global keyboard shortcut handler | ~80 |
| `hooks/useExcelExport.ts` | Excel export with xlsx (lazy) + CSV fallback | ~110 |
| `hooks/usePrint.ts` | Print-friendly output in new window | ~130 |
| `hooks/goldenRules.ts` | Barrel export for all §17 hooks | ~30 |

### Frontend Components
| File | Purpose | Lines |
|------|---------|-------|
| `components/ui/CommandPalette.tsx` | Ctrl+K global search palette | ~270 |

### Modified Files
| File | Changes |
|------|---------|
| `backend/src/app.ts` | Mounted `sanitizeTenantFromBody` + `protectSuperAdmin` middleware |
| `components/layout/MainLayout.tsx` | Added `<CommandPalette>` with menu items |

## Usage Examples

### useCachedQuery (§17.3.4 + §17.3.5)
```tsx
import { useCachedQuery, invalidateQuery } from '@/hooks/goldenRules';

const { data, loading, error, refetch, mutate } = useCachedQuery(
  'shipments-list',
  () => apiClient.get('/api/shipments'),
  { staleTime: 60000, refetchOnFocus: true }
);

// Optimistic update
mutate(
  apiClient.post('/api/shipments', newShipment),
  (current) => [...current, newShipment]  // optimistic value
);
```

### useDebounce (§17.3.3)
```tsx
import { useDebounce } from '@/hooks/goldenRules';

const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

### useAutoSave + useUnsavedChanges (§17.4.2 + §17.4.3)
```tsx
import { useAutoSave, useUnsavedChanges } from '@/hooks/goldenRules';

const { isDirty, lastSaved, hasDraft, restoreDraft, clearDraft } = useAutoSave(
  'create-shipment',
  formData,
  { interval: 30000 }
);

useUnsavedChanges(isDirty);
```

### useExcelExport (§17.4.6)
```tsx
import { useExcelExport } from '@/hooks/goldenRules';

const { exportToExcel } = useExcelExport();

<Button onClick={() => exportToExcel(shipments, columns, 'shipments-report')}>
  Export Excel
</Button>
```

### useVirtualScroll (§17.3.1)
```tsx
import { useVirtualScroll } from '@/hooks/goldenRules';

const { virtualRows, totalHeight, containerRef, isVirtual } = useVirtualScroll({
  totalItems: data.length,
  itemHeight: 48,
  containerHeight: 600
});
```

## Architecture Notes

- **useCachedQuery** uses a global in-memory `Map` instead of adding React Query dependency — keeps bundle size small
- **useExcelExport** lazy-loads the `xlsx` library only when user clicks export — no impact on initial bundle
- **CommandPalette** reads from the existing `MENU_REGISTRY` via `useMenu()` — no duplicate configuration
- **protectSuperAdmin** is mounted at app level on `/api/users/:id` — covers all mutation verbs without touching individual route files
- **sanitizeTenantFromBody** runs globally before routes — silently strips `tenant_id`/`company_id` from all POST/PUT/PATCH bodies
