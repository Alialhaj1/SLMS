# SLMS — Shipping & Logistics Module: Full Development Prompt

> **نظام إدارة الشحن واللوجستيات — دليل التطوير الشامل**
>
> هذا البرومبت المرجعي يُستخدم مع AI Agent في VS Code لتطوير 23 شاشة شحن ولوجستيات من البداية للنهاية.

---

## 1. PROJECT CONTEXT & TECH STACK

```
Project:       SLMS — Shipping & Logistics Management System
Backend:       Express.js + TypeScript (backend/src/)
Frontend:      Next.js 13.5.6 + Tailwind CSS (frontend-next/pages/)
Database:      PostgreSQL 15 (Docker: slms-postgres-1)
Auth:          JWT with tenant isolation (company_id scoping)
i18n:          Arabic (RTL) + English bilingual
UI Library:    @heroicons/react, @headlessui/react, clsx, recharts
Form:          react-hook-form + zod validation
HTTP Client:   Axios-based apiClient (frontend-next/lib/apiClient.ts)
Docker:        docker-compose.yml at c:\projects\slms\
Port Backend:  4000 (internal Docker network)
Port Frontend: 3001
API Prefix:    /api/master/... or /api/...
Migrations:    Sequential numbered SQL files (backend/migrations/NNN_*.sql)
Latest Mig#:   449 (next = 450)
```

### Authentication & Testing
```powershell
# Login:
$loginResp = Invoke-WebRequest -Uri "http://localhost:4000/api/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@darkhawlan.com","password":"A11A22A33","tenant_id":7}'
$tk = ($loginResp.Content | ConvertFrom-Json).data.accessToken

# Test any endpoint:
curl.exe -s http://localhost:4000/api/master/shipping-companies -H "Authorization: Bearer $tk" -H "x-company-id: 7"
```

### Build & Deploy
```powershell
# Backend rebuild:
docker compose -f "c:\projects\slms\docker-compose.yml" up -d --build backend

# Frontend rebuild:
docker compose -f "c:\projects\slms\docker-compose.yml" up -d --build frontend-next

# Run migration:
docker exec slms-backend-1 node -e "require('./dist/db/migrate').migrate()"
```

---

## 2. ARCHITECTURAL PATTERNS — MUST FOLLOW

### 2.1 Backend Route Pattern (FULL CRUD)
Every route file in `backend/src/routes/master/` MUST follow this pattern (reference: `tariffs.ts` — 320 lines):

```typescript
import { Router, Request, Response } from 'express';
import pool from '../../db';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendError, sendPaginated } from '../../utils/response';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// Helper: get company_id from JWT or headers
function getCompanyId(req: Request): number {
  return Number((req as any).user?.company_id || req.headers['x-company-id']);
}

// ── GET /stats ─────────────────────────────────────────────
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const result = await pool.query(`
      SELECT count(*) as total,
             count(*) FILTER (WHERE is_active = true) as active,
             count(*) FILTER (WHERE is_active = false) as inactive
      FROM table_name
      WHERE company_id = $1 AND deleted_at IS NULL
    `, [companyId]);
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    sendError(res, 'STATS_ERROR', (err as Error).message, 500);
  }
});

// ── GET / (list with pagination, search, filters, sort) ────
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string || '').trim();
    const sortBy = (req.query.sortBy as string) || 'name_en';
    const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Build WHERE clauses dynamically
    const conditions = ['t.company_id = $1', 't.deleted_at IS NULL'];
    const params: any[] = [companyId];
    let paramIdx = 2;

    if (search) {
      conditions.push(`(t.name_en ILIKE $${paramIdx} OR t.name_ar ILIKE $${paramIdx} OR t.code ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    // Add filter params...

    const whereClause = conditions.join(' AND ');
    const allowedSorts = ['code','name_en','name_ar','is_active','created_at'];
    const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'name_en';

    const countQ = await pool.query(`SELECT count(*) FROM table_name t WHERE ${whereClause}`, params);
    const total = parseInt(countQ.rows[0].count);

    const dataQ = await pool.query(`
      SELECT t.*, ... JOINs ...
      FROM table_name t
      WHERE ${whereClause}
      ORDER BY t.${safeSort} ${sortOrder}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limit, offset]);

    sendPaginated(res, dataQ.rows, { page, limit, total });
  } catch (err) {
    sendError(res, 'LIST_ERROR', (err as Error).message, 500);
  }
});

// ── GET /:id ───────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const result = await pool.query(
      'SELECT * FROM table_name WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
      [id, companyId]
    );
    if (!result.rows.length) return sendError(res, 'NOT_FOUND', 'Record not found', 404);
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    sendError(res, 'FETCH_ERROR', (err as Error).message, 500);
  }
});

// ── POST / ─────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const userId = (req as any).user?.id;
    // Zod validation
    const schema = z.object({ /* fields */ });
    const data = schema.parse(req.body);
    
    const result = await pool.query(
      `INSERT INTO table_name (company_id, ..., created_by) VALUES ($1, ..., $N) RETURNING *`,
      [companyId, ..., userId]
    );
    sendSuccess(res, result.rows[0], 201);
  } catch (err) {
    if ((err as any)?.code === '23505') return sendError(res, 'DUPLICATE', 'Record already exists', 409);
    sendError(res, 'CREATE_ERROR', (err as Error).message, 500);
  }
});

// ── PUT /:id ───────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    // Validate + update
    const result = await pool.query(
      `UPDATE table_name SET ..., updated_by = $N, updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING *`,
      [id, companyId, ..., userId]
    );
    if (!result.rows.length) return sendError(res, 'NOT_FOUND', 'Record not found', 404);
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    sendError(res, 'UPDATE_ERROR', (err as Error).message, 500);
  }
});

// ── DELETE /:id (soft delete) ──────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    const result = await pool.query(
      `UPDATE table_name SET deleted_at = NOW(), updated_by = $3
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL RETURNING id`,
      [id, companyId, userId]
    );
    if (!result.rows.length) return sendError(res, 'NOT_FOUND', 'Record not found', 404);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    sendError(res, 'DELETE_ERROR', (err as Error).message, 500);
  }
});

export default router;
```

### 2.2 Register route in `backend/src/app.ts`
```typescript
import tableNameRoutes from './routes/master/tableName';
app.use('/api/master/table-name', tableNameRoutes);
```

### 2.3 Frontend Page Pattern (FULL PROFESSIONAL)
Every page MUST follow this pattern. Reference: `tariffs.tsx` (950 lines), `hs-codes.tsx` (750 lines):

```
STRUCTURE:
┌──────────────────────────────────────────────────┐
│ PageHeader: Title + Subtitle + Action Buttons    │
├──────────────────────────────────────────────────┤
│ StatsCards Row (4-6 cards with icons & colors)   │
├──────────────────────────────────────────────────┤
│ Filters Bar (search + dropdowns + date range)    │
├──────────────────────────────────────────────────┤
│ Data Table with sort + pagination + row actions  │
├──────────────────────────────────────────────────┤
│ Create/Edit Modal (multi-section form)           │
│ Delete Confirmation Dialog                       │
│ Detail/View Side Panel (optional for complex)    │
└──────────────────────────────────────────────────┘
```

**Key Requirements:**
- Use `MainLayout` wrapper
- Use `apiClient` from `../../lib/apiClient` (NOT fetch or raw axios)
- Bilingual: content switches based on `locale` (ar/en)
- RTL-aware: use `clsx` for conditional RTL classes
- Use existing UI components: `Button`, `Input`, `Modal`, `ConfirmDialog`, `SearchableSelect`, `Badge`, `StatCard`, `StatusBadge`, `Tooltip`
- All text translatable via `useTranslation()` hook (t('key'))
- Permission-gated: wrap actions with `usePermissions()` → `hasPermission()`
- Soft delete (server) + optimistic UI update
- Toast notifications on success/error
- Loading states with spinners
- Empty state with illustration

### 2.4 Design System — Colors & Styling

```
Primary:    Navy (#1e3a5f) — headers, primary buttons
Accent:     Amber (#f59e0b) — highlights, badges, important
Success:    Green-600 — active badges, completion
Danger:     Red-600 — delete buttons, error states
Warning:    Yellow-500 — pending states
Info:       Blue-500 — informational badges

Cards:      bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/60
Tables:     divide-y divide-gray-200 dark:divide-gray-700
Badges:     px-2.5 py-1 text-xs font-medium rounded-full
Buttons:    rounded-lg font-medium transition-all duration-200
Inputs:     rounded-lg border-gray-300 focus:ring-2 focus:ring-primary-500
```

**Animations & Transitions:**
```css
/* Card hover */        hover:shadow-md transition-shadow duration-200
/* Button press */      active:scale-[0.98] transition-transform
/* Modal entrance */    transition-opacity duration-300
/* Row hover */         hover:bg-gray-50 dark:hover:bg-gray-700/50
/* Badge pulse */       animate-pulse (for pending states)
/* Stats counter */     tabular-nums (for numbers)
```

### 2.5 Migration Pattern
```sql
-- ============================================================================
-- Migration NNN: Description
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS table_name (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(30) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  -- domain-specific columns...
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(company_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_name_company ON table_name(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_table_name_code ON table_name(company_id, code) WHERE deleted_at IS NULL;

-- Seed data (if applicable)
INSERT INTO table_name (...) VALUES (...) ON CONFLICT DO NOTHING;

-- Permissions
INSERT INTO permissions (permission_code, resource, action, description, module)
VALUES
  ('resource:view', 'resource', 'view', 'View ...', 'module'),
  ('resource:create', 'resource', 'create', 'Create ...', 'module'),
  ('resource:update', 'resource', 'update', 'Update ...', 'module'),
  ('resource:delete', 'resource', 'delete', 'Delete ...', 'module')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'super_admin'
AND p.permission_code IN ('resource:view','resource:create','resource:update','resource:delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
```

---

## 3. EXISTING DATABASE TABLES (ACTUAL SCHEMAS — verified April 9, 2026)

### Tables That EXIST:

```
shipping_companies     (16 cols): id, company_id, code, name, name_ar, contact_person, phone, email, address, services[], is_active, created_at, updated_at, created_by, updated_by, deleted_at
customs_offices        (33 cols): id, country_id, code, name, name_ar, address, phone, email, working_hours, is_active, ..., name_en, city_id, port_id, border_point_id, office_type, contact_fax, website, address_en, address_ar, services_en, services_ar, sort_order, company_id, ...
clearance_offices      (19 cols): id, company_id, code, name, name_ar, license_number, contact_person, phone, email, address, specialization, rating, is_active, notes, created_at, updated_at, created_by, updated_by, deleted_at
insurance_companies    (17 cols): id, company_id, code, name, name_ar, contact_person, phone, email, address, policy_number_prefix, is_active, notes, ...
insurance_types        (13 cols): id, code, name_en, name_ar, description_en, description_ar, coverage_scope, is_active, is_system, sort_order, ... (NO company_id!)
laboratories           (21 cols): id, company_id, code, name, name_ar, lab_type, accreditation_number, contact_person, phone, email, address, services[], is_saber_certified, is_active, notes, ...
shipping_agents        (24 cols): id, company_id, code, name, name_ar, agent_type, license_number, contact_person, phone, email, address, country_id, city_id, services[], is_active, notes, credit_limit, payment_terms_id, ...
container_types        (17 cols): id, code, name_en, name_ar, description_en, description_ar, size_feet, type_category, max_weight_kg, max_volume_cbm, is_active, is_system, sort_order, ...
ports                  (30 cols): id, country_id, city_id, code, name, name_ar, port_type, address, latitude, longitude, customs_office_id, is_active, ..., name_en, contact_phone, contact_email, website, operating_hours, is_international, sort_order, company_id, ...
shipment_types         (16 cols): id, code, name_en, name_ar, description_en, description_ar, mode, icon, requires_customs, is_active, is_system, sort_order, ...
shipping_methods       (19 cols): id, company_id, code, name, name_ar, transport_mode, default_carrier_id, transit_days, tracking_available, expense_account_id, is_active, ..., sort_order
shipment_classifications (12 cols): id, company_id, code, name_en, name_ar, description_en, description_ar, is_active, sort_order, ...
bill_of_lading_types   (13 cols): id, code, name_en, name_ar, description_en, description_ar, is_negotiable, is_active, is_system, sort_order, ...
document_types         (28 cols): id, company_id, code, name, name_en, name_ar, category, description, file_formats[], max_file_size_mb, requires_approval, approval_levels, requires_expiry, default_validity_days, is_confidential, retention_period_years, numbering_prefix, auto_numbering, requires_version_control, requires_digital_signature, applicable_to, template_available, is_mandatory, is_active, sort_order, ...
shipping_bills         (40+ cols): id, company_id, bill_number, bill_type_id, booking_number, bill_date, shipment_id, project_id, carrier_id, carrier_name, vessel_name, voyage_number, port_of_loading_id, port_of_discharge_id, ..., status, is_original, is_freight_prepaid, freight_terms, notes, ...
bill_types             (seeded): MBL, HBL, MAWB, HAWB, CMR, FBL, SWB
```

### Tables That DO NOT EXIST (need migration):

```
transport_companies    — شركات النقل البري
vehicle_types          — أنواع المركبات
vehicles               — المركبات
drivers                — السائقين
transport_routes       — خطوط النقل
customs_statuses       — حالات التخليص الجمركي
```

---

## 4. DEVELOPMENT PLAN — ORDERED BY PRIORITY

### Phase 1: Migration 450 — Create Missing Tables + Fix Existing

Create a SINGLE migration `450_shipping_logistics_tables.sql` that does ALL of the following:

#### 4.1 NEW TABLES:

**A. `transport_companies` — شركات النقل**
```
company_id, code(30), name_en(200), name_ar(200), company_type ('land_transport','freight_forwarder','courier','multimodal'),
license_number(100), tax_number(50), contact_person(100), phone(30), mobile(30), fax(30), email(100),
website(200), address_en(text), address_ar(text), city_id → cities(id), country_id → countries(id),
fleet_size INTEGER, service_coverage ('domestic','international','both'),
specializations text[] — ['dry_cargo','refrigerated','dangerous_goods','oversized','petroleum','moving'],
insurance_provider_id → insurance_companies(id), insurance_policy_number(100), insurance_expiry DATE,
contract_start DATE, contract_end DATE, payment_terms_days INTEGER, credit_limit NUMERIC(18,4),
rating INTEGER CHECK(1-5), reliability_score NUMERIC(5,2),
certifications text[], operating_regions text[],
is_active, sort_order, 
notes TEXT, created_by, updated_by, created_at, updated_at, deleted_at
UNIQUE(company_id, code)
```

**B. `vehicle_types` — أنواع المركبات**
```
company_id, code(30), name_en(200), name_ar(200),
category ('truck','trailer','tanker','container_chassis','pickup','van','refrigerated_truck','flatbed','lowbed','car_carrier'),
max_weight_tons NUMERIC(10,2), max_volume_cbm NUMERIC(10,2),
length_m NUMERIC(8,2), width_m NUMERIC(8,2), height_m NUMERIC(8,2),
fuel_type ('diesel','petrol','electric','hybrid','lng'),
axle_count INTEGER, is_refrigerated BOOLEAN, temperature_range_min NUMERIC, temperature_range_max NUMERIC,
requires_special_license BOOLEAN, license_type(50),
icon(50), color_hex(7),
is_active, sort_order,
created_by, updated_by, created_at, updated_at, deleted_at
UNIQUE(company_id, code)
```

**C. `vehicles` — المركبات**
```
company_id, code(30), plate_number(30), plate_type ('private','commercial','transport','government'),
vehicle_type_id → vehicle_types(id), transport_company_id → transport_companies(id),
brand(100), model(100), year INTEGER, color(50), vin_number(50),
registration_number(50), registration_expiry DATE,
insurance_policy_number(100), insurance_expiry DATE, insurance_company_id → insurance_companies(id),
inspection_expiry DATE,
gps_tracker_id(100), gps_enabled BOOLEAN DEFAULT false,
current_status ('available','in_transit','maintenance','out_of_service','reserved'),
current_location_text(200), current_latitude NUMERIC(10,7), current_longitude NUMERIC(10,7),
odometer_km INTEGER, fuel_capacity_liters NUMERIC(10,2),
max_weight_tons NUMERIC(10,2), max_volume_cbm NUMERIC(10,2),
assigned_driver_id → drivers(id),
daily_rate NUMERIC(12,2), per_km_rate NUMERIC(8,4),
notes TEXT, photo_url(500),
is_active, sort_order,
created_by, updated_by, created_at, updated_at, deleted_at
UNIQUE(company_id, plate_number)
```

**D. `drivers` — السائقين**
```
company_id, code(30), full_name_en(200), full_name_ar(200),
id_number(50), id_type ('national_id','iqama','passport'),
nationality_id → countries(id), 
phone(30), phone2(30), email(100), emergency_contact_name(100), emergency_contact_phone(30),
license_number(50), license_type ('light','heavy','dangerous_goods','oversized'), license_expiry DATE,
license_issuing_country_id → countries(id),
transport_company_id → transport_companies(id),
assigned_vehicle_id → vehicles(id),
current_status ('available','on_trip','on_leave','inactive','suspended'),
hire_date DATE, contract_end DATE,
daily_rate NUMERIC(12,2), per_trip_rate NUMERIC(12,2),
total_trips INTEGER DEFAULT 0, total_km INTEGER DEFAULT 0,
rating NUMERIC(3,2) DEFAULT 0,
certifications text[], violations_count INTEGER DEFAULT 0,
blood_type(5), medical_clearance_expiry DATE,
photo_url(500), notes TEXT,
is_active, sort_order,
created_by, updated_by, created_at, updated_at, deleted_at
UNIQUE(company_id, code)
```

**E. `transport_routes` — خطوط النقل**
```
company_id, code(30), name_en(200), name_ar(200),
route_type ('domestic','international','cross_border'),
transport_mode ('land','sea','air','rail','multimodal'),
origin_type ('port','warehouse','city','customs_office','free_zone'),
origin_port_id → ports(id), origin_city_id → cities(id), origin_country_id → countries(id),
origin_description(200),
destination_type ('port','warehouse','city','customs_office','free_zone'),
destination_port_id → ports(id), destination_city_id → cities(id), destination_country_id → countries(id),
destination_description(200),
via_points JSONB DEFAULT '[]', — [{type, name, port_id?, city_id?, country_id?, stop_order, est_hours}]
distance_km NUMERIC(10,2), estimated_hours NUMERIC(8,2), estimated_days INTEGER,
cost_per_trip NUMERIC(14,2), cost_per_ton_km NUMERIC(8,4), currency_code(3) DEFAULT 'SAR',
requires_customs_clearance BOOLEAN DEFAULT false,
border_crossing_points text[],
risk_level ('low','medium','high'),
frequency ('daily','weekly','biweekly','monthly','on_demand'),
preferred_carrier_id → transport_companies(id),
max_weight_tons NUMERIC(10,2),
is_active, sort_order,
notes TEXT,
created_by, updated_by, created_at, updated_at, deleted_at
UNIQUE(company_id, code)
```

**F. `customs_statuses` — حالات التخليص الجمركي**
```
id, company_id, code(30), name_en(200), name_ar(200),
description_en TEXT, description_ar TEXT,
status_category ('declaration','inspection','payment','release','hold'),
color_hex(7), icon(50),
sequence_order INTEGER, — ترتيب المرحلة في سير العمل
is_initial BOOLEAN DEFAULT false, — الحالة الابتدائية
is_final BOOLEAN DEFAULT false, — الحالة النهائية
is_blocking BOOLEAN DEFAULT false, — يمنع التقدم
allowed_next_statuses text[], — قائمة الحالات التالية المسموحة
requires_document BOOLEAN DEFAULT false,
requires_approval BOOLEAN DEFAULT false,
auto_notify BOOLEAN DEFAULT true,
sla_hours INTEGER, — وقت الاستجابة المتوقع
is_active, is_system, sort_order,
created_by, updated_by, created_at, updated_at, deleted_at
UNIQUE(company_id, code)
```
Seed with standard customs workflow:
```
SUBMITTED → UNDER_REVIEW → DOCUMENTS_VERIFIED → INSPECTION_SCHEDULED → INSPECTION_PASSED → DUTY_ASSESSED → PAYMENT_PENDING → PAYMENT_CONFIRMED → RELEASED → DELIVERED
Also: REJECTED, ON_HOLD, INSPECTION_FAILED, ADDITIONAL_DOCS_REQUIRED
```

#### 4.2 ALTER EXISTING TABLES:

**G. `shipping_companies` — add missing columns:**
```sql
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS company_type VARCHAR(50); -- 'ocean_carrier','airline','freight_forwarder','nvocc','courier'
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES countries(id);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS tracking_url_template VARCHAR(500); -- https://track.maersk.com/?bill={bill_number}
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS api_endpoint VARCHAR(500);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS integration_enabled BOOLEAN DEFAULT false;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS transport_modes text[]; -- ['sea','air','land']
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS coverage_regions text[];
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS contract_start DATE;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS contract_end DATE;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE shipping_companies ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
-- Copy name → name_en where name_en is null:
UPDATE shipping_companies SET name_en = name WHERE name_en IS NULL;
```

**H. `clearance_offices` — add missing columns:**
```sql
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS commercial_reg_number VARCHAR(50);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS customs_license_number VARCHAR(100);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS customs_license_expiry DATE;
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS fax VARCHAR(30);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS website VARCHAR(200);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES countries(id);
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS operating_ports INTEGER[]; -- array of port IDs they serve
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS services text[]; -- ['import','export','transit','temporary_admission']
ALTER TABLE clearance_offices ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
UPDATE clearance_offices SET name_en = name WHERE name_en IS NULL;
```

**I. `insurance_types` — add missing columns:**
```sql
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS coverage_level VARCHAR(50); -- 'basic','standard','comprehensive','all_risk'
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS covers_theft BOOLEAN DEFAULT false;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS covers_damage BOOLEAN DEFAULT false;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS covers_total_loss BOOLEAN DEFAULT true;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS covers_war_risk BOOLEAN DEFAULT false;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS covers_natural_disaster BOOLEAN DEFAULT false;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS is_standard_icc BOOLEAN DEFAULT false;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS icc_clause VARCHAR(10); -- 'A','B','C'
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS min_premium_rate NUMERIC(8,4);
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS max_premium_rate NUMERIC(8,4);
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS deductible_percent NUMERIC(5,2);
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS applicable_modes text[]; -- ['sea','air','land']
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE insurance_types ADD COLUMN IF NOT EXISTS updated_by INTEGER;
```

**J. `container_types` — add missing physical dimensions:**
```sql
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS length_ft NUMERIC(6,2);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS external_length_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS external_width_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS external_height_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS internal_length_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS internal_width_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS internal_height_mm INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS tare_weight_kg NUMERIC(10,2);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS max_payload_kg NUMERIC(10,2);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS internal_volume_m3 NUMERIC(10,2);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS is_refrigerated BOOLEAN DEFAULT false;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS is_open_top BOOLEAN DEFAULT false;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS is_flat_rack BOOLEAN DEFAULT false;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS is_tank BOOLEAN DEFAULT false;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS teu NUMERIC(3,1) DEFAULT 1; -- Twenty-foot Equivalent Unit
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS iso_code VARCHAR(10);
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS updated_by INTEGER;
```

**K. `ports` — add missing columns:**
```sql
ALTER TABLE ports ADD COLUMN IF NOT EXISTS un_locode VARCHAR(10);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS iata_code VARCHAR(10);
ALTER TABLE ports ADD COLUMN IF NOT EXISTS handles_fcl BOOLEAN DEFAULT true;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS handles_lcl BOOLEAN DEFAULT true;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS handles_bulk BOOLEAN DEFAULT false;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS handles_roro BOOLEAN DEFAULT false;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS handles_dangerous BOOLEAN DEFAULT false;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS free_zone BOOLEAN DEFAULT false;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS annual_capacity_teu INTEGER;
ALTER TABLE ports ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
```

**L. `shipment_types` — add missing columns:**
```sql
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS avg_transit_days INTEGER;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS supports_container BOOLEAN DEFAULT true;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS supports_bulk BOOLEAN DEFAULT false;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS supports_dangerous BOOLEAN DEFAULT false;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS typical_cost_range VARCHAR(50);
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE shipment_types ADD COLUMN IF NOT EXISTS updated_by INTEGER;
```

**M. `shipping_methods` — add missing columns:**
```sql
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS cost_basis VARCHAR(50); -- per_kg, per_cbm, per_container, flat_rate
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE shipping_methods ADD COLUMN IF NOT EXISTS updated_by INTEGER;
UPDATE shipping_methods SET name_en = name WHERE name_en IS NULL;
-- NOTE: shipping_methods has is_deleted (boolean) instead of deleted_at pattern.
-- Add deleted_at if missing for consistency:
-- Backend queries MUST use: (deleted_at IS NULL AND (is_deleted IS NULL OR is_deleted = false))
```

**N. `shipment_classifications` — add columns:**
```sql
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS un_code VARCHAR(10);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS hazard_class VARCHAR(10);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS requires_special_handling BOOLEAN DEFAULT false;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS requires_temperature_control BOOLEAN DEFAULT false;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS temperature_min NUMERIC(5,1);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS temperature_max NUMERIC(5,1);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS max_stack_layers INTEGER;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS handling_instructions_en TEXT;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS handling_instructions_ar TEXT;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7);
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE shipment_classifications ADD COLUMN IF NOT EXISTS updated_by INTEGER;
```

**O. `bill_of_lading_types` — add columns:**
```sql
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(20); -- 'sea','air','land','multimodal'
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS document_kind VARCHAR(30); -- 'original','copy','electronic','express'
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS requires_original BOOLEAN DEFAULT true;
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS copies_required INTEGER DEFAULT 3;
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS can_endorse BOOLEAN DEFAULT false; -- قابلة للتظهير
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE bill_of_lading_types ADD COLUMN IF NOT EXISTS updated_by INTEGER;
```

---

## 5. SCREEN-BY-SCREEN IMPLEMENTATION GUIDE

### EXECUTION ORDER (do in this order — each builds on the previous):

```
BATCH 1  — Foundation Tables (Migration 450 + Backend CRUD):
  1. transport-companies
  2. vehicle-types  
  3. vehicles (depends on vehicle_types, transport_companies)
  4. drivers (depends on transport_companies, vehicles)
  5. transport-routes (depends on ports, transport_companies)
  6. customs-statuses (clearance-status)

BATCH 2  — Fix Existing Backend (read-only → full CRUD):
  7. customs-offices (fix backend, add CRUD)
  8. clearance-offices (fix name column bug, add CRUD)
  9. freight-agents (fix table name shipping_agents, add CRUD)
  10. insurance-types (add CRUD + missing columns)
  11. container-types (add CRUD + physical dims)
  12. ports (redirect to full CRUD route)
  13. shipment-types (add CRUD)
  14. shipping-methods (fix name_en/deleted_at bug, add CRUD)
  15. shipping-classifications (add CRUD)
  16. bill-of-lading-types (add CRUD)

BATCH 3  — Enhance Existing Pages:
  17. shipping-companies (add rating, integration fields)
  18. insurance-companies (minor cleanup)
  19. laboratories (add GET /:id)
  20. document-types (fix URL, enable edit/delete buttons)

BATCH 4  — Complex Pages:
  21. shipping-bills (build full frontend page ~ 800+ lines)
  22. integrations/shipping-companies (rewrite to use real API)
  23. delivery-locations (enhance with address/coordinates)
```

---

### SCREEN 1: `/master/transport-companies` — شركات النقل

**Backend:** New file `backend/src/routes/master/transportCompanies.ts`
- GET /stats → total, active, inactive, by_type counts, avg_fleet_size
- GET / → list with search(name_en, name_ar, code), filter(is_active, company_type, service_coverage, city_id), sort, pagination
- GET /:id → single with JOINs to countries, cities, insurance_companies
- POST / → validate: code required unique, name_en required, company_type valid enum
- PUT /:id → update
- DELETE /:id → soft delete, check if referenced by vehicles/transport_routes
- GET /filters → distinct company_types, cities, countries for dropdown

**Frontend:** Rewrite `frontend-next/pages/master/transport-companies.tsx` (~600 lines)
- Stats row: شركات نشطة | أنواع | إجمالي المركبات | متوسط التقييم
- Filters: بحث + نوع الشركة + التغطية + المدينة + الحالة
- Table columns: الكود | الاسم | النوع | الترخيص | المدينة | المركبات | التقييم ★ | الحالة
- Create/Edit Modal: 3 sections (هوية + تواصل + عقود وتأمين)
- Row action: View vehicles (link to /master/vehicles?company_id=X)

**Relationships:**
- vehicles.transport_company_id → this table
- drivers.transport_company_id → this table
- transport_routes.preferred_carrier_id → this table

---

### SCREEN 2: `/master/vehicle-types` — أنواع المركبات

**Backend:** New file `backend/src/routes/master/vehicleTypes.ts`
- CRUD + stats (count by category, refrigerated count)
- GET /filters → distinct categories, fuel_types

**Frontend:** Rewrite `frontend-next/pages/master/vehicle-types.tsx` (~500 lines)
- Stats: إجمالي الأنواع | مبردة | بوقود ديزل | تحتاج رخصة خاصة
- Filters: بحث + الفئة + نوع الوقود + مبردة + الحالة
- Table: الكود | الاسم | الفئة | الحمولة القصوى | الحجم | محركها | مبردة؟ | الحالة
- Create Modal: 3 sections (هوية + مواصفات فنية + إعدادات)
- Visual: Category icons (🚛 truck, 🏗️ flatbed, ❄️ refrigerated)

---

### SCREEN 3: `/master/vehicles` — المركبات

**Backend:** New file `backend/src/routes/master/vehicles.ts`
- CRUD + stats (total, available, in_transit, maintenance, by_type)
- GET / → JOIN vehicle_types, transport_companies, drivers(assigned)
- PUT /:id/status → change status with validation rules
- GET /available → filter only available vehicles for assignment

**Frontend:** Rewrite `frontend-next/pages/master/vehicles.tsx` (~700 lines)
- Stats cards: إجمالي | متاحة 🟢 | في رحلة 🔵 | صيانة 🟠 | خارج الخدمة 🔴
- Filters: بحث + نوع المركبة + شركة النقل + الحالة + لوحة
- Table: اللوحة | النوع | الماركة/الموديل | الشركة | السائق | الحالة | الفحص | التأمين
- Status badges with colors: available(green), in_transit(blue), maintenance(orange), out_of_service(red)
- Detail panel: vehicle photo, docs expiry timeline, trip history
- Alerts: 🔴 تأمين منتهي | 🟡 فحص قريب الانتهاء

**Relationships:**
- vehicle_type_id → vehicle_types
- transport_company_id → transport_companies
- insurance_company_id → insurance_companies
- assigned_driver_id → drivers

---

### SCREEN 4: `/master/drivers` — السائقين

**Backend:** New file `backend/src/routes/master/drivers.ts`
- CRUD + stats (total, available, on_trip, on_leave, avg_rating)
- GET / → JOIN transport_companies, vehicles, countries(nationality)
- PUT /:id/status → update driver status
- GET /available → for vehicle assignment

**Frontend:** Rewrite `frontend-next/pages/master/drivers.tsx` (~600 lines)
- Stats: إجمالي | متاح 🟢 | في رحلة 🚛 | إجازة 🏖️ | التقييم المتوسط
- Table: الكود | الاسم | الهوية | الشركة | المركبة | الرخصة | الحالة | التقييم
- License expiry color coding: 🟢 > 3 months, 🟡 1-3 months, 🔴 < 1 month or expired
- Create Modal: 4 sections (بيانات شخصية + الرخصة + التوظيف + الطوارئ)
- Validate: license_expiry must be future, phone format

---

### SCREEN 5: `/master/transport-routes` — خطوط النقل

**Backend:** New file `backend/src/routes/master/transportRoutes.ts`
- CRUD + stats
- GET / → JOIN ports(origin, destination), cities, countries
- POST /calculate-cost → estimate based on distance_km, weight

**Frontend:** Rewrite `frontend-next/pages/master/transport-routes.tsx` (~650 lines)
- Stats: إجمالي الخطوط | محلية | دولية | متوسط المسافة | تستلزم جمارك
- Filters: بحث + نوع الخط + وسيلة النقل + البلد + مستوى المخاطر
- Table: الكود | الخط | المنشأ → الوجهة | المسافة | المدة | التكلفة | جمارك؟ | المخاطر
- Visual: Origin → Destination with arrow, via points count badge
- Modal: 4 sections (هوية + المنشأ + الوجهة + تفاصيل مالية)
- SearchableSelect for ports and cities

---

### SCREEN 6: `/master/clearance-status` — حالات التخليص

**Backend:** Fix `backend/src/routes/master/customsStatuses.ts` → query `customs_statuses` table (migration creates it)
- CRUD + reorder endpoint (PUT /reorder → update sequence_order batch)
- GET /workflow → return statuses with allowed_next_statuses for workflow visualization

**Frontend:** Rewrite `frontend-next/pages/master/clearance-status.tsx` (~500 lines)
- Kanban-like workflow visualization: status cards → arrows → next status
- Color-coded cards by status_category
- Drag-to-reorder sequence
- Table fallback: الكود | الاسم | الفئة | الترتيب | مانع؟ | تحتاج مستند؟ | وقت SLA
- Modal: Status settings including allowed_next_statuses multi-select

---

### SCREENS 7-16: Fix Existing Read-Only Backends

For EACH of these screens, the pattern is the same:
1. Rewrite backend route from ~51 lines to ~200+ lines with full CRUD
2. Fix any column name mismatches (name_en vs name, deleted_at vs is_deleted)
3. Add JOINs where FK columns exist (country_id → countries, city_id → cities, customs_office_id → customs_offices)
4. Add /stats endpoint
5. Update frontend to use all new columns
6. Add proper search (search in name_en, name_ar, code)
7. Add proper filters (is_active + domain-specific)

**CRITICAL BUGS TO FIX:**

| Screen | File | Bug | Fix |
|--------|------|-----|-----|
| freight-agents | backend/routes/master/freightAgents.ts | Queries `freight_agents` table → 500 | Change to `shipping_agents` |
| clearance-offices | backend/routes/master/clearanceOffices.ts | Searches `name_en` → 500 | Use `name` or `COALESCE(name_en, name)` |
| shipping-methods | backend/routes/master/shippingMethods.ts | Filters `deleted_at IS NULL` but column missing; searches `name_en` | Use `(deleted_at IS NULL OR is_deleted = false)` pattern; use `COALESCE(name_en, name)` |

---

### SCREEN 21: `/shipping-bills` — بوليصات الشحن (MOST COMPLEX)

**Backend:** Already exists at `backend/src/routes/shippingBills.ts` (620 lines) — mostly complete.
Needs:
- Fix any column mismatches with actual table
- Add /stats endpoint
- Add /filters endpoint (distinct statuses, bill_types, carriers)
- Ensure all JOINs work (bill_types, ports, shipping_agents, logistics_shipments)

**Frontend:** Build NEW page `frontend-next/pages/shipping/bills.tsx` (~1000+ lines)
This is the crown jewel of the module — should be the most polished:

```
LAYOUT:
┌──────────────────────────────────────────────────┐
│ 📋 بوليصات الشحن                                  │
│ إدارة بوليصات الشحن البحري والجوي والبري            │
├──────────────────────────────────────────────────┤
│ [مسودة:12] [صادرة:45] [في الطريق:23] [وصلت:89]  │
│ [تم التسليم:156] [ملغاة:3]                        │
├──────────────────────────────────────────────────┤
│ 🔍 بحث | نوع البوليصة ▼ | الحالة ▼ | الناقل ▼   │
│ من تاريخ [📅] | إلى تاريخ [📅] |  تصفية | مسح    │
├──────────────────────────────────────────────────┤
│ ┌─────┬──────┬─────┬──────┬──────┬─────┬────┐   │
│ │ رقم │ نوع  │ ناقل│ تحميل│ تفريغ│حالة │ ETA│   │
│ ├─────┼──────┼─────┼──────┼──────┼─────┼────┤   │
│ │BL001│ MBL  │MAER │جدة   │روتر │في الط│04/15│   │
│ │BL002│ HAWB │SAUDIA│الرياض│دبي  │وصل  │04/10│   │
│ └─────┴──────┴─────┴──────┴──────┴─────┴────┘   │
├──────────────────────────────────────────────────┤
│ [+ إنشاء بوليصة جديدة]                           │
└──────────────────────────────────────────────────┘

CREATE/EDIT MODAL (Multi-step wizard or tabbed):
Step 1: البيانات الأساسية
  - رقم البوليصة | نوع البوليصة (dropdown → bill_types) | رقم الحجز
  - تاريخ البوليصة | الحالة

Step 2: الناقل والسفينة
  - الناقل/شركة الشحن (SearchableSelect → shipping_agents)
  - اسم السفينة | رقم الرحلة

Step 3: الموانئ والتواريخ
  - ميناء التحميل (SearchableSelect → ports)
  - ميناء التفريغ (SearchableSelect → ports)
  - مكان التسليم
  - تاريخ الشحن | ETA | تاريخ الوصول الفعلي

Step 4: البضاعة والحاويات
  - وصف البضاعة | الوزن الإجمالي | الوزن الصافي
  - الحجم | عدد الطرود | نوع التغليف
  - عدد الحاويات | نوع الحاوية | أرقام الحاويات (tag input)

Step 5: الشروط والملاحظات
  - نسخة أصلية؟ | الشحن مدفوع مسبقاً؟ | شروط الشحن
  - ملاحظات | ملاحظات داخلية
```

---

### SCREEN 22: `/integrations/shipping-companies` — تكامل شركات الشحن

**Frontend:** Rewrite to use real API (`/api/master/shipping-companies`)
- Show companies as cards with real data
- Integration settings form (API key, endpoint, enable/disable)
- "Test Connection" button → POST /api/master/shipping-companies/:id/test-connection (add to backend)
- Real-time tracking link generator using tracking_url_template

---

## 6. CROSS-SCREEN RELATIONSHIPS — DATA LINKING

```
shipping_companies ─┬── shipping_bills.carrier_id (via shipping_agents)
                    ├── transport_routes.preferred_carrier_id
                    └── integrations page

transport_companies ─┬── vehicles.transport_company_id
                     ├── drivers.transport_company_id
                     └── transport_routes.preferred_carrier_id

vehicle_types ────── vehicles.vehicle_type_id

vehicles ──────────── drivers.assigned_vehicle_id

insurance_companies ┬── vehicles.insurance_company_id
                    └── transport_companies.insurance_provider_id

insurance_types ──── (reference for policy creation)

ports ─────────────┬── shipping_bills.port_of_loading_id / port_of_discharge_id
                   ├── transport_routes.origin_port_id / destination_port_id
                   ├── customs_offices.port_id (served by)
                   └── clearance_offices.operating_ports[]

customs_offices ───── ports.customs_office_id

clearance_offices ─── customs_declarations.clearance_office_id

customs_statuses ──── customs_declarations.status workflow

shipping_agents ────── shipping_bills.carrier_id (= freight agents)

container_types ────── shipping_bills.container_type

bill_of_lading_types ─ shipping_bills (informational, bill_types is actual FK)

shipment_types ──────── logistics_shipments.shipment_type_id

shipping_methods ────── logistics_shipments.shipping_method_id

shipment_classifications ── logistics_shipments.classification_id

document_types ────── clearance_documents.document_type, attachments

laboratories ────── (reference for inspection/testing linked to declarations)
```

### Cross-page navigation tips:
- When viewing a `transport_company`, show "مركباتها" button → `/master/vehicles?transport_company_id=X`
- When viewing a `vehicle`, link to its `driver` and `transport_company`
- When viewing a `port`, show link to `customs_offices` at that port
- When creating `shipping_bill`, auto-populate port names when selecting from dropdown
- When viewing `transport_route`, show cost calculator
- SearchableSelect components should load related data lazily from API

---

## 7. UI/UX PROFESSIONAL GUIDELINES

### 7.1 Stats Cards
Every page must have 4-6 stat cards at top:
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
  <StatCard icon={TruckIcon} label="إجمالي" value={stats.total} color="blue" />
  <StatCard icon={CheckCircleIcon} label="نشط" value={stats.active} color="green" />
  <StatCard icon={XCircleIcon} label="غير نشط" value={stats.inactive} color="red" />
  {/* domain-specific stats */}
</div>
```

### 7.2 Status Badges
Consistent color mapping across ALL screens:
```typescript
const STATUS_COLORS: Record<string, string> = {
  // General
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  // Vehicle/Driver status
  available: 'bg-green-100 text-green-800',
  in_transit: 'bg-blue-100 text-blue-800',
  on_trip: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-orange-100 text-orange-800',
  out_of_service: 'bg-red-100 text-red-800',
  on_leave: 'bg-purple-100 text-purple-800',
  // Shipping bill status
  draft: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  arrived: 'bg-teal-100 text-teal-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  // Clearance status
  pending: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  on_hold: 'bg-orange-100 text-orange-800',
};
```

### 7.3 Form Validations
```
- Codes: uppercase, alphanumeric + underscore, max 30 chars
- Names: min 2 chars, max 200 chars
- Email: regex validation
- Phone: allow +, digits, spaces, dashes
- Dates: license_expiry/insurance_expiry must be > today (warn if < 30 days)
- Numeric: positive, max reasonable value
- Unique constraints: show clear error "هذا الكود مستخدم مسبقاً"
```

### 7.4 Tooltips & Hints
```
- Hover on status badge → show full status name + since date
- Hover on rating stars → show "X من 5"
- Hover on expired date → show "منتهي منذ X يوم" in red
- Hover on truncated text → show full text
- Empty fields → show placeholder with example: "مثال: TC-001"
- Required fields: red * with tooltip "حقل مطلوب"
```

### 7.5 Empty States
```tsx
<div className="text-center py-12">
  <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
    {t('transport.noCompanies')}
  </h3>
  <p className="mt-1 text-sm text-gray-500">
    {t('transport.addFirstCompany')}
  </p>
  <Button onClick={openCreate} className="mt-4">
    <PlusIcon className="w-4 h-4" />
    {t('common.add')}
  </Button>
</div>
```

### 7.6 Responsive Design
- Mobile: single column, collapsible filters, card view instead of table
- Tablet: 2-column grid, compact table
- Desktop: full table with all columns, side-by-side form sections

### 7.7 Accessibility
- All interactive elements have aria-labels
- Color is never the sole indicator (always text + icon + color)
- Keyboard navigation (Tab, Enter, Escape for modals)
- RTL: all layouts must mirror correctly

---

## 8. SEED DATA — حالات واقعية سعودية

### Transport Companies
```sql
INSERT INTO transport_companies (company_id, code, name_en, name_ar, company_type, ...) VALUES
(7, 'SMASCO', 'Saudi Massarat Cargo', 'مسارات السعودية للشحن', 'land_transport', ...),
(7, 'BAHRI-LOG', 'Bahri Logistics', 'بحري للخدمات اللوجستية', 'multimodal', ...),
(7, 'ALMAJDOUIE', 'Almajdouie Logistics', 'المجدوعي للوجستيات', 'freight_forwarder', ...),
(7, 'TCC', 'TCC Transport', 'النقل المتكامل TCC', 'land_transport', ...);
```

### Vehicle Types
```sql
INSERT INTO vehicle_types (company_id, code, name_en, name_ar, category, max_weight_tons, ...) VALUES
(7, 'TRAILER-40', '40ft Trailer', 'مقطورة 40 قدم', 'trailer', 30, ...),
(7, 'REEFER-40', '40ft Refrigerated', 'مبردة 40 قدم', 'refrigerated_truck', 25, ...),
(7, 'FLATBED', 'Flatbed Truck', 'شاحنة مسطحة', 'flatbed', 35, ...),
(7, 'TANKER', 'Fuel Tanker', 'ناقلة وقود', 'tanker', 40, ...),
(7, 'PICKUP', 'Pickup Truck', 'بيكب', 'pickup', 3.5, ...);
```

### Customs Statuses (workflow order)
```sql
INSERT INTO customs_statuses (company_id, code, name_en, name_ar, status_category, sequence_order, ...) VALUES
(7, 'SUBMITTED', 'Declaration Submitted', 'تم تقديم البيان', 'declaration', 1, ...),
(7, 'UNDER_REVIEW', 'Under Review', 'قيد المراجعة', 'declaration', 2, ...),
(7, 'DOCS_VERIFIED', 'Documents Verified', 'تم التحقق من المستندات', 'declaration', 3, ...),
(7, 'INSPECTION', 'Inspection Scheduled', 'فحص مجدول', 'inspection', 4, ...),
(7, 'INSPECTION_PASS', 'Inspection Passed', 'اجتاز الفحص', 'inspection', 5, ...),
(7, 'DUTY_ASSESSED', 'Duty Assessed', 'تم تقدير الرسوم', 'payment', 6, ...),
(7, 'PAYMENT_PENDING', 'Payment Pending', 'بانتظار الدفع', 'payment', 7, ...),
(7, 'PAYMENT_DONE', 'Payment Confirmed', 'تم تأكيد الدفع', 'payment', 8, ...),
(7, 'RELEASED', 'Released', 'تم الإفراج', 'release', 9, ...),
(7, 'DELIVERED', 'Delivered', 'تم التسليم', 'release', 10, ...),
(7, 'REJECTED', 'Rejected', 'مرفوض', 'hold', 99, ...),
(7, 'ON_HOLD', 'On Hold', 'معلق', 'hold', 98, ...),
(7, 'INSPECTION_FAIL', 'Inspection Failed', 'لم يجتز الفحص', 'inspection', 97, ...),
(7, 'ADDITIONAL_DOCS', 'Additional Docs Required', 'مستندات إضافية مطلوبة', 'declaration', 96, ...);
```

---

## 9. QUALITY CHECKLIST — Every Screen Must Pass

```
☐ Backend: GET /, GET /:id, POST /, PUT /:id, DELETE /:id all return 200/201
☐ Backend: GET /stats returns aggregated counts
☐ Backend: Search works on name_en, name_ar, code
☐ Backend: Pagination works (page, limit, total in response)
☐ Backend: Sort by multiple columns works
☐ Backend: Filters work (is_active + domain-specific)
☐ Backend: Duplicate code returns 409 with clear message
☐ Backend: Not found returns 404
☐ Backend: company_id isolation — cannot see other company data
☐ Backend: Soft delete (deleted_at = NOW())
☐ Backend: created_by/updated_by populated from JWT
☐ Frontend: Stats cards load and display correctly
☐ Frontend: Table renders with all columns and proper alignment
☐ Frontend: Search/filter actually triggers API call
☐ Frontend: Sort arrows work (asc/desc toggle)
☐ Frontend: Pagination buttons work
☐ Frontend: Create modal opens with empty form
☐ Frontend: Edit modal opens with pre-filled data
☐ Frontend: Delete shows confirmation dialog
☐ Frontend: Success toast after create/edit/delete
☐ Frontend: Error toast on failure
☐ Frontend: Loading spinner during API calls
☐ Frontend: Empty state when no data
☐ Frontend: Arabic (RTL) layout correct
☐ Frontend: All text uses t() translation function
☐ Frontend: Permission check gates actions (create/edit/delete buttons)
☐ Frontend: Responsive on mobile (no horizontal overflow)
☐ Frontend: Dark mode support
☐ Frontend: No hardcoded localhost URLs (use apiClient)
☐ Cross-linking: Related entity links work (e.g., vehicle → company link)
☐ Route registered in app.ts
☐ Migration tested and applied
```

---

## 10. EXECUTION INSTRUCTIONS FOR AI AGENT

```
When implementing, follow this exact workflow for EACH screen:

1. Run the migration (if new table needed)
2. Create/rewrite backend route file
3. Register route in app.ts (if new)
4. Rebuild backend: docker compose up -d --build backend
5. Wait for migration to apply (check logs)
6. Test ALL endpoints with curl (GET /, POST, GET /:id, PUT, DELETE)
7. Create/rewrite frontend page
8. Rebuild frontend: docker compose up -d --build frontend-next
9. Verify page loads in browser
10. Check for console errors

DO NOT:
- Skip endpoint testing
- Use fetch() instead of apiClient
- Hardcode localhost:4000 in frontend
- Forget to register routes in app.ts
- Create tables without company_id scoping
- Skip soft delete pattern
- Use is_deleted boolean (use deleted_at TIMESTAMP)
- Leave mock data in frontend pages

ALWAYS:
- Use sendSuccess/sendError/sendPaginated from utils/response
- Use authenticate middleware on all routes
- Use getCompanyId() helper for tenant isolation
- Use Zod for request validation
- Use parameterized queries ($1, $2...) — NEVER string concatenation
- Add proper indexes on company_id and frequently filtered columns
- Handle unique constraint violations (PostgreSQL error code 23505)
- Support both name_en and name_ar in search
```

---

## 11. ESTIMATED SCOPE

| Category | Count | Avg Lines/File | Total Lines |
|----------|-------|-----------------|-------------|
| Migration SQL | 1 | ~400 | 400 |
| New backend routes | 6 | ~250 | 1,500 |
| Fixed backend routes | 10 | ~200 | 2,000 |
| New frontend pages | 1 (shipping-bills) | ~1,000 | 1,000 |
| Rewritten frontend pages | 16 | ~550 | 8,800 |
| Enhanced frontend pages | 6 | ~100 | 600 |
| **Total** | **~40 files** | | **~14,300 lines** |

هذا البرومبت يُنتج نظاماً متكاملاً واحترافياً لإدارة الشحن واللوجستيات 🚢✈️🚛
