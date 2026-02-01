-- =============================================
-- Migration 124: Seed Sample Project Data
-- =============================================
-- Creates realistic sample projects with hierarchy,
-- tasks, costs, and links for testing.
-- =============================================

BEGIN;

-- =============================================
-- FIX ARABIC ENCODING IN PROJECT TYPES
-- =============================================
UPDATE project_types SET
    name_ar = 'إنشاءات'
WHERE code = 'construction';

UPDATE project_types SET
    name_ar = 'مشتريات خارجية'
WHERE code = 'procurement';

UPDATE project_types SET
    name_ar = 'عقارات'
WHERE code = 'real_estate';

UPDATE project_types SET
    name_ar = 'افتتاح فرع جديد'
WHERE code = 'new_branch';

UPDATE project_types SET
    name_ar = 'تطوير داخلي'
WHERE code = 'internal_dev';

UPDATE project_types SET
    name_ar = 'بحوث وتسويق'
WHERE code = 'research_marketing';

UPDATE project_types SET
    name_ar = 'بنية تحتية تقنية'
WHERE code = 'it_infrastructure';

UPDATE project_types SET
    name_ar = 'أخرى'
WHERE code = 'other';

-- =============================================
-- SAMPLE ROOT PROJECTS (Level 0)
-- =============================================

-- Project 1: Construction Project (Main Building)
INSERT INTO projects (
    company_id, code, name, name_ar, customer_id, start_date, end_date,
    budget, status, cost_center_id, is_active, created_by,
    parent_project_id, level, project_type_id,
    description, description_ar, manager_id, priority,
    budget_materials, budget_labor, budget_services, budget_miscellaneous,
    progress_percent
) VALUES (
    1, 'PRJ-2026-001', 'New Headquarters Building', 'مبنى المقر الرئيسي الجديد',
    NULL, '2026-01-15', '2027-06-30',
    5000000.00, 'in_progress', 3, TRUE, 1,
    NULL, 0, 1,
    'Construction of new 5-story headquarters building with modern facilities including offices, meeting rooms, cafeteria, and underground parking.',
    'بناء مبنى المقر الرئيسي الجديد من 5 طوابق بمرافق حديثة تشمل مكاتب وقاعات اجتماعات ومطعم ومواقف سيارات تحت الأرض.',
    1, 'high',
    2500000.00, 1500000.00, 750000.00, 250000.00,
    25
) ON CONFLICT DO NOTHING;

-- Project 2: IT Infrastructure Project
INSERT INTO projects (
    company_id, code, name, name_ar, customer_id, start_date, end_date,
    budget, status, cost_center_id, is_active, created_by,
    parent_project_id, level, project_type_id,
    description, description_ar, manager_id, priority,
    budget_materials, budget_labor, budget_services, budget_miscellaneous,
    progress_percent
) VALUES (
    1, 'PRJ-2026-002', 'ERP System Implementation', 'تطبيق نظام تخطيط موارد المؤسسة',
    NULL, '2026-02-01', '2026-08-31',
    800000.00, 'in_progress', 9, TRUE, 1,
    NULL, 0, 7,
    'Full ERP system implementation including modules for Finance, HR, Inventory, Sales, and Procurement with custom integrations.',
    'تطبيق نظام ERP كامل يشمل وحدات المالية والموارد البشرية والمخزون والمبيعات والمشتريات مع تكاملات مخصصة.',
    1, 'critical',
    200000.00, 400000.00, 150000.00, 50000.00,
    40
) ON CONFLICT DO NOTHING;

-- Project 3: New Branch Opening
INSERT INTO projects (
    company_id, code, name, name_ar, customer_id, start_date, end_date,
    budget, status, cost_center_id, is_active, created_by,
    parent_project_id, level, project_type_id,
    description, description_ar, manager_id, priority,
    budget_materials, budget_labor, budget_services, budget_miscellaneous,
    progress_percent
) VALUES (
    1, 'PRJ-2026-003', 'Jeddah Branch Opening', 'افتتاح فرع جدة',
    NULL, '2026-03-01', '2026-09-30',
    1200000.00, 'planned', 7, TRUE, 1,
    NULL, 0, 4,
    'Opening a new branch in Jeddah including location scouting, setup, staffing, and launch activities.',
    'افتتاح فرع جديد في جدة يشمل البحث عن موقع والتجهيز والتوظيف وأنشطة الإطلاق.',
    COALESCE((SELECT id FROM users WHERE id = 1), (SELECT id FROM users ORDER BY id LIMIT 1)), 'high',
    400000.00, 300000.00, 400000.00, 100000.00,
    0
) ON CONFLICT DO NOTHING;

-- Project 4: Marketing Campaign
INSERT INTO projects (
    company_id, code, name, name_ar, customer_id, start_date, end_date,
    budget, status, cost_center_id, is_active, created_by,
    parent_project_id, level, project_type_id,
    description, description_ar, manager_id, priority,
    budget_materials, budget_labor, budget_services, budget_miscellaneous,
    progress_percent
) VALUES (
    1, 'PRJ-2026-004', '2026 Brand Awareness Campaign', 'حملة الوعي بالعلامة التجارية 2026',
    NULL, '2026-01-01', '2026-12-31',
    350000.00, 'in_progress', 9, TRUE, 1,
    NULL, 0, 6,
    'Year-long brand awareness campaign including digital marketing, print media, events, and sponsorships.',
    'حملة توعية بالعلامة التجارية على مدار العام تشمل التسويق الرقمي والإعلانات المطبوعة والفعاليات والرعايات.',
    1, 'medium',
    50000.00, 100000.00, 180000.00, 20000.00,
    15
) ON CONFLICT DO NOTHING;

-- Project 5: Procurement - Fleet Renewal
INSERT INTO projects (
    company_id, code, name, name_ar, customer_id, start_date, end_date,
    budget, status, cost_center_id, is_active, created_by,
    parent_project_id, level, project_type_id,
    description, description_ar, manager_id, priority,
    budget_materials, budget_labor, budget_services, budget_miscellaneous,
    progress_percent
) VALUES (
    1, 'PRJ-2026-005', 'Fleet Renewal Program', 'برنامج تجديد الأسطول',
    NULL, '2026-01-01', '2026-06-30',
    2000000.00, 'in_progress', 10, TRUE, 1,
    NULL, 0, 2,
    'Renewal of company vehicle fleet including trucks, vans, and executive vehicles.',
    'تجديد أسطول مركبات الشركة بما في ذلك الشاحنات والفانات والسيارات التنفيذية.',
    COALESCE((SELECT id FROM users WHERE id = 1), (SELECT id FROM users ORDER BY id LIMIT 1)), 'medium',
    1800000.00, 50000.00, 100000.00, 50000.00,
    60
) ON CONFLICT DO NOTHING;

-- =============================================
-- SUB-PROJECTS (Level 1) - Children of PRJ-2026-001
-- =============================================

-- Get parent project ID
DO $$
DECLARE
    v_parent_id INTEGER;
    v_parent_id_2 INTEGER;
BEGIN
    SELECT id INTO v_parent_id FROM projects WHERE code = 'PRJ-2026-001';
    
    -- Sub-project 1.1: Foundation Work
    INSERT INTO projects (
        company_id, code, name, name_ar, customer_id, start_date, end_date,
        budget, status, cost_center_id, is_active, created_by,
        parent_project_id, level, project_type_id,
        description, description_ar, manager_id, priority,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        progress_percent
    ) VALUES (
        1, 'PRJ-2026-001-A', 'Foundation & Structure', 'الأساسات والهيكل',
        NULL, '2026-01-15', '2026-06-30',
        1500000.00, 'in_progress', 3, TRUE, 1,
        v_parent_id, 1, 1,
        'Foundation excavation, concrete pouring, and steel structure erection.',
        'حفر الأساسات وصب الخرسانة وتركيب الهيكل الفولاذي.',
        1, 'critical',
        900000.00, 450000.00, 100000.00, 50000.00,
        45
    ) ON CONFLICT DO NOTHING;
    
    -- Sub-project 1.2: Electrical & Mechanical
    INSERT INTO projects (
        company_id, code, name, name_ar, customer_id, start_date, end_date,
        budget, status, cost_center_id, is_active, created_by,
        parent_project_id, level, project_type_id,
        description, description_ar, manager_id, priority,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        progress_percent
    ) VALUES (
        1, 'PRJ-2026-001-B', 'Electrical & Mechanical Systems', 'الأنظمة الكهربائية والميكانيكية',
        NULL, '2026-04-01', '2026-12-31',
        1200000.00, 'planned', 3, TRUE, 1,
        v_parent_id, 1, 1,
        'Installation of electrical wiring, HVAC systems, plumbing, and fire safety systems.',
        'تركيب الأسلاك الكهربائية وأنظمة التكييف والسباكة وأنظمة السلامة من الحرائق.',
        1, 'high',
        700000.00, 350000.00, 100000.00, 50000.00,
        0
    ) ON CONFLICT DO NOTHING;
    
    -- Sub-project 1.3: Interior Finishing
    INSERT INTO projects (
        company_id, code, name, name_ar, customer_id, start_date, end_date,
        budget, status, cost_center_id, is_active, created_by,
        parent_project_id, level, project_type_id,
        description, description_ar, manager_id, priority,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        progress_percent
    ) VALUES (
        1, 'PRJ-2026-001-C', 'Interior Finishing', 'التشطيبات الداخلية',
        NULL, '2026-09-01', '2027-03-31',
        1000000.00, 'planned', 3, TRUE, 1,
        v_parent_id, 1, 1,
        'Flooring, painting, ceiling work, and office partitions.',
        'الأرضيات والدهانات وأعمال الأسقف وتقسيمات المكاتب.',
        1, 'medium',
        600000.00, 300000.00, 50000.00, 50000.00,
        0
    ) ON CONFLICT DO NOTHING;
    
    -- Sub-project 1.4: Furniture & Equipment
    INSERT INTO projects (
        company_id, code, name, name_ar, customer_id, start_date, end_date,
        budget, status, cost_center_id, is_active, created_by,
        parent_project_id, level, project_type_id,
        description, description_ar, manager_id, priority,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        progress_percent
    ) VALUES (
        1, 'PRJ-2026-001-D', 'Furniture & Equipment', 'الأثاث والمعدات',
        NULL, '2027-01-01', '2027-05-31',
        800000.00, 'planned', 3, TRUE, 1,
        v_parent_id, 1, 2,
        'Procurement and installation of office furniture, IT equipment, and appliances.',
        'شراء وتركيب أثاث المكاتب ومعدات تكنولوجيا المعلومات والأجهزة.',
        COALESCE((SELECT id FROM users WHERE id = 1), (SELECT id FROM users ORDER BY id LIMIT 1)), 'medium',
        700000.00, 50000.00, 30000.00, 20000.00,
        0
    ) ON CONFLICT DO NOTHING;

    -- Get ERP project ID for sub-projects
    SELECT id INTO v_parent_id_2 FROM projects WHERE code = 'PRJ-2026-002';
    
    -- Sub-project 2.1: Finance Module
    INSERT INTO projects (
        company_id, code, name, name_ar, customer_id, start_date, end_date,
        budget, status, cost_center_id, is_active, created_by,
        parent_project_id, level, project_type_id,
        description, description_ar, manager_id, priority,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        progress_percent
    ) VALUES (
        1, 'PRJ-2026-002-A', 'Finance Module Implementation', 'تطبيق وحدة المالية',
        NULL, '2026-02-01', '2026-04-30',
        200000.00, 'completed', 9, TRUE, 1,
        v_parent_id_2, 1, 7,
        'Implementation of GL, AR, AP, and financial reporting modules.',
        'تطبيق وحدات دفتر الأستاذ العام والمدينون والدائنون والتقارير المالية.',
        1, 'critical',
        50000.00, 100000.00, 40000.00, 10000.00,
        100
    ) ON CONFLICT DO NOTHING;
    
    -- Sub-project 2.2: Inventory Module
    INSERT INTO projects (
        company_id, code, name, name_ar, customer_id, start_date, end_date,
        budget, status, cost_center_id, is_active, created_by,
        parent_project_id, level, project_type_id,
        description, description_ar, manager_id, priority,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        progress_percent
    ) VALUES (
        1, 'PRJ-2026-002-B', 'Inventory Module Implementation', 'تطبيق وحدة المخزون',
        NULL, '2026-03-01', '2026-05-31',
        150000.00, 'in_progress', 9, TRUE, 1,
        v_parent_id_2, 1, 7,
        'Implementation of inventory management, warehousing, and stock control modules.',
        'تطبيق إدارة المخزون والتخزين ووحدات مراقبة المخزون.',
        1, 'high',
        30000.00, 80000.00, 30000.00, 10000.00,
        70
    ) ON CONFLICT DO NOTHING;
    
    -- Sub-project 2.3: HR Module
    INSERT INTO projects (
        company_id, code, name, name_ar, customer_id, start_date, end_date,
        budget, status, cost_center_id, is_active, created_by,
        parent_project_id, level, project_type_id,
        description, description_ar, manager_id, priority,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        progress_percent
    ) VALUES (
        1, 'PRJ-2026-002-C', 'HR Module Implementation', 'تطبيق وحدة الموارد البشرية',
        NULL, '2026-04-01', '2026-06-30',
        150000.00, 'planned', 9, TRUE, 1,
        v_parent_id_2, 1, 7,
        'Implementation of employee management, payroll, attendance, and leave management.',
        'تطبيق إدارة الموظفين والرواتب والحضور وإدارة الإجازات.',
        1, 'medium',
        30000.00, 80000.00, 30000.00, 10000.00,
        0
    ) ON CONFLICT DO NOTHING;
END $$;

-- =============================================
-- LEVEL 2 SUB-PROJECTS (Grandchildren)
-- =============================================
DO $$
DECLARE
    v_parent_id INTEGER;
BEGIN
    SELECT id INTO v_parent_id FROM projects WHERE code = 'PRJ-2026-001-A';
    
    -- Sub-sub-project: Excavation
    INSERT INTO projects (
        company_id, code, name, name_ar, customer_id, start_date, end_date,
        budget, status, cost_center_id, is_active, created_by,
        parent_project_id, level, project_type_id,
        description, description_ar, manager_id, priority,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        progress_percent
    ) VALUES (
        1, 'PRJ-2026-001-A1', 'Site Excavation', 'حفر الموقع',
        NULL, '2026-01-15', '2026-02-28',
        300000.00, 'completed', 3, TRUE, 1,
        v_parent_id, 2, 1,
        'Site preparation and excavation for foundation.',
        'تجهيز الموقع وحفر الأساسات.',
        1, 'critical',
        50000.00, 200000.00, 40000.00, 10000.00,
        100
    ) ON CONFLICT DO NOTHING;
    
    -- Sub-sub-project: Concrete Work
    INSERT INTO projects (
        company_id, code, name, name_ar, customer_id, start_date, end_date,
        budget, status, cost_center_id, is_active, created_by,
        parent_project_id, level, project_type_id,
        description, description_ar, manager_id, priority,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        progress_percent
    ) VALUES (
        1, 'PRJ-2026-001-A2', 'Concrete Pouring', 'صب الخرسانة',
        NULL, '2026-02-15', '2026-04-30',
        500000.00, 'in_progress', 3, TRUE, 1,
        v_parent_id, 2, 1,
        'Reinforced concrete foundation and columns.',
        'الأساسات الخرسانية المسلحة والأعمدة.',
        1, 'critical',
        350000.00, 120000.00, 20000.00, 10000.00,
        60
    ) ON CONFLICT DO NOTHING;
    
    -- Sub-sub-project: Steel Structure
    INSERT INTO projects (
        company_id, code, name, name_ar, customer_id, start_date, end_date,
        budget, status, cost_center_id, is_active, created_by,
        parent_project_id, level, project_type_id,
        description, description_ar, manager_id, priority,
        budget_materials, budget_labor, budget_services, budget_miscellaneous,
        progress_percent
    ) VALUES (
        1, 'PRJ-2026-001-A3', 'Steel Structure Erection', 'تركيب الهيكل الفولاذي',
        NULL, '2026-04-01', '2026-06-30',
        700000.00, 'planned', 3, TRUE, 1,
        v_parent_id, 2, 1,
        'Fabrication and erection of steel frame structure.',
        'تصنيع وتركيب الهيكل الفولاذي.',
        1, 'high',
        500000.00, 130000.00, 50000.00, 20000.00,
        0
    ) ON CONFLICT DO NOTHING;
END $$;

-- =============================================
-- PROJECT ITEMS (Tasks/Milestones)
-- =============================================
DO $$
DECLARE
    v_project_id INTEGER;
BEGIN
    -- Get ERP project ID
    SELECT id INTO v_project_id FROM projects WHERE code = 'PRJ-2026-002';
    
    -- Milestones for ERP Project
    INSERT INTO project_items (project_id, company_id, code, item_type, name, name_ar, description, description_ar, planned_start_date, planned_end_date, progress_percent, status, sort_order, created_by)
    VALUES
        (v_project_id, 1, 'MS-001', 'milestone', 'Project Kickoff', 'انطلاق المشروع', 'Initial project kickoff meeting and planning', 'اجتماع انطلاق المشروع والتخطيط الأولي', '2026-02-01', '2026-02-01', 100, 'completed', 1, 1),
        (v_project_id, 1, 'MS-002', 'milestone', 'Requirements Gathering Complete', 'اكتمال جمع المتطلبات', 'All business requirements documented', 'توثيق جميع متطلبات الأعمال', '2026-02-15', '2026-02-28', 100, 'completed', 2, 1),
        (v_project_id, 1, 'MS-003', 'milestone', 'System Design Approval', 'اعتماد تصميم النظام', 'Technical and functional design approved', 'اعتماد التصميم التقني والوظيفي', '2026-03-15', '2026-03-15', 100, 'completed', 3, 1),
        (v_project_id, 1, 'MS-004', 'milestone', 'UAT Start', 'بدء اختبار قبول المستخدم', 'User Acceptance Testing begins', 'بدء اختبار قبول المستخدم', '2026-06-01', '2026-06-01', 0, 'pending', 4, 1),
        (v_project_id, 1, 'MS-005', 'milestone', 'Go-Live', 'التشغيل الفعلي', 'System goes live in production', 'تشغيل النظام في بيئة الإنتاج', '2026-08-01', '2026-08-01', 0, 'pending', 5, 1)
    ON CONFLICT DO NOTHING;
    
    -- Tasks for ERP Project
    INSERT INTO project_items (project_id, company_id, code, item_type, name, name_ar, description, description_ar, planned_start_date, planned_end_date, progress_percent, status, assigned_to_id, sort_order, created_by)
    VALUES
        (v_project_id, 1, 'TSK-001', 'task', 'Data Migration Planning', 'تخطيط نقل البيانات', 'Plan data migration from legacy systems', 'تخطيط نقل البيانات من الأنظمة القديمة', '2026-03-01', '2026-03-15', 80, 'in_progress', 1, 10, 1),
        (v_project_id, 1, 'TSK-002', 'task', 'User Training Materials', 'مواد تدريب المستخدمين', 'Prepare training documentation', 'إعداد وثائق التدريب', '2026-05-01', '2026-05-31', 20, 'in_progress', 1, 11, 1),
        (v_project_id, 1, 'TSK-003', 'task', 'Integration Testing', 'اختبار التكامل', 'Test integrations with external systems', 'اختبار التكاملات مع الأنظمة الخارجية', '2026-05-15', '2026-06-15', 0, 'pending', 1, 12, 1),
        (v_project_id, 1, 'TSK-004', 'task', 'Performance Optimization', 'تحسين الأداء', 'Optimize system performance', 'تحسين أداء النظام', '2026-06-15', '2026-07-15', 0, 'pending', 1, 13, 1)
    ON CONFLICT DO NOTHING;
    
    -- Deliverables for ERP Project
    INSERT INTO project_items (project_id, company_id, code, item_type, name, name_ar, description, description_ar, planned_start_date, planned_end_date, progress_percent, status, sort_order, created_by)
    VALUES
        (v_project_id, 1, 'DLV-001', 'deliverable', 'Business Requirements Document', 'وثيقة متطلبات الأعمال', 'Complete BRD with all requirements', 'وثيقة متطلبات الأعمال الكاملة', '2026-02-01', '2026-02-28', 100, 'completed', 20, 1),
        (v_project_id, 1, 'DLV-002', 'deliverable', 'Technical Design Document', 'وثيقة التصميم التقني', 'System architecture and design specifications', 'مواصفات هندسة النظام والتصميم', '2026-03-01', '2026-03-15', 100, 'completed', 21, 1),
        (v_project_id, 1, 'DLV-003', 'deliverable', 'User Manual', 'دليل المستخدم', 'End-user documentation', 'وثائق المستخدم النهائي', '2026-07-01', '2026-07-31', 0, 'pending', 22, 1),
        (v_project_id, 1, 'DLV-004', 'deliverable', 'Training Completion Report', 'تقرير إتمام التدريب', 'Documentation of completed training sessions', 'توثيق جلسات التدريب المكتملة', '2026-07-15', '2026-08-01', 0, 'pending', 23, 1)
    ON CONFLICT DO NOTHING;
    
    -- Get Construction project ID
    SELECT id INTO v_project_id FROM projects WHERE code = 'PRJ-2026-001';
    
    -- Phases for Construction Project
    INSERT INTO project_items (project_id, company_id, code, item_type, name, name_ar, description, description_ar, planned_start_date, planned_end_date, progress_percent, status, sort_order, created_by)
    VALUES
        (v_project_id, 1, 'PHS-001', 'phase', 'Phase 1: Foundation', 'المرحلة 1: الأساسات', 'Foundation and underground work', 'أعمال الأساسات والأعمال تحت الأرض', '2026-01-15', '2026-06-30', 45, 'in_progress', 1, 1),
        (v_project_id, 1, 'PHS-002', 'phase', 'Phase 2: Structure', 'المرحلة 2: الهيكل', 'Main building structure', 'الهيكل الرئيسي للمبنى', '2026-05-01', '2026-12-31', 0, 'pending', 2, 1),
        (v_project_id, 1, 'PHS-003', 'phase', 'Phase 3: MEP', 'المرحلة 3: الكهروميكانيك', 'Mechanical, Electrical, Plumbing', 'الأعمال الميكانيكية والكهربائية والسباكة', '2026-09-01', '2027-03-31', 0, 'pending', 3, 1),
        (v_project_id, 1, 'PHS-004', 'phase', 'Phase 4: Finishing', 'المرحلة 4: التشطيبات', 'Interior and exterior finishing', 'التشطيبات الداخلية والخارجية', '2027-01-01', '2027-05-31', 0, 'pending', 4, 1),
        (v_project_id, 1, 'PHS-005', 'phase', 'Phase 5: Handover', 'المرحلة 5: التسليم', 'Final inspection and handover', 'التفتيش النهائي والتسليم', '2027-05-01', '2027-06-30', 0, 'pending', 5, 1)
    ON CONFLICT DO NOTHING;
END $$;

-- =============================================
-- PROJECT COSTS (Actual Expenses)
-- =============================================
DO $$
DECLARE
    v_project_id INTEGER;
BEGIN
    -- Get Construction project ID
    SELECT id INTO v_project_id FROM projects WHERE code = 'PRJ-2026-001-A1';
    
    -- Costs for Excavation sub-project (Completed)
    INSERT INTO project_costs (project_id, company_id, category, description, description_ar, budgeted_amount, actual_amount, cost_date, source_type, source_reference, created_by)
    VALUES
        (v_project_id, 1, 'materials', 'Excavation equipment rental', 'إيجار معدات الحفر', 40000.00, 42500.00, '2026-01-20', 'invoice', 'INV-2026-0015', 1),
        (v_project_id, 1, 'labor', 'Excavation crew wages', 'أجور طاقم الحفر', 150000.00, 148000.00, '2026-02-15', 'payroll', 'PAY-2026-02', 1),
        (v_project_id, 1, 'labor', 'Excavation supervision', 'إشراف على الحفر', 50000.00, 52000.00, '2026-02-28', 'payroll', 'PAY-2026-02B', 1),
        (v_project_id, 1, 'services', 'Soil testing services', 'خدمات فحص التربة', 30000.00, 28500.00, '2026-01-25', 'invoice', 'INV-2026-0018', 1),
        (v_project_id, 1, 'miscellaneous', 'Site security and utilities', 'أمن الموقع والمرافق', 10000.00, 11200.00, '2026-02-28', 'expense', 'EXP-2026-0042', 1)
    ON CONFLICT DO NOTHING;
    
    -- Get Concrete project ID
    SELECT id INTO v_project_id FROM projects WHERE code = 'PRJ-2026-001-A2';
    
    -- Costs for Concrete sub-project (In Progress)
    INSERT INTO project_costs (project_id, company_id, category, description, description_ar, budgeted_amount, actual_amount, cost_date, source_type, source_reference, created_by)
    VALUES
        (v_project_id, 1, 'materials', 'Concrete supply - Batch 1', 'توريد خرسانة - الدفعة 1', 100000.00, 98500.00, '2026-02-20', 'invoice', 'INV-2026-0025', 1),
        (v_project_id, 1, 'materials', 'Concrete supply - Batch 2', 'توريد خرسانة - الدفعة 2', 100000.00, 102000.00, '2026-03-15', 'invoice', 'INV-2026-0038', 1),
        (v_project_id, 1, 'materials', 'Steel reinforcement bars', 'قضبان التسليح الفولاذية', 120000.00, 118000.00, '2026-02-25', 'invoice', 'INV-2026-0028', 1),
        (v_project_id, 1, 'labor', 'Concrete workers - Feb', 'عمال الخرسانة - فبراير', 35000.00, 36500.00, '2026-02-28', 'payroll', 'PAY-2026-02C', 1),
        (v_project_id, 1, 'labor', 'Concrete workers - Mar', 'عمال الخرسانة - مارس', 40000.00, 41000.00, '2026-03-31', 'payroll', 'PAY-2026-03C', 1),
        (v_project_id, 1, 'services', 'Concrete pump rental', 'إيجار مضخة الخرسانة', 15000.00, 14500.00, '2026-03-10', 'invoice', 'INV-2026-0035', 1)
    ON CONFLICT DO NOTHING;
    
    -- Get ERP project ID
    SELECT id INTO v_project_id FROM projects WHERE code = 'PRJ-2026-002-A';
    
    -- Costs for Finance Module (Completed)
    INSERT INTO project_costs (project_id, company_id, category, description, description_ar, budgeted_amount, actual_amount, cost_date, source_type, source_reference, created_by)
    VALUES
        (v_project_id, 1, 'materials', 'Software licenses', 'تراخيص البرمجيات', 50000.00, 48000.00, '2026-02-05', 'invoice', 'INV-2026-0012', 1),
        (v_project_id, 1, 'labor', 'Implementation consultants', 'استشاريون التنفيذ', 80000.00, 85000.00, '2026-04-30', 'invoice', 'INV-2026-0065', 1),
        (v_project_id, 1, 'services', 'Data migration services', 'خدمات نقل البيانات', 30000.00, 28500.00, '2026-04-15', 'invoice', 'INV-2026-0058', 1),
        (v_project_id, 1, 'services', 'Training services', 'خدمات التدريب', 10000.00, 12000.00, '2026-04-25', 'invoice', 'INV-2026-0062', 1),
        (v_project_id, 1, 'miscellaneous', 'Travel and accommodation', 'السفر والإقامة', 10000.00, 9500.00, '2026-04-30', 'expense', 'EXP-2026-0088', 1)
    ON CONFLICT DO NOTHING;
    
    -- Get Fleet project ID
    SELECT id INTO v_project_id FROM projects WHERE code = 'PRJ-2026-005';
    
    -- Costs for Fleet Renewal (In Progress)
    INSERT INTO project_costs (project_id, company_id, category, description, description_ar, budgeted_amount, actual_amount, cost_date, source_type, source_reference, created_by)
    VALUES
        (v_project_id, 1, 'materials', 'Trucks purchase - Batch 1', 'شراء شاحنات - الدفعة 1', 600000.00, 585000.00, '2026-01-20', 'invoice', 'INV-2026-0008', 1),
        (v_project_id, 1, 'materials', 'Trucks purchase - Batch 2', 'شراء شاحنات - الدفعة 2', 600000.00, 610000.00, '2026-03-15', 'invoice', 'INV-2026-0042', 1),
        (v_project_id, 1, 'materials', 'Executive vehicles', 'سيارات تنفيذية', 400000.00, 395000.00, '2026-02-28', 'invoice', 'INV-2026-0032', 1),
        (v_project_id, 1, 'services', 'Vehicle registration fees', 'رسوم تسجيل المركبات', 50000.00, 48000.00, '2026-03-30', 'invoice', 'INV-2026-0048', 1),
        (v_project_id, 1, 'services', 'Insurance premiums', 'أقساط التأمين', 40000.00, 42000.00, '2026-04-01', 'invoice', 'INV-2026-0052', 1),
        (v_project_id, 1, 'miscellaneous', 'GPS tracking installation', 'تركيب تتبع GPS', 25000.00, 24000.00, '2026-04-10', 'expense', 'EXP-2026-0095', 1)
    ON CONFLICT DO NOTHING;
END $$;

-- =============================================
-- UPDATE PROJECT TOTALS (recalculate budgets)
-- =============================================
-- Update budget totals for projects that have budget breakdown
UPDATE projects 
SET budget = COALESCE(budget_materials, 0) + COALESCE(budget_labor, 0) + 
             COALESCE(budget_services, 0) + COALESCE(budget_miscellaneous, 0)
WHERE budget_materials IS NOT NULL 
   OR budget_labor IS NOT NULL 
   OR budget_services IS NOT NULL 
   OR budget_miscellaneous IS NOT NULL;

COMMIT;

