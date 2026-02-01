-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 119: SALES APPROVAL WORKFLOWS
-- ════════════════════════════════════════════════════════════════════════════
-- Description: Add approval workflows for Sales module (Orders, Invoices, Receipts)
-- Date: 2026-01-08
-- ════════════════════════════════════════════════════════════════════════════

-- 1️⃣ SALES ORDERS APPROVAL WORKFLOWS (4 tiers)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO approval_workflows (
    company_id, module, workflow_name,
    min_amount, max_amount, approval_role, required_approvals_count,
    is_active, approval_order, timeout_hours, description
)
SELECT 
    c.id,
    s.module,
    s.workflow_name,
    s.min_amount,
    s.max_amount,
    s.approval_role,
    s.required_approvals_count,
    true,
    s.approval_order,
    s.timeout_hours,
    s.description
FROM 
    companies c
CROSS JOIN (
    VALUES
        -- Tier 1: Small orders (0-10K SAR) → Finance
        ('sales_orders', 'SO: Small (< 10K)', 0, 9999.99, 'finance', 1, 1, 48, 'Small sales orders require finance approval'),
        
        -- Tier 2: Medium orders (10K-50K SAR) → Finance
        ('sales_orders', 'SO: Medium (10K-50K)', 10000, 49999.99, 'finance', 1, 2, 72, 'Medium sales orders require finance approval'),
        
        -- Tier 3: Large orders (50K-100K SAR) → Management
        ('sales_orders', 'SO: Large (50K-100K)', 50000, 99999.99, 'management', 1, 3, 96, 'Large sales orders require management approval'),
        
        -- Tier 4: Very large orders (>100K SAR) → Super Admin
        ('sales_orders', 'SO: Very Large (>100K)', 100000, NULL, 'super_admin', 1, 4, 120, 'Very large sales orders require super admin approval')
) AS s(module, workflow_name, min_amount, max_amount, approval_role, required_approvals_count, approval_order, timeout_hours, description)
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM approval_workflows aw 
    WHERE aw.company_id = c.id 
      AND aw.module = s.module 
      AND aw.workflow_name = s.workflow_name
  );

-- 2️⃣ SALES INVOICES APPROVAL WORKFLOWS (3 tiers)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO approval_workflows (
    company_id, module, workflow_name,
    min_amount, max_amount, approval_role, required_approvals_count,
    is_active, approval_order, timeout_hours, description
)
SELECT 
    c.id,
    s.module,
    s.workflow_name,
    s.min_amount,
    s.max_amount,
    s.approval_role,
    s.required_approvals_count,
    true,
    s.approval_order,
    s.timeout_hours,
    s.description
FROM 
    companies c
CROSS JOIN (
    VALUES
        -- Tier 1: Small invoices (0-10K SAR) → Finance
        ('sales_invoices', 'SI: Small (< 10K)', 0, 9999.99, 'finance', 1, 1, 48, 'Small sales invoices require finance approval'),
        
        -- Tier 2: Medium invoices (10K-50K SAR) → Finance
        ('sales_invoices', 'SI: Medium (10K-50K)', 10000, 49999.99, 'finance', 1, 2, 72, 'Medium sales invoices require finance approval'),
        
        -- Tier 3: Large invoices (>50K SAR) → Management
        ('sales_invoices', 'SI: Large (>50K)', 50000, NULL, 'management', 1, 3, 96, 'Large sales invoices require management approval')
) AS s(module, workflow_name, min_amount, max_amount, approval_role, required_approvals_count, approval_order, timeout_hours, description)
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM approval_workflows aw 
    WHERE aw.company_id = c.id 
      AND aw.module = s.module 
      AND aw.workflow_name = s.workflow_name
  );

-- 3️⃣ CUSTOMER RECEIPTS APPROVAL WORKFLOWS (3 tiers)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO approval_workflows (
    company_id, module, workflow_name,
    min_amount, max_amount, approval_role, required_approvals_count,
    is_active, approval_order, timeout_hours, description
)
SELECT 
    c.id,
    s.module,
    s.workflow_name,
    s.min_amount,
    s.max_amount,
    s.approval_role,
    s.required_approvals_count,
    true,
    s.approval_order,
    s.timeout_hours,
    s.description
FROM 
    companies c
CROSS JOIN (
    VALUES
        -- Tier 1: Small receipts (0-20K SAR) → Finance
        ('customer_receipts', 'CR: Small (< 20K)', 0, 19999.99, 'finance', 1, 1, 48, 'Small customer receipts require finance approval'),
        
        -- Tier 2: Medium receipts (20K-100K SAR) → Management
        ('customer_receipts', 'CR: Medium (20K-100K)', 20000, 99999.99, 'management', 1, 2, 72, 'Medium customer receipts require management approval'),
        
        -- Tier 3: Large receipts (>100K SAR) → Super Admin
        ('customer_receipts', 'CR: Large (>100K)', 100000, NULL, 'super_admin', 1, 3, 96, 'Large customer receipts require super admin approval')
) AS s(module, workflow_name, min_amount, max_amount, approval_role, required_approvals_count, approval_order, timeout_hours, description)
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM approval_workflows aw 
    WHERE aw.company_id = c.id 
      AND aw.module = s.module 
      AND aw.workflow_name = s.workflow_name
  );

-- ════════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ════════════════════════════════════════════════════════════════════════════
-- Total workflows added: 10 (per company)
-- - Sales Orders: 4 tiers (0-10K, 10K-50K, 50K-100K, >100K)
-- - Sales Invoices: 3 tiers (0-10K, 10K-50K, >50K)
-- - Customer Receipts: 3 tiers (0-20K, 20K-100K, >100K)
-- ════════════════════════════════════════════════════════════════════════════
