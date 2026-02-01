# 🧪 Items Module - Automated Testing Strategy

**Purpose**: Ensure Phase 2 movement lock rules and Phase 3 enhancements remain stable through automated tests.

**Last Updated**: January 31, 2026

---

## 🎯 Testing Scope

### Phase 2 (Critical - Must Have)
- ✅ Movement lock validation (PUT endpoint)
- ✅ Deletion prevention (DELETE endpoint)
- ✅ Hierarchical groups protection
- ✅ has_movement computed correctly

### Phase 3 (Important - Should Have)
- 🔄 Permission-aware policy editing
- 🔄 Lifecycle state transitions
- 🔄 Diagnostics error detection
- 🔄 Audit trail capture

---

## 📦 Test Pyramid Strategy

```
         ╱────────╲
        ╱  E2E (5) ╲
       ╱────────────╲
      ╱ Integration  ╲
     ╱    (20 tests)  ╲
    ╱──────────────────╲
   ╱   Unit Tests       ╲
  ╱   (50+ tests)        ╲
 ╱──────────────────────╲
```

**Distribution**:
- **50+ Unit Tests**: 60% - Test individual functions (item_has_movement, validation logic)
- **20 Integration Tests**: 35% - Test API endpoints with database
- **5 E2E Tests**: 5% - Test critical user workflows end-to-end

---

## 🔧 Testing Stack

### Backend (Node.js + TypeScript)
- **Framework**: Jest
- **Database**: PostgreSQL (test database)
- **Fixtures**: Factory functions for test data
- **Coverage Target**: 80% for critical paths

### Frontend (Next.js + React)
- **Framework**: Jest + React Testing Library
- **Component Tests**: Render + user interactions
- **Coverage Target**: 70% for UI components

### E2E
- **Framework**: Playwright
- **Browser**: Chromium (headless)
- **Scenarios**: 5 critical workflows

---

## 📝 Unit Tests (Backend)

### File: `backend/tests/unit/itemPolicies.test.ts`

```typescript
import { itemHasMovement } from '../../src/utils/itemValidation';
import { validatePolicyChange } from '../../src/utils/itemValidation';

describe('Item Policy Validation', () => {
  describe('itemHasMovement()', () => {
    it('should return false for new item', async () => {
      const itemId = await createTestItem({ code: 'TEST001' });
      const hasMovement = await itemHasMovement(itemId);
      expect(hasMovement).toBe(false);
    });
    
    it('should return true after inventory movement', async () => {
      const itemId = await createTestItem({ code: 'TEST002' });
      await createInventoryMovement({ item_id: itemId, qty_delta: 10 });
      
      const hasMovement = await itemHasMovement(itemId);
      expect(hasMovement).toBe(true);
    });
    
    it('should return true after shipment item', async () => {
      const itemId = await createTestItem({ code: 'TEST003' });
      await createShipmentItem({ item_id: itemId, quantity: 5 });
      
      const hasMovement = await itemHasMovement(itemId);
      expect(hasMovement).toBe(true);
    });
  });
  
  describe('validatePolicyChange()', () => {
    it('should allow base_uom change when no movement', () => {
      const current = { base_uom_id: 1, has_movement: false };
      const updates = { base_uom_id: 2 };
      
      const result = validatePolicyChange(current, updates);
      expect(result.valid).toBe(true);
    });
    
    it('should block base_uom change when has movement', () => {
      const current = { base_uom_id: 1, has_movement: true };
      const updates = { base_uom_id: 2 };
      
      const result = validatePolicyChange(current, updates);
      expect(result.valid).toBe(false);
      expect(result.locked_fields).toContain('base_uom_id');
    });
    
    it('should allow name change even with movement', () => {
      const current = { name: 'Old Name', has_movement: true };
      const updates = { name: 'New Name' };
      
      const result = validatePolicyChange(current, updates);
      expect(result.valid).toBe(true);
    });
    
    it('should detect multiple locked field changes', () => {
      const current = { 
        base_uom_id: 1, 
        tracking_policy: 'none', 
        valuation_method: 'fifo',
        has_movement: true 
      };
      const updates = { 
        base_uom_id: 2, 
        tracking_policy: 'batch' 
      };
      
      const result = validatePolicyChange(current, updates);
      expect(result.valid).toBe(false);
      expect(result.locked_fields).toEqual(['base_uom_id', 'tracking_policy']);
    });
  });
});
```

---

## 🔗 Integration Tests (API Endpoints)

### File: `backend/tests/integration/items.put.test.ts`

```typescript
import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/testDb';

describe('PUT /api/master/items/:id - Movement Lock', () => {
  let authToken: string;
  let itemId: number;
  
  beforeAll(async () => {
    await setupTestDatabase();
    authToken = await getAuthToken('admin@test.com');
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  describe('Without Movement', () => {
    beforeEach(async () => {
      itemId = await createTestItem({
        code: 'TEST-UNLOCK',
        name: 'Unlocked Item',
        base_uom_id: 1,
        tracking_policy: 'none'
      });
    });
    
    it('should allow base_uom change', async () => {
      const response = await request(app)
        .put(`/api/master/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST-UNLOCK',
          name: 'Unlocked Item',
          base_uom_id: 2 // Changed
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.base_uom_id).toBe(2);
    });
    
    it('should allow tracking_policy change', async () => {
      const response = await request(app)
        .put(`/api/master/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST-UNLOCK',
          name: 'Unlocked Item',
          base_uom_id: 1,
          tracking_policy: 'batch' // Changed
        });
      
      expect(response.status).toBe(200);
      expect(response.body.data.tracking_policy).toBe('batch');
    });
  });
  
  describe('With Movement (Locked)', () => {
    beforeEach(async () => {
      itemId = await createTestItem({
        code: 'TEST-LOCKED',
        name: 'Locked Item',
        base_uom_id: 1,
        tracking_policy: 'none',
        valuation_method: 'fifo'
      });
      
      // Create movement to lock item
      await createInventoryMovement({
        item_id: itemId,
        qty_delta: 10,
        warehouse_id: 1
      });
    });
    
    it('should block base_uom change', async () => {
      const response = await request(app)
        .put(`/api/master/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST-LOCKED',
          name: 'Locked Item',
          base_uom_id: 2 // Attempt to change
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('POLICY_LOCKED');
      expect(response.body.error.locked_fields).toContain('base_uom_id');
    });
    
    it('should block tracking_policy change', async () => {
      const response = await request(app)
        .put(`/api/master/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST-LOCKED',
          name: 'Locked Item',
          base_uom_id: 1,
          tracking_policy: 'batch' // Attempt to change
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('POLICY_LOCKED');
      expect(response.body.error.locked_fields).toContain('tracking_policy');
    });
    
    it('should block valuation_method change', async () => {
      const response = await request(app)
        .put(`/api/master/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST-LOCKED',
          name: 'Locked Item',
          base_uom_id: 1,
          valuation_method: 'weighted_avg' // Attempt to change
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('POLICY_LOCKED');
    });
    
    it('should allow name change (non-locked field)', async () => {
      const response = await request(app)
        .put(`/api/master/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'TEST-LOCKED',
          name: 'Updated Name', // Non-locked field
          base_uom_id: 1
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });
    
    it('should include movement_count in error', async () => {
      // Add 2 more movements
      await createInventoryMovement({ item_id: itemId, qty_delta: 5 });
      await createInventoryMovement({ item_id: itemId, qty_delta: -3 });
      
      const response = await request(app)
        .put(`/api/master/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ base_uom_id: 2 });
      
      expect(response.body.error.movement_count).toBe(3);
    });
  });
});
```

---

### File: `backend/tests/integration/items.delete.test.ts`

```typescript
describe('DELETE /api/master/items/:id - Movement Lock', () => {
  it('should allow deletion when no movement', async () => {
    const itemId = await createTestItem({ code: 'DEL-OK' });
    
    const response = await request(app)
      .delete(`/api/master/items/${itemId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  it('should block deletion when has movement', async () => {
    const itemId = await createTestItem({ code: 'DEL-BLOCK' });
    await createInventoryMovement({ item_id: itemId, qty_delta: 10 });
    
    const response = await request(app)
      .delete(`/api/master/items/${itemId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('HAS_MOVEMENTS');
  });
});
```

---

### File: `backend/tests/integration/itemGroups.test.ts`

```typescript
describe('Item Groups - Hierarchical Protection', () => {
  it('should block parent_id change when group has items', async () => {
    const parentId = await createTestGroup({ name: 'Parent A' });
    const groupId = await createTestGroup({ name: 'Child', parent_id: parentId });
    const itemId = await createTestItem({ group_id: groupId });
    
    const newParentId = await createTestGroup({ name: 'Parent B' });
    
    const response = await request(app)
      .put(`/api/master/item-groups/${groupId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Child',
        parent_id: newParentId // Attempt to reparent
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('HAS_ITEMS_CANNOT_REPARENT');
    expect(response.body.error.item_count).toBe(1);
  });
  
  it('should block group deletion when has items', async () => {
    const groupId = await createTestGroup({ name: 'Group With Items' });
    await createTestItem({ group_id: groupId });
    await createTestItem({ group_id: groupId });
    
    const response = await request(app)
      .delete(`/api/master/item-groups/${groupId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('HAS_ITEMS');
    expect(response.body.error.item_count).toBe(2);
  });
  
  it('should block group deletion when has children', async () => {
    const parentId = await createTestGroup({ name: 'Parent' });
    await createTestGroup({ name: 'Child 1', parent_id: parentId });
    await createTestGroup({ name: 'Child 2', parent_id: parentId });
    
    const response = await request(app)
      .delete(`/api/master/item-groups/${parentId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('HAS_CHILDREN');
  });
});
```

---

## 🎨 Frontend Tests (React Components)

### File: `frontend-next/__tests__/components/ItemProfileSlideOver.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import ItemProfileSlideOver from '@/components/master/ItemProfileSlideOver';

describe('ItemProfileSlideOver', () => {
  const mockItem = {
    id: 1,
    code: 'TEST001',
    name: 'Test Item',
    base_uom_id: 1,
    base_uom_code: 'PC',
    tracking_policy: 'batch',
    valuation_method: 'fifo',
    has_movement: true,
    movement_count: 23,
    is_active: true,
    is_composite: false,
  };
  
  it('should render item details', () => {
    render(
      <ItemProfileSlideOver 
        itemId={1} 
        isOpen={true} 
        onClose={jest.fn()} 
      />
    );
    
    expect(screen.getByText('TEST001')).toBeInTheDocument();
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });
  
  it('should show lock icons on locked fields', () => {
    render(<ItemProfileSlideOver itemId={1} isOpen={true} onClose={jest.fn()} />);
    
    const lockIcons = screen.getAllByTitle('Locked after first movement');
    expect(lockIcons.length).toBeGreaterThan(0);
  });
  
  it('should disable locked fields when has movement', () => {
    render(<ItemProfileSlideOver itemId={1} isOpen={true} onClose={jest.fn()} />);
    
    const baseUomInput = screen.getByLabelText(/base unit/i);
    expect(baseUomInput).toBeDisabled();
  });
  
  it('should show status banner with movement count', () => {
    render(<ItemProfileSlideOver itemId={1} isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText(/23 movements/i)).toBeInTheDocument();
  });
  
  it('should display policy badges', () => {
    render(<ItemProfileSlideOver itemId={1} isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('FIFO')).toBeInTheDocument();
    expect(screen.getByText('BATCH')).toBeInTheDocument();
  });
});
```

---

## 🌐 E2E Tests (Playwright)

### File: `tests/e2e/items-movement-lock.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Items Movement Lock - E2E', () => {
  test('should prevent editing locked item', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3001/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navigate to items
    await page.goto('http://localhost:3001/master/items');
    
    // Find locked item (has_movement = true)
    await page.click('tr:has-text("🔒")');
    
    // Item profile should open
    await expect(page.locator('text=Has Movement')).toBeVisible();
    
    // Try to edit base_uom
    await page.click('button:has-text("Edit")');
    const baseUomSelect = page.locator('select#base_uom_id');
    
    // Should be disabled
    await expect(baseUomSelect).toBeDisabled();
    
    // Should show lock icon
    await expect(page.locator('svg[data-testid="lock-icon"]')).toBeVisible();
    
    // Hover should show tooltip
    await page.hover('label:has-text("Base Unit")');
    await expect(page.locator('text=Locked after first movement')).toBeVisible();
  });
  
  test('should show error when API blocks locked field change', async ({ page }) => {
    // ... login and navigate ...
    
    // Force enable field via devtools (bypass frontend validation)
    await page.evaluate(() => {
      document.querySelector('#base_uom_id').removeAttribute('disabled');
    });
    
    // Change value
    await page.selectOption('#base_uom_id', '2');
    
    // Submit
    await page.click('button:has-text("Save")');
    
    // Should show error toast
    await expect(page.locator('.toast.error')).toBeVisible();
    await expect(page.locator('text=POLICY_LOCKED')).toBeVisible();
    await expect(page.locator('text=base_uom_id')).toBeVisible();
  });
});
```

---

## 📊 Test Coverage Reporting

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/routes/master/items.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'html', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
};
```

---

## 🚀 CI/CD Integration

### GitHub Actions (`.github/workflows/test.yml`)

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: slms_test
          POSTGRES_USER: slms_test
          POSTGRES_PASSWORD: test_pass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run migrations
        working-directory: ./backend
        run: npm run migrate:test
      
      - name: Run unit tests
        working-directory: ./backend
        run: npm test -- --coverage
      
      - name: Run integration tests
        working-directory: ./backend
        run: npm run test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info
  
  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./frontend-next
        run: npm ci
      
      - name: Run tests
        working-directory: ./frontend-next
        run: npm test -- --coverage
  
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Wait for services
        run: sleep 30
      
      - name: Run E2E tests
        run: npx playwright test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🔄 Test Data Factories

### File: `backend/tests/factories/itemFactory.ts`

```typescript
export const createTestItem = async (overrides = {}) => {
  const defaults = {
    code: `TEST-${Date.now()}`,
    name: 'Test Item',
    base_uom_id: 1,
    tracking_policy: 'none',
    valuation_method: 'fifo',
    is_composite: false,
    is_active: true,
    company_id: 1,
  };
  
  const item = { ...defaults, ...overrides };
  
  const result = await pool.query(`
    INSERT INTO items (code, name, base_uom_id, tracking_policy, valuation_method, is_composite, is_active, company_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [item.code, item.name, item.base_uom_id, item.tracking_policy, item.valuation_method, item.is_composite, item.is_active, item.company_id]);
  
  return result.rows[0].id;
};

export const createInventoryMovement = async (overrides = {}) => {
  const defaults = {
    item_id: 1,
    warehouse_id: 1,
    qty_delta: 10,
    ref_type: 'ADJ',
    ref_id: 1,
    company_id: 1,
  };
  
  const movement = { ...defaults, ...overrides };
  
  await pool.query(`
    INSERT INTO inventory_movements (item_id, warehouse_id, qty_delta, ref_type, ref_id, company_id)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [movement.item_id, movement.warehouse_id, movement.qty_delta, movement.ref_type, movement.ref_id, movement.company_id]);
};
```

---

## ✅ Test Execution Commands

```bash
# Backend tests
cd backend
npm test                           # Run all unit tests
npm run test:integration           # Run integration tests
npm run test:coverage              # Generate coverage report

# Frontend tests
cd frontend-next
npm test                           # Run component tests
npm run test:watch                 # Watch mode

# E2E tests
npx playwright test                # Run all E2E tests
npx playwright test --headed       # Run with browser visible
npx playwright test --debug        # Debug mode

# Full test suite
npm run test:all                   # Run everything (unit + integration + e2e)
```

---

## 📈 Success Metrics

**Target Coverage**:
- Backend critical paths: **>90%**
- Frontend components: **>70%**
- Integration tests: **All critical APIs covered**
- E2E tests: **5 happy path scenarios**

**CI/CD Goals**:
- All tests must pass before merge
- Coverage must not decrease
- E2E tests run on staging deploy
- Performance tests < 200ms per API call

---

## 🎯 Priority Test List (Must Implement First)

1. ✅ **item_has_movement() function** - Unit test
2. ✅ **PUT /items/:id with movement** - Integration test
3. ✅ **DELETE /items/:id with movement** - Integration test
4. ✅ **PUT /item-groups/:id with items** - Integration test
5. ✅ **ItemProfileSlideOver lock indicators** - Component test

**Estimated Effort**: 2-3 days to implement all Phase 2 tests.

---

**Status**: 📋 **READY TO IMPLEMENT** - Test files structured, factories defined, CI/CD configured.
