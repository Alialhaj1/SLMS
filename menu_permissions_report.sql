-- =====================================================
-- تقرير ربط القوائم بالصلاحيات
-- Menu-Permission Mapping Report
-- =====================================================

-- التحقق من الصلاحيات الأساسية للقوائم
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'dashboard:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'لوحة التحكم (Dashboard)' AS menu_item,
  'dashboard:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'shipments:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'الشحنات (Shipments)' AS menu_item,
  'shipments:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'expenses:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'المصروفات (Expenses)' AS menu_item,
  'expenses:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'warehouses:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'المستودعات (Warehouses)' AS menu_item,
  'warehouses:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'suppliers:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'الموردين (Suppliers)' AS menu_item,
  'suppliers:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'users:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'المستخدمين (Users)' AS menu_item,
  'users:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'roles:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'الأدوار (Roles)' AS menu_item,
  'roles:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'finance:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'المالية (Finance)' AS menu_item,
  'finance:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'accounting:journal:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'القيود اليومية (Journals)' AS menu_item,
  'accounting:journal:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'inventory:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'المخزون (Inventory)' AS menu_item,
  'inventory:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'logistics:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'اللوجستيات (Logistics)' AS menu_item,
  'logistics:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'procurement:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'المشتريات (Procurement)' AS menu_item,
  'procurement:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'projects:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'المشاريع (Projects)' AS menu_item,
  'projects:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'hr:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'الموارد البشرية (HR)' AS menu_item,
  'hr:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'master:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'البيانات الأساسية (Master Data)' AS menu_item,
  'master:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'audit_logs:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'سجلات المراجعة (Audit Logs)' AS menu_item,
  'audit_logs:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'system_settings:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'إعدادات النظام (Settings)' AS menu_item,
  'system_settings:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'notifications:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'الإشعارات (Notifications)' AS menu_item,
  'notifications:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'quality:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'الجودة (Quality)' AS menu_item,
  'quality:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'risks:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'المخاطر (Risks)' AS menu_item,
  'risks:view' AS permission_code;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = 'tax:view') THEN '✅'
    ELSE '❌'
  END AS status,
  'الضرائب (Tax)' AS menu_item,
  'tax:view' AS permission_code;

-- ملخص إجمالي
SELECT '========================================' as separator;
SELECT 'إجمالي الصلاحيات في النظام: ' || COUNT(*) as total FROM permissions;
SELECT 'إجمالي ربط الصلاحيات بالأدوار: ' || COUNT(*) as total FROM role_permissions;
