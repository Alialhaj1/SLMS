# SLMS (Smart Logistics Management System) - AI Agent Guide

## Architecture Overview

**Multi-tenant ERP system** with three layers:
- **Backend**: Express.js + TypeScript (`backend/`) - REST API on port 4000
- **Frontend**: Next.js 13 Pages Router + TypeScript (`frontend-next/`) - SSR app on port 3001  
- **Legacy Frontend**: React + Vite (`frontend/`) - port 3000 (deprecated, do not use)
- **Infrastructure**: PostgreSQL + Redis + RabbitMQ (via docker-compose)

**Key architectural decisions:**
- JWT-based authentication with refresh tokens (15min access, 30-day refresh)
- Fine-grained RBAC using `resource:action` permission codes (e.g., `companies:create`)
- Soft deletes with `deleted_at` timestamps across all core tables
- Audit logging for all mutations via `audit_logs` table with before/after JSONB snapshots
- Multi-company support built in from day 1 (`companies` table, `company_id` foreign keys)
- **Enterprise-grade UI/UX**: SaaS-standard dashboard, WCAG AA accessible, dark mode, responsive

## RBAC System (Critical)

**Permission format:** `resource:action` (e.g., `users:view`, `shipments:delete`)

**Middleware stack pattern** (backend):
```typescript
router.post('/companies', authenticate, requirePermission('companies:create'), handler);
router.get('/audit-logs', authenticate, requireAnyPermission(['audit_logs:view', 'companies:view']), handler);
```

**Frontend permission checks** (via `usePermissions` hook):
```tsx
const { hasPermission } = usePermissions();
if (!hasPermission('users:create')) return null; // Hide UI elements
```

**Role hierarchy:**
- `super_admin` - bypasses all permission checks (hardcoded in middleware)
- `admin`, `manager`, `user` - permissions fetched from `role_permissions` junction table
- Permissions resolved via DB join: `user_roles` → `role_permissions` → `permissions`

**Important:** Frontend `usePermissions` currently uses mock role mappings. Backend is source of truth.

## Development Workflows

### Quick Start
```powershell
# From repository root (c:\projects\slms)
docker-compose up --build  # Starts all services
```

### Rebuild Strategies
- **Full rebuild:** `REBUILD-LATEST.bat` - nukes containers, rebuilds frontend-next
- **Backend only:** `REBUILD-BACKEND.bat` - rebuilds backend service  
- **Frontend only:** `rebuild-frontend.bat` - rebuilds frontend-next image
- **Fresh start:** `rebuild-clean.bat` - removes volumes, prunes Docker cache

**Common gotcha:** If frontend changes don't appear, run `docker-compose build --no-cache frontend-next` (Next.js caching issue).

### Database Migrations
**Location:** `backend/migrations/*.sql` (numbered sequentially)

**Auto-run on startup** via `src/db/migrate.ts`:
1. Creates `migrations` table if missing
2. Reads `.sql` files in order (001, 002, 003...)
3. Skips already-applied migrations (tracked by filename)
4. Wraps each migration in transaction (atomic rollback on failure)

**To add migration:** Create `00X_description.sql` in `backend/migrations/`, restart backend.

**Critical migrations:**
- `003_system_admin_tables.sql` - companies, branches, permissions, audit_logs
- `006_create_super_admin.sql` - seeds initial super_admin user

### Testing
- **Smoke test:** `npm run smoke` (backend) - hits auth endpoints with `smoke-auth.ts`
- **Backend test script:** `TEST-BACKEND.PS1` (PowerShell)

## Frontend Patterns (Next.js)

### Enterprise UI/UX Standards (IMPLEMENTED)
This is a **production-grade SaaS dashboard** following enterprise design principles:
- Clean, minimal, uncluttered interface
- WCAG AA accessible (4.5:1 contrast, keyboard nav, ARIA labels, screen reader support)
- Responsive: desktop-first, then tablet/mobile (grid-based layouts)
- Dark mode + light mode with system preference detection
- Consistent spacing (4px/8px/12px/16px/24px), typography (Inter font), iconography (Heroicons)
- RBAC-aware UI: unauthorized elements **hidden** (not disabled), no role assumptions in frontend

### Context Providers (Nested in `_app.tsx`)
```tsx
LocaleProvider → ThemeProvider → ToastProvider → Component
```

**Access patterns:**
- Auth: `const { user, logout } = useAuth()` - auto-fetches from `/api/auth/me`
- Permissions: `const { hasPermission } = usePermissions()`
- Toast: `const { showToast } = useToast()` - 4 variants (success, error, warning, info)
- Theme: `const { theme, toggleTheme } = useTheme()` - persists to localStorage
- Locale: `const { locale, setLocale, t } = useLocale()` - i18n (English/Arabic)

### Layout Structure
All authenticated pages wrapped in `MainLayout` → `Header` + `Sidebar` + content area.

**Header** (`components/layout/Header.tsx`):
- Company logo (click → dashboard)
- Global search bar (desktop only, permission-aware, future-ready)
- Language toggle (EN/Arabic)
- Theme toggle (light/dark)
- Notifications bell (future-ready)
- User dropdown menu: email, role badge (color-coded: super_admin=purple, admin=blue, manager=green, user=gray), "My Profile", "Change Password", "Logout" (clears tokens securely)
- Mobile hamburger menu
- Keyboard accessible

**Sidebar** (`components/layout/Sidebar.tsx`):
- Filters menu items by RBAC (unauthorized items **completely hidden**)
- Active route highlighting via Next.js router
- Collapsible on desktop, slide-over on mobile
- Nested menu support with expand/collapse
- Menu structure: Dashboard, Shipments, Expenses, Warehouses, Suppliers, Users & Access (admin only), System (audit logs, settings)

### API Call Pattern
**No axios** - uses native `fetch` with manual token management:
```typescript
const token = localStorage.getItem('accessToken');
const res = await fetch('http://localhost:4000/api/...', {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Token storage:** `localStorage.accessToken` + `localStorage.refreshToken` (dev-grade, acceptable for prototype)
**Auto logout on 401/403** - handled in `useAuth` hook

### Component Library (Enterprise-Grade)
**Custom components** in `components/ui/`:
- `Button` - 3 variants (primary/secondary/danger), 3 sizes (sm/md/lg), loading spinner, disabled state, focus ring (WCAG AA)
- `Input` - Label with required indicator (*), inline error messages, helper text, ARIA attributes (`aria-invalid`, `aria-describedby`), dark mode support
- `Modal` - 4 sizes (sm/md/lg/xl), keyboard accessible (Esc to close, focus trap), click-outside to close, backdrop blur
- `ConfirmDialog` - Delete confirmation modal, loading state (disables close during async), customizable title/message/button text, variant support (danger/primary)
- `Card` & `StatCard` - Base card with hover/onClick, StatCard for KPIs (icon, color-coded, trend indicator ↑/↓, skeleton loader, click-through navigation)
- `DataTablePro` - Pagination, sorting, filtering, responsive (enterprise-grade)

**Icons:** `@heroicons/react` (outline + solid variants)

### Form Patterns & Validation
**Manual validation** (no Zod/Yup yet):
```typescript
const validateForm = () => {
  const newErrors: Record<string, string> = {};
  if (!email) newErrors.email = 'Email required';
  if (!password || password.length < 8) newErrors.password = 'Min 8 chars';
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Validation rules** (implement these):
- Email: valid format regex
- Password: min 8 chars, uppercase, lowercase, number
- Numbers: positive only, decimal precision
- Dates: logical ranges (start < end, no future dates for historical data)
- Required fields: never submit empty

**Form UX patterns:**
- Clear labels (never placeholder-only)
- Required field indicators (*)
- Inline validation on blur
- Disable submit until valid
- Loading states with spinner
- Delete actions require `ConfirmDialog`

### Dashboard Widgets
**KPI Cards** (`pages/dashboard.tsx`):
- Total Shipments (blue, click → `/shipments`)
- Active Shipments (green, click → `/shipments`)
- Monthly Expenses (yellow, click → `/expenses`)
- Pending Customs (purple)
- Skeleton loaders during fetch
- Color-coded status (blue/green/yellow/red/purple)
- Optional trend indicators (↑/↓ with percentage)

**Charts** (placeholder, ready for Recharts/Chart.js):
- Shipments over time (line chart)
- Expenses breakdown (pie/bar chart)
- Status distribution

### Styling
**TailwindCSS 3** with dark mode:
- Custom theme in `tailwind.config.js` (primary: blue-600, secondary: slate-700)
- Global styles: `styles/globals.css` with custom utility classes (`.btn`, `.input`, `.card`, `.sidebar-item`)
- Dark mode class strategy: `className="dark:bg-slate-800"`
- Color palette: Primary (blue), Secondary (gray), Success (green), Warning (yellow), Danger (red), Purple (super_admin)

## Backend Patterns (Express)

### Route Structure
```typescript
// src/app.ts - centralized router registration
app.use('/api/auth', authRouter);       // login, register, refresh
app.use('/api/me', meRouter);           // current user profile
app.use('/api/companies', companiesRouter);
app.use('/api/audit-logs', auditLogsRouter);
```

### Authentication Flow
1. **Login** (`POST /api/auth/login`):
   - Validates bcrypt hash
   - Generates JTI (JWT ID) with uuid
   - Returns `{ accessToken, refreshToken }` 
   - Stores hashed refresh token in `refresh_tokens` table

2. **Token Refresh** (`POST /api/auth/refresh`):
   - Validates refresh token hash from DB
   - Issues new access token with fresh JTI
   - Rotates refresh token (revokes old, issues new)

3. **Logout** (`POST /api/auth/logout`):
   - Deletes refresh token from DB (server-side revocation)

### Middleware Order
```typescript
authenticate → requirePermission('resource:action') → handler
```

**Never skip `authenticate`** - it populates `req.user` from JWT payload:
```typescript
req.user = { id, email, roles: string[], companyId?: number }
```

### Database Access
**Connection pool** via `src/db/index.ts`:
```typescript
import pool from '../db';
const result = await pool.query('SELECT ...', [params]);
```

**Transaction pattern:**
```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... multiple queries
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

### Audit Logging
**Automatic via middleware** (`middleware/auditLog.ts`):
- Captures before/after state as JSONB
- Records IP address, user agent
- Fired on POST/PUT/DELETE (not GET)

## Key Files Reference

### Configuration
- `docker-compose.yml` - service definitions, ports (postgres:5432, backend:4000, frontend-next:3001)
- `backend/tsconfig.json` - TypeScript config (ES2020, strict mode)
- `frontend-next/next.config.js` - Next.js config
- `frontend-next/tailwind.config.js` - theme customization

### Critical Backend Files
- `src/middleware/auth.ts` - JWT verification logic
- `src/middleware/rbac.ts` - permission checking (`requirePermission`, `requireAnyPermission`)
- `src/db/migrate.ts` - migration runner (study this for migration semantics)
- `migrations/003_system_admin_tables.sql` - core schema (companies, branches, permissions, audit)

### Critical Frontend Files
- `hooks/useAuth.ts` - authentication state management
- `hooks/usePermissions.ts` - RBAC permission checks (NOTE: mock data, needs backend integration)
- `components/layout/MainLayout.tsx` - page wrapper (study for layout patterns)
- `contexts/ToastContext.tsx` - notification system

### Documentation
- `DASHBOARD_IMPLEMENTATION.md` - comprehensive UI component catalog
- `backend/API_DOCUMENTATION.md` - REST API reference with examples

## Common Pitfalls

1. **Frontend permissions are mocked** - `usePermissions` returns hardcoded role mappings. Real permissions must come from backend via API.
2. **Migrations run once** - filename-based tracking means renaming a migration won't re-run it. Create new migration instead.
3. **super_admin bypass** - hardcoded in `rbac.ts` line 36, doesn't query DB (performance optimization).
4. **Soft deletes** - always filter `WHERE deleted_at IS NULL` unless explicitly including deleted records.
5. **Port conflicts** - frontend-next uses 3001 (not 3000) to avoid clash with legacy frontend.
6. **Token refresh** - 15min access token expiry requires refresh logic (not yet implemented in frontend).
7. **Manual validation** - No Zod/Yup yet. Implement validation functions manually per form (see `pages/index.tsx` login validation).
8. **No sensitive data exposure** - Never show stack traces, SQL errors, or internal IDs in UI. Use generic error messages.
9. **API URL hardcoded** - `http://localhost:4000` in fetch calls. Use `NEXT_PUBLIC_API_URL` env var for production.

## Project-Specific Conventions

- **SQL migrations:** Use uppercase for SQL keywords, snake_case for identifiers
- **TypeScript:** PascalCase for components/types, camelCase for functions/variables
- **API responses:** Always `{ data: [...], total: number }` for lists, `{ error: string }` for errors (never expose stack traces)
- **Validation:** Manual validation functions in frontend (no lib yet), Zod schemas in backend (see `backend/package.json`)
- **i18n ready:** `LocaleContext` + `locales/translations.ts` (Arabic + English support via `t('key')` function)
- **Batch scripts:** Windows-first (`.bat` + `.ps1`), assume PowerShell 5.1
- **UI patterns:**
  - Delete requires `ConfirmDialog` - never instant delete
  - Loading states with spinners on all async operations
  - Disable buttons during submission (prevent double-submit)
  - Toast notifications for success/error feedback
  - Skeleton loaders for data fetching (not spinners)
- **Security UI patterns:**
  - Logout clears `localStorage` tokens and redirects to `/`
  - 401/403 responses trigger auto-logout
  - No role/permission data cached - always fetch fresh
  - Password fields with visibility toggle
  - Session timeout warnings (future)

## When Adding Features

### Backend Changes
1. **New route:** Add to `src/routes/`, register in `src/app.ts`, apply middleware (`authenticate`, `requirePermission`)
2. **Database change:** Create numbered migration in `backend/migrations/` (e.g., `007_add_customers.sql`)
3. **New permission:** Insert into `permissions` table via migration (e.g., `INSERT INTO permissions (permission_code, resource, action, description) VALUES ('customers:create', 'customers', 'create', 'Create new customers')`)
4. **Audit logging:** Use `auditLog` middleware for POST/PUT/DELETE routes (captures before/after state)

### Frontend Changes
1. **UI component:** Check `components/ui/` first - extend existing components over creating new ones
2. **Page:** Create in `pages/`, wrap in `<MainLayout>`, add to `Sidebar.tsx` menu with permission check
3. **Update permissions mock:** Edit `usePermissions` hook to include new permission in role mappings
4. **Form validation:** Create `validateForm()` function with field-specific rules (email format, password strength, positive numbers, date ranges)
5. **Error handling:** Use `showToast('error', message)` for user feedback, never expose technical details
6. **Loading states:** Use `<StatCard loading={true}>` for skeleton loaders, `<Button loading={true}>` for spinners
7. **Responsive design:** Test mobile (hamburger menu), tablet (2-column grids), desktop (full sidebar)
8. **Dark mode:** Test all new components in both themes (`dark:` classes in Tailwind)
9. **Accessibility:** Add ARIA labels, keyboard navigation, focus management, proper semantic HTML

### Component Patterns to Follow
```tsx
// Page structure
export default function MyPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    // validation logic
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      // API call
      showToast('success', 'Saved successfully');
    } catch (error) {
      showToast('error', 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission('resource:view')) {
    return <div>Access denied</div>;
  }

  return (
    <MainLayout>
      <Head><title>Page Title - SLMS</title></Head>
      {/* content */}
    </MainLayout>
  );
}
```

### Delete Pattern (ALWAYS use ConfirmDialog)
```tsx
const [confirmOpen, setConfirmOpen] = useState(false);
const [deleting, setDeleting] = useState(false);

const handleDelete = async () => {
  setDeleting(true);
  try {
    await fetch(`http://localhost:4000/api/resource/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    showToast('success', 'Deleted successfully');
  } catch (error) {
    showToast('error', 'Failed to delete');
  } finally {
    setDeleting(false);
    setConfirmOpen(false);
  }
};

// In JSX:
<Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete</Button>
<ConfirmDialog
  isOpen={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleDelete}
  title="Delete Item"
  message="This action cannot be undone."
  confirmText="Delete"
  variant="danger"
  loading={deleting}
/>
```
