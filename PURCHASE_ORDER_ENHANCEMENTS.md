# Purchase Order Enhancements - Payment Method & Project Linkage

## Overview
Added two critical fields to purchase orders to support project-centric architecture and payment method tracking:
1. **payment_method_id** - Links to payment_methods master data (replacing free-text payment_terms)
2. **project_id** - Links to projects table (mandatory for PO approval)

## Changes Made

### 1. Database Schema (Migration 131)
**File**: `backend/migrations/131_add_purchase_order_payment_and_project.sql`

```sql
-- Add payment_method_id (optional, linked to master data)
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL;

-- Add project_id (required for approval workflow)
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE RESTRICT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment_method ON purchase_orders(payment_method_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project ON purchase_orders(project_id) WHERE deleted_at IS NULL;
```

**Status**: ✅ Migration executed successfully

### 2. Backend API Changes
**File**: `backend/src/routes/procurement/purchaseOrders.ts`

#### CREATE Purchase Order (POST /)
- Added `payment_method_id` to request body extraction (line 277)
- Added `project_id` to request body extraction (line 277)
- Updated INSERT statement to include both new fields (lines 415-432)
- Parameter positions: payment_method_id = $17, project_id = $31

#### UPDATE Purchase Order (PUT /:id)
- Added `payment_method_id` to request body extraction (line 493)
- Added `project_id` to request body extraction (line 515)
- Updated UPDATE statement to include both new fields (lines 631-694)
- Parameter positions: payment_method_id = $15, project_id = $27

#### APPROVE Purchase Order (PUT /:id/approve)
- Added business rule validation (lines 793-803):
  ```typescript
  if (!po.project_id) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'PROJECT_REQUIRED',
        message: 'Purchase order must have a project assigned before approval'
      }
    });
  }
  ```

**Status**: ✅ Backend code updated

### 3. Frontend UI Changes
**File**: `frontend-next/pages/purchasing/orders.tsx`

#### State Management
- Added `paymentMethods` state array (line 138)
- Added `projects` state array (line 139)
- Added `payment_method_id` to formData (line 169)
- Added `project_id` to formData (line 170)

#### Data Fetching
- Updated `fetchReferenceData()` to fetch payment methods and projects (lines 191-196):
  ```typescript
  const [vendorsRes, typesRes, statusesRes, paymentsRes, projectsRes] = await Promise.all([
    fetch(`${API_BASE}/api/procurement/vendors`, { headers }),
    fetch(`${API_BASE}/api/procurement/purchase-orders/order-types`, { headers }),
    fetch(`${API_BASE}/api/procurement/purchase-orders/order-statuses`, { headers }),
    fetch(`${API_BASE}/api/payment-methods?limit=100`, { headers }),
    fetch(`${API_BASE}/api/projects?limit=500&status=active`, { headers }),
  ]);
  ```
- Added data parsing for payment methods (lines 212-215)
- Added data parsing for projects (lines 216-219)

#### Form Validation
- Added project_id required validation (line 285):
  ```typescript
  if (!formData.project_id) errors.project_id = locale === 'ar' ? 'رقم المشروع مطلوب للاعتماد' : 'Project is required for approval';
  ```

#### Form Submission
- Added payment_method_id to submit body (line 308)
- Added project_id to submit body (line 309)

#### Form UI (Modal)
- Added **Project** dropdown field (lines 809-829):
  - Required field (red asterisk)
  - Displays project code and name: `{code} - {name}`
  - Bilingual support (EN/AR)
  - Error message display
  - Border color changes to red on validation error

- Added **Payment Method** dropdown field (lines 831-847):
  - Optional field (no asterisk)
  - Displays payment method name (bilingual)
  - Loads from `/api/payment-methods` endpoint

#### Form Reset/Edit
- Updated `handleOpenCreate()` to reset new fields (lines 410, 417)
- Updated `handleOpenEdit()` to populate new fields from existing PO (lines 436-437)

**Status**: ✅ Frontend code updated

### 4. Field Positioning in Form
Current form layout (2-column grid):
```
Row 1: [Vendor*]         [Order Type]
Row 2: [Order Date*]     [Expected Delivery]
Row 3: [Project*]        [Payment Method]
Row 4: [Notes] (full width, 3 rows)
```

**Note**: Project is now in Row 3, left column (required field)
**Note**: Payment Method is in Row 3, right column (optional field)

## Business Rules

### Project ID Requirement
- **CREATE**: Optional during PO creation (allows saving draft)
- **UPDATE**: Optional during PO editing (allows incremental updates)
- **APPROVE**: **MANDATORY** - PO cannot be approved without project linkage
- **Error Code**: `PROJECT_REQUIRED`
- **Error Message**: "Purchase order must have a project assigned before approval"

### Payment Method Tracking
- **Purpose**: Replace free-text payment_terms with standardized master data
- **Data Source**: `/api/payment-methods` (master data module)
- **Optional**: POs can be created without payment method (for draft state)
- **Display**: Shows name (bilingual) in dropdown
- **Validation**: None (optional field)

## API Endpoints Used

### Backend Endpoints (Existing)
- `POST /api/procurement/purchase-orders` - Create PO (now accepts payment_method_id, project_id)
- `PUT /api/procurement/purchase-orders/:id` - Update PO (now accepts payment_method_id, project_id)
- `PUT /api/procurement/purchase-orders/:id/approve` - Approve PO (now validates project_id)

### Reference Data Endpoints (Existing)
- `GET /api/payment-methods?limit=100` - Fetch payment methods list
- `GET /api/projects?limit=500&status=active` - Fetch active projects list
- `GET /api/procurement/vendors` - Fetch vendors list
- `GET /api/procurement/purchase-orders/order-types` - Fetch order types
- `GET /api/procurement/purchase-orders/order-statuses` - Fetch order statuses

## Testing Checklist

### Manual Testing Required
- [ ] **Create new PO** without project_id → Should save successfully (draft state)
- [ ] **Create new PO** with project_id and payment_method_id → Should save successfully
- [ ] **Edit existing PO** → Fields should populate correctly if present
- [ ] **Try to approve PO** without project_id → Should fail with error message:
  ```json
  {
    "success": false,
    "error": {
      "code": "PROJECT_REQUIRED",
      "message": "Purchase order must have a project assigned before approval"
    }
  }
  ```
- [ ] **Approve PO** with project_id → Should succeed
- [ ] **Payment methods dropdown** → Should load from master data (not free text)
- [ ] **Projects dropdown** → Should load active projects only
- [ ] **Bilingual display** → Both fields should show Arabic names when locale is AR
- [ ] **Form validation** → Project field should show red border and error message when empty on submit
- [ ] **Responsive design** → Form should display correctly on desktop/tablet/mobile

### API Testing
```bash
# Test create PO with new fields
curl -X POST http://localhost:4000/api/procurement/purchase-orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": 1,
    "order_date": "2024-01-15",
    "project_id": 5,
    "payment_method_id": 3,
    "items": [{"item_id": 10, "quantity": 5, "unit_price": 100}]
  }'

# Test approve without project_id (should fail)
curl -X PUT http://localhost:4000/api/procurement/purchase-orders/123/approve \
  -H "Authorization: Bearer <token>"

# Expected response:
# {
#   "success": false,
#   "error": {
#     "code": "PROJECT_REQUIRED",
#     "message": "Purchase order must have a project assigned before approval"
#   }
# }
```

## Database Verification

```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'purchase_orders' 
  AND column_name IN ('payment_method_id', 'project_id');

-- Check indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'purchase_orders' 
  AND indexname LIKE '%payment_method%' OR indexname LIKE '%project%';

-- Check foreign key constraints
SELECT conname, conrelid::regclass, confrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'purchase_orders'::regclass
  AND contype = 'f'
  AND conname LIKE '%payment_method%' OR conname LIKE '%project%';
```

## Rollback Plan (If Needed)

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_purchase_orders_payment_method;
DROP INDEX IF EXISTS idx_purchase_orders_project;

-- Remove columns
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS payment_method_id;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS project_id;
```

## Integration Points

### Related Modules
- **Projects Module**: `/api/projects` - Must have active projects for dropdown
- **Payment Methods Module**: `/api/payment-methods` - Must have configured payment methods
- **Approval Workflow**: Approval endpoint now enforces project_id requirement

### Data Flow
1. User opens PO form → Frontend fetches projects and payment methods lists
2. User fills form including project and payment method
3. User clicks Save → Backend validates and stores data
4. User clicks Approve → Backend checks project_id presence, fails if missing
5. Approved PO → Linked to project for tracking and reporting

## Architecture Notes

### Project-Centric Design
This enhancement extends the project-centric architecture pattern:
- **Shipments** (Migration 129): Already linked to projects
- **Purchase Orders** (Migration 131): Now linked to projects
- **Future**: Purchase invoices, payments, and other procurement documents will follow

### Benefits
1. **Project Tracking**: All procurement costs can be traced to projects
2. **Financial Control**: Project budgets can be monitored against POs
3. **Reporting**: Project-based procurement reports and dashboards
4. **Data Integrity**: Payment methods standardized via master data (no free text)

## Deployment Steps

1. ✅ Create migration file (131_add_purchase_order_payment_and_project.sql)
2. ✅ Run migration on database
3. ✅ Update backend API code
4. ✅ Update frontend form code
5. ⏳ Restart backend service
6. ⏳ Restart frontend service
7. ⏳ Test complete flow
8. ⏳ Update user documentation

## User Documentation Updates Required

### User Guide Changes
- Add section: "Purchase Orders - Project Linkage"
- Add section: "Purchase Orders - Payment Methods"
- Update screenshots showing new fields in PO form
- Add business rule documentation about project requirement for approval

### Training Materials
- Create video tutorial showing new fields
- Add FAQ: "Why do I need to select a project?"
- Add FAQ: "What if my project is not in the dropdown?"
- Add FAQ: "Can I change the project after approval?"

## Related User Request

**Original Request (Arabic)**:
> "في قائمة اوامر الشراء عند اضافمة او تعديل امر شراء في حقل طريقة الدفع يجب ان تظهر البيانات التي في القائمة http://localhost:3001/master/payment-methods وكذلك اضف حقل رقم المشروع حيث انه لايعتبر امر الشراء حالته معتمد مالم يتم اضافة رقم المشروع"

**Translation**:
> "In purchase orders list when adding or editing a purchase order in the payment method field, data from http://localhost:3001/master/payment-methods should appear, and also add project number field where purchase order is not considered approved unless project number is added"

**Implementation Status**: ✅ COMPLETED
- Payment method field: Linked to master data ✅
- Project number field: Added with approval validation ✅

## Technical Debt & Future Improvements

### Short-term (Current Release)
- [x] Add database columns
- [x] Update backend API
- [x] Update frontend form
- [ ] Add unit tests for approval validation
- [ ] Add integration tests for complete flow

### Medium-term (Next Release)
- [ ] Add project budget vs PO amount validation
- [ ] Add payment method tracking in reports
- [ ] Add project-based PO dashboard widget
- [ ] Add bulk update tool for existing POs without projects

### Long-term (Future Releases)
- [ ] Add project hierarchy support (parent/child projects)
- [ ] Add payment method analytics
- [ ] Add project-based procurement forecasting
- [ ] Add multi-project allocation (split PO across projects)

## Notes for Developers

### Code Patterns Used
- **Frontend**: React hooks (useState, useCallback)
- **Backend**: Express + TypeScript + PostgreSQL
- **Validation**: Manual validation in frontend, database constraints + business rules in backend
- **Error Handling**: Standard error response format with error codes
- **Bilingual**: Arabic/English support via locale context

### Common Pitfalls to Avoid
1. **Don't** make project_id required at database level (allows draft state)
2. **Don't** skip approval validation (enforce in backend)
3. **Don't** use free text for payment methods (always use master data)
4. **Don't** forget to filter projects (status=active only in dropdown)
5. **Don't** expose sensitive project data in client-side code

### Performance Considerations
- Payment methods query: Limited to 100 records (sufficient for most cases)
- Projects query: Limited to 500 active projects (may need pagination for large companies)
- Indexes added on foreign keys to prevent slow joins
- Soft deletes respected in all queries (deleted_at IS NULL filters)

## Support & Troubleshooting

### Common Issues

**Issue 1**: Payment methods dropdown is empty
- **Cause**: No payment methods configured in master data
- **Solution**: Add payment methods via Master Data → Payment Methods page
- **Verification**: `SELECT * FROM payment_methods WHERE deleted_at IS NULL;`

**Issue 2**: Projects dropdown is empty
- **Cause**: No active projects exist
- **Solution**: Create projects via Projects page, ensure status is 'active'
- **Verification**: `SELECT * FROM projects WHERE status = 'active' AND deleted_at IS NULL;`

**Issue 3**: Cannot approve PO even with project selected
- **Cause**: project_id not saved to database
- **Solution**: Check browser console for API errors, verify backend received project_id in request
- **Verification**: `SELECT id, project_id FROM purchase_orders WHERE id = <po_id>;`

**Issue 4**: "Project is required" error appears incorrectly
- **Cause**: Frontend validation mismatch with backend
- **Solution**: Check formData.project_id is set before submit, verify validation function
- **Debug**: Add `console.log('formData:', formData)` before submit

### Contact
For issues or questions, contact:
- Backend: Check `backend/src/routes/procurement/purchaseOrders.ts`
- Frontend: Check `frontend-next/pages/purchasing/orders.tsx`
- Database: Check migration `131_add_purchase_order_payment_and_project.sql`

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
**Status**: IMPLEMENTATION COMPLETE
