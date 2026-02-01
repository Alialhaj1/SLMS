# 🎨 Items Module - UI Wireframes & Component Specifications

**Purpose**: Visual mockups and detailed specifications for Phase 3 UI enhancements.

**Last Updated**: January 31, 2026

---

## 🖼️ 1. Item Profile SlideOver - Status Banner

### Visual Mockup (Text-Based)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🟡 ITEM001 - Test Item                                        [X] Close │ ← Yellow background
│ Status: Has Movement | 23 movements                                     │
│                                                                          │
│ [FIFO] [BATCH] [COMPOSITE]                              🔒 LOCKED       │ ← Badges
└─────────────────────────────────────────────────────────────────────────┘
│                                                                          │
│ [Overview] [Classification] [Units] [Warehouses] [Movements] [BOM]     │ ← Tabs
│                                                                          │
│ ┌── Overview Tab ──────────────────────────────────────────────────┐   │
│ │                                                                   │   │
│ │  Basic Information                                                │   │
│ │  ┌─────────────────────┐  ┌─────────────────────┐               │   │
│ │  │ Code                │  │ Name                │               │   │
│ │  │ ITEM001             │  │ Test Item           │               │   │
│ │  └─────────────────────┘  └─────────────────────┘               │   │
│ │                                                                   │   │
│ │  Policy Fields (Locked)                                          │   │
│ │  ┌─────────────────────────────────────────────────────────┐    │   │
│ │  │ Base Unit 🔒                Tracking Policy 🔒          │    │   │
│ │  │ ┌────────────────────┐     ┌────────────────────┐      │    │   │
│ │  │ │ Piece (Locked)     │     │ Batch (Locked)     │      │    │   │ ← Grayed out
│ │  │ └────────────────────┘     └────────────────────┘      │    │   │
│ │  │                                                          │    │   │
│ │  │ Valuation Method 🔒                                     │    │   │
│ │  │ ┌────────────────────┐                                  │    │   │
│ │  │ │ FIFO (Locked)      │                                  │    │   │
│ │  │ └────────────────────┘                                  │    │   │
│ │  └─────────────────────────────────────────────────────────┘    │   │
│ │                                                                   │   │
│ │  ⚠️ Policy fields are locked due to existing movements          │   │ ← Warning banner
│ │  Contact system administrator if changes are required.           │   │
│ │                                                                   │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Specification

**File**: `components/master/ItemProfileSlideOver.tsx`

**Props**:
```typescript
interface ItemProfileSlideOverProps {
  itemId: number;
  isOpen: boolean;
  onClose: () => void;
}
```

**State**:
```typescript
const [item, setItem] = useState<ItemProfile | null>(null);
const [loading, setLoading] = useState(true);
const [activeTab, setActiveTab] = useState<TabName>('overview');
```

**Status Banner Logic**:
```typescript
const getStatusConfig = (item: ItemProfile) => {
  if (!item.is_active) {
    return {
      color: 'red',
      icon: '🔴',
      text: 'Inactive',
      bg: 'bg-red-50',
      border: 'border-red-200'
    };
  }
  
  if (item.has_movement) {
    return {
      color: 'yellow',
      icon: '🟡',
      text: 'Has Movement',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200'
    };
  }
  
  return {
    color: 'green',
    icon: '🟢',
    text: 'No Movement',
    bg: 'bg-green-50',
    border: 'border-green-200'
  };
};
```

**Badge Components**:
```typescript
const PolicyBadge = ({ policy }: { policy: string }) => {
  const colors = {
    fifo: 'bg-blue-100 text-blue-800',
    weighted_avg: 'bg-purple-100 text-purple-800',
    specific_cost: 'bg-indigo-100 text-indigo-800',
  };
  
  return (
    <span className={cn('px-2 py-1 rounded text-xs font-semibold uppercase', colors[policy])}>
      {policy.replace('_', ' ')}
    </span>
  );
};

const TrackingBadge = ({ tracking }: { tracking: string }) => {
  if (tracking === 'none') return null;
  
  const colors = {
    batch: 'bg-orange-100 text-orange-800',
    serial: 'bg-yellow-100 text-yellow-800',
    batch_expiry: 'bg-red-100 text-red-800',
    serial_expiry: 'bg-pink-100 text-pink-800',
  };
  
  return (
    <span className={cn('px-2 py-1 rounded text-xs font-semibold uppercase', colors[tracking])}>
      {tracking.replace('_', ' ')}
    </span>
  );
};
```

---

## 🔒 2. Lock Indicator Components

### Visual Mockup

```
┌─────────────────────────────────────────────────────┐
│ Base Unit 🔒                                        │ ← Lock icon in label
│ ┌──────────────────────────────────────────────┐   │
│ │ Piece                                        │   │ ← Disabled input
│ │                                              │   │ ← Gray background
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ [Hover shows tooltip]                              │
│ ┌──────────────────────────────────────────────┐   │
│ │ 🔒 Locked after first inventory movement     │   │ ← Tooltip
│ │    Cannot be changed to preserve data        │   │
│ │    integrity and accounting accuracy         │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Component Specification

**File**: `components/ui/LockedInput.tsx`

```typescript
interface LockedInputProps {
  label: string;
  value: string;
  locked: boolean;
  lockReason?: string;
  type?: 'text' | 'select';
  onChange?: (value: string) => void;
}

export const LockedInput = ({ 
  label, 
  value, 
  locked, 
  lockReason = 'Locked after first inventory movement',
  type = 'text',
  onChange 
}: LockedInputProps) => {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {label}
        {locked && (
          <Tooltip content={lockReason}>
            <LockClosedIcon className="h-4 w-4 text-yellow-500" />
          </Tooltip>
        )}
      </label>
      
      {type === 'text' ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={locked}
          className={cn(
            'input w-full',
            locked && 'bg-gray-100 cursor-not-allowed opacity-60 text-gray-600'
          )}
        />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={locked}
          className={cn(
            'select w-full',
            locked && 'bg-gray-100 cursor-not-allowed opacity-60 text-gray-600'
          )}
        >
          {/* Options */}
        </select>
      )}
      
      {locked && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <InformationCircleIcon className="h-3 w-3" />
          This field is locked and cannot be modified
        </p>
      )}
    </div>
  );
};
```

---

## ⚡ 3. Keyboard Shortcut Legend

### Visual Mockup

```
┌─────────────────────────────────────────────────────┐
│ [?] Keyboard Shortcuts                     [Close]  │ ← Popover trigger
└─────────────────────────────────────────────────────┘
     │
     ↓ (On click)
┌─────────────────────────────────────────────────────┐
│ Keyboard Shortcuts                                  │
│                                                     │
│ Navigation                                          │
│ ┌─────────┐  Open Item Profile                    │
│ │ Alt + I │                                         │
│ └─────────┘                                         │
│ ┌─────────┐  Focus Search                          │
│ │ Alt + F │                                         │
│ └─────────┘                                         │
│ ┌─────────┐  Create New Item                       │
│ │ Alt + N │                                         │
│ └─────────┘                                         │
│                                                     │
│ Profile Tabs                                        │
│ ┌─────────┐  Overview Tab                          │
│ │ Alt + O │                                         │
│ └─────────┘                                         │
│ ┌─────────┐  Warehouses Tab                        │
│ │ Alt + W │                                         │
│ └─────────┘                                         │
│ ┌─────────┐  Movements Tab                         │
│ │ Alt + M │                                         │
│ └─────────┘                                         │
│                                                     │
│ Actions                                             │
│ ┌─────────┐  Save Changes                          │
│ │ Ctrl + S│                                         │
│ └─────────┘                                         │
│ ┌─────────┐  Close Dialog                          │
│ │   Esc   │                                         │
│ └─────────┘                                         │
└─────────────────────────────────────────────────────┘
```

### Component Specification

**File**: `components/ui/ShortcutLegend.tsx`

```typescript
export const ShortcutLegend = () => {
  const shortcuts = [
    { category: 'Navigation', items: [
      { key: 'Alt + I', action: 'Open Item Profile' },
      { key: 'Alt + F', action: 'Focus Search' },
      { key: 'Alt + N', action: 'Create New Item' },
    ]},
    { category: 'Profile Tabs', items: [
      { key: 'Alt + O', action: 'Overview Tab' },
      { key: 'Alt + C', action: 'Classification Tab' },
      { key: 'Alt + U', action: 'Units Tab' },
      { key: 'Alt + W', action: 'Warehouses Tab' },
      { key: 'Alt + M', action: 'Movements Tab' },
      { key: 'Alt + B', action: 'BOM Tab' },
    ]},
    { category: 'Actions', items: [
      { key: 'Ctrl + S', action: 'Save Changes' },
      { key: 'Esc', action: 'Close Dialog' },
    ]},
  ];
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <KeyboardIcon className="h-4 w-4 mr-2" />
          Shortcuts (?)
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80">
        <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
        {shortcuts.map((section) => (
          <div key={section.category} className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {section.category}
            </h4>
            <dl className="space-y-2">
              {section.items.map((shortcut) => (
                <div key={shortcut.key} className="flex justify-between items-center">
                  <dt>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono border border-gray-300">
                      {shortcut.key}
                    </kbd>
                  </dt>
                  <dd className="text-sm text-gray-600 ml-3">
                    {shortcut.action}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};
```

---

## 🔗 4. Cross-Linking Components

### Warehouses Tab with Links

```
┌─────────────────────────────────────────────────────────────────┐
│ Assigned Warehouses                                             │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Main Warehouse                                       ✓    │  │ ← Default badge
│ │ Stock: 100 Pieces | Min: 10 | Max: 500                   │  │
│ │                                                           │  │
│ │ [View Movements 🔗] [Inventory Report 🔗] [Adjust 🔗]    │  │ ← Action buttons
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Secondary Warehouse                                       │  │
│ │ Stock: 50 Pieces | Min: 5 | Max: 200                     │  │
│ │                                                           │  │
│ │ [View Movements 🔗] [Inventory Report 🔗] [Adjust 🔗]    │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Movements Tab with Clickable References

```
┌─────────────────────────────────────────────────────────────────┐
│ Recent Movements                                                │
│                                                                 │
│ Date       │ Type │ Reference   │ Warehouse     │ Qty │ UOM    │
│ ───────────┼──────┼─────────────┼───────────────┼─────┼────────│
│ 2026-01-30 │ GRN  │ GRN-00123🔗 │ Main WH 🔗    │ +50 │ PC     │ ← Links
│ 2026-01-28 │ ISS  │ ISS-00456🔗 │ Main WH 🔗    │ -20 │ PC     │
│ 2026-01-25 │ TRF  │ TRF-00789🔗 │ Main → Sec 🔗 │ +10 │ PC     │
│ 2026-01-20 │ ADJ  │ ADJ-00234🔗 │ Main WH 🔗    │ +5  │ PC     │
└─────────────────────────────────────────────────────────────────┘
                ↓ (Click on reference)
          Opens document page directly
```

### Component Specification

**File**: `components/master/WarehouseCardWithLinks.tsx`

```typescript
interface WarehouseCardProps {
  warehouse: {
    id: number;
    name: string;
    qty_on_hand: number;
    min_stock: number;
    max_stock: number;
    is_default: boolean;
  };
  itemId: number;
  baseUomCode: string;
}

export const WarehouseCardWithLinks = ({ 
  warehouse, 
  itemId, 
  baseUomCode 
}: WarehouseCardProps) => {
  const router = useRouter();
  
  const handleViewMovements = () => {
    router.push(`/inventory/movements?warehouse_id=${warehouse.id}&item_id=${itemId}`);
  };
  
  const handleInventoryReport = () => {
    router.push(`/inventory/stock-balance?warehouse_id=${warehouse.id}`);
  };
  
  const handleAdjust = () => {
    router.push(`/inventory/adjustments/new?item_id=${itemId}&warehouse_id=${warehouse.id}`);
  };
  
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            {warehouse.name}
            {warehouse.is_default && (
              <Badge variant="success" size="sm">Default</Badge>
            )}
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            Stock: <strong>{warehouse.qty_on_hand}</strong> {baseUomCode} | 
            Min: {warehouse.min_stock} | 
            Max: {warehouse.max_stock}
          </p>
        </div>
        
        <WarehouseIcon className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewMovements}
          className="flex items-center gap-1"
        >
          <DocumentTextIcon className="h-4 w-4" />
          View Movements
          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleInventoryReport}
          className="flex items-center gap-1"
        >
          <ChartBarIcon className="h-4 w-4" />
          Report
          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdjust}
          className="flex items-center gap-1"
        >
          <PencilIcon className="h-4 w-4" />
          Adjust
        </Button>
      </div>
    </Card>
  );
};
```

---

## 📊 5. Diagnostics Tab Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Item Health Check                                               │
│                                                                 │
│ ❌ Missing GL Accounts                                    CRITICAL│
│    Stockable items require Inventory and COGS accounts for    │
│    journal entries.                                             │
│    [Assign GL Accounts]                                         │
│                                                                 │
│ ⚠️ No Assigned Warehouses                                WARNING│
│    Stockable items should have at least one warehouse assigned.│
│    This may cause issues during inventory movements.            │
│    [Assign Warehouse]                                           │
│                                                                 │
│ ℹ️ Zero Stock Level                                          INFO│
│    Item is active but has no stock. Consider reordering or    │
│    deactivating if no longer needed.                            │
│    [View Reorder History]                                       │
│                                                                 │
│ ✅ All Other Checks Passed                                      │
│    No issues found with tracking policy, valuation method,     │
│    or BOM configuration.                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Design System Tokens

### Colors

```typescript
const colors = {
  // Status colors
  locked: '#F59E0B', // yellow-500
  success: '#10B981', // green-500
  error: '#EF4444', // red-500
  warning: '#F97316', // orange-500
  info: '#3B82F6', // blue-500
  
  // Badge backgrounds
  badgeFifo: '#DBEAFE', // blue-100
  badgeBatch: '#FED7AA', // orange-100
  badgeSerial: '#FEF3C7', // yellow-100
  badgeComposite: '#E9D5FF', // purple-100
  
  // Lock states
  lockIcon: '#F59E0B',
  lockBg: '#F3F4F6',
  lockBorder: '#D1D5DB',
};
```

### Typography

```typescript
const typography = {
  badgeText: 'text-xs font-semibold uppercase tracking-wide',
  labelText: 'text-sm font-medium text-gray-700',
  helperText: 'text-xs text-gray-500',
  errorText: 'text-xs text-red-600',
  tooltipText: 'text-xs text-white',
};
```

### Spacing

```typescript
const spacing = {
  bannerPadding: 'px-6 py-3',
  cardPadding: 'p-4',
  buttonGap: 'gap-2',
  iconSize: 'h-4 w-4',
  lockIconSize: 'h-5 w-5',
};
```

---

## ✅ Implementation Checklist

### Phase 3.1 - Status Banner & Badges
- [ ] Create `StatusBanner` component
- [ ] Create `PolicyBadge` component
- [ ] Create `TrackingBadge` component
- [ ] Create `CompositeBadge` component
- [ ] Integrate into `ItemProfileSlideOver`
- [ ] Test with different item states

### Phase 3.2 - Lock Indicators
- [ ] Create `LockedInput` component
- [ ] Create `LockedSelect` component
- [ ] Create `LockTooltip` component
- [ ] Update all policy fields to use `LockedInput`
- [ ] Add hover tooltips with lock reasons
- [ ] Test disabled state styling

### Phase 3.3 - Keyboard Shortcuts
- [ ] Create `useKeyboardShortcuts` hook
- [ ] Create `ShortcutLegend` component
- [ ] Implement global shortcuts in items list
- [ ] Implement SlideOver shortcuts
- [ ] Add shortcut hints in UI
- [ ] Test all shortcuts work correctly

### Phase 3.4 - Cross-Linking
- [ ] Create `WarehouseCardWithLinks` component
- [ ] Create `MovementRowWithLinks` component
- [ ] Implement `openMovementDocument` utility
- [ ] Add clickable group/vendor links
- [ ] Test all navigation paths
- [ ] Verify filter parameters passed correctly

### Phase 3.5 - Diagnostics
- [ ] Create `DiagnosticsTab` component
- [ ] Create `DiagnosticAlert` component
- [ ] Implement backend `/diagnostics` endpoint
- [ ] Add "Fix All" action buttons
- [ ] Test all diagnostic checks
- [ ] Verify action buttons work

---

**Status**: 📋 **READY FOR IMPLEMENTATION** - All mockups and specs defined.

**Estimated Effort**: 2 weeks for complete UI implementation.
