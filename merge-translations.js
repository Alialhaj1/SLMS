/**
 * Merge translation files: Docker (more sections) + Backup (better common)
 * Then add all missing translations
 */
const fs = require('fs');

// Custom JSON parser that handles duplicate keys by merging them
function parseWithMerge(text) {
  // Use reviver won't work for dupes, use a streaming approach
  // Actually for our case, we just merge docker + backup
  return JSON.parse(text);
}

// Deep merge: target gets values from source (source wins on conflicts)
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function setNestedValue(obj, key, value) {
  const parts = key.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  // Don't overwrite existing values
  if (cur[parts[parts.length - 1]] === undefined) {
    cur[parts[parts.length - 1]] = value;
  }
}

// Load all versions
const enDocker = JSON.parse(fs.readFileSync('./frontend-next/locales/en.json.docker', 'utf8'));
const arDocker = JSON.parse(fs.readFileSync('./frontend-next/locales/ar.json.docker', 'utf8'));
const enBackup = JSON.parse(fs.readFileSync('./frontend-next/locales/en.json.backup', 'utf8'));
const arBackup = JSON.parse(fs.readFileSync('./frontend-next/locales/ar.json.backup', 'utf8'));

// Merge: start with Docker (more sections), merge in backup (better common & other keys)
const en = deepMerge(deepMerge({}, enDocker), enBackup);
const ar = deepMerge(deepMerge({}, arDocker), arBackup);

console.log('EN common keys after merge:', Object.keys(en.common).length);
console.log('AR common keys after merge:', Object.keys(ar.common).length);
console.log('EN top-level sections after merge:', Object.keys(en).length);
console.log('AR top-level sections after merge:', Object.keys(ar).length);

// Now add all the comprehensive translations that were in the "second common" section
// These are keys referenced by the code that should be in common

const additionalCommonEN = {
  "searchMenu": "Search menu...",
  "favorites": "Favorites",
  "results": "results",
  "filter": "Filter",
  "refresh": "Refresh",
  "back": "Back",
  "next": "Next",
  "previous": "Previous",
  "viewAll": "View All",
  "expand": "Expand",
  "collapse": "Collapse",
  "expandAll": "Expand All",
  "collapseAll": "Collapse All",
  "noResults": "No results found",
  "noRecordsFound": "No records found",
  "empty": "No data available. Create one to get started.",
  "error": "An error occurred",
  "fixErrors": "Please fix the highlighted errors before submitting",
  "fetchError": "Failed to fetch data",
  "failedToLoad": "Failed to load",
  "success": "Success",
  "failed": "Failed",
  "warning": "Warning",
  "info": "Information",
  "logout": "Logout",
  "profile": "Profile",
  "settings": "Settings",
  "help": "Help",
  "notifications": "Notifications",
  "create": "Create",
  "add": "Add",
  "optional": "Optional",
  "fieldRequired": "This field is required",
  "filters": "Filters",
  "all": "All",
  "clear": "Clear",
  "select": "Select",
  "none": "None",
  "selectAll": "Select All",
  "deselectAll": "Deselect All",
  "apply": "Apply",
  "export": "Export",
  "showing": "Showing",
  "of": "of",
  "actions": "Actions",
  "status": "Status",
  "active": "Active",
  "isActive": "Active",
  "inactive": "Inactive",
  "enabled": "Enabled",
  "noData": "No data available",
  "noDescription": "No description",
  "tryDifferentSearch": "Try a different search term",
  "allTypes": "All Types",
  "allStatus": "All Status",
  "allStatuses": "All Statuses",
  "allCategories": "All Categories",
  "category": "Category",
  "resource": "Resource",
  "action": "Action",
  "module": "Module",
  "enabledOnly": "Enabled Only",
  "noTemplates": "No templates available",
  "use": "Use",
  "permissions": "permissions",
  "resources": "Resources",
  "users": "users",
  "quickActions": "Quick Actions",
  "viewOnly": "View Only",
  "selectCompany": "Please select a company",
  "confirmDelete": "Are you sure you want to delete?",
  "deleteConfirm": "Are you sure you want to delete?",
  "deleteSuccess": "Deleted successfully",
  "deleted": "Deleted successfully",
  "createSuccess": "Created successfully",
  "updateSuccess": "Updated successfully",
  "createError": "Failed to create",
  "updateError": "Failed to update",
  "saveError": "Failed to save",
  "deleteError": "Failed to delete",
  "userLimitReached": "Maximum user limit reached",
  "contactAccountManager": "Please contact your account manager to increase the limit",
  "accessNotAvailable": "Access Not Available",
  "serviceNotEnabled": "This service is not available in your current plan. Please contact your account manager to enable it.",
  "accountManager": "Account Manager",
  "Failed to fetch expense requests": "Failed to fetch expense requests",
  "Failed to fetch transfer requests": "Failed to fetch transfer requests",
  "Failed to fetch payment requests": "Failed to fetch payment requests",
  "date": "Date",
  "dateFrom": "From Date",
  "dateTo": "To Date",
  "reference": "Reference",
  "sequence": "Sequence",
  "print": "Print",
  "total": "Total",
  "code": "Code",
  "nameEn": "Name (English)",
  "nameAr": "Arabic Name",
  "customers": "Customers",
  "sales": "Sales",
  "purchases": "Purchases",
  "transfers": "Transfers",
  "type": "Type",
  "level": "Level",
  "days": "Days",
  "months": "Months",
  "characters": "characters",
  "minutes": "minutes",
  "hour": "hour",
  "hours": "hours",
  "year": "year",
  "years": "years",
  "saveSuccess": "Saved successfully",
  "notes": "Notes",
  "deleteMessage": "This action cannot be undone. Are you sure you want to delete this item?",
  "cannotUndo": "This action cannot be undone.",
  "noPermission": "You don't have permission",
  "noPermissionToView": "You don't have permission to view this",
  "noPermissionToEdit": "You don't have permission to edit this",
  "noPermissionToDelete": "You don't have permission to delete this",
  "noPermissionToCreate": "You don't have permission to create this",
  "noPermissionToAccess": "You don't have permission to access this page",
  "confirmAction": "Confirm Action",
  "confirmActionMessage": "Are you sure you want to proceed with this action?",
  "confirmDeleteMessage": "This action cannot be undone.",
  "accessDenied": "Access Denied",
  "phone": "Phone",
  "email": "Email",
  "description": "Description",
  "default": "Default",
  "remove": "Remove",
  "descriptionEn": "Description (English)",
  "descriptionAr": "Description (Arabic)",
  "sortOrder": "Sort Order",
  "yes": "Yes",
  "no": "No",
  "items": "item(s)",
  "stock": "Stock",
  "optionalNotes": "Optional notes for this item",
  "totalItems": "Total Items",
  "seasonal": "Seasonal",
  "itemType": "Item Type",
  "selectItemType": "Select Item Type",
  "supplierAndOrigin": "Supplier & Origin",
  "defaultVendor": "Default Vendor",
  "selectVendor": "Select Vendor",
  "countryOfOrigin": "Country of Origin",
  "selectCountry": "Select Country",
  "manufacturer": "Manufacturer",
  "harvestInfo": "Harvest Information",
  "harvestSchedule": "Harvest Schedule",
  "selectHarvestSchedule": "Select Harvest Schedule",
  "expectedHarvestDate": "Expected Harvest Date",
  "shelfLifeDays": "Shelf Life (days)",
  "additionalInfo": "Additional Information",
  "minOrderQty": "Min Order Qty",
  "warrantyMonths": "Warranty (months)",
  "imageUrl": "Image URL",
  "preview": "Preview",
  "reset": "Reset",
  "dashboard": "Dashboard",
  "searchIn": "Search in {{name}}",
  "getStarted": "Get started by creating your first record",
  "createFirst": "Create your first {{name}}",
  "activeOnly": "Active only",
  "records": "records",
  "to": "to",
  "columns": "Columns",
  "columnVisibility": "Column Visibility",
  "advancedFilters": "Advanced Filters",
  "clearAll": "Clear All",
  "details": "Details",
  "relations": "Relations",
  "auditTrail": "Audit Trail",
  "icon": "Icon",
  "custom": "Custom",
  "selected": "selected",
  "noPermissions": "No permissions available.",
  "saving": "Saving...",
  "creating": "Creating...",
  "cloning": "Cloning...",
  "deleting": "Deleting...",
  "created": "Created successfully",
  "saved": "Saved successfully",
  "actionCannotBeUndone": "This action cannot be undone.",
  // Additional keys found referenced in code but not in any version
  "activate": "Activate",
  "deactivate": "Deactivate",
  "addNew": "Add New",
  "address": "Address",
  "allCountries": "All Countries",
  "allItems": "All Items",
  "allWarehouses": "All Warehouses",
  "autoGenerated": "Auto Generated",
  "clearSearch": "Clear Search",
  "comingSoon": "Coming Soon",
  "contact": "Contact",
  "createRule": "Create Rule",
  "createdAt": "Created At",
  "currency": "Currency",
  "dateRange": "Date Range",
  "disabled": "Disabled",
  "documentNumber": "Document Number",
  "editRule": "Edit Rule",
  "effectiveFrom": "Effective From",
  "effectiveTo": "Effective To",
  "endDate": "End Date",
  "expense": "Expense",
  "exportError": "Failed to export",
  "exportSuccess": "Exported successfully",
  "exported": "Exported",
  "failedToDelete": "Failed to delete",
  "failedToSave": "Failed to save",
  "highestFirst": "Highest First",
  "invalidValue": "Invalid value",
  "item": "Item",
  "loadFailed": "Failed to load",
  "lowestFirst": "Lowest First",
  "message": "Message",
  "mobile": "Mobile",
  "newestFirst": "Newest First",
  "noModules": "No modules available",
  "notSet": "Not Set",
  "oldestFirst": "Oldest First",
  "page": "Page",
  "relatedRecords": "Related Records",
  "required": "Required",
  "requiredFields": "Required Fields",
  "saveFailed": "Failed to save",
  "savedSuccessfully": "Saved successfully",
  "selectBranch": "Select Branch",
  "selectShipment": "Select Shipment",
  "service": "Service",
  "startDate": "Start Date",
  "submitting": "Submitting...",
  "summary": "Summary",
  "updated": "Updated successfully",
  "variance": "Variance",
  "warehouse": "Warehouse",
  "download": "Download",
  "allRoles": "All Roles"
};

const additionalCommonAR = {
  "searchMenu": "البحث في القوائم",
  "favorites": "المفضلة",
  "results": "النتائج",
  "filter": "تصفية",
  "refresh": "تحديث",
  "back": "رجوع",
  "next": "التالي",
  "previous": "السابق",
  "viewAll": "عرض الكل",
  "expand": "توسيع",
  "collapse": "طي",
  "expandAll": "توسيع الكل",
  "collapseAll": "طي الكل",
  "noResults": "لم يتم العثور على نتائج",
  "noRecordsFound": "لا توجد سجلات",
  "empty": "لا توجد بيانات. أنشئ واحدة للبدء.",
  "error": "حدث خطأ",
  "fixErrors": "يرجى تصحيح الأخطاء المميّزة قبل الإرسال",
  "fetchError": "فشل في جلب البيانات",
  "failedToLoad": "فشل في التحميل",
  "success": "نجح",
  "failed": "فشل",
  "warning": "تحذير",
  "info": "معلومات",
  "logout": "تسجيل الخروج",
  "profile": "الملف الشخصي",
  "settings": "الإعدادات",
  "help": "مساعدة",
  "notifications": "الإشعارات",
  "create": "إنشاء",
  "add": "إضافة",
  "optional": "اختياري",
  "fieldRequired": "هذا الحقل مطلوب",
  "filters": "تصفية",
  "all": "الكل",
  "allRoles": "جميع الأدوار",
  "clear": "مسح",
  "select": "اختر",
  "none": "لا يوجد",
  "selectAll": "تحديد الكل",
  "deselectAll": "إلغاء تحديد الكل",
  "apply": "تطبيق",
  "export": "تصدير",
  "showing": "عرض",
  "of": "من",
  "actions": "الإجراءات",
  "status": "الحالة",
  "active": "نشط",
  "isActive": "نشط",
  "inactive": "غير نشط",
  "enabled": "مفعّل",
  "noData": "لا توجد بيانات",
  "noDescription": "بدون وصف",
  "tryDifferentSearch": "جرب كلمة بحث مختلفة",
  "allTypes": "جميع الأنواع",
  "allStatus": "جميع الحالات",
  "allStatuses": "جميع الحالات",
  "allCategories": "جميع الفئات",
  "category": "الفئة",
  "resource": "المورد",
  "action": "الإجراء",
  "module": "الوحدة",
  "enabledOnly": "المفعّلة فقط",
  "noTemplates": "لا توجد قوالب متاحة",
  "use": "استخدام",
  "permissions": "صلاحيات",
  "resources": "الموارد",
  "users": "مستخدمين",
  "quickActions": "إجراءات سريعة",
  "viewOnly": "للعرض فقط",
  "selectCompany": "يرجى اختيار الشركة",
  "confirmDelete": "هل أنت متأكد من الحذف؟",
  "deleteConfirm": "هل أنت متأكد من رغبتك في الحذف؟",
  "deleteSuccess": "تم الحذف بنجاح",
  "deleted": "تم الحذف بنجاح",
  "createSuccess": "تم الإنشاء بنجاح",
  "updateSuccess": "تم التحديث بنجاح",
  "createError": "فشل في الإنشاء",
  "updateError": "فشل في التحديث",
  "saveError": "فشل في الحفظ",
  "deleteError": "فشل في الحذف",
  "userLimitReached": "تم الوصول للحد الأقصى من المستخدمين",
  "contactAccountManager": "يرجى التواصل مع مشرف الحساب لزيادة الحد المسموح",
  "accessNotAvailable": "الوصول غير متاح",
  "serviceNotEnabled": "هذه الخدمة غير مفعّلة في باقتك الحالية. يرجى التواصل مع مشرف حسابك لتفعيلها.",
  "accountManager": "مشرف الحساب",
  "Failed to fetch expense requests": "فشل في جلب طلبات المصاريف",
  "Failed to fetch transfer requests": "فشل في جلب طلبات التحويل",
  "Failed to fetch payment requests": "فشل في جلب طلبات السداد",
  "date": "التاريخ",
  "dateFrom": "من التاريخ",
  "dateTo": "إلى التاريخ",
  "reference": "المرجع",
  "sequence": "التسلسل",
  "print": "طباعة",
  "total": "الإجمالي",
  "code": "الرمز",
  "nameEn": "الاسم (بالإنجليزية)",
  "nameAr": "الاسم بالعربية",
  "customers": "العملاء",
  "sales": "المبيعات",
  "purchases": "المشتريات",
  "transfers": "التحويلات",
  "type": "النوع",
  "level": "المستوى",
  "days": "أيام",
  "months": "أشهر",
  "characters": "حروف",
  "minutes": "دقائق",
  "hour": "ساعة",
  "hours": "ساعات",
  "year": "سنة",
  "years": "سنوات",
  "saveSuccess": "تم الحفظ بنجاح",
  "notes": "ملاحظات",
  "deleteMessage": "هل أنت متأكد من رغبتك في حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.",
  "cannotUndo": "لا يمكن التراجع عن هذا الإجراء.",
  "noPermission": "لا تملك الصلاحية",
  "noPermissionToView": "لا تملك صلاحية عرض هذا",
  "noPermissionToEdit": "لا تملك صلاحية تعديل هذا",
  "noPermissionToDelete": "لا تملك صلاحية حذف هذا",
  "noPermissionToCreate": "لا تملك صلاحية إنشاء هذا",
  "noPermissionToAccess": "لا تملك صلاحية الوصول لهذه الصفحة",
  "confirmAction": "تأكيد الإجراء",
  "confirmActionMessage": "هل أنت متأكد من رغبتك في المتابعة؟",
  "confirmDeleteMessage": "لا يمكن التراجع عن هذا الإجراء.",
  "accessDenied": "تم رفض الوصول",
  "phone": "الهاتف",
  "email": "البريد الإلكتروني",
  "description": "الوصف",
  "default": "افتراضي",
  "remove": "إزالة",
  "descriptionEn": "الوصف (بالإنجليزية)",
  "descriptionAr": "الوصف (بالعربية)",
  "sortOrder": "ترتيب العرض",
  "yes": "نعم",
  "no": "لا",
  "items": "صنف/أصناف",
  "stock": "المخزون",
  "optionalNotes": "ملاحظات اختيارية لهذا الصنف",
  "totalItems": "إجمالي الأصناف",
  "seasonal": "موسمي",
  "itemType": "نوع الصنف",
  "selectItemType": "اختر نوع الصنف",
  "supplierAndOrigin": "المورد والمنشأ",
  "defaultVendor": "المورد الافتراضي",
  "selectVendor": "اختر المورد",
  "countryOfOrigin": "بلد المنشأ",
  "selectCountry": "اختر الدولة",
  "manufacturer": "الشركة المصنعة",
  "harvestInfo": "معلومات الحصاد",
  "harvestSchedule": "موعد الحصاد",
  "selectHarvestSchedule": "اختر موعد الحصاد",
  "expectedHarvestDate": "تاريخ الحصاد المتوقع",
  "shelfLifeDays": "مدة الصلاحية (أيام)",
  "additionalInfo": "معلومات إضافية",
  "minOrderQty": "الحد الأدنى للطلب",
  "warrantyMonths": "فترة الضمان (أشهر)",
  "imageUrl": "رابط الصورة",
  "preview": "معاينة",
  "reset": "إعادة تعيين",
  "dashboard": "لوحة التحكم",
  "searchIn": "البحث في {{name}}",
  "getStarted": "ابدأ بإنشاء أول سجل",
  "createFirst": "أنشئ أول {{name}}",
  "activeOnly": "النشطة فقط",
  "records": "سجلات",
  "to": "إلى",
  "columns": "الأعمدة",
  "columnVisibility": "إظهار/إخفاء الأعمدة",
  "advancedFilters": "تصفية متقدمة",
  "clearAll": "مسح الكل",
  "details": "التفاصيل",
  "relations": "العلاقات",
  "auditTrail": "سجل التدقيق",
  "icon": "أيقونة",
  "custom": "مخصص",
  "selected": "محدد",
  "noPermissions": "لا توجد صلاحيات متاحة.",
  "saving": "جارٍ الحفظ...",
  "creating": "جارٍ الإنشاء...",
  "cloning": "جارٍ النسخ...",
  "deleting": "جارٍ الحذف...",
  "created": "تم الإنشاء بنجاح",
  "saved": "تم الحفظ بنجاح",
  "actionCannotBeUndone": "لا يمكن التراجع عن هذا الإجراء.",
  "download": "تحميل",
  // Additional keys from code scan
  "activate": "تفعيل",
  "deactivate": "إلغاء التفعيل",
  "addNew": "إضافة جديد",
  "address": "العنوان",
  "allCountries": "جميع الدول",
  "allItems": "جميع الأصناف",
  "allWarehouses": "جميع المستودعات",
  "autoGenerated": "مُولّد تلقائياً",
  "clearSearch": "مسح البحث",
  "comingSoon": "قريباً",
  "contact": "جهة الاتصال",
  "createRule": "إنشاء قاعدة",
  "createdAt": "تاريخ الإنشاء",
  "currency": "العملة",
  "dateRange": "نطاق التاريخ",
  "disabled": "معطّل",
  "documentNumber": "رقم المستند",
  "editRule": "تعديل القاعدة",
  "effectiveFrom": "ساري من",
  "effectiveTo": "ساري إلى",
  "endDate": "تاريخ النهاية",
  "expense": "مصروف",
  "exportError": "فشل في التصدير",
  "exportSuccess": "تم التصدير بنجاح",
  "exported": "تم التصدير",
  "failedToDelete": "فشل في الحذف",
  "failedToSave": "فشل في الحفظ",
  "highestFirst": "الأعلى أولاً",
  "invalidValue": "قيمة غير صالحة",
  "item": "صنف",
  "loadFailed": "فشل في التحميل",
  "lowestFirst": "الأدنى أولاً",
  "message": "رسالة",
  "mobile": "الجوال",
  "newestFirst": "الأحدث أولاً",
  "noModules": "لا توجد وحدات متاحة",
  "notSet": "غير محدد",
  "oldestFirst": "الأقدم أولاً",
  "page": "صفحة",
  "relatedRecords": "سجلات ذات صلة",
  "required": "مطلوب",
  "requiredFields": "حقول مطلوبة",
  "saveFailed": "فشل في الحفظ",
  "savedSuccessfully": "تم الحفظ بنجاح",
  "selectBranch": "اختر الفرع",
  "selectShipment": "اختر الشحنة",
  "service": "الخدمة",
  "startDate": "تاريخ البداية",
  "submitting": "جارٍ الإرسال...",
  "summary": "الملخص",
  "updated": "تم التحديث بنجاح",
  "variance": "الفرق",
  "warehouse": "المستودع"
};

// Merge common keys (don't overwrite existing)
Object.entries(additionalCommonEN).forEach(([k, v]) => {
  if (en.common[k] === undefined) en.common[k] = v;
});
Object.entries(additionalCommonAR).forEach(([k, v]) => {
  if (ar.common[k] === undefined) ar.common[k] = v;
});

// Add timeAgo sub-object
if (!en.common.timeAgo) en.common.timeAgo = {};
if (!ar.common.timeAgo) ar.common.timeAgo = {};
const timeAgoEN = {
  "justNow": "Just now",
  "minutesAgo": "{{count}}m ago",
  "hoursAgo": "{{count}}h ago",
  "daysAgo": "{{count}}d ago",
  "weeksAgo": "{{count}}w ago"
};
const timeAgoAR = {
  "justNow": "الآن",
  "minutesAgo": "منذ {{count}} دقيقة",
  "hoursAgo": "منذ {{count}} ساعة",
  "daysAgo": "منذ {{count}} يوم",
  "weeksAgo": "منذ {{count}} أسبوع"
};
Object.entries(timeAgoEN).forEach(([k,v]) => { if (!en.common.timeAgo[k]) en.common.timeAgo[k] = v; });
Object.entries(timeAgoAR).forEach(([k,v]) => { if (!ar.common.timeAgo[k]) ar.common.timeAgo[k] = v; });

// Add validation sub-object
if (!en.common.validation) en.common.validation = {};
if (!ar.common.validation) ar.common.validation = {};
if (!en.common.validation.endMonthAfterStart) en.common.validation.endMonthAfterStart = "End month must be after start month";
if (!ar.common.validation.endMonthAfterStart) ar.common.validation.endMonthAfterStart = "يجب أن يكون شهر النهاية بعد شهر البداية";

// ==========================================
// SECTION TRANSLATIONS - Missing in EN
// ==========================================
if (!en.notifications) en.notifications = {};
const notifEN = {
  "categories": { "all": "All", "system": "System" },
  "errors": { "dismissFailed": "Failed to dismiss notification", "loadFailed": "Failed to load notifications", "markReadFailed": "Failed to mark as read" },
  "markAllRead": "Mark all as read",
  "markAsRead": "Mark as read",
  "noNotifications": "No notifications",
  "noNotificationsDescription": "You're up to date! No new notifications.",
  "success": { "dismissed": "Notification dismissed", "markedAllRead": "All notifications marked as read" },
  "timeAgo": { "daysAgo": "{{days}} days ago", "hoursAgo": "{{hours}} hours ago", "justNow": "Just now", "minutesAgo": "{{minutes}} minutes ago" },
  "unreadOnly": "Unread only",
  "untitled": "Notification",
  "viewAll": "View All"
};
deepMerge(en.notifications, notifEN);

// ==========================================
// SECTION TRANSLATIONS - Missing in AR (326 keys)
// ==========================================

// chequeBooks
if (!ar.chequeBooks) ar.chequeBooks = {};
deepMerge(ar.chequeBooks, {
  "activeBooks": "الدفاتر النشطة", "allBanks": "جميع البنوك", "allStatuses": "جميع الحالات",
  "available": "متاح", "bank": "البنك", "bankAccount": "الحساب البنكي",
  "cannotDeleteUsed": "لا يمكن حذف دفتر شيكات يحتوي على شيكات صادرة",
  "chequePrefix": "بادئة الشيك", "chequeRange": "نطاق أرقام الشيكات",
  "create": "إنشاء دفتر شيكات", "current": "الحالي",
  "deleteWarning": "سيتم حذف دفتر الشيكات نهائياً.", "edit": "تعديل دفتر شيكات",
  "endMustBeGreater": "رقم النهاية يجب أن يكون أكبر من البداية", "endNumber": "رقم النهاية",
  "expiry": "انتهاء الصلاحية", "expiryDate": "تاريخ الانتهاء", "issueDate": "تاريخ الإصدار",
  "new": "دفتر شيكات جديد", "preview": "معاينة", "range": "نطاق الشيكات",
  "series": "السلسلة", "seriesName": "اسم السلسلة", "setDefault": "تعيين كافتراضي",
  "startNumber": "رقم البداية", "subtitle": "تتبع مخزون دفاتر الشيكات واستخدامها",
  "title": "دفاتر الشيكات", "totalLeaves": "إجمالي الأوراق", "totalLeavesCalc": "إجمالي الأوراق",
  "usage": "الاستخدام", "usedLeaves": "المستخدمة"
});

// fiscalPeriods
if (!ar.fiscalPeriods) ar.fiscalPeriods = {};
deepMerge(ar.fiscalPeriods, {
  "adjustment": "تسوية", "adjustmentPeriod": "فترة التسوية", "closePeriod": "إغلاق الفترة",
  "closed": "مغلقة", "closedPeriods": "مغلقة", "create": "إنشاء فترة",
  "dateRange": "نطاق التاريخ", "deleteWarning": "حذف الفترة قد يؤثر على التقارير المالية.",
  "edit": "تعديل الفترة", "endDate": "تاريخ النهاية", "fiscalYear": "السنة المالية",
  "generate": "توليد سنة", "generateDescription": "سيتم إنشاء 12 فترة شهرية للسنة المالية المحددة.",
  "generatePeriods": "توليد الفترات المالية", "locked": "مقفلة", "lockedPeriods": "مقفلة",
  "new": "فترة جديدة", "open": "مفتوحة", "openPeriods": "مفتوحة",
  "period": "الفترة", "periodClosed": "تم إغلاق الفترة بنجاح", "periodNumber": "رقم الفترة",
  "periodReopened": "تم إعادة فتح الفترة بنجاح", "periodType": "نوع الفترة", "periods": "فترات",
  "periodsGenerated": "تم توليد 12 فترة بنجاح", "reopenPeriod": "إعادة فتح الفترة",
  "startDate": "تاريخ البداية", "subtitle": "إدارة الفترات المحاسبية وإقفال نهاية السنة",
  "title": "الفترات المالية", "yearEnd": "فترة نهاية السنة"
});

// alerts
if (!ar.alerts) ar.alerts = {};
deepMerge(ar.alerts, {
  "activateImmediately": "تفعيل فوري", "active": "نشط", "channels": "قنوات الإشعار",
  "condition": "الشرط (اختياري)", "cooldown": "فترة الانتظار (دقائق)",
  "cooldownDesc": "الحد الأدنى للوقت بين التنبيهات المتكررة", "createFirst": "أنشئ أول تنبيه",
  "createRule": "إنشاء قاعدة تنبيه", "critical": "حرج",
  "deleteConfirm": "هل أنت متأكد من حذف قاعدة التنبيه؟ لا يمكن التراجع عن هذا الإجراء.",
  "deleteRule": "حذف قاعدة التنبيه", "description": "الوصف", "editRule": "تعديل قاعدة التنبيه",
  "eventType": "نوع الحدث", "history": "سجل التنبيهات", "info": "معلومات",
  "lastTriggered": "آخر تشغيل", "nameAr": "الاسم (بالعربية)", "nameEn": "الاسم (بالإنجليزية)",
  "noRules": "لا توجد قواعد تنبيه", "rules": "قواعد التنبيه", "severity": "الخطورة",
  "subtitle": "إعداد وإدارة تنبيهات النظام", "title": "التنبيهات", "totalRules": "إجمالي القواعد",
  "triggered": "مرات التشغيل", "triggers": "تشغيلات", "warning": "تحذير"
});

// costCenters
if (!ar.costCenters) ar.costCenters = {};
deepMerge(ar.costCenters, {
  "actions": { "add": "إضافة مركز تكلفة" }, "activeOnlySuffix": "فقط",
  "delete": { "message": "لا يمكن التراجع عن هذا الإجراء.", "title": "حذف مركز التكلفة" },
  "empty": { "ctaHint": "ابدأ بإنشاء مركز تكلفة جديد", "searchHint": "حاول تعديل معايير البحث", "title": "لم يتم العثور على مراكز تكلفة" },
  "fields": { "code": "رمز مركز التكلفة", "name": "اسم مركز التكلفة", "nameAr": "اسم مركز التكلفة (بالعربية)", "parent": "الأصل" },
  "loading": "جاري تحميل مراكز التكلفة...",
  "messages": { "createSuccess": "تم إنشاء مركز التكلفة بنجاح", "deleteFailed": "فشل حذف مركز التكلفة", "deleteSuccess": "تم حذف مركز التكلفة بنجاح", "loadFailed": "فشل تحميل مراكز التكلفة", "loginRequired": "يرجى تسجيل الدخول مجدداً", "saveFailed": "فشل حفظ مركز التكلفة", "updateSuccess": "تم تحديث مركز التكلفة بنجاح" },
  "modal": { "createTitle": "إنشاء مركز تكلفة", "editTitle": "تعديل مركز التكلفة" },
  "pageTitle": "مراكز التكلفة - SLMS", "searchPlaceholder": "البحث بالاسم أو الرمز...",
  "subtitle": "إدارة مراكز التكلفة (رئيسية وفرعية)", "title": "مراكز التكلفة",
  "validation": { "codeRequired": "رمز مركز التكلفة مطلوب", "nameRequired": "اسم مركز التكلفة مطلوب" }
});

// notifications (AR missing keys)
if (!ar.notifications) ar.notifications = {};
deepMerge(ar.notifications, {
  "apiKey": "مفتاح API", "autoDismiss": "إخفاء تلقائي (ثوانٍ)", "daily": "يومي",
  "digest": "ملخص البريد الإلكتروني", "digestDesc": "دمج الإشعارات المتعددة في بريد ملخص واحد.",
  "digestTime": "إرسال في", "emailSettings": "إعدادات البريد الإلكتروني", "event": "الحدث",
  "frequency": "التكرار", "fromEmail": "البريد المرسل", "fromName": "اسم المرسل",
  "inAppSettings": "إشعارات داخل التطبيق", "maxNotifications": "الحد الأقصى للإشعارات المحفوظة",
  "provider": "المزود", "pushSettings": "إشعارات الدفع", "quietEnd": "وقت الانتهاء",
  "quietHours": "ساعات الهدوء", "quietHoursDesc": "خلال ساعات الهدوء، سيتم إرسال الإشعارات الحرجة فقط.",
  "quietStart": "وقت البدء", "schedule": "جدول التسليم", "scheduleNote": "ملاحظة",
  "scheduleNoteDesc": "الإشعارات الحرجة والأمنية ستُرسل فوراً بغض النظر عن إعدادات الجدول.",
  "smsSettings": "إعدادات الرسائل النصية", "vapidKey": "مفتاح VAPID العام",
  "weekendDesc": "السماح بالإشعارات غير الحرجة خلال عطلة نهاية الأسبوع",
  "weekendNotifications": "إشعارات نهاية الأسبوع", "weekly": "أسبوعي"
});

// financialYears
if (!ar.financialYears) ar.financialYears = {};
deepMerge(ar.financialYears, {
  "cannotEditClosed": "لا يمكن تعديل سنة مالية مغلقة", "close": "إغلاق",
  "closeTitle": "إغلاق السنة المالية", "closeWarning": "إغلاق السنة المالية لا يمكن التراجع عنه.",
  "closed": "تم إغلاق السنة المالية", "closedStatus": "مغلقة", "create": "إنشاء سنة مالية",
  "deleteTitle": "حذف السنة المالية", "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "edit": "تعديل السنة المالية", "empty": "لم يتم العثور على سنوات مالية", "end": "النهاية",
  "isDefault": "تعيين كافتراضي", "listTitle": "السنوات", "name": "الاسم",
  "new": "سنة مالية جديدة", "openStatus": "مفتوحة", "setDefault": "تعيين الافتراضي",
  "start": "البداية", "status": "الحالة", "subtitle": "إنشاء وتعيين وإغلاق السنوات المالية",
  "title": "السنوات المالية", "validation": { "dateOrder": "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" }
});

// taxCodes
if (!ar.taxCodes) ar.taxCodes = {};
deepMerge(ar.taxCodes, {
  "allApplies": "جميع التطبيقات", "appliesTo": "ينطبق على", "create": "إنشاء رمز ضريبي",
  "customsRate": "الجمارك (%)", "edit": "تعديل رمز ضريبي", "effectiveFrom": "ساري من",
  "effectiveTo": "ساري إلى", "exciseRate": "الانتقائية (%)", "exempt": "معفى",
  "new": "رمز ضريبي جديد", "otherTaxes": "أخرى", "reverseCharge": "الاحتساب العكسي",
  "standard": "قياسي", "subtitle": "رموز المعاملات الضريبية المجمعة",
  "taxRates": "معدلات الضريبة", "title": "الرموز الضريبية", "type": "النوع",
  "vatRate": "نسبة ضريبة القيمة المضافة (%)", "withholdingRate": "نسبة الاستقطاع (%)",
  "zatca": "هيئة الزكاة والضريبة والجمارك", "zatcaCode": "رمز ZATCA", "zeroRated": "نسبة صفر"
});

// departments
if (!ar.departments) ar.departments = {};
deepMerge(ar.departments, {
  "allLevels": "جميع المستويات", "budget": "الميزانية", "costCenter": "مركز التكلفة",
  "create": "إنشاء قسم", "deleteWarning": "حذف هذا القسم سيؤثر على جميع الأقسام الفرعية. هل أنت متأكد؟",
  "edit": "تعديل القسم", "employees": "الموظفين", "level": "المستوى",
  "levels": "مستويات التسلسل", "location": "الموقع", "manager": "المدير",
  "new": "قسم جديد", "noParent": "بدون أصل (مستوى أعلى)", "parent": "القسم الأصل",
  "subtitle": "إدارة الأقسام التنظيمية والتسلسل الهرمي", "title": "الأقسام",
  "total": "إجمالي الأقسام", "totalBudget": "إجمالي الميزانية", "totalEmployees": "إجمالي الموظفين"
});

// taxTypes
if (!ar.taxTypes) ar.taxTypes = {};
deepMerge(ar.taxTypes, {
  "appliesTo": "ينطبق على", "calculationMethod": "طريقة الحساب", "category": "الفئة",
  "create": "إنشاء نوع ضريبة", "defaultRate": "النسبة الافتراضية %", "edit": "تعديل نوع الضريبة",
  "excise": "انتقائية", "glPayable": "حساب الأستاذ المستحق", "glReceivable": "حساب الأستاذ المدين",
  "inclusive": "شامل الضريبة", "new": "نوع ضريبة جديد", "rate": "النسبة",
  "recoverable": "قابل للاسترداد", "reportingFrequency": "تكرار التقارير",
  "subtitle": "تعريفات ضريبة القيمة المضافة والجمارك والانتقائية والاستقطاع والزكاة",
  "taxAuthority": "الجهة الضريبية", "title": "أنواع الضرائب", "vat": "ضريبة القيمة المضافة", "zakat": "الزكاة"
});

// taxRates
if (!ar.taxRates) ar.taxRates = {};
deepMerge(ar.taxRates, {
  "create": "إنشاء معدل ضريبة", "default": "افتراضي", "defaultRates": "المعدلات الافتراضية",
  "edit": "تعديل معدل الضريبة", "effectiveDate": "تاريخ السريان", "effectiveFrom": "ساري من",
  "effectiveTo": "ساري إلى", "highRates": "معدلات مرتفعة", "itemCategory": "فئة الصنف",
  "maxAmount": "الحد الأقصى للمبلغ", "minAmount": "الحد الأدنى للمبلغ", "new": "معدل ضريبة جديد",
  "rate": "النسبة (%)", "region": "المنطقة", "subtitle": "إدارة معدلات الضرائب وتهيئة ضريبة القيمة المضافة",
  "taxType": "نوع الضريبة", "title": "معدلات الضرائب", "zeroRates": "معدلات صفرية"
});

// freeze
if (!ar.freeze) ar.freeze = {};
deepMerge(ar.freeze, {
  "affectedModules": "الوحدات المتأثرة", "editPeriod": "تعديل فترة التجميد", "endDate": "تاريخ النهاية",
  "freezeType": "نوع التجميد", "frozen": "مجمّد", "modules": "الوحدات",
  "noPeriods": "لم يتم العثور على فترات تجميد", "periodName": "اسم الفترة",
  "periods": "فترات التجميد", "reason": "السبب", "startDate": "تاريخ البداية",
  "subtitle": "إدارة فترات تجميد البيانات", "title": "إعدادات التجميد", "unfreeze": "إلغاء التجميد"
});

// master (AR)
if (!ar.master) ar.master = {};
deepMerge(ar.master, {
  "backupSettings": {
    "buttons": { "backup": "نسخ احتياطي الآن" }, "days": "أيام",
    "fields": { "autoBackup": "نسخ احتياطي تلقائي", "encryption": "التشفير", "frequency": "تكرار النسخ الاحتياطي", "lastBackup": "آخر نسخ احتياطي", "location": "موقع النسخ الاحتياطي", "retention": "فترة الاحتفاظ" },
    "messages": { "backupStarted": "بدأ النسخ الاحتياطي بنجاح", "updated": "تم تحديث إعدادات النسخ الاحتياطي بنجاح" },
    "title": "إعدادات النسخ الاحتياطي"
  },
  "systemSetup": {
    "messages": { "updated": "تم تحديث إعدادات النظام بنجاح" },
    "title": "إعداد النظام", "type": "النوع"
  }
});

// security
if (!ar.security) ar.security = {};
deepMerge(ar.security, {
  "access": "الوصول", "audit": "التدقيق", "auditEvents": "أحداث التدقيق",
  "ipWhitelist": "قائمة IP المسموحة", "medium": "متوسط", "minLength": "الحد الأدنى للطول",
  "password": "كلمة المرور", "requirements": "المتطلبات", "session": "الجلسة",
  "sessionTimeout": "مهلة الجلسة (دقائق)", "strong": "قوي",
  "subtitle": "إدارة سياسات الأمان وكلمات المرور", "title": "سياسات الأمان", "weak": "ضعيف"
});

// approval
if (!ar.approval) ar.approval = {};
deepMerge(ar.approval, {
  "addStep": "إضافة خطوة", "approverType": "نوع الموافِق", "createFirst": "أنشئ أول سير عمل",
  "createWorkflow": "إنشاء سير عمل", "deleteConfirm": "هل أنت متأكد من حذف سير العمل هذا؟",
  "deleteWorkflow": "حذف سير العمل", "editStep": "تعديل الخطوة", "editWorkflow": "تعديل سير العمل",
  "noWorkflows": "لم يتم العثور على سير عمل", "resourceType": "نوع المورد",
  "stepName": "اسم الخطوة", "steps": "الخطوات"
});

// bankAccounts
if (!ar.bankAccounts) ar.bankAccounts = {};
deepMerge(ar.bankAccounts, {
  "allCurrencies": "جميع العملات", "allTypes": "جميع الأنواع",
  "cannotDeleteDefault": "لا يمكن حذف الحساب الافتراضي", "invalidIban": "رقم IBAN غير صالح",
  "new": "حساب بنكي جديد", "overdraftLimit": "حد السحب", "pending": "معلق",
  "reconciled": "تمت المطابقة", "totalBalance": "إجمالي الرصيد"
});

// invoiceItems
if (!ar.invoiceItems) ar.invoiceItems = {};
deepMerge(ar.invoiceItems, {
  "costCenter": "مركز التكلفة", "editItem": "تعديل الصنف", "project": "المشروع",
  "selectWarehouse": "اختر المستودع", "update": "تحديث", "warehouse": "المستودع"
});

// menu
if (!ar.menu) ar.menu = {};
deepMerge(ar.menu, {
  "logistics": {
    "landedCost": { "allocation": "توزيع التكلفة المحملة", "costTypes": "أنواع تكاليف الشحن", "settings": "إعدادات التكلفة المحملة" },
    "shipmentManagement": { "carrierEvaluations": "تقييمات الناقلين", "carrierQuotes": "عروض أسعار الناقلين", "shipmentAlerts": "تنبيهات الشحنات" }
  }
});

// reminders
if (!ar.reminders) ar.reminders = {};
deepMerge(ar.reminders, { "addRule": "إضافة قاعدة", "subtitle": "إدارة قواعد التذكير للمدفوعات المعلقة", "title": "تذكيرات الدفع" });

// renewals
if (!ar.renewals) ar.renewals = {};
deepMerge(ar.renewals, { "subtitle": "تتبع التراخيص والعقود والاشتراكات", "title": "تنبيهات التجديد" });

// validation
if (!ar.validation) ar.validation = {};
if (!ar.validation.required) ar.validation.required = "هذا الحقل مطلوب";
if (!en.validation) en.validation = {};
if (!en.validation.required) en.validation.required = "This field is required";

// Write files
fs.writeFileSync('./frontend-next/locales/en.json', JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync('./frontend-next/locales/ar.json', JSON.stringify(ar, null, 2) + '\n', 'utf8');

console.log('EN common keys:', Object.keys(en.common).length);
console.log('AR common keys:', Object.keys(ar.common).length);
console.log('EN top-level sections:', Object.keys(en).length);
console.log('AR top-level sections:', Object.keys(ar).length);
console.log('\nMerge complete!');
