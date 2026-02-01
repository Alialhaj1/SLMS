# 🛈 Items Module - Tooltips & Alerts Specification

**Purpose**: Comprehensive specification for all tooltips, alerts, and notifications in Items module.

**Last Updated**: January 31, 2026

---

## 📍 1. Lock Icon Tooltips

### Policy Fields (Locked State)

#### Base Unit of Measure 🔒

**Trigger**: Hover over lock icon next to "Base Unit" label  
**Context**: Item has inventory movements  
**Tooltip Text**:
```
🔒 Locked after first inventory movement

This field cannot be changed because the item has 
inventory movements. Changing the base unit would 
invalidate existing stock records and accounting entries.

Contact system administrator if changes are required.
```

**Tooltip Position**: Top-center  
**Delay**: 300ms  
**Max Width**: 280px  

---

#### Tracking Policy 🔒

**Trigger**: Hover over lock icon next to "Tracking Policy" label  
**Context**: Item has inventory movements  
**Tooltip Text**:
```
🔒 Locked after first inventory movement

This field cannot be changed because the item has 
batch/serial tracking records. Changing the tracking 
policy would corrupt existing traceability data.

Contact system administrator if changes are required.
```

**Tooltip Position**: Top-center  
**Delay**: 300ms  

---

#### Valuation Method 🔒

**Trigger**: Hover over lock icon next to "Valuation Method" label  
**Context**: Item has inventory movements  
**Tooltip Text**:
```
🔒 Locked after first inventory movement

This field cannot be changed because the item has 
financial transactions. Changing the valuation method 
(FIFO, Weighted Average, etc.) would invalidate 
existing cost calculations.

Contact system administrator if changes are required.
```

**Tooltip Position**: Top-center  
**Delay**: 300ms  

---

#### Composite Item Flag 🔒

**Trigger**: Hover over lock icon next to "Is Composite" checkbox  
**Context**: Item has inventory movements  
**Tooltip Text**:
```
🔒 Locked after first inventory movement

This field cannot be changed because the item has 
existing BOM (Bill of Materials) and production records. 
Changing composite status would invalidate manufacturing 
history.

Contact system administrator if changes are required.
```

**Tooltip Position**: Top-center  
**Delay**: 300ms  

---

## 🎯 2. Badge Tooltips

### FIFO Badge

**Trigger**: Hover over "FIFO" badge  
**Tooltip Text**:
```
First In, First Out

Items are costed and issued based on the order they 
were received. The oldest stock is consumed first.

This valuation method is locked after first movement.
```

**Color**: Blue (#3B82F6)  
**Position**: Top  

---

### Weighted Average Badge

**Trigger**: Hover over "WEIGHTED AVG" badge  
**Tooltip Text**:
```
Weighted Average Costing

Item cost is calculated as the average cost of all 
units in stock, weighted by quantity.

This valuation method is locked after first movement.
```

**Color**: Purple (#A855F7)  
**Position**: Top  

---

### Batch Tracking Badge

**Trigger**: Hover over "BATCH" badge  
**Tooltip Text**:
```
Batch Tracking Enabled

Items are tracked by batch number. Each batch has:
• Unique batch ID
• Manufacturing date
• Expiry date (optional)
• Supplier reference

This tracking policy is locked after first movement.
```

**Color**: Orange (#F97316)  
**Position**: Top  

---

### Serial Tracking Badge

**Trigger**: Hover over "SERIAL" badge  
**Tooltip Text**:
```
Serial Number Tracking Enabled

Each individual item has a unique serial number 
for full traceability.

Ideal for high-value or warranty-tracked items.

This tracking policy is locked after first movement.
```

**Color**: Yellow (#EAB308)  
**Position**: Top  

---

### Composite Badge

**Trigger**: Hover over "COMPOSITE" badge  
**Tooltip Text**:
```
Composite Item (BOM)

This item is assembled from multiple components.

View the BOM tab to see component breakdown.

Composite status is locked after first movement.
```

**Color**: Green (#10B981)  
**Position**: Top  

---

## ⚠️ 3. Warning Banners

### Policy Locked Banner (Item Profile)

**Trigger**: Displayed when `item.has_movement === true`  
**Location**: Top of Overview tab, below header  
**Banner Type**: Warning (yellow)  
**Text**:
```
⚠️ Policy fields are locked due to existing inventory movements

Base unit, tracking policy, valuation method, and composite status 
cannot be modified to preserve data integrity and accounting accuracy.

Contact system administrator if changes are required.
```

**Actions**: 
- Button: "View Movement History" → Opens Movements tab  
- Button: "Contact Admin" → Opens help request form  

**Dismissible**: No (always visible when locked)  

---

### Missing GL Accounts Banner

**Trigger**: Displayed when stockable item has no `inventory_account_id` or `cogs_account_id`  
**Location**: Top of Overview tab  
**Banner Type**: Error (red)  
**Text**:
```
❌ Missing GL Accounts - Journal Entries Cannot Be Created

This stockable item requires:
• Inventory Asset Account
• Cost of Goods Sold (COGS) Account

Assign GL accounts in the Accounting tab to enable financial transactions.
```

**Actions**: 
- Button: "Assign Accounts Now" → Opens GL account assignment modal  

**Dismissible**: No (critical issue)  

---

### No Warehouses Assigned Banner

**Trigger**: Displayed when stockable item has zero warehouses  
**Location**: Top of Warehouses tab  
**Banner Type**: Warning (yellow)  
**Text**:
```
⚠️ No warehouses assigned to this item

Stockable items should have at least one warehouse assigned 
for inventory movements. Add warehouses below.
```

**Actions**: 
- Button: "Assign Warehouse" → Opens warehouse assignment form  

**Dismissible**: Yes (non-critical)  

---

### Zero Stock Warning

**Trigger**: Displayed when item is active but `qty_on_hand = 0` across all warehouses  
**Location**: Top of Overview tab  
**Banner Type**: Info (blue)  
**Text**:
```
ℹ️ Item has zero stock across all warehouses

Consider creating a purchase order or performing a stock adjustment.
```

**Actions**: 
- Button: "Create Purchase Order" → Opens PO creation  
- Button: "Stock Adjustment" → Opens adjustment form  

**Dismissible**: Yes  

---

## 🔔 4. Toast Notifications

### Successful Edit (Without Locked Fields)

**Trigger**: PUT `/api/master/items/:id` returns 200  
**Type**: Success (green)  
**Duration**: 4 seconds  
**Text**:
```
✅ Item updated successfully
```

---

### Blocked Edit (Locked Fields)

**Trigger**: PUT `/api/master/items/:id` returns 409 with `POLICY_LOCKED` error  
**Type**: Error (red)  
**Duration**: 8 seconds (longer to ensure user reads)  
**Text**:
```
❌ Cannot update item: Policy fields are locked

The following fields cannot be changed after first movement:
• Base Unit: Piece → Kilogram (attempted change)
• Tracking Policy: None → Batch (attempted change)

Contact system administrator if changes are required.
```

**Actions**: 
- Button: "View Audit Log" → Opens audit trail  

---

### Delete Blocked (Has Movements)

**Trigger**: DELETE `/api/master/items/:id` returns 409 with `HAS_MOVEMENTS` error  
**Type**: Error (red)  
**Duration**: 8 seconds  
**Text**:
```
❌ Cannot delete item: Has existing inventory movements

Item ITEM-001 has 47 inventory movements and cannot be deleted.

Consider archiving or deactivating instead.
```

**Actions**: 
- Button: "Archive Item" → Changes lifecycle_state to archived  
- Button: "Deactivate" → Sets is_active = false  

---

### Group Reparenting Blocked

**Trigger**: PUT `/api/master/item-groups/:id` returns 409 with `HAS_ITEMS_CANNOT_REPARENT` error  
**Type**: Error (red)  
**Duration**: 8 seconds  
**Text**:
```
❌ Cannot move group: Contains 23 items

Group "Electronics" has 23 assigned items and cannot be moved 
to a different parent group.

Remove items from this group first, or contact administrator.
```

**Actions**: 
- Button: "View Assigned Items" → Opens items list filtered by group  

---

### Successful Archive

**Trigger**: Item lifecycle_state changed to 'archived'  
**Type**: Success (green)  
**Duration**: 5 seconds  
**Text**:
```
✅ Item archived successfully

Item ITEM-001 has been moved to archive. It will no longer 
appear in active item lists but all historical data is preserved.
```

**Actions**: 
- Button: "Undo" → Restores to previous lifecycle_state  

---

### Diagnostics Alert (Critical)

**Trigger**: Item fails critical diagnostics check (e.g., missing GL accounts)  
**Type**: Error (red)  
**Duration**: 10 seconds  
**Text**:
```
❌ Critical configuration issue detected

Item ITEM-001 is missing GL accounts. Journal entries 
cannot be created for this item.

Fix this issue immediately to prevent transaction errors.
```

**Actions**: 
- Button: "Fix Now" → Opens GL account assignment  
- Button: "View Diagnostics" → Opens Diagnostics tab  

---

### Diagnostics Warning (Non-Critical)

**Trigger**: Item fails non-critical diagnostics check (e.g., zero stock)  
**Type**: Warning (yellow)  
**Duration**: 6 seconds  
**Text**:
```
⚠️ Item has zero stock across all warehouses

Consider reordering or deactivating if no longer needed.
```

**Actions**: 
- Button: "Dismiss"  

---

## 🎨 5. Diagnostic Tab Alerts

### Critical Alert (Missing GL Accounts)

**Icon**: ❌ (red)  
**Severity**: CRITICAL  
**Title**: Missing GL Accounts  
**Description**:
```
Stockable items require Inventory Asset Account and 
Cost of Goods Sold (COGS) Account for journal entries.

Without these accounts:
• Purchase receipts cannot generate accounting entries
• Sales issues will not update COGS
• Stock adjustments will fail
```

**Actions**:
- Primary Button: "Assign GL Accounts" → Opens modal  

---

### Warning Alert (No Warehouses)

**Icon**: ⚠️ (yellow)  
**Severity**: WARNING  
**Title**: No Assigned Warehouses  
**Description**:
```
Stockable items should have at least one warehouse 
assigned for inventory movements.

This may cause issues during:
• Stock receipts (no default location)
• Inventory adjustments
• Stock transfers
```

**Actions**:
- Primary Button: "Assign Warehouse" → Opens form  

---

### Info Alert (Zero Stock)

**Icon**: ℹ️ (blue)  
**Severity**: INFO  
**Title**: Zero Stock Level  
**Description**:
```
Item is active but has no stock in any warehouse.

Consider:
• Creating a purchase order if reorder is needed
• Performing a stock adjustment for physical count
• Deactivating if item is no longer in use
```

**Actions**:
- Button: "View Reorder History"  
- Button: "Create Purchase Order"  

---

### Success Alert (All Checks Passed)

**Icon**: ✅ (green)  
**Severity**: SUCCESS  
**Title**: All Checks Passed  
**Description**:
```
No issues found with:
✓ Tracking policy configuration
✓ Valuation method setup
✓ BOM structure (if composite)
✓ GL account assignments
✓ Warehouse assignments
```

**Actions**: None  

---

## 📊 6. Keyboard Shortcut Tooltips

### Item Row (List View)

**Trigger**: Hover over item row  
**Tooltip Text** (if user has permission):
```
Click to view details | Alt+I to open profile
```

**Tooltip Position**: Bottom  
**Delay**: 500ms  

---

### Search Bar

**Trigger**: Focus on search input  
**Tooltip Text**:
```
Alt+F to focus search | Type to filter items
```

**Tooltip Position**: Bottom  
**Delay**: 300ms  

---

### Create Button

**Trigger**: Hover over "Create Item" button  
**Tooltip Text**:
```
Alt+N to create new item
```

**Tooltip Position**: Bottom  
**Delay**: 500ms  

---

## 🔐 7. Permission-Based Tooltips

### Edit Button (No Permission)

**Trigger**: User lacks `master:items:edit` permission  
**Tooltip Text**:
```
🔒 Insufficient permissions

You do not have permission to edit items.

Contact your system administrator to request access.
```

**Button State**: Disabled (grayed out)  
**Tooltip Position**: Top  

---

### Delete Button (No Permission)

**Trigger**: User lacks `master:items:delete` permission  
**Tooltip Text**:
```
🔒 Insufficient permissions

You do not have permission to delete items.

Contact your system administrator to request access.
```

**Button State**: Disabled (grayed out)  
**Tooltip Position**: Top  

---

### Edit Locked Policy (No Permission)

**Trigger**: User lacks `master:items:edit_policies` permission + item has movements  
**Tooltip Text**:
```
🔒 Double-locked

This field is locked because:
1. Item has inventory movements
2. You lack "Edit Locked Policies" permission

Only super admins can override policy locks.
```

**Field State**: Disabled (double-grayed)  
**Tooltip Position**: Top  

---

## 🎯 8. Component Implementation

### Tooltip Component

**File**: `components/ui/Tooltip.tsx`

```typescript
interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number; // in milliseconds
  maxWidth?: number; // in pixels
}

export const Tooltip = ({ 
  children, 
  content, 
  position = 'top', 
  delay = 300,
  maxWidth = 280 
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div 
          className={cn(
            'absolute z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded shadow-lg',
            'whitespace-pre-line', // Preserve line breaks
            position === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
            position === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
            position === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
            position === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2'
          )}
          style={{ maxWidth: `${maxWidth}px` }}
        >
          {content}
          
          {/* Arrow */}
          <div 
            className={cn(
              'absolute w-2 h-2 bg-gray-900 transform rotate-45',
              position === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
              position === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
              position === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
              position === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2'
            )}
          />
        </div>
      )}
    </div>
  );
};
```

---

### Alert Component

**File**: `components/ui/Alert.tsx`

```typescript
interface AlertProps {
  severity: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description: string | React.ReactNode;
  actions?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const Alert = ({ 
  severity, 
  title, 
  description, 
  actions,
  dismissible = false,
  onDismiss 
}: AlertProps) => {
  const config = {
    success: { icon: '✅', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
    info: { icon: 'ℹ️', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
    warning: { icon: '⚠️', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
    error: { icon: '❌', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  }[severity];

  return (
    <div className={cn('rounded-lg border p-4', config.bg, config.border)}>
      <div className="flex items-start">
        <span className="text-2xl mr-3">{config.icon}</span>
        
        <div className="flex-1">
          <h3 className={cn('font-semibold mb-1', config.text)}>
            {title}
          </h3>
          <div className={cn('text-sm', config.text)}>
            {description}
          </div>
          
          {actions && (
            <div className="mt-3 flex gap-2">
              {actions}
            </div>
          )}
        </div>
        
        {dismissible && (
          <button
            onClick={onDismiss}
            className={cn('ml-auto text-xl', config.text, 'hover:opacity-70')}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
```

---

## ✅ Implementation Checklist

### Phase 3.6 - Tooltips
- [ ] Create `Tooltip` component with delay/position support
- [ ] Add lock icon tooltips to all policy fields
- [ ] Add badge tooltips (FIFO, Batch, Serial, Composite)
- [ ] Add keyboard shortcut tooltips
- [ ] Add permission-based tooltips for disabled actions
- [ ] Test tooltip positioning (viewport edge detection)

### Phase 3.7 - Alerts & Banners
- [ ] Create `Alert` component with 4 severities
- [ ] Implement policy locked banner
- [ ] Implement missing GL accounts banner
- [ ] Implement zero stock warning
- [ ] Add action buttons to all alerts
- [ ] Test dismissible vs. non-dismissible alerts

### Phase 3.8 - Toast Notifications
- [ ] Enhance `useToast` with duration/actions support
- [ ] Implement error toast for locked field edits
- [ ] Implement error toast for delete blocked
- [ ] Implement success toast for archive
- [ ] Implement warning toast for diagnostics
- [ ] Test toast auto-dismiss timing

---

**Status**: 📋 **READY FOR IMPLEMENTATION** - All specifications defined.

**Estimated Effort**: 4 days for complete tooltips & alerts implementation.
