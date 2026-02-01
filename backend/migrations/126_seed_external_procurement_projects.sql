-- =============================================
-- Seed External Procurement Projects
-- مشاريع تكاليف المشتريات الخارجية
-- Tree structure matching the reference image
-- =============================================

-- First, get or create a project type for procurement
INSERT INTO project_types (code, name, name_ar, icon, color, is_active, company_id)
SELECT 'procurement', 'External Procurement', 'مشتريات خارجية', 'truck', '#3B82F6', true, 1
WHERE NOT EXISTS (SELECT 1 FROM project_types WHERE code = 'procurement' AND company_id = 1);

-- Get the project type ID
DO $$
DECLARE
    v_type_id INTEGER;
    v_root_id INTEGER;
    v_supplier_id INTEGER;
    v_sub_id INTEGER;
BEGIN
    -- Get project type
    SELECT id INTO v_type_id FROM project_types WHERE code = 'procurement' AND company_id = 1 LIMIT 1;
    IF v_type_id IS NULL THEN
        v_type_id := 1; -- fallback
    END IF;

    -- =============================================
    -- ROOT PROJECT: مشاريع تكاليف المشتريات الخارجية - 100
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, description, description_ar,
        parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-100', 
        'External Procurement Cost Projects', 
        'مشاريع تكاليف المشتريات الخارجية',
        'Main project for all external procurement costs',
        'المشروع الرئيسي لجميع تكاليف المشتريات الخارجية',
        NULL, 0, v_type_id,
        'in_progress', 'high', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_root_id;

    -- =============================================
    -- SUPPLIER 1: مشتريات المورد 1 - 101
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-101', 'Supplier 1 Purchases', 'مشتريات المورد 1',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project under Supplier 1
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-101-001', 'Large Cardamom 8mm - 12465547454', 'هيل اكبر 8 ملي 12465547454',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- =============================================
    -- SUPPLIER 2: مشتريات المورد 2 - 102
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-102', 'Supplier 2 Purchases', 'مشتريات المورد 2',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project under Supplier 2
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-102-001', 'Pistachio 34656565413', 'فستق 34656565413',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- =============================================
    -- SUPPLIER 3: SAMIX INDIA PVT - 103
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-103', 'SAMIX INDIA PVT', 'SAMIX INDIA PVT',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-103-001', 'Large Cardamom 2 Containers Contract 2116', 'هيل اكبر 2 حاوية عقد رقم 2116',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- =============================================
    -- SUPPLIER 4: DALIAN JIAHONG BROTHERS - 104
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-104', 'DALIAN JIAHONG BROTHERS', 'DALIAN JIAHONG BROTHERS',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-104-001', 'DLJH25W178 Chinese Walnut - Pumpkin Seeds', 'DLJH25W178 جوز عين الجمل صيني - بذر القرع',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- =============================================
    -- SUPPLIER 5: CHINAKSEN IMPOET AND EXPORT - 105
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-105', 'CHINAKSEN IMPOET AND EXPORT', 'CHINAKSEN IMPOET AND EXPORT',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-105-001', 'Harrari Coffee 3 Containers 108 Bags 50kg', 'شحنة القهوة الهرري 3 حاوية 108 كيس 50 كجم',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- =============================================
    -- SUPPLIER 6: WUZHOU JUFENG CASSIA & SPICES - 106
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-106', 'WUZHOU JUFENG CASSIA & SPICES', 'WUZHOU JUFENG CASSIA & SPICES',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-106-001', 'JFM151 Chinese Cinnamon Sticks 622 Cartons', 'JFM151 قرفة مواسير صيني 622 كرتون - 25',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- =============================================
    -- SUPPLIER 7: QIUBEI YUNNONG AGRO PRODUCTS CO. LTD - 107
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-107', 'QIUBEI YUNNONG AGRO PRODUCTS CO. LTD', 'QIUBEI YUNNONG AGRO PRODUCTS CO. LTD',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project 1
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-107-001', 'Chinese Ginger Slices 18 Tons', 'شحنة زنجبيل صيني شرائح 18 طن',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- Sub-project 2
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-107-002', 'Chinese Walnut Shipment 24 Tons', 'شحنة جوز عين الجمل الصيني 24 طن',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- =============================================
    -- SUPPLIER 8: K.S AGRO IMPEX 220100404 - 108
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-108', 'K.S AGRO IMPEX 220100404', 'K.S AGRO IMPEX 220100404',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-108-001', 'PI NO. KSA/01/22/25 Amber Dar Khawlan Rice - 2 Containers', 'PI NO. KSA/01/22/25 شحنة ارز عنبر دار خولان - حاويتين - عقد رقم',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- =============================================
    -- SUPPLIER 9: PT GAVA PENINSULA ASIAC - 109
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-109', 'PT GAVA PENINSULA ASIAC', 'PT GAVA PENINSULA ASIAC',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-109-001', 'Lemon 2 Containers 2319 Bags 10kg', 'حاويتين ليمون 2319 كيس 10 كجم',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- =============================================
    -- SUPPLIER 10: MINH HOANG BP IMPORT EXPORT COMPANY LIMITED - 110
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-110', 'MINH HOANG BP IMPORT EXPORT COMPANY LIMITED', 'MINH HOANG BP IMPORT EXPORT COMPANY LIMITED',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-110-001', 'Cashew Shipment - 40ft Container January 2026', 'شحنة الكاجو - حاوية 40 قدم يناير 2026',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- =============================================
    -- SUPPLIER 11: BOETTGER FOOD INGREDIENTS GMC - 111
    -- =============================================
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-111', 'BOETTGER FOOD INGREDIENTS GMC', 'BOETTGER FOOD INGREDIENTS GMC',
        v_root_id, 1, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_supplier_id;

    -- Sub-project 1
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-111-001', 'American Pistachio 18-22 Container 1', 'شحنة الفستق الامريكي 18-22 - الحاوية رقم 1',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    -- Sub-project 2
    INSERT INTO projects (
        code, name, name_ar, parent_project_id, level, project_type_id,
        status, priority, is_active, company_id, created_by
    ) VALUES (
        'EXT-111-002', 'American Pistachio 18-22 Container 2', 'شحنة 2 الفستق الامريكي 18-22 - حاوية رقم 2',
        v_supplier_id, 2, v_type_id,
        'in_progress', 'medium', true, 1, 1
    )
    ON CONFLICT (code, company_id) DO NOTHING;

    RAISE NOTICE 'External Procurement Projects seeded successfully!';
END $$;

COMMENT ON TABLE projects IS 'Projects table now includes External Procurement Projects (EXT-100 series)';
