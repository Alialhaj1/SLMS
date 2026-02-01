# Phase 3.6 Testing Execution Guide

## 📋 Table of Contents
1. [Database Test Data Insertion](#database-test-data-insertion)
2. [Running Tests](#running-tests)
3. [Validating Results](#validating-results)
4. [Cross-Validations](#cross-validations)

---

## 1. Database Test Data Insertion

### Option A: Direct SQL Approach (Recommended for Quick Testing)

**File**: `c:\projects\slms\PHASE_3.6_TEST_DATA.sql`

**Prerequisites**:
- PostgreSQL running on localhost:5432
- Database: `slms`
- User: `postgres` / Password: `postgres`

**Execution**:

Using `psql` command:
```bash
psql -h localhost -U postgres -d slms -f "c:\projects\slms\PHASE_3.6_TEST_DATA.sql"
```

Or using pgAdmin:
1. Open pgAdmin
2. Connect to `slms` database
3. Open Query Tool
4. Copy content of `PHASE_3.6_TEST_DATA.sql`
5. Execute (F5 or Run button)

**Expected Output**:
```
Test Data Inserted Successfully
Status: ✅ INSERTED
Total Entries: 5
Posted Entries: 5
Total Debit: 225,000
Total Credit: 225,000
```

**What Gets Created**:
- 5 Journal Entries (all posted)
  - Scenario 1: Initial Capital (100,000)
  - Scenario 2: Sales Revenue (50,000)
  - Scenario 3: Salary Expense (20,000)
  - Scenario 4: COGS (30,000)
  - Scenario 5: Accounts Receivable (25,000)
- Total balance: 225,000 debit = 225,000 credit ✅

---

## 2. Running Tests

### Option A: Python Script Approach (Requires Backend API)

**File**: `c:\projects\slms\PHASE_3.6_TEST_EXECUTION.py`

**Prerequisites**:
1. ✅ Python 3.8+ installed
2. ✅ PostgreSQL running
3. ✅ Backend API running on localhost:3001
4. ✅ Required Python packages:
   ```bash
   pip install requests psycopg2-binary
   ```

**Configuration**:
Edit the `CONFIG` dictionary in script (lines 51-60):
```python
CONFIG = {
    'DB_HOST': 'localhost',
    'DB_PORT': 5432,
    'DB_NAME': 'slms',
    'DB_USER': 'postgres',
    'DB_PASSWORD': 'postgres',
    'API_URL': 'http://localhost:3001/api',
    'SUPER_ADMIN_EMAIL': 'super_admin@slms.local',
    'SUPER_ADMIN_PASSWORD': 'SuperAdmin@123',
}
```

**Execution**:
```bash
cd c:\projects\slms
python PHASE_3.6_TEST_EXECUTION.py
```

**Expected Output**:
```
======================================================================
Phase 3.6 Financial Statements Testing & Validation
======================================================================

✅ Database connected successfully
✅ API Login successful (User ID: 1)

======================================================================
🚀 STARTING PHASE 3.6 TEST EXECUTION
======================================================================

======================================================================
🧪 SCENARIO 1: Basic Balanced Journal Entry
======================================================================
[Creates and validates balanced entry...]

[... continues through all 5 scenarios ...]

======================================================================
✔️ CROSS-VALIDATION: Trial Balance = General Ledger
======================================================================
Total Debit:  225,000.00
Total Credit: 225,000.00
Difference:   0.00

======================================================================
📊 PHASE 3.6 TEST RESULTS SUMMARY
======================================================================
✅ Passed: 6/6
❌ Failed: 0/6
📈 Success Rate: 100.0%
======================================================================
```

**Output File**:
- Results saved to: `PHASE_3.6_TEST_RESULTS.json`
- Contains detailed results of each test scenario

---

## 3. Validating Results

### A. Check Trial Balance Totals

**SQL Query**:
```sql
-- Verify all test entries are posted and balanced
SELECT
  'Test Data Summary' as description,
  COUNT(*) as total_entries,
  SUM(total_debit) as total_debit,
  SUM(total_credit) as total_credit,
  ABS(SUM(total_debit) - SUM(total_credit)) as difference,
  CASE 
    WHEN ABS(SUM(total_debit) - SUM(total_credit)) < 0.01 
    THEN '✅ BALANCED' 
    ELSE '❌ UNBALANCED' 
  END as result
FROM journal_entries
WHERE description LIKE 'Scenario %'
  AND company_id = 1
  AND status = 'posted'
  AND deleted_at IS NULL;
```

**Expected Result**:
```
Description        | Total Entries | Total Debit | Total Credit | Difference | Result
Test Data Summary  | 5             | 225,000.00  | 225,000.00   | 0.00       | ✅ BALANCED
```

### B. Check Individual Account Balances

**SQL Query**:
```sql
-- Check balances by account
SELECT
  coa.account_code,
  coa.account_name,
  coa.account_type,
  SUM(CASE WHEN jed.debit_amount > 0 THEN jed.debit_amount ELSE 0 END) as debit_total,
  SUM(CASE WHEN jed.credit_amount > 0 THEN jed.credit_amount ELSE 0 END) as credit_total,
  SUM(CASE WHEN jed.debit_amount > 0 THEN jed.debit_amount ELSE 0 END) -
  SUM(CASE WHEN jed.credit_amount > 0 THEN jed.credit_amount ELSE 0 END) as balance
FROM journal_entry_details jed
JOIN chart_of_accounts coa ON jed.account_id = coa.id
WHERE jed.company_id = 1
  AND jed.journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE description LIKE 'Scenario %'
      AND company_id = 1
      AND status = 'posted'
  )
GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
ORDER BY coa.account_code;
```

**Expected Result**:
```
Account Code | Account Name      | Type      | Debit     | Credit    | Balance
1010         | Cash              | Asset     | 100,000   | 50,000    | 50,000
1200         | AR Customers      | Asset     | 25,000    | 0         | 25,000
3100         | Capital           | Equity    | 0         | 100,000   | -100,000
4100         | Sales Revenue     | Revenue   | 0         | 75,000    | -75,000
5100         | COGS              | Expense   | 30,000    | 0         | 30,000
6100         | Salary Expense    | Expense   | 20,000    | 0         | 20,000
```

---

## 4. Cross-Validations

### Formula 1: Trial Balance = General Ledger

**Validation**: Sum of debits in TB = Sum of debits in GL

**SQL**:
```sql
SELECT
  'TB = GL Validation' as test_name,
  (SELECT SUM(debit_amount) FROM journal_entry_details WHERE company_id = 1) as gl_total_debit,
  (SELECT SUM(debit_amount) FROM trial_balance_calculated WHERE company_id = 1) as tb_total_debit,
  CASE 
    WHEN ABS((SELECT SUM(debit_amount) FROM journal_entry_details WHERE company_id = 1) -
             (SELECT SUM(debit_amount) FROM trial_balance_calculated WHERE company_id = 1)) < 0.01
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result;
```

### Formula 2: Net Profit = Revenue - COGS - Expenses

**Validation**: Income Statement shows correct Net Profit calculation

**SQL**:
```sql
SELECT
  'Net Profit Formula' as test_name,
  (SELECT SUM(credit_amount) 
   FROM journal_entry_details jed
   JOIN chart_of_accounts coa ON jed.account_id = coa.id
   WHERE coa.account_code LIKE '41%' AND jed.company_id = 1) as revenue,
  (SELECT SUM(debit_amount)
   FROM journal_entry_details jed
   JOIN chart_of_accounts coa ON jed.account_id = coa.id
   WHERE coa.account_code LIKE '51%' AND jed.company_id = 1) as cogs,
  (SELECT SUM(debit_amount)
   FROM journal_entry_details jed
   JOIN chart_of_accounts coa ON jed.account_id = coa.id
   WHERE coa.account_code LIKE '61%' AND jed.company_id = 1) as expenses,
  (SELECT SUM(credit_amount) 
   FROM journal_entry_details jed
   JOIN chart_of_accounts coa ON jed.account_id = coa.id
   WHERE coa.account_code LIKE '41%' AND jed.company_id = 1) -
  (SELECT SUM(debit_amount)
   FROM journal_entry_details jed
   JOIN chart_of_accounts coa ON jed.account_id = coa.id
   WHERE coa.account_code LIKE '51%' AND jed.company_id = 1) -
  (SELECT SUM(debit_amount)
   FROM journal_entry_details jed
   JOIN chart_of_accounts coa ON jed.account_id = coa.id
   WHERE coa.account_code LIKE '61%' AND jed.company_id = 1) as net_profit;
```

**Expected Result**:
```
Test Name        | Revenue  | COGS   | Expenses | Net Profit
Net Profit       | 75,000   | 30,000 | 20,000   | 25,000
Formula Check    | ✅ 75,000 - 30,000 - 20,000 = 25,000
```

### Formula 3: Assets = Liabilities + Equity

**Validation**: Balance Sheet balances (Assets - Liabilities - Equity = 0)

**SQL**:
```sql
SELECT
  'Balance Sheet Balance' as test_name,
  (SELECT SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE -credit_amount END)
   FROM journal_entry_details jed
   JOIN chart_of_accounts coa ON jed.account_id = coa.id
   WHERE coa.account_code LIKE '1%' AND jed.company_id = 1) as assets,
  (SELECT SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE -debit_amount END)
   FROM journal_entry_details jed
   JOIN chart_of_accounts coa ON jed.account_id = coa.id
   WHERE coa.account_code LIKE '2%' AND jed.company_id = 1) as liabilities,
  (SELECT SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE -debit_amount END)
   FROM journal_entry_details jed
   JOIN chart_of_accounts coa ON jed.account_id = coa.id
   WHERE coa.account_code LIKE '3%' AND jed.company_id = 1) as equity,
  ABS((SELECT SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE -credit_amount END)
       FROM journal_entry_details jed
       JOIN chart_of_accounts coa ON jed.account_id = coa.id
       WHERE coa.account_code LIKE '1%' AND jed.company_id = 1) -
      (SELECT SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE -debit_amount END)
       FROM journal_entry_details jed
       JOIN chart_of_accounts coa ON jed.account_id = coa.id
       WHERE coa.account_code LIKE '2%' AND jed.company_id = 1) -
      (SELECT SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE -debit_amount END)
       FROM journal_entry_details jed
       JOIN chart_of_accounts coa ON jed.account_id = coa.id
       WHERE coa.account_code LIKE '3%' AND jed.company_id = 1)) as difference,
  CASE
    WHEN ABS(...) < 0.01 THEN '✅ BALANCED'
    ELSE '❌ UNBALANCED'
  END as result;
```

---

## 📊 Test Acceptance Criteria

**All scenarios MUST PASS**:
- ✅ Scenario 1: Balanced entry created and posted successfully
- ✅ Scenario 2: Unbalanced entry correctly rejected
- ✅ Scenario 3: Revenue recorded correctly
- ✅ Scenario 4: Expense recorded correctly
- ✅ Scenario 5: COGS recorded correctly

**Cross-validations MUST PASS**:
- ✅ Trial Balance total debits = total credits (within 0.01)
- ✅ General Ledger total debits = total credits (within 0.01)
- ✅ Net Profit formula calculated correctly
- ✅ Balance Sheet assets = liabilities + equity (within 0.01)

---

## ⚠️ Troubleshooting

### Issue: Database Connection Failed
```
❌ Database connection failed: ...
```
**Solution**:
1. Verify PostgreSQL is running
2. Check connection parameters in CONFIG
3. Ensure database `slms` exists

### Issue: API Login Failed
```
❌ API Login failed: 401
```
**Solution**:
1. Verify backend is running on port 3001
2. Check super_admin email/password
3. Ensure user exists in database

### Issue: Test Scenarios Failed
```
❌ Scenario 1: Failed to create/post entry
```
**Solution**:
1. Check if required accounts exist in COA
2. Verify journal entry permissions are assigned
3. Check backend logs for detailed error

### Issue: Data Already Exists
```
Duplicate key value violates unique constraint
```
**Solution**:
1. Clean up test data: `DELETE FROM journal_entries WHERE description LIKE 'Scenario %';`
2. Or use a different date/company for testing

---

## 🎯 Success Indicators

✅ **All tests passed if you see**:
```
======================================================================
📊 PHASE 3.6 TEST RESULTS SUMMARY
======================================================================
✅ Passed: 7/7
❌ Failed: 0/7
📈 Success Rate: 100.0%
======================================================================
```

---

**Ready to test? Start with SQL approach, then move to Python if you need API-level testing.**
