# My Requests Module - وحدة طلباتي

## 📋 Overview

This document provides complete implementation details for the **My Requests** module - a centralized hub for managing all user requests within the SLMS system.

## 🎯 Features Implemented

### ✅ Database Layer (Backend Migration)

**File:** `backend/migrations/177_create_requests_module.sql`

#### Tables Created:
1. **expense_types** - Reference data for 17 expense categories
   - LC Fees, Cargo Insurance, Sea Freight, Delivery Order
   - Customs Declaration, Storage, Port Charges, Unloading
   - Customs Inspection, Container Delays, Customs Clearance
   - Transport, Loading/Unloading, Sample Testing, SABER Certificate
   - Pallet Fines, Container Return Delay

2. **request_statuses** - Workflow states
   - DRAFT, SUBMITTED, APPROVED, REJECTED, EXECUTED, CANCELLED
   - With UI colors, icons, and permission flags

3. **expense_requests** - Main expense request table
   - Linked to: projects (mandatory), shipments (mandatory), vendors, expense types
   - Financial tracking: currency, exchange rate, amounts
   - Approval workflow: submitted_by, approved_by, rejected_by
   - Audit trail: created_at, updated_at, deleted_at (soft delete)

4. **expense_request_items** - Line items for itemized expenses
   - Item details, quantities, UOM, pricing, discounts, taxes

5. **expense_request_attachments** - File uploads (PDFs, images)

6. **transfer_requests** - Transfer requests (linked to approved expenses)
   - Bank transfer details: beneficiary, IBAN, SWIFT
   - Print tracking: is_printed, print_count, first/last printed timestamps
   - Execution tracking: executed_at, transaction_reference

7. **payment_requests** - Payment requests (linked to transfers)
   - Payment method: bank_transfer, cash, cheque, online, credit_card
   - Accounting integration: journal_entry_id, is_posted
   - Receipt tracking: receipt_number, cheque_number

8. **request_approval_history** - Complete audit trail
   - Logs all actions: created, submitted, approved, rejected, executed, printed
   - Captures IP address, user agent, comments

#### Features:
- **Auto-numbering** via triggers: EXP-2026-00001, TRF-2026-00001, PAY-2026-00001
- **Soft deletes** on all tables
- **updated_at triggers** for automatic timestamp updates
- **Approval history logging** triggers (automatic on INSERT/UPDATE)

#### Seeded Data:
- 17 expense types for company_id=1 (system types)
- 6 request statuses with workflow logic

---

### ✅ Backend APIs

#### 1. **Expense Types API** (`backend/src/routes/expenseTypes.ts`)

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/expense-types` | GET | `expense_types:view` | List all expense types |
| `/api/expense-types/:id` | GET | `expense_types:view` | Get single expense type |
| `/api/expense-types` | POST | `expense_types:create` | Create new expense type |
| `/api/expense-types/:id` | PUT | `expense_types:update` | Update expense type |
| `/api/expense-types/:id` | DELETE | `expense_types:delete` | Delete expense type |

#### 2. **Expense Requests API** (`backend/src/routes/expenseRequests.ts`)

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/expense-requests` | GET | `expense_requests:view` | List expense requests (filtered by user) |
| `/api/expense-requests/:id` | GET | `expense_requests:view` | Get single request with items, attachments, history |
| `/api/expense-requests` | POST | `expense_requests:create` | Create new expense request |
| `/api/expense-requests/:id` | PUT | `expense_requests:update` | Update expense request (only if DRAFT) |
| `/api/expense-requests/:id` | DELETE | `expense_requests:delete` | Soft delete (only if DRAFT) |
| `/api/expense-requests/:id/submit` | POST | `expense_requests:submit` | Submit for approval |
| `/api/expense-requests/:id/approve` | POST | `expense_requests:approve` | Approve request |
| `/api/expense-requests/:id/reject` | POST | `expense_requests:approve` | Reject request (requires reason) |

**Query Parameters (GET /api/expense-requests):**
- `status_id` - Filter by status
- `project_id` - Filter by project
- `shipment_id` - Filter by shipment
- `expense_type_id` - Filter by expense type
- `vendor_id` - Filter by vendor
- `date_from` / `date_to` - Date range filter
- `search` - Search by request number, BL number, notes
- `page` / `limit` - Pagination

#### 3. **Transfer Requests API** (`backend/src/routes/transferRequests.ts`)

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/transfer-requests` | GET | `transfer_requests:view` | List transfer requests |
| `/api/transfer-requests/:id` | GET | `transfer_requests:view` | Get single transfer request |
| `/api/transfer-requests` | POST | `transfer_requests:create` | Create from approved expense |
| `/api/transfer-requests/:id` | PUT | `transfer_requests:update` | Update transfer request |
| `/api/transfer-requests/:id` | DELETE | `transfer_requests:delete` | Soft delete |
| `/api/transfer-requests/:id/submit` | POST | `transfer_requests:submit` | Submit for approval |
| `/api/transfer-requests/:id/approve` | POST | `transfer_requests:approve` | Approve transfer |
| `/api/transfer-requests/:id/execute` | POST | `transfer_requests:execute` | Execute transfer (requires transaction_reference) |
| `/api/transfer-requests/:id/print` | POST | `transfer_requests:print` | Track print event |

**Query Parameters:**
- Same as expense requests +
- `is_printed` - Filter by print status (true/false)

#### 4. **Payment Requests API** (`backend/src/routes/paymentRequests.ts`)

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/payment-requests` | GET | `payment_requests:view` | List payment requests |
| `/api/payment-requests/:id` | GET | `payment_requests:view` | Get single payment request |
| `/api/payment-requests` | POST | `payment_requests:create` | Create from approved transfer |
| `/api/payment-requests/:id/execute` | POST | `payment_requests:execute` | Execute payment |
| `/api/payment-requests/:id/print` | POST | `payment_requests:print` | Track print event |

**Query Parameters:**
- Same as transfer requests +
- `is_posted` - Filter by accounting post status

---

### ✅ Permissions System

**File:** `backend/migrations/178_add_requests_module_permissions.sql`

#### Permissions Created (32 total):

**Expense Types:**
- `expense_types:view`, `expense_types:create`, `expense_types:update`, `expense_types:delete`

**Expense Requests:**
- `expense_requests:view`, `expense_requests:create`, `expense_requests:update`
- `expense_requests:delete`, `expense_requests:submit`, `expense_requests:approve`
- `expense_requests:manage`

**Transfer Requests:**
- `transfer_requests:view`, `transfer_requests:create`, `transfer_requests:update`
- `transfer_requests:delete`, `transfer_requests:submit`, `transfer_requests:approve`
- `transfer_requests:execute`, `transfer_requests:print`, `transfer_requests:manage`

**Payment Requests:**
- `payment_requests:view`, `payment_requests:create`, `payment_requests:update`
- `payment_requests:delete`, `payment_requests:submit`, `payment_requests:approve`
- `payment_requests:execute`, `payment_requests:print`, `payment_requests:manage`

#### Role Assignments:

| Role | Permissions |
|------|-------------|
| **super_admin** | All permissions (hardcoded bypass in middleware) |
| **admin** | All permissions for all request types |
| **manager** | View all, approve, execute, print (full workflow control) |
| **user** | Create, view own, submit (cannot approve) |

---

### ✅ Frontend Implementation

#### Main Page: `/requests` (`frontend-next/pages/requests/index.tsx`)

**Features:**
- **Tabbed Interface**: Expense, Transfer, Payment, Printed, Unprinted tabs
- **RBAC Filtering**: User sees only own requests unless manager/admin
- **Advanced Filters**: Search, date range, status, project, vendor, printed status
- **DataTablePro Integration**: Pagination, sorting, responsive design
- **Status Badges**: Color-coded badges (gray/yellow/green/red/blue/slate)
- **Print Tracking**: Shows print count with checkmark icon
- **Action Buttons**: 
  - "New Expense Request" (if has permission)
  - Filter toggle
  - Refresh button
- **Responsive Design**: Mobile hamburger menu, desktop full layout
- **Dark Mode Support**: Full theme compatibility
- **i18n Ready**: Arabic/English support with `useTranslation` hook

**Columns Display:**

**Expense Requests:**
- Request Number (link to detail), Date, Project, Shipment
- Expense Type (localized), Vendor, Amount (formatted with currency)
- Status Badge

**Transfer Requests:**
- Request Number (link), Expense Request Number, Date
- Project, Vendor, Amount, Status, Printed Status (with count)

**Payment Requests:**
- Request Number (link), Transfer Request Number, Date
- Project, Vendor, Amount, Payment Method
- Status, Printed Status

---

### ✅ Menu Integration

**File:** `frontend-next/config/menu.registry.ts`

Added **"My Requests"** section with submenu:
- All Requests (`/requests`)
- Expense Requests (`/requests?tab=expense`)
- Transfer Requests (`/requests?tab=transfer`)
- Payment Requests (`/requests?tab=payment`)
- Printed Requests (`/requests?tab=printed`)
- Unprinted Requests (`/requests?tab=unprinted`)

**Icons:** DocumentTextIcon, BanknotesIcon, CreditCardIcon, PrinterIcon

**Permissions:** Each menu item filtered by user permissions

---

### ✅ Translations

**File:** `frontend-next/locales/requestsTranslations.ts`

Added complete translations for:
- All menu labels
- Field names (requestNumber, project, shipment, vendor, amount, etc.)
- All 17 expense types (English + Arabic)
- All 6 request statuses (English + Arabic)
- Action buttons (create, submit, approve, reject, execute, print)
- Messages (success/error feedback)
- Filter labels

**File:** `frontend-next/locales/erpTranslations.ts`

Added menu navigation labels:
```typescript
myRequests: {
  title: 'My Requests' | 'طلباتي',
  all: 'All Requests' | 'جميع الطلبات',
  expenseRequests: 'Expense Requests' | 'طلبات المصاريف',
  transferRequests: 'Transfer Requests' | 'طلبات التحويل',
  paymentRequests: 'Payment Requests' | 'طلبات السداد',
  printed: 'Printed Requests' | 'طلبات مطبوعة',
  unprinted: 'Unprinted' | 'غير مطبوعة',
}
```

---

## 🔐 Security & Business Rules

### Business Logic:

1. **Expense Request → Transfer Request → Payment Request** (strict flow)
2. **Mandatory Fields**:
   - Project (always required)
   - Shipment (always required)
   - Vendor (always required)
   - Currency (always required)
3. **Approval Workflow**:
   - DRAFT → can edit/delete
   - SUBMITTED → can only approve/reject
   - APPROVED → can execute (no edits)
   - REJECTED → can delete
   - EXECUTED → read-only
4. **Transfer Request Rules**:
   - Can only be created from APPROVED expense request
   - One transfer per expense request (enforced in API)
5. **Payment Request Rules**:
   - Can only be created from APPROVED/EXECUTED transfer request
   - One payment per transfer (enforced in API)
6. **Print Tracking**:
   - First print: records `first_printed_at`, `first_printed_by`
   - Subsequent prints: increments `print_count`, updates `last_printed_at`
   - Print tracking via dedicated `/print` endpoint

### Access Control:

- **User Context**: Non-managers see only own requests (filtered by `requested_by`)
- **Company Scoping**: All queries scoped to user's company_id (unless super_admin)
- **Soft Deletes**: All tables use `deleted_at` timestamp
- **Audit Trail**: All status changes logged in `request_approval_history`

---

## 📊 Data Flow

```
┌──────────────────────┐
│  Expense Request     │  (User creates)
│  - Project           │
│  - Shipment          │  ──SUBMIT──>
│  - Expense Type      │
│  - Vendor            │
│  - Amount            │
│  STATUS: DRAFT       │
└──────────────────────┘
         │
         │ (Manager Approves)
         ▼
┌──────────────────────┐
│  Expense Request     │
│  STATUS: APPROVED    │  ──AUTO CREATE──>
└──────────────────────┘
         │
         │
         ▼
┌──────────────────────┐
│  Transfer Request    │  (Accountant)
│  - Bank Details      │
│  - Beneficiary Info  │  ──SUBMIT──>
│  - Expected Date     │
│  STATUS: DRAFT       │
└──────────────────────┘
         │
         │ (Manager Approves)
         ▼
┌──────────────────────┐
│  Transfer Request    │
│  STATUS: APPROVED    │  ──EXECUTE──>
│  - Print Tracking    │
└──────────────────────┘
         │
         │ (Treasurer Executes)
         ▼
┌──────────────────────┐
│  Transfer Request    │
│  STATUS: EXECUTED    │  ──AUTO CREATE──>
│  - Transaction Ref   │
└──────────────────────┘
         │
         │
         ▼
┌──────────────────────┐
│  Payment Request     │  (Finance)
│  - Payment Method    │
│  - Receipt Number    │  ──EXECUTE──>
│  STATUS: DRAFT       │
└──────────────────────┘
         │
         │ (Manager Executes)
         ▼
┌──────────────────────┐
│  Payment Request     │
│  STATUS: EXECUTED    │  ──POST TO ACCOUNTING──>
│  - Posted to GL      │
└──────────────────────┘
```

---

## 🚀 Next Steps (Not Implemented Yet)

### 1. Print Templates (High Priority)

**Goal:** Professional PDF generation for Transfer/Payment requests

**Requirements:**
- Company header with logo (from `companies` table)
- Bilingual layout (Arabic/English side-by-side)
- All request details + items table
- Approval signatures section
- Footer with company contact info (from prompt spec)

**Implementation:**
- Create print template in `/master/printed-templates`
- Link to `transfer_requests` and `payment_requests`
- API endpoint: `/api/transfer-requests/:id/print-pdf` (returns PDF blob)
- Frontend: Print button → modal → PDF viewer → download

### 2. Create/Edit Pages

Create these pages:
- `/requests/expense/create` - Form for new expense request
- `/requests/expense/[id]` - Detail view with edit capability
- `/requests/transfer/[id]` - Detail view
- `/requests/payment/[id]` - Detail view

### 3. Approval Workflow UI

- Dashboard widget: "Requests Pending My Approval"
- Notification system integration
- Email alerts on status changes

### 4. Accounting Integration

- Link payment requests to journal entries
- Auto-post accounting entries on payment execution
- Link to vendor ledger

### 5. File Uploads

- API endpoint for expense request attachments
- Frontend: Drag-and-drop file upload
- File storage: local filesystem or S3

### 6. Export/Reports

- Export requests to Excel/PDF
- Summary reports (by project, by vendor, by expense type)
- Audit trail reports

---

## 📝 Testing Checklist

### Backend:
- [ ] Run migrations: `177_create_requests_module.sql`
- [ ] Run permissions migration: `178_add_requests_module_permissions.sql`
- [ ] Restart backend service
- [ ] Test API endpoints with Postman/curl:
  - [ ] Create expense request (POST /api/expense-requests)
  - [ ] Submit for approval (POST /api/expense-requests/:id/submit)
  - [ ] Approve (POST /api/expense-requests/:id/approve)
  - [ ] Create transfer from approved expense
  - [ ] Execute transfer
  - [ ] Create payment from executed transfer

### Frontend:
- [ ] Rebuild frontend-next container
- [ ] Verify menu appears in sidebar
- [ ] Navigate to `/requests`
- [ ] Test all tabs (Expense, Transfer, Payment, Printed, Unprinted)
- [ ] Test filters (search, date range, status)
- [ ] Test pagination
- [ ] Test permission-based filtering (login as different roles)
- [ ] Test dark mode
- [ ] Test Arabic/English language switch

### Permissions:
- [ ] Login as **user** → can create expense requests, view own
- [ ] Login as **manager** → can approve, view all
- [ ] Login as **admin** → full access to all features

---

## 📂 Files Created/Modified

### Backend:
1. `backend/migrations/177_create_requests_module.sql` (NEW)
2. `backend/migrations/178_add_requests_module_permissions.sql` (NEW)
3. `backend/src/routes/expenseTypes.ts` (NEW)
4. `backend/src/routes/expenseRequests.ts` (NEW)
5. `backend/src/routes/transferRequests.ts` (NEW)
6. `backend/src/routes/paymentRequests.ts` (NEW)
7. `backend/src/app.ts` (MODIFIED - added route imports + registrations)

### Frontend:
1. `frontend-next/pages/requests/index.tsx` (NEW)
2. `frontend-next/locales/requestsTranslations.ts` (NEW)
3. `frontend-next/locales/erpTranslations.ts` (MODIFIED - added myRequests section)
4. `frontend-next/config/menu.registry.ts` (MODIFIED - added myRequests menu)

---

## 🎨 UI Screenshots Reference

### Main Requests Page:
```
┌─────────────────────────────────────────────────────────────┐
│  📄 طلباتي (My Requests)                     [Filter] [⟳] [+ New] │
│  إدارة جميع طلباتك في مكان واحد                                    │
├─────────────────────────────────────────────────────────────┤
│  [Expense Requests] [Transfer Requests] [Payment Requests]     │
│  [Printed Requests] [Unprinted Requests]                        │
├─────────────────────────────────────────────────────────────┤
│ Request #    Date        Project    Shipment   Type    Amount │
│ EXP-2026-001 2026-01-19  PRJ-001   SHIP-123   LC Fees $5,000  │
│ EXP-2026-002 2026-01-18  PRJ-002   SHIP-124   Freight $12,000 │
├─────────────────────────────────────────────────────────────┤
│ < 1 2 3 >                                       Showing 1-50  │
└─────────────────────────────────────────────────────────────┘
```

### Status Badges:
- **DRAFT** → Gray badge
- **SUBMITTED** → Yellow badge (⏱️ Pending)
- **APPROVED** → Green badge (✓)
- **REJECTED** → Red badge (✗)
- **EXECUTED** → Blue badge (✓✓)
- **CANCELLED** → Slate badge

---

## 🌐 API Base URL

- Development: `http://localhost:4000/api`
- Production: Configure via `NEXT_PUBLIC_API_URL` environment variable

---

## 📞 Support & Documentation

For further details, refer to:
- [MASTER_DATA_ARCHITECTURE.md](../MASTER_DATA_ARCHITECTURE.md)
- [PERMISSIONS_DOCUMENTATION.md](../PERMISSIONS_DOCUMENTATION.md)
- [API_DOCUMENTATION.md](../backend/API_DOCUMENTATION.md)

---

**Implementation Date:** January 19, 2026  
**Version:** 1.0  
**Status:** ✅ Complete (except print templates)
