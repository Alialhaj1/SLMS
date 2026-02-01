# Accounting Posting Flow - SLMS
**Smart Logistics Management System**  
**Version:** 3.0 (Phase 3 Ready)  
**Date:** February 1, 2026  
**Status:** Architecture Design

---

## Overview
This document defines the **Accounting Integration** for SLMS.  
It ensures **GAAP/IFRS compliance** with **automated journal entries** and **period controls**.

---

## Core Accounting Principles

### 1. Double-Entry Bookkeeping
Every transaction creates **balanced journal entries** (Debit = Credit).

### 2. Accrual Accounting
Revenue/expenses recorded when **earned/incurred**, not when cash moves.

### 3. Chart of Accounts (CoA)
Structured account hierarchy:
- **1XXX:** Assets (inventory, receivables)
- **2XXX:** Liabilities (payables, accruals)
- **3XXX:** Equity (capital, retained earnings)
- **4XXX:** Revenue (sales, services)
- **5XXX:** Cost of Goods Sold (COGS)
- **6XXX:** Operating Expenses

### 4. Fiscal Period Locking
Once period closed → **no modifications** (audit requirement).

---

## Chart of Accounts Structure

```
┌─────────────────────────────────────────────────┐
│ Chart of Accounts (SLMS)                        │
├─────────────────────────────────────────────────┤
│                                                  │
│ 1000 - Assets                                   │
│  ├─ 1100 - Current Assets                       │
│  │   ├─ 1110 - Cash & Bank                      │
│  │   ├─ 1120 - Accounts Receivable              │
│  │   ├─ 1130 - Inventory                        │
│  │   │   ├─ 1131 - Raw Materials                │
│  │   │   ├─ 1132 - Work in Progress             │
│  │   │   └─ 1133 - Finished Goods               │
│  │   └─ 1140 - Prepaid Expenses                 │
│  └─ 1200 - Fixed Assets                         │
│      ├─ 1210 - Property & Equipment             │
│      └─ 1220 - Accumulated Depreciation         │
│                                                  │
│ 2000 - Liabilities                              │
│  ├─ 2100 - Current Liabilities                  │
│  │   ├─ 2110 - Accounts Payable                 │
│  │   ├─ 2120 - Accrued Expenses                 │
│  │   └─ 2130 - VAT Payable                      │
│  └─ 2200 - Long-term Liabilities                │
│      └─ 2210 - Long-term Debt                   │
│                                                  │
│ 3000 - Equity                                   │
│  ├─ 3100 - Capital                              │
│  └─ 3200 - Retained Earnings                    │
│                                                  │
│ 4000 - Revenue                                  │
│  ├─ 4100 - Sales Revenue                        │
│  └─ 4200 - Service Revenue                      │
│                                                  │
│ 5000 - Cost of Goods Sold (COGS)               │
│  ├─ 5100 - Material Costs                       │
│  ├─ 5200 - Freight & Shipping                   │
│  └─ 5300 - Customs Duties                       │
│                                                  │
│ 6000 - Operating Expenses                       │
│  ├─ 6100 - Salaries & Wages                     │
│  ├─ 6200 - Rent & Utilities                     │
│  ├─ 6300 - Marketing & Advertising              │
│  └─ 6400 - General & Administrative             │
└─────────────────────────────────────────────────┘
```

---

## Transaction Flow (Inventory Receipt)

### Business Event
```
Warehouse receives 100 units of Item "ABC-001"
Purchase Order: PO-2026-001
Supplier: Acme Corp
Unit Cost: $10
Total Cost: $1,000
```

### Step 1: Record Inventory Movement
```sql
INSERT INTO inventory_movements (
  item_id,
  warehouse_id,
  movement_type,
  quantity,
  uom_id,
  unit_cost,
  reference_number,
  movement_date
) VALUES (
  123,           -- Item: ABC-001
  1,             -- Warehouse: Main
  'receipt',     -- Type: Goods Receipt
  100,           -- Quantity
  1,             -- UOM: Piece
  10.00,         -- Unit cost
  'GRN-2026-001',
  '2026-02-01'
);
```

### Step 2: Generate Journal Entry (Automatic)
```
Journal Entry: JE-2026-001
Date: 2026-02-01
Type: Inventory Receipt
Reference: GRN-2026-001

┌──────────────────┬────────────┬────────────┬─────────┐
│ Account          │ Description│ Debit ($)  │ Credit  │
├──────────────────┼────────────┼────────────┼─────────┤
│ 1130 - Inventory │ GRN-001    │  1,000.00  │    -    │
│ 2110 - Payables  │ Acme Corp  │      -     │ 1,000.00│
└──────────────────┴────────────┴────────────┴─────────┘

Total:                           1,000.00     1,000.00 ✓ Balanced
```

### Step 3: Store Journal Entry
```sql
-- Create journal entry header
INSERT INTO journal_entries (
  entry_number,
  entry_date,
  entry_type,
  description,
  reference_type,
  reference_id,
  state,
  posted_by
) VALUES (
  'JE-2026-001',
  '2026-02-01',
  'inventory_receipt',
  'Goods Receipt - GRN-2026-001',
  'inventory_movement',
  1,  -- Movement ID
  'posted',
  5   -- User ID
);

-- Create journal entry lines (debits & credits)
INSERT INTO journal_entry_lines (entry_id, account_code, debit, credit, description) VALUES
(1, '1130', 1000.00, 0, 'Inventory - Item ABC-001'),
(1, '2110', 0, 1000.00, 'Accounts Payable - Acme Corp');
```

---

## Transaction Flow (Expense Posting)

### Business Event
```
Expense recorded for freight charges
Supplier: DHL Express
Amount: $150
Expense Type: Shipping
```

### Step 1: Create Expense Record
```sql
INSERT INTO expenses (
  expense_number,
  expense_date,
  expense_type_id,
  supplier_id,
  amount,
  currency_code,
  description,
  company_id,
  created_by
) VALUES (
  'EXP-2026-001',
  '2026-02-01',
  2,  -- Expense Type: Shipping
  5,  -- Supplier: DHL Express
  150.00,
  'USD',
  'Shipment freight - Acme order',
  1,  -- Company ID
  5   -- User ID
);
```

### Step 2: Generate Journal Entry (Automatic)
```
Journal Entry: JE-2026-002
Date: 2026-02-01
Type: Expense
Reference: EXP-2026-001

┌──────────────────────┬────────────┬──────────┬─────────┐
│ Account              │ Description│ Debit ($)│ Credit  │
├──────────────────────┼────────────┼──────────┼─────────┤
│ 5200 - Freight       │ EXP-001    │  150.00  │    -    │
│ 2110 - Payables      │ DHL Express│    -     │  150.00 │
└──────────────────────┴────────────┴──────────┴─────────┘

Total:                               150.00     150.00 ✓ Balanced
```

### Step 3: Account Mapping (Expense Type → CoA)
```sql
-- Expense type to account mapping
CREATE TABLE expense_type_accounts (
  expense_type_id INTEGER NOT NULL REFERENCES expense_types(id),
  account_code VARCHAR(20) NOT NULL,  -- e.g., '5200' for freight
  is_default BOOLEAN DEFAULT true,
  
  PRIMARY KEY (expense_type_id, account_code)
);

-- Example mappings
INSERT INTO expense_type_accounts VALUES
(1, '6100', true),  -- Salaries → Operating Expense
(2, '5200', true),  -- Shipping → COGS
(3, '5300', true),  -- Customs → COGS
(4, '6200', true);  -- Rent → Operating Expense
```

---

## Transaction Flow (Shipment Costing)

### Business Event
```
Shipment delivered to customer
Shipment: SH-2026-001
Customer: Beta Inc
Items sold: 50 units of ABC-001
Sales Price: $20/unit
Cost: $10/unit (from inventory)
Total Revenue: $1,000
Total Cost: $500
Gross Profit: $500
```

### Step 1: Record Shipment
```sql
INSERT INTO shipments (
  shipment_number,
  customer_id,
  shipment_date,
  status,
  total_amount
) VALUES (
  'SH-2026-001',
  10,  -- Customer: Beta Inc
  '2026-02-01',
  'delivered',
  1000.00
);

-- Shipment items
INSERT INTO shipment_items (shipment_id, item_id, quantity, unit_price, unit_cost) VALUES
(1, 123, 50, 20.00, 10.00);  -- Item ABC-001
```

### Step 2: Generate Journal Entry (Revenue Recognition)
```
Journal Entry: JE-2026-003
Date: 2026-02-01
Type: Sales
Reference: SH-2026-001

┌─────────────────────┬────────────┬──────────┬─────────┐
│ Account             │ Description│ Debit ($)│ Credit  │
├─────────────────────┼────────────┼──────────┼─────────┤
│ 1120 - Receivables  │ Beta Inc   │ 1,000.00 │    -    │
│ 4100 - Revenue      │ SH-001     │    -     │ 1,000.00│
└─────────────────────┴────────────┴──────────┴─────────┘

Total:                              1,000.00   1,000.00 ✓
```

### Step 3: Generate Journal Entry (COGS Recognition)
```
Journal Entry: JE-2026-004
Date: 2026-02-01
Type: COGS
Reference: SH-2026-001

┌─────────────────────┬────────────┬──────────┬─────────┐
│ Account             │ Description│ Debit ($)│ Credit  │
├─────────────────────┼────────────┼──────────┼─────────┤
│ 5100 - COGS         │ SH-001     │  500.00  │    -    │
│ 1130 - Inventory    │ ABC-001    │    -     │  500.00 │
└─────────────────────┴────────────┴──────────┴─────────┘

Total:                               500.00     500.00 ✓
```

---

## Database Schema

### `journal_entries` Table
```sql
CREATE TABLE journal_entries (
  id SERIAL PRIMARY KEY,
  
  -- Entry metadata
  entry_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'JE-2026-001'
  entry_date DATE NOT NULL,
  entry_type VARCHAR(50) NOT NULL,  -- 'inventory_receipt', 'expense', 'sales', 'cogs'
  description TEXT,
  
  -- Reference to source transaction
  reference_type VARCHAR(50),  -- 'inventory_movement', 'expense', 'shipment'
  reference_id INTEGER,
  
  -- State management
  state VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, posted, reversed
  posted_at TIMESTAMP,
  posted_by INTEGER REFERENCES users(id),
  
  -- Reversal tracking
  reversed_at TIMESTAMP,
  reversed_by INTEGER REFERENCES users(id),
  reversal_reason TEXT,
  
  -- Period control
  fiscal_year INTEGER NOT NULL,  -- e.g., 2026
  fiscal_period INTEGER NOT NULL,  -- 1-12 (month)
  period_locked BOOLEAN DEFAULT false,
  
  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMP,
  
  CONSTRAINT valid_state CHECK (state IN ('draft', 'posted', 'reversed'))
);

CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date DESC);
CREATE INDEX idx_journal_entries_type ON journal_entries(entry_type, state);
CREATE INDEX idx_journal_entries_period ON journal_entries(fiscal_year, fiscal_period);
CREATE INDEX idx_journal_entries_reference ON journal_entries(reference_type, reference_id);
```

### `journal_entry_lines` Table
```sql
CREATE TABLE journal_entry_lines (
  id SERIAL PRIMARY KEY,
  
  entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  
  -- Account reference
  account_code VARCHAR(20) NOT NULL,  -- e.g., '1130', '2110'
  account_name VARCHAR(255),          -- Cached for performance
  
  -- Amounts
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  
  -- Line description
  description TEXT,
  
  -- Analytical dimensions (optional)
  cost_center_id INTEGER,
  department_id INTEGER,
  project_id INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_amounts CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);

CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines(entry_id);
CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_code, entry_id);
```

### `fiscal_periods` Table
```sql
CREATE TABLE fiscal_periods (
  id SERIAL PRIMARY KEY,
  
  company_id INTEGER NOT NULL REFERENCES companies(id),
  
  -- Period definition
  fiscal_year INTEGER NOT NULL,
  fiscal_period INTEGER NOT NULL,  -- 1-12
  period_name VARCHAR(50),          -- 'January 2026'
  
  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- State
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMP,
  closed_by INTEGER REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_company_period UNIQUE (company_id, fiscal_year, fiscal_period)
);

CREATE INDEX idx_fiscal_periods_company ON fiscal_periods(company_id, fiscal_year, fiscal_period);
```

---

## Posting Rules

### Rule 1: Balance Validation
Every journal entry MUST balance:
```typescript
function validateBalance(lines: JournalEntryLine[]): boolean {
  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
  
  return Math.abs(totalDebit - totalCredit) < 0.01; // Allow 1 cent rounding
}
```

### Rule 2: Period Validation
Cannot post to closed period:
```typescript
async function validatePeriod(entryDate: Date, companyId: number): Promise<boolean> {
  const period = await getFiscalPeriod(entryDate, companyId);
  
  if (period.is_closed) {
    throw new Error('Cannot post to closed period');
  }
  
  return true;
}
```

### Rule 3: Account Validation
All accounts must exist in CoA:
```typescript
async function validateAccounts(lines: JournalEntryLine[]): Promise<boolean> {
  for (const line of lines) {
    const account = await getAccount(line.account_code);
    
    if (!account) {
      throw new Error(`Invalid account: ${line.account_code}`);
    }
    
    if (!account.is_active) {
      throw new Error(`Inactive account: ${line.account_code}`);
    }
  }
  
  return true;
}
```

---

## Reversal Flow

### When to Reverse
1. **Error correction** (posted to wrong account)
2. **Void transaction** (cancel shipment, void expense)
3. **Period adjustment** (prior period correction)

### Reversal Process
```
Original Entry (JE-2026-001):
┌──────────────────┬──────────┬─────────┐
│ Account          │ Debit ($)│ Credit  │
├──────────────────┼──────────┼─────────┤
│ 1130 - Inventory │ 1,000.00 │    -    │
│ 2110 - Payables  │    -     │ 1,000.00│
└──────────────────┴──────────┴─────────┘

Reversal Entry (JE-2026-REV-001):
┌──────────────────┬──────────┬─────────┐
│ Account          │ Debit ($)│ Credit  │
├──────────────────┼──────────┼─────────┤
│ 2110 - Payables  │ 1,000.00 │    -    │  ← Swapped
│ 1130 - Inventory │    -     │ 1,000.00│  ← Swapped
└──────────────────┴──────────┴─────────┘

Description: "Reversal of JE-2026-001 - Error correction"
```

---

## Accounting Reports

### 1. Trial Balance
Shows all account balances at a point in time:
```sql
SELECT
  account_code,
  account_name,
  SUM(debit) as total_debit,
  SUM(credit) as total_credit,
  SUM(debit) - SUM(credit) as balance
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.entry_id = je.id
WHERE je.state = 'posted'
  AND je.entry_date <= '2026-02-01'
  AND je.company_id = 1
GROUP BY account_code, account_name
ORDER BY account_code;
```

### 2. General Ledger
Shows all transactions for a specific account:
```sql
SELECT
  je.entry_date,
  je.entry_number,
  je.description,
  jel.debit,
  jel.credit,
  SUM(jel.debit - jel.credit) OVER (ORDER BY je.entry_date) as running_balance
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.entry_id = je.id
WHERE jel.account_code = '1130'  -- Inventory account
  AND je.state = 'posted'
  AND je.company_id = 1
ORDER BY je.entry_date;
```

### 3. Income Statement (P&L)
```sql
SELECT
  CASE
    WHEN account_code LIKE '4%' THEN 'Revenue'
    WHEN account_code LIKE '5%' THEN 'COGS'
    WHEN account_code LIKE '6%' THEN 'Expenses'
  END as category,
  SUM(credit - debit) as amount
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.entry_id = je.id
WHERE je.state = 'posted'
  AND je.entry_date BETWEEN '2026-01-01' AND '2026-02-01'
  AND je.company_id = 1
  AND (account_code LIKE '4%' OR account_code LIKE '5%' OR account_code LIKE '6%')
GROUP BY category;
```

---

## API Endpoints

### 1. Create Journal Entry (Manual)
```http
POST /api/accounting/journal-entries
Authorization: Bearer <token>
Content-Type: application/json

{
  "entry_date": "2026-02-01",
  "entry_type": "manual",
  "description": "Adjustment entry",
  "lines": [
    {
      "account_code": "1130",
      "debit": 100.00,
      "credit": 0,
      "description": "Inventory adjustment"
    },
    {
      "account_code": "3200",
      "debit": 0,
      "credit": 100.00,
      "description": "Retained earnings"
    }
  ]
}

Response (201 Created):
{
  "journal_entry": {
    "id": 1,
    "entry_number": "JE-2026-005",
    "state": "posted",
    "entry_date": "2026-02-01"
  }
}
```

### 2. Reverse Journal Entry
```http
POST /api/accounting/journal-entries/:id/reverse
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Correction - Posted to wrong account"
}

Response (200 OK):
{
  "reversal_entry": {
    "id": 2,
    "entry_number": "JE-2026-REV-001",
    "state": "posted"
  }
}
```

### 3. Close Fiscal Period
```http
POST /api/accounting/periods/:year/:period/close
Authorization: Bearer <token>

Response (200 OK):
{
  "fiscal_period": {
    "fiscal_year": 2026,
    "fiscal_period": 1,
    "is_closed": true,
    "closed_at": "2026-02-01T10:00:00Z"
  }
}
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('Journal Entry Posting', () => {
  it('should reject unbalanced entry', async () => {
    const entry = {
      lines: [
        { account_code: '1130', debit: 100, credit: 0 },
        { account_code: '2110', debit: 0, credit: 99 },  // Unbalanced!
      ],
    };

    await expect(postJournalEntry(entry)).rejects.toThrow('Entry not balanced');
  });

  it('should reject posting to closed period', async () => {
    const entry = {
      entry_date: '2026-01-15',  // January 2026 (closed)
      lines: [/* ... */],
    };

    await expect(postJournalEntry(entry)).rejects.toThrow('Period closed');
  });
});
```

---

## Migration Path

### Phase 3.4: Accounting Integration (Week 4)
1. Day 1: Create CoA tables + seed default accounts
2. Day 2: Create journal entry tables
3. Day 3: Implement posting logic
4. Day 4: Build accounting reports
5. Day 5-7: Testing + validation

---

**Document Owner:** CTO + CFO  
**Last Updated:** February 1, 2026  
**Implementation Target:** Phase 3.4 (Week 4)
