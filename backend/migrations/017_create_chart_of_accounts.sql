-- =============================================
-- Chart of Accounts (COA)
-- Hierarchical account structure for full ERP
-- =============================================

-- =============================================
-- ACCOUNT TYPES (System Level)
-- =============================================
CREATE TABLE IF NOT EXISTS account_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    nature VARCHAR(10) NOT NULL CHECK (nature IN ('debit', 'credit')),
    classification VARCHAR(20) NOT NULL,      -- asset, liability, equity, revenue, expense
    report_group VARCHAR(20) NOT NULL,        -- balance_sheet, income_statement
    display_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ACCOUNTS (Chart of Accounts)
-- =============================================
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES accounts(id),
    account_type_id INTEGER NOT NULL REFERENCES account_types(id),
    
    -- Account Identification
    code VARCHAR(20) NOT NULL,                -- e.g., 1101, 4101
    name VARCHAR(150) NOT NULL,
    name_ar VARCHAR(150),
    full_code VARCHAR(50),                    -- Full hierarchical code: 1-11-1101
    
    -- Account Properties
    level INTEGER DEFAULT 1,                  -- Hierarchy level (1=root, 2=group, 3=detail)
    is_group BOOLEAN DEFAULT false,           -- true = parent account (no posting)
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,          -- System accounts can't be deleted
    allow_posting BOOLEAN DEFAULT true,       -- Can post journal entries
    
    -- Currency & Control
    currency_id INTEGER REFERENCES currencies(id),  -- Specific currency (null = base currency)
    is_reconcilable BOOLEAN DEFAULT false,    -- Bank reconciliation
    is_control_account BOOLEAN DEFAULT false, -- Linked to sub-ledger (AR/AP)
    control_type VARCHAR(20),                 -- customer, vendor, bank, employee
    
    -- Balances (denormalized for performance)
    opening_balance DECIMAL(18, 4) DEFAULT 0,
    current_balance DECIMAL(18, 4) DEFAULT 0,
    
    -- Categorization
    cost_center_required BOOLEAN DEFAULT false,
    project_required BOOLEAN DEFAULT false,
    
    -- Notes
    description TEXT,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    UNIQUE(company_id, code)
);

-- =============================================
-- COST CENTERS
-- =============================================
CREATE TABLE IF NOT EXISTS cost_centers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES cost_centers(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    level INTEGER DEFAULT 1,
    is_group BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- PROFIT CENTERS
-- =============================================
CREATE TABLE IF NOT EXISTS profit_centers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- PROJECTS (For project-based accounting)
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    name_ar VARCHAR(150),
    customer_id INTEGER,                      -- Will reference customers
    start_date DATE,
    end_date DATE,
    budget DECIMAL(18, 4),
    status VARCHAR(20) DEFAULT 'active',      -- draft, active, completed, cancelled
    cost_center_id INTEGER REFERENCES cost_centers(id),
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- =============================================
-- DEFAULT ACCOUNT SETTINGS (Mapping)
-- =============================================
CREATE TABLE IF NOT EXISTS default_accounts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_key VARCHAR(50) NOT NULL,         -- Unique key for each default account
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    description VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, account_key)
);

-- =============================================
-- ACCOUNT BUDGETS
-- =============================================
CREATE TABLE IF NOT EXISTS account_budgets (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    fiscal_year_id INTEGER REFERENCES fiscal_years(id),
    period_id INTEGER REFERENCES accounting_periods(id),
    budget_amount DECIMAL(18, 4) NOT NULL,
    actual_amount DECIMAL(18, 4) DEFAULT 0,
    cost_center_id INTEGER REFERENCES cost_centers(id),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type_id);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_accounts_control ON accounts(is_control_account, control_type);
CREATE INDEX IF NOT EXISTS idx_cost_centers_company ON cost_centers(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_default_accounts_company ON default_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_account_budgets_account ON account_budgets(account_id);

-- =============================================
-- INSERT ACCOUNT TYPES
-- =============================================
INSERT INTO account_types (code, name, name_ar, nature, classification, report_group, display_order) VALUES
-- Assets (Debit Nature)
('CASH', 'Cash & Bank', 'النقدية والبنوك', 'debit', 'asset', 'balance_sheet', 1),
('RECEIVABLE', 'Receivables', 'المدينون', 'debit', 'asset', 'balance_sheet', 2),
('INVENTORY', 'Inventory', 'المخزون', 'debit', 'asset', 'balance_sheet', 3),
('PREPAID', 'Prepaid Expenses', 'مصروفات مدفوعة مقدماً', 'debit', 'asset', 'balance_sheet', 4),
('FIXED_ASSET', 'Fixed Assets', 'الأصول الثابتة', 'debit', 'asset', 'balance_sheet', 5),
('ACCUM_DEPR', 'Accumulated Depreciation', 'الإهلاك المتراكم', 'credit', 'asset', 'balance_sheet', 6),
('OTHER_ASSET', 'Other Assets', 'أصول أخرى', 'debit', 'asset', 'balance_sheet', 7),

-- Liabilities (Credit Nature)
('PAYABLE', 'Payables', 'الدائنون', 'credit', 'liability', 'balance_sheet', 10),
('ACCRUED', 'Accrued Expenses', 'مصروفات مستحقة', 'credit', 'liability', 'balance_sheet', 11),
('TAX_PAYABLE', 'Taxes Payable', 'الضرائب المستحقة', 'credit', 'liability', 'balance_sheet', 12),
('DEFERRED', 'Deferred Revenue', 'إيرادات مؤجلة', 'credit', 'liability', 'balance_sheet', 13),
('LOAN', 'Loans', 'القروض', 'credit', 'liability', 'balance_sheet', 14),
('OTHER_LIAB', 'Other Liabilities', 'التزامات أخرى', 'credit', 'liability', 'balance_sheet', 15),

-- Equity (Credit Nature)
('CAPITAL', 'Capital', 'رأس المال', 'credit', 'equity', 'balance_sheet', 20),
('RETAINED', 'Retained Earnings', 'الأرباح المحتجزة', 'credit', 'equity', 'balance_sheet', 21),
('RESERVE', 'Reserves', 'الاحتياطيات', 'credit', 'equity', 'balance_sheet', 22),
('CURRENT_EARN', 'Current Year Earnings', 'أرباح العام الحالي', 'credit', 'equity', 'balance_sheet', 23),

-- Revenue (Credit Nature)
('REVENUE', 'Revenue', 'الإيرادات', 'credit', 'revenue', 'income_statement', 30),
('DISCOUNT', 'Sales Discounts', 'خصومات المبيعات', 'debit', 'revenue', 'income_statement', 31),
('RETURNS', 'Sales Returns', 'مردودات المبيعات', 'debit', 'revenue', 'income_statement', 32),
('OTHER_INCOME', 'Other Income', 'إيرادات أخرى', 'credit', 'revenue', 'income_statement', 33),

-- Cost of Goods Sold (Debit Nature)
('COGS', 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', 'debit', 'expense', 'income_statement', 40),

-- Expenses (Debit Nature)
('OPERATING', 'Operating Expenses', 'المصروفات التشغيلية', 'debit', 'expense', 'income_statement', 50),
('ADMIN', 'Administrative Expenses', 'المصروفات الإدارية', 'debit', 'expense', 'income_statement', 51),
('SELLING', 'Selling Expenses', 'مصروفات البيع', 'debit', 'expense', 'income_statement', 52),
('FINANCIAL', 'Financial Expenses', 'المصروفات المالية', 'debit', 'expense', 'income_statement', 53),
('DEPRECIATION', 'Depreciation Expense', 'مصروف الإهلاك', 'debit', 'expense', 'income_statement', 54),
('OTHER_EXP', 'Other Expenses', 'مصروفات أخرى', 'debit', 'expense', 'income_statement', 55)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- FUNCTION: Create Default COA for Company
-- =============================================
CREATE OR REPLACE FUNCTION create_default_coa(p_company_id INTEGER, p_created_by INTEGER)
RETURNS VOID AS $$
DECLARE
    v_type_cash INTEGER;
    v_type_receivable INTEGER;
    v_type_inventory INTEGER;
    v_type_fixed INTEGER;
    v_type_accum_depr INTEGER;
    v_type_payable INTEGER;
    v_type_tax_payable INTEGER;
    v_type_accrued INTEGER;
    v_type_capital INTEGER;
    v_type_retained INTEGER;
    v_type_revenue INTEGER;
    v_type_discount INTEGER;
    v_type_cogs INTEGER;
    v_type_operating INTEGER;
    v_type_admin INTEGER;
    v_type_selling INTEGER;
BEGIN
    -- Get account type IDs
    SELECT id INTO v_type_cash FROM account_types WHERE code = 'CASH';
    SELECT id INTO v_type_receivable FROM account_types WHERE code = 'RECEIVABLE';
    SELECT id INTO v_type_inventory FROM account_types WHERE code = 'INVENTORY';
    SELECT id INTO v_type_fixed FROM account_types WHERE code = 'FIXED_ASSET';
    SELECT id INTO v_type_accum_depr FROM account_types WHERE code = 'ACCUM_DEPR';
    SELECT id INTO v_type_payable FROM account_types WHERE code = 'PAYABLE';
    SELECT id INTO v_type_tax_payable FROM account_types WHERE code = 'TAX_PAYABLE';
    SELECT id INTO v_type_accrued FROM account_types WHERE code = 'ACCRUED';
    SELECT id INTO v_type_capital FROM account_types WHERE code = 'CAPITAL';
    SELECT id INTO v_type_retained FROM account_types WHERE code = 'RETAINED';
    SELECT id INTO v_type_revenue FROM account_types WHERE code = 'REVENUE';
    SELECT id INTO v_type_discount FROM account_types WHERE code = 'DISCOUNT';
    SELECT id INTO v_type_cogs FROM account_types WHERE code = 'COGS';
    SELECT id INTO v_type_operating FROM account_types WHERE code = 'OPERATING';
    SELECT id INTO v_type_admin FROM account_types WHERE code = 'ADMIN';
    SELECT id INTO v_type_selling FROM account_types WHERE code = 'SELLING';

    -- ========== 1. ASSETS (1xxx) ==========
    -- 1000 - Assets (Root)
    INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
    VALUES (p_company_id, '1000', 'Assets', 'الأصول', v_type_cash, 1, true, true, false, p_created_by);
    
    -- 1100 - Current Assets
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '1100', 'Current Assets', 'الأصول المتداولة', v_type_cash, 2, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1000';
    
    -- 1110 - Cash & Bank
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '1110', 'Cash and Bank', 'النقدية والبنوك', v_type_cash, 3, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_reconcilable, is_system, created_by)
    SELECT p_company_id, id, '1111', 'Petty Cash', 'الصندوق', v_type_cash, 4, false, true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1110';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_reconcilable, is_control_account, control_type, is_system, created_by)
    SELECT p_company_id, id, '1112', 'Bank Accounts', 'الحسابات البنكية', v_type_cash, 4, true, true, 'bank', true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1110';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1113', 'Checks Under Collection', 'شيكات تحت التحصيل', v_type_cash, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1110';
    
    -- 1200 - Receivables
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '1200', 'Receivables', 'المدينون', v_type_receivable, 3, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_control_account, control_type, is_system, created_by)
    SELECT p_company_id, id, '1201', 'Accounts Receivable - Trade', 'ذمم العملاء', v_type_receivable, 4, true, 'customer', true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1200';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1202', 'Notes Receivable', 'أوراق قبض', v_type_receivable, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1200';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1203', 'Allowance for Doubtful Accounts', 'مخصص الديون المشكوك فيها', v_type_receivable, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1200';
    
    -- 1300 - Inventory
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '1300', 'Inventory', 'المخزون', v_type_inventory, 3, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
    SELECT p_company_id, id, '1301', 'Merchandise Inventory', 'مخزون البضائع', v_type_inventory, 4, true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1300';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1302', 'Raw Materials', 'المواد الخام', v_type_inventory, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1300';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1303', 'Work in Progress', 'إنتاج تحت التشغيل', v_type_inventory, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1300';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1304', 'Finished Goods', 'منتجات تامة الصنع', v_type_inventory, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1300';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1305', 'Goods in Transit', 'بضائع في الطريق', v_type_inventory, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1300';
    
    -- 1500 - Fixed Assets
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '1500', 'Fixed Assets', 'الأصول الثابتة', v_type_fixed, 2, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1000';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1501', 'Land', 'أراضي', v_type_fixed, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1500';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1502', 'Buildings', 'مباني', v_type_fixed, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1500';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1503', 'Machinery & Equipment', 'آلات ومعدات', v_type_fixed, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1500';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1504', 'Vehicles', 'مركبات', v_type_fixed, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1500';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1505', 'Furniture & Fixtures', 'أثاث ومفروشات', v_type_fixed, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1500';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '1509', 'Accumulated Depreciation', 'الإهلاك المتراكم', v_type_accum_depr, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '1500';
    
    -- ========== 2. LIABILITIES (2xxx) ==========
    INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
    VALUES (p_company_id, '2000', 'Liabilities', 'الالتزامات', v_type_payable, 1, true, true, false, p_created_by);
    
    -- 2100 - Current Liabilities
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '2100', 'Current Liabilities', 'الالتزامات المتداولة', v_type_payable, 2, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2000';
    
    -- Payables
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_control_account, control_type, is_system, created_by)
    SELECT p_company_id, id, '2101', 'Accounts Payable - Trade', 'ذمم الموردين', v_type_payable, 3, true, 'vendor', true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '2102', 'Notes Payable', 'أوراق دفع', v_type_payable, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2100';
    
    -- Tax Payables
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '2200', 'Taxes Payable', 'الضرائب المستحقة', v_type_tax_payable, 3, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
    SELECT p_company_id, id, '2201', 'VAT Output', 'ضريبة القيمة المضافة - مخرجات', v_type_tax_payable, 4, true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2200';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
    SELECT p_company_id, id, '2202', 'VAT Input', 'ضريبة القيمة المضافة - مدخلات', v_type_tax_payable, 4, true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2200';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '2203', 'Customs Duties Payable', 'رسوم جمركية مستحقة', v_type_tax_payable, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2200';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '2204', 'Zakat Payable', 'الزكاة المستحقة', v_type_tax_payable, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2200';
    
    -- Accrued Expenses
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '2300', 'Accrued Expenses', 'مصروفات مستحقة', v_type_accrued, 3, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '2301', 'Accrued Salaries', 'رواتب مستحقة', v_type_accrued, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2300';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '2302', 'Accrued Utilities', 'خدمات مستحقة', v_type_accrued, 4, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '2300';
    
    -- ========== 3. EQUITY (3xxx) ==========
    INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
    VALUES (p_company_id, '3000', 'Equity', 'حقوق الملكية', v_type_capital, 1, true, true, false, p_created_by);
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
    SELECT p_company_id, id, '3100', 'Capital', 'رأس المال', v_type_capital, 2, true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '3000';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
    SELECT p_company_id, id, '3200', 'Retained Earnings', 'الأرباح المحتجزة', v_type_retained, 2, true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '3000';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
    SELECT p_company_id, id, '3300', 'Current Year Earnings', 'أرباح العام الحالي', v_type_retained, 2, true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '3000';
    
    -- ========== 4. REVENUE (4xxx) ==========
    INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
    VALUES (p_company_id, '4000', 'Revenue', 'الإيرادات', v_type_revenue, 1, true, true, false, p_created_by);
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '4100', 'Sales Revenue', 'إيرادات المبيعات', v_type_revenue, 2, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '4000';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
    SELECT p_company_id, id, '4101', 'Domestic Sales', 'مبيعات محلية', v_type_revenue, 3, true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '4100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '4102', 'Export Sales', 'مبيعات تصدير', v_type_revenue, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '4100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '4103', 'Service Revenue', 'إيرادات خدمات', v_type_revenue, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '4100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '4200', 'Sales Discounts', 'خصومات المبيعات', v_type_discount, 2, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '4000';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '4300', 'Sales Returns', 'مردودات المبيعات', v_type_discount, 2, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '4000';
    
    -- ========== 5. COGS (5xxx) ==========
    INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
    VALUES (p_company_id, '5000', 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', v_type_cogs, 1, true, true, false, p_created_by);
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_system, created_by)
    SELECT p_company_id, id, '5100', 'Cost of Goods Sold', 'تكلفة المبيعات', v_type_cogs, 2, true, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '5000';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '5101', 'Material Cost', 'تكلفة المواد', v_type_cogs, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '5100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '5102', 'Freight In', 'مصاريف الشحن الداخلة', v_type_cogs, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '5100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '5103', 'Customs Duties', 'رسوم جمركية', v_type_cogs, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '5100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '5104', 'Insurance - Cargo', 'تأمين البضائع', v_type_cogs, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '5100';
    
    -- ========== 6. EXPENSES (6xxx) ==========
    INSERT INTO accounts (company_id, code, name, name_ar, account_type_id, level, is_group, is_system, allow_posting, created_by)
    VALUES (p_company_id, '6000', 'Expenses', 'المصروفات', v_type_operating, 1, true, true, false, p_created_by);
    
    -- Operating Expenses
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '6100', 'Operating Expenses', 'المصروفات التشغيلية', v_type_operating, 2, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6000';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6101', 'Salaries & Wages', 'الرواتب والأجور', v_type_operating, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6102', 'Rent Expense', 'مصروف الإيجار', v_type_operating, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6103', 'Utilities', 'الخدمات العامة', v_type_operating, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6104', 'Telephone & Internet', 'الهاتف والإنترنت', v_type_operating, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6100';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6105', 'Office Supplies', 'مستلزمات مكتبية', v_type_operating, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6100';
    
    -- Administrative Expenses
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '6200', 'Administrative Expenses', 'المصروفات الإدارية', v_type_admin, 2, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6000';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6201', 'Professional Fees', 'أتعاب مهنية', v_type_admin, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6200';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6202', 'Insurance Expense', 'مصروف التأمين', v_type_admin, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6200';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6203', 'Depreciation Expense', 'مصروف الإهلاك', v_type_admin, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6200';
    
    -- Selling Expenses
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, is_group, allow_posting, created_by)
    SELECT p_company_id, id, '6300', 'Selling Expenses', 'مصروفات البيع والتسويق', v_type_selling, 2, true, false, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6000';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6301', 'Advertising', 'الدعاية والإعلان', v_type_selling, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6300';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6302', 'Freight Out', 'مصاريف الشحن', v_type_selling, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6300';
    
    INSERT INTO accounts (company_id, parent_id, code, name, name_ar, account_type_id, level, created_by)
    SELECT p_company_id, id, '6303', 'Sales Commission', 'عمولات المبيعات', v_type_selling, 3, p_created_by
    FROM accounts WHERE company_id = p_company_id AND code = '6300';

    -- ========== CREATE DEFAULT ACCOUNT MAPPINGS ==========
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'AR_TRADE', id, 'Default Accounts Receivable' FROM accounts WHERE company_id = p_company_id AND code = '1201';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'AP_TRADE', id, 'Default Accounts Payable' FROM accounts WHERE company_id = p_company_id AND code = '2101';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'INVENTORY', id, 'Default Inventory Account' FROM accounts WHERE company_id = p_company_id AND code = '1301';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'COGS', id, 'Default Cost of Goods Sold' FROM accounts WHERE company_id = p_company_id AND code = '5100';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'SALES', id, 'Default Sales Revenue' FROM accounts WHERE company_id = p_company_id AND code = '4101';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'VAT_OUTPUT', id, 'VAT Output Account' FROM accounts WHERE company_id = p_company_id AND code = '2201';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'VAT_INPUT', id, 'VAT Input Account' FROM accounts WHERE company_id = p_company_id AND code = '2202';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'RETAINED_EARNINGS', id, 'Retained Earnings Account' FROM accounts WHERE company_id = p_company_id AND code = '3200';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'CASH', id, 'Default Cash Account' FROM accounts WHERE company_id = p_company_id AND code = '1111';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'BANK', id, 'Default Bank Account' FROM accounts WHERE company_id = p_company_id AND code = '1112';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'CUSTOMS', id, 'Customs Duties Expense' FROM accounts WHERE company_id = p_company_id AND code = '5103';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'FREIGHT_IN', id, 'Freight In (COGS)' FROM accounts WHERE company_id = p_company_id AND code = '5102';
    
    INSERT INTO default_accounts (company_id, account_key, account_id, description) 
    SELECT p_company_id, 'FREIGHT_OUT', id, 'Freight Out (Selling)' FROM accounts WHERE company_id = p_company_id AND code = '6302';

END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE account_types IS 'Account classification types (system level)';
COMMENT ON TABLE accounts IS 'Chart of Accounts - hierarchical account structure';
COMMENT ON TABLE cost_centers IS 'Cost centers for expense tracking';
COMMENT ON TABLE profit_centers IS 'Profit centers for revenue tracking';
COMMENT ON TABLE projects IS 'Projects for project-based accounting';
COMMENT ON TABLE default_accounts IS 'Mapping of default accounts for transactions';
COMMENT ON FUNCTION create_default_coa IS 'Creates default Chart of Accounts for a new company';
