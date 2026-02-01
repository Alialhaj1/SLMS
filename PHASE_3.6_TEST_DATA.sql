-- ════════════════════════════════════════════════════════════════════
-- Phase 3.6 Financial Statements Testing - Direct SQL Approach
-- ════════════════════════════════════════════════════════════════════
--
-- هذا السكريبت ينشئ قيود يومية لاختبار صيغ البيانات المالية
-- يمكن تشغيله مباشرة على PostgreSQL بدون الحاجة للـ API
--
-- السيناريوهات:
-- 1. Balanced Entry (متوازن) - Capital
-- 2. Revenue Entry (إيرادات)
-- 3. Expense Entry (مصروفات)
-- 4. COGS Entry (تكلفة البضاعة)
-- 5. AR Transaction (ذمم مدينة)
--
-- ════════════════════════════════════════════════════════════════════

-- تفعيل الدعاملات (Transactions)
BEGIN;

-- المتغيرات المحلية للاختبار
-- استخدام CTE لحساب المعرفات المطلوبة
WITH test_setup AS (
  SELECT
    -- معرفات الحسابات الأساسية
    (SELECT id FROM chart_of_accounts WHERE account_code = '1010' AND company_id = 1 LIMIT 1) as cash_id,
    (SELECT id FROM chart_of_accounts WHERE account_code = '1020' AND company_id = 1 LIMIT 1) as bank_id,
    (SELECT id FROM chart_of_accounts WHERE account_code = '1200' AND company_id = 1 LIMIT 1) as ar_id,
    (SELECT id FROM chart_of_accounts WHERE account_code = '3100' AND company_id = 1 LIMIT 1) as capital_id,
    (SELECT id FROM chart_of_accounts WHERE account_code = '4100' AND company_id = 1 LIMIT 1) as sales_revenue_id,
    (SELECT id FROM chart_of_accounts WHERE account_code = '5100' AND company_id = 1 LIMIT 1) as cogs_id,
    (SELECT id FROM chart_of_accounts WHERE account_code = '6100' AND company_id = 1 LIMIT 1) as salary_id,
    (SELECT id FROM currencies WHERE code = 'USD' LIMIT 1) as currency_id,
    (SELECT MAX(id) FROM users WHERE roles IS NOT NULL LIMIT 1) as user_id
),

-- ════════════════════════════════════════════════════════════════════
-- السيناريو 1: قيد متوازن - الرأسمال الأولي
-- ════════════════════════════════════════════════════════════════════
scenario_1 AS (
  INSERT INTO journal_entries (
    company_id, entry_type, entry_date, posting_date,
    status, description, total_debit, total_credit,
    currency_id, created_by
  )
  SELECT
    1, 'journal', CURRENT_DATE, CURRENT_DATE,
    'posted', 'Scenario 1: Initial Capital - 100,000',
    100000, 100000,
    currency_id, user_id
  FROM test_setup
  RETURNING id as scenario1_id
),

-- إضافة تفاصيل السيناريو 1
scenario_1_details AS (
  INSERT INTO journal_entry_details (
    journal_entry_id, account_id, debit_amount, credit_amount, 
    description, company_id
  )
  SELECT
    s1.scenario1_id,
    ts.cash_id,
    100000, 0,
    'Received initial capital',
    1
  FROM scenario_1 s1, test_setup ts
  UNION ALL
  SELECT
    s1.scenario1_id,
    ts.capital_id,
    0, 100000,
    'Initial capital contribution',
    1
  FROM scenario_1 s1, test_setup ts
  RETURNING journal_entry_id
),

-- ════════════════════════════════════════════════════════════════════
-- السيناريو 2: معاملة الإيرادات - مبيعات 50,000
-- ════════════════════════════════════════════════════════════════════
scenario_2 AS (
  INSERT INTO journal_entries (
    company_id, entry_type, entry_date, posting_date,
    status, description, total_debit, total_credit,
    currency_id, created_by
  )
  SELECT
    1, 'journal', CURRENT_DATE, CURRENT_DATE,
    'posted', 'Scenario 2: Sales Revenue - 50,000',
    50000, 50000,
    currency_id, user_id
  FROM test_setup
  RETURNING id as scenario2_id
),

scenario_2_details AS (
  INSERT INTO journal_entry_details (
    journal_entry_id, account_id, debit_amount, credit_amount,
    description, company_id
  )
  SELECT
    s2.scenario2_id,
    ts.cash_id,
    50000, 0,
    'Cash received from sales',
    1
  FROM scenario_2 s2, test_setup ts
  UNION ALL
  SELECT
    s2.scenario2_id,
    ts.sales_revenue_id,
    0, 50000,
    'Revenue from sales',
    1
  FROM scenario_2 s2, test_setup ts
  RETURNING journal_entry_id
),

-- ════════════════════════════════════════════════════════════════════
-- السيناريو 3: مصروفات الموظفين - 20,000
-- ════════════════════════════════════════════════════════════════════
scenario_3 AS (
  INSERT INTO journal_entries (
    company_id, entry_type, entry_date, posting_date,
    status, description, total_debit, total_credit,
    currency_id, created_by
  )
  SELECT
    1, 'journal', CURRENT_DATE, CURRENT_DATE,
    'posted', 'Scenario 3: Salary Expense - 20,000',
    20000, 20000,
    currency_id, user_id
  FROM test_setup
  RETURNING id as scenario3_id
),

scenario_3_details AS (
  INSERT INTO journal_entry_details (
    journal_entry_id, account_id, debit_amount, credit_amount,
    description, company_id
  )
  SELECT
    s3.scenario3_id,
    ts.salary_id,
    20000, 0,
    'Monthly salary expense',
    1
  FROM scenario_3 s3, test_setup ts
  UNION ALL
  SELECT
    s3.scenario3_id,
    ts.cash_id,
    0, 20000,
    'Cash paid for salaries',
    1
  FROM scenario_3 s3, test_setup ts
  RETURNING journal_entry_id
),

-- ════════════════════════════════════════════════════════════════════
-- السيناريو 4: تكلفة البضاعة المباعة - 30,000
-- ════════════════════════════════════════════════════════════════════
scenario_4 AS (
  INSERT INTO journal_entries (
    company_id, entry_type, entry_date, posting_date,
    status, description, total_debit, total_credit,
    currency_id, created_by
  )
  SELECT
    1, 'journal', CURRENT_DATE, CURRENT_DATE,
    'posted', 'Scenario 4: COGS Purchase - 30,000',
    30000, 30000,
    currency_id, user_id
  FROM test_setup
  RETURNING id as scenario4_id
),

scenario_4_details AS (
  INSERT INTO journal_entry_details (
    journal_entry_id, account_id, debit_amount, credit_amount,
    description, company_id
  )
  SELECT
    s4.scenario4_id,
    ts.cogs_id,
    30000, 0,
    'Cost of goods sold',
    1
  FROM scenario_4 s4, test_setup ts
  UNION ALL
  SELECT
    s4.scenario4_id,
    ts.cash_id,
    0, 30000,
    'Cash paid for inventory',
    1
  FROM scenario_4 s4, test_setup ts
  RETURNING journal_entry_id
),

-- ════════════════════════════════════════════════════════════════════
-- السيناريو 5: الذمم المدينة - مبيعات آجلة 25,000
-- ════════════════════════════════════════════════════════════════════
scenario_5 AS (
  INSERT INTO journal_entries (
    company_id, entry_type, entry_date, posting_date,
    status, description, total_debit, total_credit,
    currency_id, created_by
  )
  SELECT
    1, 'journal', CURRENT_DATE, CURRENT_DATE,
    'posted', 'Scenario 5: Accounts Receivable - 25,000',
    25000, 25000,
    currency_id, user_id
  FROM test_setup
  RETURNING id as scenario5_id
),

scenario_5_details AS (
  INSERT INTO journal_entry_details (
    journal_entry_id, account_id, debit_amount, credit_amount,
    description, company_id
  )
  SELECT
    s5.scenario5_id,
    ts.ar_id,
    25000, 0,
    'Accounts receivable from credit sales',
    1
  FROM scenario_5 s5, test_setup ts
  UNION ALL
  SELECT
    s5.scenario5_id,
    ts.sales_revenue_id,
    0, 25000,
    'Revenue from credit sales',
    1
  FROM scenario_5 s5, test_setup ts
  RETURNING journal_entry_id
)

-- ════════════════════════════════════════════════════════════════════
-- الإخراج: تقرير ملخص البيانات المدخلة
-- ════════════════════════════════════════════════════════════════════
SELECT
  'Test Data Inserted Successfully' as status,
  COUNT(*) as total_entries,
  SUM(CASE WHEN status = 'posted' THEN 1 ELSE 0 END) as posted_entries,
  SUM(total_debit) as total_debit,
  SUM(total_credit) as total_credit
FROM journal_entries
WHERE description LIKE 'Scenario %' 
  AND company_id = 1
  AND entry_date = CURRENT_DATE;

-- ════════════════════════════════════════════════════════════════════
-- التحقق من التوازن (Trial Balance = General Ledger)
-- ════════════════════════════════════════════════════════════════════
SELECT
  'TRIAL BALANCE VALIDATION' as validation_type,
  SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) as total_debit,
  SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END) as total_credit,
  ABS(SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) - 
      SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END)) as difference,
  CASE 
    WHEN ABS(SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) - 
             SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END)) < 0.01 
    THEN '✅ BALANCED'
    ELSE '❌ UNBALANCED'
  END as result
FROM journal_entry_details
WHERE company_id = 1
  AND journal_entry_id IN (
    SELECT id FROM journal_entries
    WHERE description LIKE 'Scenario %'
      AND company_id = 1
      AND status = 'posted'
  );

-- الشرط لـ Rollback إذا كان هناك خطأ
COMMIT;
