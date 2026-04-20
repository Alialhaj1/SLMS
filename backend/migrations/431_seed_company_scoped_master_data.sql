-- Migration 431: Seed company-scoped master data for ALL companies
-- Seeds: item_categories, group_categories, shipping_companies, shipment_classifications,
--        customs_tariffs, customs_exemptions, insurance_companies, laboratories,
--        shipping_agents, shipment_stages, shipment_expense_types

DO $$
DECLARE
  comp RECORD;
  root_id INTEGER;
BEGIN
  FOR comp IN SELECT id FROM companies WHERE deleted_at IS NULL LOOP

    -------------------------------------------------------
    -- ITEM CATEGORIES (hierarchical - name, name_ar)
    -------------------------------------------------------
    -- Level 1 root categories
    INSERT INTO item_categories (company_id, code, name, name_ar, level, is_active)
    VALUES
      (comp.id, 'RAW', 'Raw Materials', 'مواد خام', 1, TRUE),
      (comp.id, 'FIN', 'Finished Goods', 'بضائع تامة الصنع', 1, TRUE),
      (comp.id, 'PKG', 'Packaging Materials', 'مواد تغليف', 1, TRUE),
      (comp.id, 'OFS', 'Office Supplies', 'مستلزمات مكتبية', 1, TRUE),
      (comp.id, 'SPR', 'Spare Parts', 'قطع غيار', 1, TRUE),
      (comp.id, 'FNB', 'Food & Beverages', 'أغذية ومشروبات', 1, TRUE),
      (comp.id, 'CHM', 'Chemicals', 'مواد كيميائية', 1, TRUE),
      (comp.id, 'EQP', 'Equipment & Machinery', 'معدات وآلات', 1, TRUE),
      (comp.id, 'ELC', 'Electronics', 'إلكترونيات', 1, TRUE),
      (comp.id, 'TXT', 'Textiles & Garments', 'منسوجات وملابس', 1, TRUE),
      (comp.id, 'BLD', 'Building Materials', 'مواد بناء', 1, TRUE),
      (comp.id, 'AUT', 'Automotive Parts', 'قطع سيارات', 1, TRUE)
    ON CONFLICT (company_id, code) DO NOTHING;

    -- Level 2 subcategories under Raw Materials
    SELECT id INTO root_id FROM item_categories WHERE company_id = comp.id AND code = 'RAW' LIMIT 1;
    IF root_id IS NOT NULL THEN
      INSERT INTO item_categories (company_id, parent_id, code, name, name_ar, level, is_active)
      VALUES
        (comp.id, root_id, 'RAW-MTL', 'Metals & Alloys', 'معادن وسبائك', 2, TRUE),
        (comp.id, root_id, 'RAW-PLS', 'Plastics & Polymers', 'بلاستيك وبوليمرات', 2, TRUE),
        (comp.id, root_id, 'RAW-WOD', 'Wood & Timber', 'خشب وأخشاب', 2, TRUE),
        (comp.id, root_id, 'RAW-FBR', 'Fibers & Textiles', 'ألياف ومنسوجات', 2, TRUE)
      ON CONFLICT (company_id, code) DO NOTHING;
    END IF;

    -- Level 2 subcategories under Finished Goods
    SELECT id INTO root_id FROM item_categories WHERE company_id = comp.id AND code = 'FIN' LIMIT 1;
    IF root_id IS NOT NULL THEN
      INSERT INTO item_categories (company_id, parent_id, code, name, name_ar, level, is_active)
      VALUES
        (comp.id, root_id, 'FIN-CON', 'Consumer Goods', 'سلع استهلاكية', 2, TRUE),
        (comp.id, root_id, 'FIN-IND', 'Industrial Products', 'منتجات صناعية', 2, TRUE),
        (comp.id, root_id, 'FIN-MED', 'Medical Devices', 'أجهزة طبية', 2, TRUE),
        (comp.id, root_id, 'FIN-ELC', 'Electronic Products', 'منتجات إلكترونية', 2, TRUE)
      ON CONFLICT (company_id, code) DO NOTHING;
    END IF;

    -- Level 2 subcategories under Chemicals
    SELECT id INTO root_id FROM item_categories WHERE company_id = comp.id AND code = 'CHM' LIMIT 1;
    IF root_id IS NOT NULL THEN
      INSERT INTO item_categories (company_id, parent_id, code, name, name_ar, level, is_active)
      VALUES
        (comp.id, root_id, 'CHM-ORG', 'Organic Chemicals', 'مواد كيميائية عضوية', 2, TRUE),
        (comp.id, root_id, 'CHM-INO', 'Inorganic Chemicals', 'مواد كيميائية غير عضوية', 2, TRUE),
        (comp.id, root_id, 'CHM-PNT', 'Paints & Coatings', 'دهانات وطلاءات', 2, TRUE),
        (comp.id, root_id, 'CHM-ADH', 'Adhesives & Sealants', 'لواصق ومانعات تسرب', 2, TRUE)
      ON CONFLICT (company_id, code) DO NOTHING;
    END IF;

    -------------------------------------------------------
    -- GROUP CATEGORIES (new table)
    -------------------------------------------------------
    INSERT INTO group_categories (company_id, code, name_en, name_ar, description_en, description_ar, sort_order, is_active)
    VALUES
      (comp.id, 'IMP-GEN', 'General Imports', 'واردات عامة', 'Standard import shipments', 'شحنات الاستيراد القياسية', 1, TRUE),
      (comp.id, 'IMP-PRJ', 'Project Imports', 'واردات المشاريع', 'Project-specific imports', 'واردات خاصة بالمشاريع', 2, TRUE),
      (comp.id, 'EXP-GEN', 'General Exports', 'صادرات عامة', 'Standard export shipments', 'شحنات التصدير القياسية', 3, TRUE),
      (comp.id, 'EXP-PRJ', 'Project Exports', 'صادرات المشاريع', 'Project-specific exports', 'صادرات خاصة بالمشاريع', 4, TRUE),
      (comp.id, 'TRN-DIR', 'Direct Transit', 'عبور مباشر', 'Direct transit through customs', 'عبور مباشر عبر الجمارك', 5, TRUE),
      (comp.id, 'TRN-BND', 'Bonded Transit', 'عبور تحت الضمان', 'Bonded transit warehousing', 'عبور مستودعات تحت الضمان', 6, TRUE),
      (comp.id, 'WHS-STD', 'Standard Warehouse', 'مستودع قياسي', 'Standard warehouse grouping', 'تصنيف المستودعات القياسي', 7, TRUE),
      (comp.id, 'WHS-FRZ', 'Frozen Storage', 'تخزين مجمد', 'Cold/frozen storage group', 'مجموعة التخزين البارد/المجمد', 8, TRUE),
      (comp.id, 'CUS-CLR', 'Customs Clearance', 'تخليص جمركي', 'Customs clearance operations', 'عمليات التخليص الجمركي', 9, TRUE),
      (comp.id, 'LOG-FTL', 'Full Truckload', 'حمولة شاحنة كاملة', 'Full truck load logistics', 'لوجستيات الحمولة الكاملة', 10, TRUE),
      (comp.id, 'LOG-LTL', 'Less Than Truckload', 'حمولة جزئية', 'LTL logistics grouping', 'تصنيف الحمولات الجزئية', 11, TRUE),
      (comp.id, 'LOG-AIR', 'Air Freight', 'شحن جوي', 'Air freight operations', 'عمليات الشحن الجوي', 12, TRUE)
    ON CONFLICT DO NOTHING;

    -------------------------------------------------------
    -- SHIPPING COMPANIES (new table)
    -------------------------------------------------------
    INSERT INTO shipping_companies (company_id, code, name, name_ar, contact_person, phone, email, services, is_active)
    VALUES
      (comp.id, 'MAERSK', 'Maersk Line', 'ميرسك لاين', 'Customer Service', '+966-11-4000000', 'info.sa@maersk.com', ARRAY['sea','container'], TRUE),
      (comp.id, 'MSC', 'MSC Mediterranean', 'إم إس سي المتوسط', 'Booking Dept', '+966-11-4100000', 'booking.sa@msc.com', ARRAY['sea','container'], TRUE),
      (comp.id, 'CMACGM', 'CMA CGM', 'سي إم أيه سي جي إم', 'Sales Team', '+966-11-4200000', 'sales.sa@cma-cgm.com', ARRAY['sea','container','reefer'], TRUE),
      (comp.id, 'HAPAG', 'Hapag-Lloyd', 'هاباج لويد', 'Operations', '+966-11-4300000', 'ops.sa@hapag-lloyd.com', ARRAY['sea','container'], TRUE),
      (comp.id, 'COSCO', 'COSCO Shipping', 'كوسكو للشحن', 'Trade Lane Manager', '+966-11-4400000', 'trade.sa@cosco.com', ARRAY['sea','container','bulk'], TRUE),
      (comp.id, 'DHL', 'DHL Express', 'دي إتش إل إكسبريس', 'Express Desk', '+966-11-4500000', 'express.sa@dhl.com', ARRAY['air','express','courier'], TRUE),
      (comp.id, 'FEDEX', 'FedEx', 'فيديكس', 'Customer Support', '+966-11-4600000', 'support.sa@fedex.com', ARRAY['air','express','courier'], TRUE),
      (comp.id, 'ARAMEX', 'Aramex', 'أرامكس', 'Corporate Sales', '+966-11-4700000', 'corporate.sa@aramex.com', ARRAY['air','express','courier','ground'], TRUE),
      (comp.id, 'SAL', 'Saudi Arabian Logistics', 'اللوجستيات السعودية', 'Operations', '+966-11-4800000', 'ops@sal.sa', ARRAY['air','ground','warehouse'], TRUE),
      (comp.id, 'EVGRN', 'Evergreen Line', 'إيفرجرين لاين', 'Documentation', '+966-11-4900000', 'docs.sa@evergreen-line.com', ARRAY['sea','container'], TRUE),
      (comp.id, 'OOCL', 'OOCL', 'أو أو سي إل', 'Customer Service', '+966-11-5000000', 'cs.sa@oocl.com', ARRAY['sea','container'], TRUE),
      (comp.id, 'ZIM', 'ZIM Shipping', 'زيم للشحن', 'Trade Support', '+966-11-5100000', 'trade.sa@zim.com', ARRAY['sea','container'], TRUE)
    ON CONFLICT DO NOTHING;

    -------------------------------------------------------
    -- SHIPMENT CLASSIFICATIONS (new table)
    -------------------------------------------------------
    INSERT INTO shipment_classifications (company_id, code, name_en, name_ar, description_en, description_ar, sort_order, is_active)
    VALUES
      (comp.id, 'GEN', 'General Cargo', 'بضائع عامة', 'Standard general merchandise', 'بضائع عامة قياسية', 1, TRUE),
      (comp.id, 'DGR', 'Dangerous Goods', 'بضائع خطرة', 'Hazardous materials - IMO/IATA classified', 'مواد خطرة - تصنيف IMO/IATA', 2, TRUE),
      (comp.id, 'PER', 'Perishable Goods', 'بضائع قابلة للتلف', 'Temperature-sensitive perishables', 'بضائع حساسة للحرارة وقابلة للتلف', 3, TRUE),
      (comp.id, 'FRG', 'Fragile Items', 'بضائع قابلة للكسر', 'Fragile requiring special handling', 'بضائع هشة تتطلب معالجة خاصة', 4, TRUE),
      (comp.id, 'OVS', 'Oversized Cargo', 'بضائع كبيرة الحجم', 'Out-of-gauge or heavy lift', 'بضائع خارج المقاييس أو ثقيلة', 5, TRUE),
      (comp.id, 'REF', 'Refrigerated', 'بضائع مبردة', 'Refrigerated or frozen cargo', 'بضائع مبردة أو مجمدة', 6, TRUE),
      (comp.id, 'LQB', 'Liquid Bulk', 'سوائل بالجملة', 'Liquid bulk in tankers', 'سوائل بالجملة في صهاريج', 7, TRUE),
      (comp.id, 'DRB', 'Dry Bulk', 'جافة بالجملة', 'Dry bulk commodities', 'سلع جافة بالجملة', 8, TRUE),
      (comp.id, 'VEH', 'Vehicles & RoRo', 'مركبات ورورو', 'Vehicles and roll-on/roll-off', 'مركبات وشحن رورو', 9, TRUE),
      (comp.id, 'PRJ', 'Project Cargo', 'بضائع مشاريع', 'Large-scale project shipments', 'شحنات المشاريع الكبيرة', 10, TRUE),
      (comp.id, 'PHR', 'Pharmaceuticals', 'أدوية', 'GDP-compliant pharmaceutical cargo', 'شحنات دوائية متوافقة مع GDP', 11, TRUE),
      (comp.id, 'LVS', 'Livestock', 'ماشية حية', 'Live animal transport', 'نقل الحيوانات الحية', 12, TRUE),
      (comp.id, 'VAL', 'High Value', 'بضائع عالية القيمة', 'High-value cargo with security', 'بضائع عالية القيمة مع حراسة', 13, TRUE),
      (comp.id, 'PPC', 'Personal Effects', 'أغراض شخصية', 'Personal household goods', 'أغراض شخصية ومنزلية', 14, TRUE)
    ON CONFLICT DO NOTHING;

    -------------------------------------------------------
    -- CUSTOMS TARIFFS (expand for all companies)
    -------------------------------------------------------
    INSERT INTO customs_tariffs (company_id, hs_code, country_code, duty_rate_percent, effective_from, notes_en, notes_ar, is_active)
    VALUES
      (comp.id, '847130', 'CN', 5.0000, '2025-01-01', 'Laptop computers and portable data processing machines', 'حواسيب محمولة وآلات معالجة بيانات محمولة', TRUE),
      (comp.id, '851712', 'CN', 5.0000, '2025-01-01', 'Smartphones and mobile telephones', 'هواتف ذكية وهواتف محمولة', TRUE),
      (comp.id, '870323', 'JP', 5.0000, '2025-01-01', 'Passenger vehicles 1500-3000cc', 'سيارات ركاب 1500-3000 سي سي', TRUE),
      (comp.id, '030613', 'IN', 5.0000, '2025-01-01', 'Shrimps and prawns frozen', 'جمبري ومن نوعه مجمد', TRUE),
      (comp.id, '100199', 'US', 0.0000, '2025-01-01', 'Wheat and meslin', 'قمح وخليط قمح وشيلم', TRUE),
      (comp.id, '270900', 'US', 0.0000, '2025-01-01', 'Petroleum oils, crude', 'زيوت بترولية خام', TRUE),
      (comp.id, '720917', 'CN', 5.0000, '2025-01-01', 'Cold-rolled stainless steel flat products', 'منتجات مسطحة من الفولاذ المقاوم للصدأ مدلفنة على البارد', TRUE),
      (comp.id, '300490', 'DE', 0.0000, '2025-01-01', 'Medicaments in measured doses', 'أدوية بجرعات محددة', TRUE),
      (comp.id, '848180', 'CN', 5.0000, '2025-01-01', 'Taps, cocks, valves for pipes', 'صنابير وصمامات للأنابيب', TRUE),
      (comp.id, '610910', 'BD', 5.0000, '2025-01-01', 'T-shirts and singlets of cotton knitted', 'قمصان تي شيرت وفانلات قطنية محبوكة', TRUE),
      (comp.id, '940360', 'CN', 15.0000, '2025-01-01', 'Wooden furniture', 'أثاث خشبي', TRUE),
      (comp.id, '854231', 'KR', 5.0000, '2025-01-01', 'Electronic integrated circuits - processors', 'دوائر إلكترونية متكاملة - معالجات', TRUE),
      (comp.id, '840999', 'JP', 5.0000, '2025-01-01', 'Parts for internal combustion engines', 'أجزاء لمحركات الاحتراق الداخلي', TRUE),
      (comp.id, '390110', 'US', 12.0000, '2025-01-01', 'Polyethylene in primary forms, SG < 0.94', 'بولي إيثيلين بأشكال أولية', TRUE),
      (comp.id, '220290', 'AE', 5.0000, '2025-01-01', 'Non-alcoholic beverages', 'مشروبات غير كحولية', TRUE)
    ON CONFLICT DO NOTHING;

    -------------------------------------------------------
    -- CUSTOMS EXEMPTIONS (expand for all companies)
    -------------------------------------------------------
    INSERT INTO customs_exemptions (company_id, code, name_en, name_ar, notes_en, notes_ar, is_active)
    VALUES
      (comp.id, 'DIPLOMATIC', 'Diplomatic Exemption', 'إعفاء دبلوماسي', 'Diplomatic missions and personnel exemption', 'إعفاء البعثات والأفراد الدبلوماسيين', TRUE),
      (comp.id, 'GOV', 'Government Entity Exemption', 'إعفاء جهة حكومية', 'Government entities and ministries', 'إعفاء الجهات والوزارات الحكومية', TRUE),
      (comp.id, 'HUMANITARIAN', 'Humanitarian Aid', 'مساعدات إنسانية', 'Humanitarian and charitable organizations', 'منظمات إنسانية وخيرية', TRUE),
      (comp.id, 'MEDICAL', 'Medical Supplies', 'مستلزمات طبية', 'Medical equipment and supplies exemption', 'إعفاء المعدات والمستلزمات الطبية', TRUE),
      (comp.id, 'TEMP_IMPORT', 'Temporary Import', 'إدخال مؤقت', 'Temporary import with re-export bond', 'إدخال مؤقت مع ضمان إعادة التصدير', TRUE),
      (comp.id, 'FTZ', 'Free Trade Zone', 'منطقة تجارة حرة', 'Free trade zone and special economic zone', 'إعفاء المنطقة الحرة والمنطقة الاقتصادية الخاصة', TRUE),
      (comp.id, 'GCC_ORIGIN', 'GCC Origin Products', 'منتجات منشأ خليجي', 'Products originating from GCC member states', 'منتجات من دول مجلس التعاون الخليجي', TRUE),
      (comp.id, 'INDUSTRIAL', 'Industrial Project', 'مشروع صناعي', 'Licensed industrial project equipment', 'معدات المشاريع الصناعية المرخصة', TRUE),
      (comp.id, 'AGRICULTURAL', 'Agricultural Exemption', 'إعفاء زراعي', 'Agricultural inputs and equipment', 'مدخلات ومعدات زراعية', TRUE),
      (comp.id, 'MILITARY', 'Military Exemption', 'إعفاء عسكري', 'Defense and security equipment', 'معدات دفاعية وأمنية', TRUE),
      (comp.id, 'RETURNED', 'Returned Goods', 'بضائع مرتجعة', 'Previously exported goods returned to origin', 'بضائع مصدرة سابقاً أعيدت إلى بلد المنشأ', TRUE),
      (comp.id, 'SAMPLES', 'Commercial Samples', 'عينات تجارية', 'Commercial samples below threshold value', 'عينات تجارية أقل من القيمة المحددة', TRUE)
    ON CONFLICT DO NOTHING;

    -------------------------------------------------------
    -- INSURANCE COMPANIES (expand for all companies)
    -- Schema: name (not name_en)
    -------------------------------------------------------
    INSERT INTO insurance_companies (company_id, code, name, name_ar, contact_person, phone, email, policy_number_prefix, is_active)
    VALUES
      (comp.id, 'INS001', 'Tawuniya Insurance', 'التعاونية للتأمين', 'Marine Dept', '+966-11-2180000', 'marine@tawuniya.com.sa', 'TWN', TRUE),
      (comp.id, 'INS002', 'Bupa Arabia', 'بوبا العربية', 'Cargo Dept', '+966-11-2190000', 'cargo@bupa.com.sa', 'BPA', TRUE),
      (comp.id, 'INS003', 'Al Rajhi Takaful', 'الراجحي تكافل', 'Marine Unit', '+966-11-2200000', 'marine@alrajhitakaful.com', 'ART', TRUE),
      (comp.id, 'INS004', 'Malath Insurance', 'ملاذ للتأمين', 'Marine Insurance', '+966-11-2210000', 'marine@malath.com.sa', 'MLT', TRUE),
      (comp.id, 'INS005', 'SALAMA Insurance', 'سلامة للتأمين', 'Cargo Division', '+966-11-2220000', 'cargo@salama.com.sa', 'SLM', TRUE),
      (comp.id, 'INS006', 'AXA Cooperative', 'أكسا التعاونية', 'Marine & Cargo', '+966-11-2230000', 'marine@axa-cooperative.com', 'AXA', TRUE),
      (comp.id, 'INS007', 'Walaa Insurance', 'ولاء للتأمين', 'Marine Underwriting', '+966-11-2240000', 'marine@walaa.com', 'WLA', TRUE),
      (comp.id, 'INS008', 'Gulf Union Insurance', 'الاتحاد الخليجي للتأمين', 'Marine Team', '+966-11-2250000', 'marine@gulfunion.com.sa', 'GUI', TRUE)
    ON CONFLICT DO NOTHING;

    -------------------------------------------------------
    -- LABORATORIES (expand for all companies)
    -- Schema: name (not name_en)
    -------------------------------------------------------
    INSERT INTO laboratories (company_id, code, name, name_ar, lab_type, accreditation_number, contact_person, phone, email, services, is_saber_certified, is_active)
    VALUES
      (comp.id, 'LAB001', 'Saudi Standards Quality Lab', 'مختبر المواصفات السعودية', 'quality', 'SASO-Q-001', 'Lab Manager', '+966-11-3000000', 'lab@saso.gov.sa', ARRAY['quality_testing','conformity_assessment'], TRUE, TRUE),
      (comp.id, 'LAB002', 'TUV Middle East', 'تي يو في الشرق الأوسط', 'conformity', 'TUV-ME-2024', 'Testing Dept', '+966-11-3010000', 'testing@tuv-me.com', ARRAY['conformity_assessment','product_certification'], TRUE, TRUE),
      (comp.id, 'LAB003', 'SGS Saudi Arabia', 'إس جي إس السعودية', 'inspection', 'SGS-SA-2024', 'Inspection Team', '+966-11-3020000', 'inspect@sgs.sa', ARRAY['inspection','testing','certification'], TRUE, TRUE),
      (comp.id, 'LAB004', 'Bureau Veritas Saudi', 'بيرو فيريتاس السعودية', 'testing', 'BV-SA-2024', 'Lab Director', '+966-11-3030000', 'lab@bureauveritas.sa', ARRAY['testing','calibration','inspection'], TRUE, TRUE),
      (comp.id, 'LAB005', 'Intertek Saudi Arabia', 'إنترتك السعودية', 'quality', 'ITK-SA-2024', 'Quality Team', '+966-11-3040000', 'quality@intertek.sa', ARRAY['quality_assurance','product_testing'], TRUE, TRUE),
      (comp.id, 'LAB006', 'Al-Jazeera Testing Lab', 'مختبر الجزيرة للفحص', 'food', 'AJL-SA-2024', 'Food Lab', '+966-11-3050000', 'food@jazeeralab.sa', ARRAY['food_testing','microbiology'], FALSE, TRUE),
      (comp.id, 'LAB007', 'KACST Materials Lab', 'مختبر المواد - مدينة الملك عبدالعزيز', 'materials', 'KACST-MAT-001', 'Research Dept', '+966-11-3060000', 'materials@kacst.edu.sa', ARRAY['materials_testing','research'], FALSE, TRUE),
      (comp.id, 'LAB008', 'Saudi Calibration Center', 'المركز السعودي للمعايرة', 'calibration', 'SCC-2024', 'Calibration Team', '+966-11-3070000', 'calibration@scc.sa', ARRAY['calibration','metrology'], FALSE, TRUE)
    ON CONFLICT DO NOTHING;

    -------------------------------------------------------
    -- SHIPPING AGENTS (expand for all companies)
    -- Schema: name (not name_en), agent_type required
    -------------------------------------------------------
    INSERT INTO shipping_agents (company_id, code, name, name_ar, agent_type, license_number, contact_person, phone, email, services, is_active, credit_limit)
    VALUES
      (comp.id, 'AGT001', 'Maersk Line', 'ميرسك لاين', 'shipping_line', 'SL-001-2024', 'Trade Manager', '+966-11-5000001', 'trade@maersk.sa', ARRAY['sea'], TRUE, 500000.00),
      (comp.id, 'AGT002', 'MSC Saudi', 'إم إس سي السعودية', 'shipping_line', 'SL-002-2024', 'Operations', '+966-11-5000002', 'ops@msc.sa', ARRAY['sea'], TRUE, 500000.00),
      (comp.id, 'AGT003', 'Kanoo Shipping', 'كانو للشحن', 'freight_forwarder', 'FF-001-2024', 'Freight Dept', '+966-11-5000003', 'freight@kanoo.com', ARRAY['sea','air','land'], TRUE, 300000.00),
      (comp.id, 'AGT004', 'Almajdouie Logistics', 'المجدوعي للخدمات اللوجستية', 'freight_forwarder', 'FF-002-2024', 'Logistics Mgr', '+966-11-5000004', 'logistics@almajdouie.com', ARRAY['sea','land','project'], TRUE, 1000000.00),
      (comp.id, 'AGT005', 'BAKHASHAB Shipping', 'باخشب للشحن', 'customs_broker', 'CB-001-2024', 'Customs Dept', '+966-11-5000005', 'customs@bakhashab.com', ARRAY['customs','clearance'], TRUE, 200000.00),
      (comp.id, 'AGT006', 'Gulf Agency Company', 'شركة الخليج للوكالات', 'shipping_line', 'SL-003-2024', 'Agent Manager', '+966-11-5000006', 'agent@gac.com', ARRAY['sea','port_services'], TRUE, 400000.00),
      (comp.id, 'AGT007', 'Agility Logistics', 'أجيليتي للخدمات اللوجستية', 'freight_forwarder', 'FF-003-2024', 'Operations', '+966-11-5000007', 'ops@agility.com', ARRAY['sea','air','land','warehouse'], TRUE, 600000.00),
      (comp.id, 'AGT008', 'Kuehne Nagel Saudi', 'كوني ناجل السعودية', 'freight_forwarder', 'FF-004-2024', 'Trade Lane', '+966-11-5000008', 'trade@kuehne-nagel.sa', ARRAY['sea','air'], TRUE, 500000.00),
      (comp.id, 'AGT009', 'DB Schenker Saudi', 'دي بي شنكر السعودية', 'freight_forwarder', 'FF-005-2024', 'Forwarding', '+966-11-5000009', 'forward@dbschenker.sa', ARRAY['sea','air','land'], TRUE, 400000.00),
      (comp.id, 'AGT010', 'Al Bawani Customs', 'البواني للتخليص', 'customs_broker', 'CB-002-2024', 'Broker Team', '+966-11-5000010', 'broker@albawani.sa', ARRAY['customs','clearance'], TRUE, 200000.00)
    ON CONFLICT DO NOTHING;

    -------------------------------------------------------
    -- SHIPMENT STAGES (expand for all companies)
    -------------------------------------------------------
    INSERT INTO shipment_stages (company_id, code, name_en, name_ar, sort_order)
    VALUES
      (comp.id, 'BOOKED', 'Booking Confirmed', 'تأكيد الحجز', 10),
      (comp.id, 'DOCS_PREP', 'Documents Preparation', 'إعداد المستندات', 20),
      (comp.id, 'LOADING', 'Loading at Origin', 'التحميل في المنشأ', 30),
      (comp.id, 'IN_TRANSIT', 'In Transit', 'في الطريق', 40),
      (comp.id, 'ARRIVED', 'Arrived at Port', 'وصل الميناء', 50),
      (comp.id, 'CUSTOMS_CLR', 'Customs Clearance', 'تخليص جمركي', 60),
      (comp.id, 'INSPECTION', 'Inspection & Testing', 'فحص واختبار', 70),
      (comp.id, 'RELEASED', 'Customs Released', 'إفراج جمركي', 80),
      (comp.id, 'DELIVERY', 'Out for Delivery', 'جاري التوصيل', 90),
      (comp.id, 'DELIVERED', 'Delivered', 'تم التسليم', 100),
      (comp.id, 'RETURNED', 'Returned', 'مرتجع', 110),
      (comp.id, 'CANCELLED', 'Cancelled', 'ملغي', 120)
    ON CONFLICT DO NOTHING;

    -------------------------------------------------------
    -- SHIPMENT EXPENSE TYPES (expand for all companies)
    -- Schema: name (not name_en), category required
    -------------------------------------------------------
    -- shipment_expense_types.code is VARCHAR(10), use short codes
    INSERT INTO shipment_expense_types (company_id, code, name, name_ar, category, is_active)
    VALUES
      (comp.id, 'FRT_SEA', 'Sea Freight', 'شحن بحري', 'FREIGHT', TRUE),
      (comp.id, 'FRT_AIR', 'Air Freight', 'شحن جوي', 'FREIGHT', TRUE),
      (comp.id, 'FRT_LAND', 'Land Transport', 'نقل بري', 'FREIGHT', TRUE),
      (comp.id, 'CST_DUTY', 'Customs Duty', 'رسوم جمركية', 'CUSTOMS', TRUE),
      (comp.id, 'CST_VAT', 'Customs VAT', 'ضريبة القيمة المضافة الجمركية', 'CUSTOMS', TRUE),
      (comp.id, 'CST_FEE', 'Customs Service Fee', 'رسوم خدمات جمركية', 'CUSTOMS', TRUE),
      (comp.id, 'CLEARANCE', 'Clearance Charges', 'رسوم التخليص', 'CLEARANCE', TRUE),
      (comp.id, 'THC_ORIG', 'THC at Origin', 'مناولة حاويات في المنشأ', 'PORT', TRUE),
      (comp.id, 'THC_DEST', 'THC at Destination', 'مناولة حاويات في الوجهة', 'PORT', TRUE),
      (comp.id, 'DEMURRAGE', 'Demurrage', 'أرضيات', 'PORT', TRUE),
      (comp.id, 'DETENTION', 'Detention', 'تأخير حاويات', 'PORT', TRUE),
      (comp.id, 'INSURANCE', 'Cargo Insurance', 'تأمين بضائع', 'INSURANCE', TRUE),
      (comp.id, 'INSPECT', 'Inspection Fees', 'رسوم الفحص', 'INSPECTION', TRUE),
      (comp.id, 'LAB_TEST', 'Laboratory Testing', 'فحص مختبري', 'INSPECTION', TRUE),
      (comp.id, 'SABER_CRT', 'SABER Certification', 'شهادة سابر', 'CERTIFICATION', TRUE),
      (comp.id, 'COO', 'Certificate of Origin', 'شهادة المنشأ', 'DOCUMENTATION', TRUE),
      (comp.id, 'BL_FEE', 'Bill of Lading Fee', 'رسوم بوليصة الشحن', 'DOCUMENTATION', TRUE),
      (comp.id, 'STORAGE', 'Storage Fees', 'رسوم التخزين', 'WAREHOUSE', TRUE),
      (comp.id, 'HANDLING', 'Handling Charges', 'رسوم المناولة', 'WAREHOUSE', TRUE),
      (comp.id, 'DLV_LOCAL', 'Local Delivery', 'توصيل محلي', 'DELIVERY', TRUE),
      (comp.id, 'FUMIGATIN', 'Fumigation', 'تبخير', 'TREATMENT', TRUE),
      (comp.id, 'BANK_CHRG', 'Bank Charges (LC)', 'رسوم بنكية (اعتماد)', 'FINANCE', TRUE)
    ON CONFLICT DO NOTHING;

    -------------------------------------------------------
    -- CUSTOMS DECLARATION STATUSES (expand for all companies)
    -------------------------------------------------------
    INSERT INTO customs_declaration_statuses (company_id, code, name_en, name_ar, stage_order, is_initial, is_final, color, is_active)
    VALUES
      (comp.id, 'DRAFT', 'Draft', 'مسودة', 1, TRUE, FALSE, 'gray', TRUE),
      (comp.id, 'SUBMITTED', 'Submitted', 'مقدم', 2, FALSE, FALSE, 'blue', TRUE),
      (comp.id, 'UNDER_REVIEW', 'Under Review', 'قيد المراجعة', 3, FALSE, FALSE, 'orange', TRUE),
      (comp.id, 'DOCS_REQUESTED', 'Documents Requested', 'مطلوب مستندات', 4, FALSE, FALSE, 'yellow', TRUE),
      (comp.id, 'INSPECTION', 'Inspection', 'فحص', 5, FALSE, FALSE, 'purple', TRUE),
      (comp.id, 'ASSESSMENT', 'Assessment', 'تقييم', 6, FALSE, FALSE, 'cyan', TRUE),
      (comp.id, 'PAYMENT_DUE', 'Payment Due', 'مستحق الدفع', 7, FALSE, FALSE, 'red', TRUE),
      (comp.id, 'PAID', 'Paid', 'مدفوع', 8, FALSE, FALSE, 'teal', TRUE),
      (comp.id, 'RELEASED', 'Released', 'مفرج عنه', 9, FALSE, TRUE, 'green', TRUE),
      (comp.id, 'REJECTED', 'Rejected', 'مرفوض', 10, FALSE, TRUE, 'red', TRUE),
      (comp.id, 'CANCELLED', 'Cancelled', 'ملغي', 11, FALSE, TRUE, 'gray', TRUE),
      (comp.id, 'APPEAL', 'Under Appeal', 'قيد الاستئناف', 12, FALSE, FALSE, 'amber', TRUE),
      (comp.id, 'PARTIAL_RELEASE', 'Partial Release', 'إفراج جزئي', 13, FALSE, FALSE, 'lime', TRUE)
    ON CONFLICT DO NOTHING;

  END LOOP;
END $$;
