-- Migration: 202_data_protection_system.sql
-- Description: Data Protection System - DDL Guards, Backup Tables, Audit Triggers
-- Date: 2026-02-01

-- ============================================
-- 1. BACKUP MANAGEMENT TABLES
-- ============================================

-- Backup runs history
CREATE TABLE IF NOT EXISTS backup_history (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL, -- 'full', 'master_data', 'custom', 'pre_migration', 'scheduled'
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000),
    file_size BIGINT,
    tables_included TEXT[], -- Array of table names
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    triggered_by INTEGER REFERENCES users(id),
    trigger_type VARCHAR(50), -- 'manual', 'scheduled', 'pre_migration'
    notes TEXT,
    error_message TEXT,
    checksum VARCHAR(64), -- SHA256 of backup file
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backup schedule configuration
CREATE TABLE IF NOT EXISTS backup_schedules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    backup_type VARCHAR(50) NOT NULL,
    tables_included TEXT[],
    cron_expression VARCHAR(100), -- e.g., '0 3 * * *' for daily at 3 AM
    retention_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restore history
CREATE TABLE IF NOT EXISTS restore_history (
    id SERIAL PRIMARY KEY,
    backup_id INTEGER REFERENCES backup_history(id),
    restore_type VARCHAR(50) NOT NULL, -- 'full', 'partial', 'table'
    tables_restored TEXT[],
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    triggered_by INTEGER REFERENCES users(id),
    notes TEXT,
    error_message TEXT,
    rows_affected JSONB, -- {"items": 1000, "vendors": 500}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. SEED DEFAULT BACKUP SCHEDULES
-- ============================================

INSERT INTO backup_schedules (name, name_ar, backup_type, tables_included, cron_expression, retention_days, is_active)
VALUES 
    ('Daily Full Backup', 'نسخ احتياطي كامل يومي', 'full', NULL, '0 3 * * *', 30, true),
    ('Master Data Backup', 'نسخ البيانات الرئيسية', 'master_data', 
        ARRAY['items', 'item_groups', 'units', 'vendors', 'customers', 'projects', 'accounts', 
              'currencies', 'countries', 'cities', 'ports', 'customs_tariffs', 'companies', 
              'branches', 'warehouses', 'cost_centers', 'printed_templates', 'users', 'roles', 
              'permissions', 'expense_types', 'shipment_expense_types'], 
        '0 */6 * * *', 7, true),
    ('Transaction Backup', 'نسخ المعاملات', 'custom',
        ARRAY['shipments', 'vendor_payments', 'expense_requests', 'purchase_orders', 
              'sales_orders', 'journal_entries', 'general_ledger'],
        '0 * * * *', 1, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. PROTECTED TABLES REGISTRY
-- ============================================

CREATE TABLE IF NOT EXISTS protected_tables (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) UNIQUE NOT NULL,
    protection_level VARCHAR(50) DEFAULT 'standard', -- 'critical', 'standard', 'low'
    allow_truncate BOOLEAN DEFAULT false,
    allow_drop BOOLEAN DEFAULT false,
    allow_hard_delete BOOLEAN DEFAULT false,
    backup_priority INTEGER DEFAULT 1,
    description TEXT,
    description_ar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Register protected tables
INSERT INTO protected_tables (table_name, protection_level, backup_priority, description_ar)
VALUES 
    ('items', 'critical', 1, 'الأصناف'),
    ('item_groups', 'critical', 1, 'مجموعات الأصناف'),
    ('units', 'critical', 1, 'وحدات القياس'),
    ('vendors', 'critical', 1, 'الموردين'),
    ('customers', 'critical', 1, 'العملاء'),
    ('projects', 'critical', 1, 'المشاريع'),
    ('shipments', 'critical', 1, 'الشحنات'),
    ('accounts', 'critical', 1, 'الحسابات'),
    ('companies', 'critical', 1, 'الشركات'),
    ('branches', 'critical', 1, 'الفروع'),
    ('users', 'critical', 1, 'المستخدمين'),
    ('roles', 'critical', 1, 'الأدوار'),
    ('permissions', 'critical', 1, 'الصلاحيات'),
    ('vendor_payments', 'critical', 2, 'مدفوعات الموردين'),
    ('expense_requests', 'critical', 2, 'طلبات المصروفات'),
    ('purchase_orders', 'standard', 2, 'أوامر الشراء'),
    ('sales_orders', 'standard', 2, 'أوامر البيع'),
    ('journal_entries', 'critical', 2, 'القيود اليومية'),
    ('general_ledger', 'critical', 2, 'دفتر الأستاذ'),
    ('customs_tariffs', 'standard', 3, 'التعريفة الجمركية'),
    ('countries', 'standard', 3, 'الدول'),
    ('cities', 'standard', 3, 'المدن'),
    ('ports', 'standard', 3, 'الموانئ'),
    ('currencies', 'standard', 3, 'العملات'),
    ('warehouses', 'standard', 3, 'المخازن'),
    ('cost_centers', 'standard', 3, 'مراكز التكلفة'),
    ('printed_templates', 'standard', 3, 'قوالب الطباعة')
ON CONFLICT (table_name) DO NOTHING;

-- ============================================
-- 4. DANGEROUS OPERATION AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS dangerous_operations_log (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL, -- 'DELETE', 'TRUNCATE', 'DROP', 'UPDATE_BULK'
    table_name VARCHAR(100),
    query_text TEXT,
    affected_rows INTEGER,
    user_id INTEGER,
    user_email VARCHAR(255),
    ip_address VARCHAR(50),
    was_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. SOFT DELETE VERIFICATION FUNCTION
-- ============================================

-- Function to check if a table has soft delete capability
CREATE OR REPLACE FUNCTION has_soft_delete(p_table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_deleted_at BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name 
        AND column_name = 'deleted_at'
    ) INTO has_deleted_at;
    
    RETURN has_deleted_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. BACKUP PERMISSIONS
-- ============================================

INSERT INTO permissions (permission_code, resource, action, description, name_ar, category_id)
VALUES 
    ('backup:view', 'backup', 'view', 'View backup status and history', 'عرض حالة النسخ الاحتياطي', NULL),
    ('backup:create', 'backup', 'create', 'Create manual backups', 'إنشاء نسخ احتياطي يدوي', NULL),
    ('backup:restore', 'backup', 'restore', 'Restore from backup', 'استرجاع من النسخ الاحتياطي', NULL),
    ('backup:delete', 'backup', 'delete', 'Delete backup files', 'حذف ملفات النسخ الاحتياطي', NULL),
    ('backup:schedule', 'backup', 'schedule', 'Manage backup schedules', 'إدارة جدول النسخ الاحتياطي', NULL)
ON CONFLICT (permission_code) DO NOTHING;

-- Assign backup permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin'
AND p.permission_code IN ('backup:view', 'backup:create', 'backup:restore', 'backup:delete', 'backup:schedule')
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_backup_history_type ON backup_history(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backup_history_created ON backup_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dangerous_ops_table ON dangerous_operations_log(table_name);
CREATE INDEX IF NOT EXISTS idx_dangerous_ops_executed ON dangerous_operations_log(executed_at DESC);

-- ============================================
-- 8. HELPER VIEW FOR BACKUP DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW backup_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM backup_history WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours') as backups_last_24h,
    (SELECT COUNT(*) FROM backup_history WHERE status = 'failed' AND created_at > NOW() - INTERVAL '7 days') as failed_last_7d,
    (SELECT MAX(completed_at) FROM backup_history WHERE status = 'completed' AND backup_type = 'full') as last_full_backup,
    (SELECT MAX(completed_at) FROM backup_history WHERE status = 'completed' AND backup_type = 'master_data') as last_master_backup,
    (SELECT COALESCE(SUM(file_size), 0) FROM backup_history WHERE status = 'completed') as total_backup_size,
    (SELECT COUNT(*) FROM protected_tables WHERE protection_level = 'critical') as critical_tables_count,
    (SELECT COUNT(*) FROM backup_schedules WHERE is_active = true) as active_schedules;

COMMENT ON TABLE backup_history IS 'سجل النسخ الاحتياطي - Backup history log';
COMMENT ON TABLE backup_schedules IS 'جدول النسخ الاحتياطي التلقائي - Automated backup schedules';
COMMENT ON TABLE restore_history IS 'سجل الاسترجاع - Restore history log';
COMMENT ON TABLE protected_tables IS 'الجداول المحمية - Protected tables registry';
COMMENT ON TABLE dangerous_operations_log IS 'سجل العمليات الخطرة - Dangerous operations audit log';
