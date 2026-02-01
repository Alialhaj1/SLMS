-- Migration: 197_vendor_documents_and_enhancements.sql
-- Description: Add vendor documents, logo, projects relationship, and new permissions
-- Date: 2026-01-26
-- SAFE: Non-destructive migration

-- =====================================================
-- 1. Add vendor_logo_url column to vendors table
-- =====================================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS vendor_logo_url VARCHAR(500);

-- =====================================================
-- 2. Create vendor_documents table
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_documents (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Document info
    document_type VARCHAR(50) NOT NULL, -- 'commercial_register', 'tax_certificate', 'iban_letter', 'contract', 'certification', 'other'
    document_number VARCHAR(100),
    document_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- File info
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER, -- in bytes
    file_type VARCHAR(50), -- mime type
    
    -- Dates
    issue_date DATE,
    expiry_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'pending_renewal'
    is_required BOOLEAN DEFAULT false,
    
    -- Audit
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor_id ON vendor_documents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_expiry ON vendor_documents(expiry_date) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_vendor_documents_company ON vendor_documents(company_id);

-- =====================================================
-- 3. Create vendor_projects junction table
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_projects (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Financials (cached, updated by triggers/functions)
    total_contracted DECIMAL(18,2) DEFAULT 0,
    total_paid DECIMAL(18,2) DEFAULT 0,
    total_outstanding DECIMAL(18,2) DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(vendor_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_projects_vendor ON vendor_projects(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_projects_project ON vendor_projects(project_id);

-- =====================================================
-- 4. Add rating breakdown columns to vendors
-- =====================================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating_quality DECIMAL(3,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating_delivery DECIMAL(3,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating_price DECIMAL(3,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating_compliance DECIMAL(3,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating_notes TEXT;

-- =====================================================
-- 5. Add default_currency_id to vendors
-- =====================================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS default_currency_id INTEGER REFERENCES currencies(id);

-- =====================================================
-- 6. Create document types reference table
-- =====================================================
CREATE TABLE IF NOT EXISTS vendor_document_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    requires_expiry BOOLEAN DEFAULT true,
    expiry_warning_days INTEGER DEFAULT 30,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default document types
INSERT INTO vendor_document_types (code, name_en, name_ar, is_required, requires_expiry, sort_order)
VALUES 
    ('commercial_register', 'Commercial Register', 'السجل التجاري', true, true, 1),
    ('tax_certificate', 'Tax Certificate', 'الشهادة الضريبية', true, true, 2),
    ('vat_certificate', 'VAT Certificate', 'شهادة ضريبة القيمة المضافة', true, true, 3),
    ('iban_letter', 'IBAN Letter', 'خطاب الآيبان', true, false, 4),
    ('contract', 'Contract', 'عقد', false, true, 5),
    ('certification', 'Certification / License', 'شهادة / رخصة', false, true, 6),
    ('insurance', 'Insurance Certificate', 'شهادة تأمين', false, true, 7),
    ('quality_cert', 'Quality Certificate (ISO)', 'شهادة الجودة (أيزو)', false, true, 8),
    ('bank_guarantee', 'Bank Guarantee', 'ضمان بنكي', false, true, 9),
    ('other', 'Other Document', 'مستند آخر', false, false, 99)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 7. Insert new permissions
-- =====================================================
INSERT INTO permissions (permission_code, resource, action, description)
VALUES 
    ('vendors:documents:view', 'vendors', 'documents:view', 'View vendor documents'),
    ('vendors:documents:manage', 'vendors', 'documents:manage', 'Add/edit/delete vendor documents'),
    ('vendors:logo:update', 'vendors', 'logo:update', 'Update vendor logo'),
    ('vendors:projects:view', 'vendors', 'projects:view', 'View vendor project relationships'),
    ('vendors:rating:edit', 'vendors', 'rating:edit', 'Edit vendor rating breakdown')
ON CONFLICT (permission_code) DO NOTHING;

-- Assign to admin and manager roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin', 'manager')
AND p.permission_code IN (
    'vendors:documents:view',
    'vendors:documents:manage',
    'vendors:logo:update',
    'vendors:projects:view',
    'vendors:rating:edit'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. Function to check for expiring documents
-- =====================================================
CREATE OR REPLACE FUNCTION get_expiring_vendor_documents(
    p_company_id INTEGER,
    p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
    document_id INTEGER,
    vendor_id INTEGER,
    vendor_name VARCHAR,
    document_type VARCHAR,
    document_name VARCHAR,
    expiry_date DATE,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vd.id as document_id,
        vd.vendor_id,
        v.name as vendor_name,
        vd.document_type,
        vd.document_name,
        vd.expiry_date,
        (vd.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry
    FROM vendor_documents vd
    JOIN vendors v ON v.id = vd.vendor_id
    WHERE vd.company_id = p_company_id
    AND vd.deleted_at IS NULL
    AND vd.status = 'active'
    AND vd.expiry_date IS NOT NULL
    AND vd.expiry_date <= CURRENT_DATE + p_days_ahead
    ORDER BY vd.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. Function to update vendor project totals
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_vendor_project_totals(p_vendor_id INTEGER)
RETURNS void AS $$
BEGIN
    -- Update totals from POs and Payments grouped by project
    UPDATE vendor_projects vp
    SET 
        total_contracted = COALESCE((
            SELECT SUM(po.total_amount)
            FROM purchase_orders po
            WHERE po.vendor_id = vp.vendor_id
            AND po.project_id = vp.project_id
            AND po.deleted_at IS NULL
        ), 0),
        total_paid = COALESCE((
            SELECT SUM(vpm.amount)
            FROM vendor_payments vpm
            WHERE vpm.vendor_id = vp.vendor_id
            AND vpm.project_id = vp.project_id
            AND vpm.deleted_at IS NULL
            AND vpm.status = 'completed'
        ), 0),
        updated_at = NOW()
    WHERE vp.vendor_id = p_vendor_id;
    
    -- Calculate outstanding
    UPDATE vendor_projects
    SET total_outstanding = total_contracted - total_paid
    WHERE vendor_id = p_vendor_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. Auto-update document status based on expiry
-- =====================================================
CREATE OR REPLACE FUNCTION update_expired_documents()
RETURNS void AS $$
BEGIN
    UPDATE vendor_documents
    SET status = 'expired', updated_at = NOW()
    WHERE expiry_date < CURRENT_DATE
    AND status = 'active'
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE vendor_documents IS 'Stores vendor documents like commercial register, tax certificates, contracts etc.';
COMMENT ON TABLE vendor_projects IS 'Junction table linking vendors to projects with financial summary';
COMMENT ON TABLE vendor_document_types IS 'Reference table for document types with localized names';
