# 🔒 Phase 2: Movement Lock Rules - Testing Guide

## Overview
Phase 2 implements **critical backend validation** to enforce movement lock rules, preventing data integrity violations after items have transactions.

---

## ✅ Completed Features

### 1. **PUT Endpoint - Locked Field Validation** (`PUT /api/master/items/:id`)
- **Location**: `backend/src/routes/master/items.ts` (lines 601-677)
- **Logic**: Checks `item_has_movement(item_id)` before allowing updates
- **Locked Fields** (cannot change after first movement):
  - `base_uom_id` - Base Unit of Measure
  - `tracking_policy` - Tracking Policy (none/batch/serial/batch_expiry/serial_expiry)
  - `valuation_method` - Valuation Method (fifo/weighted_avg/specific_cost)
  - `is_composite` - Composite Item Flag (BOM enabled)

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "POLICY_LOCKED",
    "message": "Cannot modify locked fields after item has movements/transactions",
    "locked_fields": ["base_uom_id", "tracking_policy"],
    "locked_at": "2026-01-31T12:00:00.000Z",
    "hint": "These fields are locked to preserve accounting and inventory integrity"
  }
}
```

**Test Scenario**:
1. Create item with `base_uom_id = 1`, `tracking_policy = 'none'`
2. Add inventory movement (via inventory_movements or logistics_shipment_items)
3. Attempt to change `base_uom_id` to 2 → **SHOULD FAIL**
4. Attempt to change `tracking_policy` to 'batch' → **SHOULD FAIL**
5. Change `name` or `description` → **SHOULD SUCCEED** (non-locked fields)

---

### 2. **DELETE Endpoint - Movement Check** (`DELETE /api/master/items/:id`)
- **Location**: `backend/src/routes/master/items.ts` (lines 851-882)
- **Logic**: Prevents deletion if `item_has_movement(item_id) = true`

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "HAS_MOVEMENTS",
    "message": "Cannot delete item with existing movements/transactions",
    "hint": "Items with movements must remain for audit trail and accounting integrity"
  }
}
```

**Test Scenario**:
1. Create item without movements
2. Delete item → **SHOULD SUCCEED**
3. Restore item
4. Add inventory movement
5. Attempt to delete → **SHOULD FAIL with HAS_MOVEMENTS error**

---

### 3. **List Endpoint - has_movement Column** (`GET /api/master/items`)
- **Location**: `backend/src/routes/master/items.ts` (lines 31-65)
- **Enhancement**: Added `item_has_movement(i.id) as has_movement` to SELECT
- **Purpose**: Frontend can check lock status without additional API calls

**Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "ITEM001",
      "name": "Test Item",
      "has_movement": true,  // 🔒 Locked - cannot edit policies
      "tracking_policy": "batch",
      "valuation_method": "fifo",
      ...
    }
  ]
}
```

**Test Scenario**:
1. GET /api/master/items
2. Verify `has_movement` column present for all items
3. Items with movements should show `has_movement: true`
4. Items without movements should show `has_movement: false`

---

### 4. **Deprecated Endpoint** (`GET /api/master/items/:id/has-movement`)
- **Location**: `backend/src/routes/master/items.ts` (lines 1177-1214)
- **Status**: ⚠️ **DEPRECATED** - Kept for backward compatibility only
- **Replacement**: Use `/full-profile` or list endpoint instead

**Deprecation Warning in Response**:
```json
{
  "success": true,
  "data": {
    "has_movement": true,
    "locked": true
  },
  "_deprecated": true,
  "_message": "This endpoint is deprecated. Use GET /items/:id/full-profile instead."
}
```

**Action Required**: Frontend should migrate to `/full-profile` or list endpoint

---

### 5. **Hierarchical Groups - Reparenting Lock** (`PUT /api/master/item-groups/:id`)
- **Location**: `backend/src/routes/master/itemGroups.ts` (lines 253-310)
- **Logic**: Prevents changing `parent_id` if group has items assigned

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "HAS_ITEMS_CANNOT_REPARENT",
    "message": "Cannot change parent group when items are assigned to this group",
    "hint": "Remove all item assignments before changing the group hierarchy",
    "item_count": 5
  }
}
```

**Checks Both**:
- Legacy: `items.group_id` (single group assignment)
- New: `item_group_assignments` (multi-group assignments)

**Test Scenario**:
1. Create parent group A, child group B (parent_id = A)
2. Assign 3 items to group B
3. Attempt to change B's parent_id to group C → **SHOULD FAIL**
4. Remove all item assignments from group B
5. Change B's parent_id to C → **SHOULD SUCCEED**

---

### 6. **Hierarchical Groups - Deletion Validation** (`DELETE /api/master/item-groups/:id`)
- **Location**: `backend/src/routes/master/itemGroups.ts` (lines 450-490)
- **Enhanced**: Now checks both legacy and new assignment tables

**Prevents Deletion If**:
- Group has child groups (`parent_group_id = this_id`)
- Group has items via `items.group_id` (legacy)
- Group has items via `item_group_assignments` (new multi-group)

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "HAS_ITEMS",
    "message": "Cannot delete group with associated items",
    "item_count": 12
  }
}
```

**Test Scenario**:
1. Create group with 5 items assigned
2. Attempt to delete → **SHOULD FAIL with item_count: 5**
3. Remove all items
4. Delete group → **SHOULD SUCCEED**

---

## 🧪 Manual Testing Checklist

### Items Movement Lock
- [ ] Create item → add movement → attempt base_uom change (should fail)
- [ ] Create item → add movement → attempt tracking_policy change (should fail)
- [ ] Create item → add movement → attempt valuation_method change (should fail)
- [ ] Create item → add movement → attempt is_composite change (should fail)
- [ ] Create item → add movement → change name/description (should succeed)
- [ ] Create item → add movement → attempt deletion (should fail)
- [ ] Create item without movement → delete (should succeed)

### List Endpoint
- [ ] GET /items → verify has_movement column present
- [ ] Item with movements → has_movement: true
- [ ] Item without movements → has_movement: false

### Hierarchical Groups
- [ ] Create group with items → change parent_id (should fail)
- [ ] Create group with items → delete (should fail)
- [ ] Create group with children → delete (should fail)
- [ ] Empty group → delete (should succeed)

### Error Handling
- [ ] Verify all error responses have proper code, message, hint
- [ ] Verify HTTP status codes (400 for validation, 404 for not found)
- [ ] Check backend logs for any uncaught errors

---

## 📊 Database Functions Used

### `item_has_movement(p_item_id INT)`
- **Returns**: BOOLEAN
- **Logic**: Checks existence in `inventory_movements` OR `logistics_shipment_items`
- **Location**: Created by migration `189_items_enterprise_enhancements.sql`
- **Test Query**:
```sql
SELECT item_id, code, item_has_movement(id) as has_movement
FROM items
WHERE deleted_at IS NULL
ORDER BY code
LIMIT 10;
```

---

## 🔄 Migration Status

**Migration**: `189_items_enterprise_enhancements.sql`
- **Status**: ✅ Applied successfully (269ms execution time)
- **Applied**: 2026-01-31 11:59:08
- **Function**: `item_has_movement()` created
- **View**: `v_items_stock_summary` created
- **Tables**: `item_group_assignments`, `item_warehouses`, `item_batches`, `item_serials`, `item_bom`, `item_change_log`

---

## 🚫 What's NOT Locked (Editable After Movements)

These fields can always be changed, even after movements:
- `code`, `name`, `name_ar`, `description`
- `category_id`, `group_id`, `brand_id`
- `is_purchasable`, `is_sellable`, `is_stockable`
- `min_stock_level`, `max_stock_level`, `reorder_level`, `reorder_qty`
- `standard_cost`, `last_purchase_cost`, `average_cost` (updated by system)
- `base_selling_price`, `min_selling_price`, `max_discount_percent`
- `weight`, `length`, `width`, `height`, `volume`
- `hs_code`, `country_of_origin`
- `sales_account_id`, `cogs_account_id`, `inventory_account_id`, etc. (GL accounts)
- `tax_type_id`, `is_tax_inclusive`
- `image_url`, `is_active`
- `default_vendor_id`, `manufacturer`, `warranty_months`
- `tags`, `specifications`, `additional_images`

---

## 🎯 Next Steps (Phase 1.4 - UI Integration)

**After Phase 2 Testing Completes**:
1. Update frontend `ItemProfileSlideOver.tsx`:
   - Show lock icon on locked fields if `has_movement = true`
   - Disable locked fields in edit mode
   - Display tooltip: "Field locked after movements exist"
   
2. Update items list page:
   - Add lock icon column for `has_movement = true` items
   - Integrate `ItemProfileSlideOver` component
   - Add "View Profile" button/click handler
   
3. Update item edit form:
   - Fetch `has_movement` status
   - Disable base_uom, tracking_policy, valuation_method, is_composite if locked
   - Show warning banner: "⚠️ Some fields are locked due to existing movements"
   
4. Handle API errors:
   - Catch `POLICY_LOCKED` error code
   - Display user-friendly message with locked field list
   - Prevent form submission if locked fields changed

---

## 🔐 ERP Best Practices Enforced

✅ **Accounting Integrity**: Cannot change valuation method after movements (prevents financial misstatements)  
✅ **Inventory Integrity**: Cannot change base UOM after stock transactions (prevents quantity inconsistencies)  
✅ **Traceability**: Cannot change tracking policy after batch/serial numbers assigned  
✅ **Audit Trail**: Cannot delete items with movements (maintains historical data)  
✅ **Hierarchical Consistency**: Cannot reparent groups with items (prevents orphaned assignments)  
✅ **Referential Integrity**: Cannot delete groups with children or items  

---

## 📝 Code Review Checklist

- [x] Movement lock validation in PUT endpoint
- [x] Movement lock validation in DELETE endpoint
- [x] Hierarchical groups reparenting validation
- [x] Hierarchical groups deletion validation (both tables)
- [x] has_movement added to list endpoint
- [x] Deprecated endpoint marked with warning
- [x] Error responses structured with code/message/hint
- [x] Transaction checks use `item_has_movement()` function (computed, not stored)
- [x] All validations use company_id for multi-tenancy
- [x] Soft deletes respected (deleted_at IS NULL)

---

## 🐛 Known Limitations

1. **Performance**: `item_has_movement()` queries two tables per item in list endpoint
   - **Mitigation**: Consider adding indexed computed column if list becomes slow
   - **Threshold**: Monitor if item list > 1000 items

2. **Legacy Data**: Existing items without movements can still change policies
   - **Expected Behavior**: Only locks after FIRST movement

3. **Restore After Delete**: Restored items retain their movement history
   - **Expected Behavior**: `has_movement` will be true for restored items

---

## 📞 Support & Troubleshooting

**If Movement Lock Fails**:
1. Check `item_has_movement(item_id)` directly:
   ```sql
   SELECT item_has_movement(123);
   ```
2. Verify movements exist:
   ```sql
   SELECT COUNT(*) FROM inventory_movements WHERE item_id = 123;
   SELECT COUNT(*) FROM logistics_shipment_items WHERE item_id = 123;
   ```
3. Check backend logs for validation errors
4. Verify migration 189 applied successfully

**If Group Validation Fails**:
1. Check item assignments:
   ```sql
   SELECT COUNT(*) FROM items WHERE group_id = 456 AND deleted_at IS NULL;
   SELECT COUNT(*) FROM item_group_assignments WHERE group_id = 456 AND deleted_at IS NULL;
   ```
2. Check child groups:
   ```sql
   SELECT * FROM item_groups WHERE parent_group_id = 456 AND deleted_at IS NULL;
   ```

---

**Phase 2 Status**: ✅ **COMPLETE** - Ready for Phase 1.4 UI Integration

**Testing Status**: ⏳ **PENDING** - Requires manual testing before UI work

**Estimated Testing Time**: 30-45 minutes
