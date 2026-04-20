/**
 * Add all remaining missing translations
 * Phase 2: Handle the 839 keys missing from both EN and AR
 */
const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('./frontend-next/locales/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('./frontend-next/locales/ar.json', 'utf8'));

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMerge(target[key], source[key]);
    } else if (target[key] === undefined) {
      target[key] = source[key];
    }
  }
  return target;
}

// Fix the 1 missing AR key
if (!ar.common.view) ar.common.view = "عرض";

// Fix the 1 missing common in both
if (!en.common.allRoles) en.common.allRoles = "All Roles";
if (!ar.common.allRoles) ar.common.allRoles = "جميع الأدوار";

// ==========================================
// settings section (196 keys)
// ==========================================
const settingsEN = {
  "title": "Settings",
  "subtitle": "System configuration and preferences",
  "general": "General",
  "generalSettings": "General Settings",
  "companyInfo": "Company Information",
  "companyName": "Company Name",
  "companyNameAr": "Company Name (Arabic)",
  "companyLogo": "Company Logo",
  "uploadLogo": "Upload Logo",
  "removeLogo": "Remove Logo",
  "address": "Address",
  "city": "City",
  "country": "Country",
  "phone": "Phone",
  "email": "Email",
  "website": "Website",
  "taxId": "Tax ID",
  "commercialRegister": "Commercial Register",
  "currency": "Default Currency",
  "language": "Default Language",
  "timezone": "Timezone",
  "dateFormat": "Date Format",
  "fiscalYear": "Fiscal Year",
  "fiscalYearStart": "Fiscal Year Start",
  "invoiceSettings": "Invoice Settings",
  "invoicePrefix": "Invoice Prefix",
  "invoiceStartNumber": "Starting Invoice Number",
  "invoiceTerms": "Default Invoice Terms",
  "invoiceNotes": "Default Invoice Notes",
  "paymentTerms": "Payment Terms",
  "paymentDueDays": "Payment Due Days",
  "taxSettings": "Tax Settings",
  "enableTax": "Enable Tax",
  "defaultTaxRate": "Default Tax Rate",
  "taxInclusive": "Tax Inclusive",
  "vatNumber": "VAT Number",
  "warehouseSettings": "Warehouse Settings",
  "enableMultiWarehouse": "Enable Multi-Warehouse",
  "defaultWarehouse": "Default Warehouse",
  "enableBarcode": "Enable Barcode",
  "enableBatch": "Enable Batch Tracking",
  "enableSerial": "Enable Serial Numbers",
  "enableExpiry": "Enable Expiry Tracking",
  "lowStockAlert": "Low Stock Alert",
  "lowStockThreshold": "Low Stock Threshold",
  "shipmentSettings": "Shipment Settings",
  "defaultShippingMethod": "Default Shipping Method",
  "enableTracking": "Enable Tracking",
  "autoGenerateRef": "Auto Generate Reference",
  "refPrefix": "Reference Prefix",
  "userSettings": "User Settings",
  "enableTwoFactor": "Enable Two-Factor Authentication",
  "sessionTimeout": "Session Timeout",
  "maxLoginAttempts": "Max Login Attempts",
  "lockoutDuration": "Lockout Duration",
  "passwordMinLength": "Min Password Length",
  "requireUppercase": "Require Uppercase",
  "requireLowercase": "Require Lowercase",
  "requireNumbers": "Require Numbers",
  "requireSpecialChars": "Require Special Characters",
  "emailSettings": "Email Settings",
  "smtpServer": "SMTP Server",
  "smtpPort": "SMTP Port",
  "smtpUser": "SMTP Username",
  "smtpPassword": "SMTP Password",
  "smtpEncryption": "Encryption",
  "senderEmail": "Sender Email",
  "senderName": "Sender Name",
  "testEmail": "Test Email",
  "sendTestEmail": "Send Test Email",
  "notificationSettings": "Notification Settings",
  "enableEmailNotifications": "Enable Email Notifications",
  "enablePushNotifications": "Enable Push Notifications",
  "enableSmsNotifications": "Enable SMS Notifications",
  "backupSettings": "Backup Settings",
  "autoBackup": "Auto Backup",
  "backupFrequency": "Backup Frequency",
  "backupRetention": "Backup Retention (days)",
  "lastBackup": "Last Backup",
  "backupNow": "Backup Now",
  "restoreBackup": "Restore Backup",
  "integrationSettings": "Integration Settings",
  "apiKey": "API Key",
  "generateApiKey": "Generate API Key",
  "webhookUrl": "Webhook URL",
  "enableWebhook": "Enable Webhook",
  "billingSettings": "Billing Settings",
  "plan": "Current Plan",
  "nextBilling": "Next Billing Date",
  "changePlan": "Change Plan",
  "paymentMethod": "Payment Method",
  "billingHistory": "Billing History",
  "system": "System",
  "systemInfo": "System Information",
  "version": "Version",
  "environment": "Environment",
  "database": "Database",
  "storage": "Storage",
  "lastUpdated": "Last Updated",
  "maintenance": "Maintenance",
  "clearCache": "Clear Cache",
  "reindex": "Reindex Database",
  "systemLogs": "System Logs",
  "auditLog": "Audit Log",
  "customize": "Customize",
  "theme": "Theme",
  "primaryColor": "Primary Color",
  "accentColor": "Accent Color",
  "logoPosition": "Logo Position",
  "compactMode": "Compact Mode",
  "sidebarCollapsed": "Sidebar Collapsed",
  "locale": "Locale",
  "regionFormat": "Region Format",
  "importExport": "Import/Export",
  "importData": "Import Data",
  "exportData": "Export Data",
  "importFromFile": "Import from File",
  "selectFile": "Select File",
  "fileFormat": "File Format",
  "skipHeader": "Skip Header Row",
  "importPreview": "Import Preview",
  "startImport": "Start Import",
  "exportAll": "Export All Data",
  "exportSelected": "Export Selected",
  "exportFormat": "Export Format",
  "printing": "Printing",
  "printLogo": "Include Logo",
  "printHeader": "Print Header",
  "printFooter": "Print Footer",
  "pageSize": "Page Size",
  "orientation": "Orientation",
  "portrait": "Portrait",
  "landscape": "Landscape",
  "headerText": "Header Text",
  "footerText": "Footer Text",
  "security": "Security",
  "twoFactorAuth": "Two-Factor Authentication",
  "ipWhitelist": "IP Whitelist",
  "passwordPolicy": "Password Policy",
  "sessionManagement": "Session Management",
  "activeSessions": "Active Sessions",
  "revokeAll": "Revoke All Sessions",
  "loginHistory": "Login History",
  "modules": "Modules",
  "enabledModules": "Enabled Modules",
  "disabledModules": "Disabled Modules",
  "moduleConfig": "Module Configuration",
  "accounting": "Accounting",
  "inventory": "Inventory",
  "shipping": "Shipping",
  "crm": "CRM",
  "hr": "Human Resources",
  "reports": "Reports",
  "resetToDefault": "Reset to Default",
  "resetWarning": "This will reset all settings to their default values.",
  "resetConfirm": "Are you sure you want to reset?",
  "saveSettings": "Save Settings",
  "saved": "Settings saved successfully",
  "saveFailed": "Failed to save settings",
  "loading": "Loading settings...",
  "tabs": "Settings Tabs",
  "advanced": "Advanced",
  "permissions": "Permissions",
  "roles": "Roles",
  "workflows": "Workflows",
  "templates": "Templates",
  "branches": "Branches",
  "currencies": "Currencies",
  "exchangeRates": "Exchange Rates",
  "units": "Units",
  "categories": "Categories",
  "tags": "Tags",
  "customFields": "Custom Fields",
  "numberFormat": "Number Format",
  "decimalPlaces": "Decimal Places",
  "thousandSeparator": "Thousand Separator",
  "decimalSeparator": "Decimal Separator",
  "currencyFormat": "Currency Format",
  "currencyPosition": "Currency Position",
  "prefix": "Prefix",
  "suffix": "Suffix"
};

const settingsAR = {
  "title": "الإعدادات",
  "subtitle": "تهيئة النظام والتفضيلات",
  "general": "عام",
  "generalSettings": "الإعدادات العامة",
  "companyInfo": "معلومات الشركة",
  "companyName": "اسم الشركة",
  "companyNameAr": "اسم الشركة (بالعربية)",
  "companyLogo": "شعار الشركة",
  "uploadLogo": "رفع الشعار",
  "removeLogo": "إزالة الشعار",
  "address": "العنوان",
  "city": "المدينة",
  "country": "الدولة",
  "phone": "الهاتف",
  "email": "البريد الإلكتروني",
  "website": "الموقع الإلكتروني",
  "taxId": "الرقم الضريبي",
  "commercialRegister": "السجل التجاري",
  "currency": "العملة الافتراضية",
  "language": "اللغة الافتراضية",
  "timezone": "المنطقة الزمنية",
  "dateFormat": "صيغة التاريخ",
  "fiscalYear": "السنة المالية",
  "fiscalYearStart": "بداية السنة المالية",
  "invoiceSettings": "إعدادات الفواتير",
  "invoicePrefix": "بادئة الفاتورة",
  "invoiceStartNumber": "رقم بداية الفاتورة",
  "invoiceTerms": "شروط الفاتورة الافتراضية",
  "invoiceNotes": "ملاحظات الفاتورة الافتراضية",
  "paymentTerms": "شروط الدفع",
  "paymentDueDays": "أيام استحقاق الدفع",
  "taxSettings": "إعدادات الضرائب",
  "enableTax": "تفعيل الضريبة",
  "defaultTaxRate": "نسبة الضريبة الافتراضية",
  "taxInclusive": "شامل الضريبة",
  "vatNumber": "رقم ضريبة القيمة المضافة",
  "warehouseSettings": "إعدادات المستودعات",
  "enableMultiWarehouse": "تفعيل المستودعات المتعددة",
  "defaultWarehouse": "المستودع الافتراضي",
  "enableBarcode": "تفعيل الباركود",
  "enableBatch": "تفعيل تتبع الدفعات",
  "enableSerial": "تفعيل الأرقام التسلسلية",
  "enableExpiry": "تفعيل تتبع الصلاحية",
  "lowStockAlert": "تنبيه انخفاض المخزون",
  "lowStockThreshold": "حد انخفاض المخزون",
  "shipmentSettings": "إعدادات الشحن",
  "defaultShippingMethod": "طريقة الشحن الافتراضية",
  "enableTracking": "تفعيل التتبع",
  "autoGenerateRef": "توليد المرجع تلقائياً",
  "refPrefix": "بادئة المرجع",
  "userSettings": "إعدادات المستخدم",
  "enableTwoFactor": "تفعيل المصادقة الثنائية",
  "sessionTimeout": "مهلة الجلسة",
  "maxLoginAttempts": "الحد الأقصى لمحاولات الدخول",
  "lockoutDuration": "مدة القفل",
  "passwordMinLength": "الحد الأدنى لطول كلمة المرور",
  "requireUppercase": "يتطلب أحرف كبيرة",
  "requireLowercase": "يتطلب أحرف صغيرة",
  "requireNumbers": "يتطلب أرقام",
  "requireSpecialChars": "يتطلب رموز خاصة",
  "emailSettings": "إعدادات البريد الإلكتروني",
  "smtpServer": "خادم SMTP",
  "smtpPort": "منفذ SMTP",
  "smtpUser": "اسم مستخدم SMTP",
  "smtpPassword": "كلمة مرور SMTP",
  "smtpEncryption": "التشفير",
  "senderEmail": "بريد المرسل",
  "senderName": "اسم المرسل",
  "testEmail": "بريد اختباري",
  "sendTestEmail": "إرسال بريد اختباري",
  "notificationSettings": "إعدادات الإشعارات",
  "enableEmailNotifications": "تفعيل إشعارات البريد",
  "enablePushNotifications": "تفعيل إشعارات الدفع",
  "enableSmsNotifications": "تفعيل إشعارات الرسائل النصية",
  "backupSettings": "إعدادات النسخ الاحتياطي",
  "autoBackup": "نسخ احتياطي تلقائي",
  "backupFrequency": "تكرار النسخ الاحتياطي",
  "backupRetention": "الاحتفاظ بالنسخ (أيام)",
  "lastBackup": "آخر نسخ احتياطي",
  "backupNow": "نسخ احتياطي الآن",
  "restoreBackup": "استعادة النسخ الاحتياطي",
  "integrationSettings": "إعدادات التكامل",
  "apiKey": "مفتاح API",
  "generateApiKey": "توليد مفتاح API",
  "webhookUrl": "رابط Webhook",
  "enableWebhook": "تفعيل Webhook",
  "billingSettings": "إعدادات الفواتير",
  "plan": "الباقة الحالية",
  "nextBilling": "تاريخ الفاتورة التالية",
  "changePlan": "تغيير الباقة",
  "paymentMethod": "طريقة الدفع",
  "billingHistory": "سجل الفواتير",
  "system": "النظام",
  "systemInfo": "معلومات النظام",
  "version": "الإصدار",
  "environment": "البيئة",
  "database": "قاعدة البيانات",
  "storage": "التخزين",
  "lastUpdated": "آخر تحديث",
  "maintenance": "الصيانة",
  "clearCache": "مسح ذاكرة التخزين المؤقت",
  "reindex": "إعادة فهرسة قاعدة البيانات",
  "systemLogs": "سجلات النظام",
  "auditLog": "سجل التدقيق",
  "customize": "تخصيص",
  "theme": "المظهر",
  "primaryColor": "اللون الأساسي",
  "accentColor": "لون التمييز",
  "logoPosition": "موضع الشعار",
  "compactMode": "الوضع المضغوط",
  "sidebarCollapsed": "الشريط الجانبي مطوي",
  "locale": "اللغة المحلية",
  "regionFormat": "تنسيق المنطقة",
  "importExport": "استيراد/تصدير",
  "importData": "استيراد البيانات",
  "exportData": "تصدير البيانات",
  "importFromFile": "استيراد من ملف",
  "selectFile": "اختر ملف",
  "fileFormat": "صيغة الملف",
  "skipHeader": "تخطي صف العنوان",
  "importPreview": "معاينة الاستيراد",
  "startImport": "بدء الاستيراد",
  "exportAll": "تصدير جميع البيانات",
  "exportSelected": "تصدير المحدد",
  "exportFormat": "صيغة التصدير",
  "printing": "الطباعة",
  "printLogo": "تضمين الشعار",
  "printHeader": "رأس الطباعة",
  "printFooter": "تذييل الطباعة",
  "pageSize": "حجم الصفحة",
  "orientation": "الاتجاه",
  "portrait": "عمودي",
  "landscape": "أفقي",
  "headerText": "نص الرأس",
  "footerText": "نص التذييل",
  "security": "الأمان",
  "twoFactorAuth": "المصادقة الثنائية",
  "ipWhitelist": "قائمة IP المسموحة",
  "passwordPolicy": "سياسة كلمة المرور",
  "sessionManagement": "إدارة الجلسات",
  "activeSessions": "الجلسات النشطة",
  "revokeAll": "إلغاء جميع الجلسات",
  "loginHistory": "سجل تسجيل الدخول",
  "modules": "الوحدات",
  "enabledModules": "الوحدات المفعّلة",
  "disabledModules": "الوحدات المعطّلة",
  "moduleConfig": "تهيئة الوحدة",
  "accounting": "المحاسبة",
  "inventory": "المخزون",
  "shipping": "الشحن",
  "crm": "إدارة العملاء",
  "hr": "الموارد البشرية",
  "reports": "التقارير",
  "resetToDefault": "إعادة تعيين للافتراضي",
  "resetWarning": "سيتم إعادة تعيين جميع الإعدادات إلى قيمها الافتراضية.",
  "resetConfirm": "هل أنت متأكد من إعادة التعيين؟",
  "saveSettings": "حفظ الإعدادات",
  "saved": "تم حفظ الإعدادات بنجاح",
  "saveFailed": "فشل حفظ الإعدادات",
  "loading": "جاري تحميل الإعدادات...",
  "tabs": "علامات الإعدادات",
  "advanced": "متقدم",
  "permissions": "الصلاحيات",
  "roles": "الأدوار",
  "workflows": "سير العمل",
  "templates": "القوالب",
  "branches": "الفروع",
  "currencies": "العملات",
  "exchangeRates": "أسعار الصرف",
  "units": "الوحدات",
  "categories": "الفئات",
  "tags": "العلامات",
  "customFields": "حقول مخصصة",
  "numberFormat": "تنسيق الأرقام",
  "decimalPlaces": "المنازل العشرية",
  "thousandSeparator": "فاصل الآلاف",
  "decimalSeparator": "الفاصل العشري",
  "currencyFormat": "تنسيق العملة",
  "currencyPosition": "موضع العملة",
  "prefix": "بادئة",
  "suffix": "لاحقة"
};

if (!en.settings) en.settings = {};
if (!ar.settings) ar.settings = {};
deepMerge(en.settings, settingsEN);
deepMerge(ar.settings, settingsAR);

// ==========================================
// security section (39 keys) - supplement
// ==========================================
const securityEN = {
  "title": "Security Policies",
  "subtitle": "Manage security and password policies",
  "passwordPolicy": "Password Policy",
  "password": "Password",
  "minLength": "Minimum Length",
  "requireUppercase": "Require Uppercase",
  "requireLowercase": "Require Lowercase",
  "requireNumbers": "Require Numbers",
  "requireSpecialChars": "Require Special Characters",
  "passwordExpiry": "Password Expiry (days)",
  "preventReuse": "Prevent Password Reuse",
  "reuseCount": "Previous Passwords Count",
  "session": "Session",
  "sessionTimeout": "Session Timeout (minutes)",
  "maxSessions": "Max Concurrent Sessions",
  "idleTimeout": "Idle Timeout (minutes)",
  "access": "Access",
  "ipWhitelist": "IP Whitelist",
  "enableIpWhitelist": "Enable IP Whitelist",
  "allowedIps": "Allowed IPs",
  "addIp": "Add IP Address",
  "twoFactor": "Two-Factor Authentication",
  "enableTwoFactor": "Enable 2FA",
  "twoFactorMethod": "2FA Method",
  "audit": "Audit",
  "auditEvents": "Audit Events",
  "enableAudit": "Enable Audit Logging",
  "retentionDays": "Retention (days)",
  "logLevel": "Log Level",
  "loginAttempts": "Login Attempts",
  "maxAttempts": "Max Attempts",
  "lockoutDuration": "Lockout Duration (minutes)",
  "bruteForce": "Brute Force Protection",
  "weak": "Weak",
  "medium": "Medium",
  "strong": "Strong",
  "requirements": "Requirements",
  "strength": "Password Strength",
  "compliant": "Compliant"
};

const securityAR = {
  "title": "سياسات الأمان",
  "subtitle": "إدارة سياسات الأمان وكلمات المرور",
  "passwordPolicy": "سياسة كلمة المرور",
  "password": "كلمة المرور",
  "minLength": "الحد الأدنى للطول",
  "requireUppercase": "يتطلب أحرف كبيرة",
  "requireLowercase": "يتطلب أحرف صغيرة",
  "requireNumbers": "يتطلب أرقام",
  "requireSpecialChars": "يتطلب رموز خاصة",
  "passwordExpiry": "انتهاء صلاحية كلمة المرور (أيام)",
  "preventReuse": "منع إعادة استخدام كلمة المرور",
  "reuseCount": "عدد كلمات المرور السابقة",
  "session": "الجلسة",
  "sessionTimeout": "مهلة الجلسة (دقائق)",
  "maxSessions": "الحد الأقصى للجلسات المتزامنة",
  "idleTimeout": "مهلة الخمول (دقائق)",
  "access": "الوصول",
  "ipWhitelist": "قائمة IP المسموحة",
  "enableIpWhitelist": "تفعيل قائمة IP المسموحة",
  "allowedIps": "عناوين IP المسموحة",
  "addIp": "إضافة عنوان IP",
  "twoFactor": "المصادقة الثنائية",
  "enableTwoFactor": "تفعيل المصادقة الثنائية",
  "twoFactorMethod": "طريقة المصادقة الثنائية",
  "audit": "التدقيق",
  "auditEvents": "أحداث التدقيق",
  "enableAudit": "تفعيل سجل التدقيق",
  "retentionDays": "الاحتفاظ (أيام)",
  "logLevel": "مستوى السجل",
  "loginAttempts": "محاولات تسجيل الدخول",
  "maxAttempts": "الحد الأقصى للمحاولات",
  "lockoutDuration": "مدة القفل (دقائق)",
  "bruteForce": "الحماية من القوة الغاشمة",
  "weak": "ضعيف",
  "medium": "متوسط",
  "strong": "قوي",
  "requirements": "المتطلبات",
  "strength": "قوة كلمة المرور",
  "compliant": "متوافق"
};

if (!en.security) en.security = {};
if (!ar.security) ar.security = {};
deepMerge(en.security, securityEN);
deepMerge(ar.security, securityAR);

// ==========================================
// expenses (34 keys)
// ==========================================
const expensesEN = {
  "title": "Expenses",
  "subtitle": "Track and manage expenses",
  "addExpense": "Add Expense",
  "createExpense": "Create Expense",
  "editExpense": "Edit Expense",
  "deleteExpense": "Delete Expense",
  "deleteMessage": "Are you sure you want to delete this expense?",
  "create": "Create Expense",
  "createSubtitle": "Add a new expense record",
  "created": "Expense created successfully",
  "amount": "Amount",
  "amountDetails": "Amount Details",
  "description": "Description",
  "notes": "Notes",
  "category": "Category",
  "currency": "Currency",
  "date": "Date",
  "expenseDate": "Expense Date",
  "dateReference": "Date & Reference",
  "receiptNumber": "Receipt Number",
  "status": "Status",
  "pending": "Pending",
  "approved": "Approved",
  "paid": "Paid",
  "pendingApproval": "Pending Approval",
  "basicInfo": "Basic Information",
  "shipment": "Shipment",
  "shipmentReference": "Shipment Reference",
  "total": "Total",
  "totalExpenses": "Total Expenses",
  "count": "Expense Count",
  "noExpensesMessage": "No expenses found",
  "reports": "Expense Reports",
  "reportsSubtitle": "Analyze expense data"
};

const expensesAR = {
  "title": "المصاريف",
  "subtitle": "تتبع وإدارة المصاريف",
  "addExpense": "إضافة مصروف",
  "createExpense": "إنشاء مصروف",
  "editExpense": "تعديل المصروف",
  "deleteExpense": "حذف المصروف",
  "deleteMessage": "هل أنت متأكد من حذف هذا المصروف؟",
  "create": "إنشاء مصروف",
  "createSubtitle": "إضافة سجل مصروف جديد",
  "created": "تم إنشاء المصروف بنجاح",
  "amount": "المبلغ",
  "amountDetails": "تفاصيل المبلغ",
  "description": "الوصف",
  "notes": "ملاحظات",
  "category": "الفئة",
  "currency": "العملة",
  "date": "التاريخ",
  "expenseDate": "تاريخ المصروف",
  "dateReference": "التاريخ والمرجع",
  "receiptNumber": "رقم الإيصال",
  "status": "الحالة",
  "pending": "معلق",
  "approved": "معتمد",
  "paid": "مدفوع",
  "pendingApproval": "بانتظار الموافقة",
  "basicInfo": "معلومات أساسية",
  "shipment": "الشحنة",
  "shipmentReference": "مرجع الشحنة",
  "total": "الإجمالي",
  "totalExpenses": "إجمالي المصاريف",
  "count": "عدد المصاريف",
  "noExpensesMessage": "لم يتم العثور على مصاريف",
  "reports": "تقارير المصاريف",
  "reportsSubtitle": "تحليل بيانات المصاريف"
};

if (!en.expenses) en.expenses = {};
if (!ar.expenses) ar.expenses = {};
deepMerge(en.expenses, expensesEN);
deepMerge(ar.expenses, expensesAR);

// ==========================================
// payrollPeriods (32)
// ==========================================
if (!en.payrollPeriods) en.payrollPeriods = {};
if (!ar.payrollPeriods) ar.payrollPeriods = {};
deepMerge(en.payrollPeriods, {
  "title": "Payroll Periods", "subtitle": "Manage payroll periods and schedules",
  "create": "Create Period", "edit": "Edit Period", "new": "New Period",
  "startDate": "Start Date", "endDate": "End Date", "payDate": "Pay Date",
  "status": "Status", "open": "Open", "closed": "Closed", "locked": "Locked",
  "processing": "Processing", "employees": "Employees", "totalGross": "Total Gross",
  "totalNet": "Total Net", "totalDeductions": "Total Deductions", "process": "Process",
  "close": "Close Period", "reopen": "Reopen", "generate": "Generate",
  "deleteWarning": "This payroll period will be permanently deleted.",
  "cannotDelete": "Cannot delete a processed period", "period": "Period",
  "frequency": "Frequency", "monthly": "Monthly", "biweekly": "Bi-weekly",
  "weekly": "Weekly", "annual": "Annual", "summary": "Payroll Summary",
  "details": "Period Details", "total": "Total", "variance": "Variance"
});
deepMerge(ar.payrollPeriods, {
  "title": "فترات الرواتب", "subtitle": "إدارة فترات ومواعيد الرواتب",
  "create": "إنشاء فترة", "edit": "تعديل الفترة", "new": "فترة جديدة",
  "startDate": "تاريخ البداية", "endDate": "تاريخ النهاية", "payDate": "تاريخ الدفع",
  "status": "الحالة", "open": "مفتوحة", "closed": "مغلقة", "locked": "مقفلة",
  "processing": "قيد المعالجة", "employees": "الموظفين", "totalGross": "إجمالي الراتب",
  "totalNet": "صافي الراتب", "totalDeductions": "إجمالي الخصومات", "process": "معالجة",
  "close": "إغلاق الفترة", "reopen": "إعادة فتح", "generate": "توليد",
  "deleteWarning": "سيتم حذف فترة الرواتب نهائياً.",
  "cannotDelete": "لا يمكن حذف فترة تمت معالجتها", "period": "الفترة",
  "frequency": "التكرار", "monthly": "شهري", "biweekly": "نصف شهري",
  "weekly": "أسبوعي", "annual": "سنوي", "summary": "ملخص الرواتب",
  "details": "تفاصيل الفترة", "total": "الإجمالي", "variance": "الفرق"
});

// ==========================================
// deductions (29)
// ==========================================
if (!en.deductions) en.deductions = {};
if (!ar.deductions) ar.deductions = {};
deepMerge(en.deductions, {
  "title": "Deductions", "subtitle": "Manage salary deductions",
  "create": "Create Deduction", "edit": "Edit Deduction", "new": "New Deduction",
  "delete": "Delete Deduction", "deleteWarning": "This deduction will be permanently deleted.",
  "deduction": "Deduction", "type": "Type", "types": "Deduction Types",
  "fixedAmount": "Fixed Amount", "percentOfBasic": "Percentage of Basic",
  "percentRequired": "Percentage is required", "maxAmount": "Maximum Amount",
  "minAmount": "Minimum Amount", "maxInstallments": "Max Installments",
  "glAccount": "GL Account", "employees": "Employees", "monthlyTotal": "Monthly Total",
  "flags": "Flags", "gosi": "GOSI", "loans": "Loans",
  "active": "Active", "category": "Category", "frequency": "Frequency",
  "amount": "Amount", "startDate": "Start Date", "endDate": "End Date",
  "description": "Description", "mandatory": "Mandatory"
});
deepMerge(ar.deductions, {
  "title": "الخصومات", "subtitle": "إدارة خصومات الرواتب",
  "create": "إنشاء خصم", "edit": "تعديل الخصم", "new": "خصم جديد",
  "delete": "حذف الخصم", "deleteWarning": "سيتم حذف هذا الخصم نهائياً.",
  "deduction": "الخصم", "type": "النوع", "types": "أنواع الخصومات",
  "fixedAmount": "مبلغ ثابت", "percentOfBasic": "نسبة من الراتب الأساسي",
  "percentRequired": "النسبة مطلوبة", "maxAmount": "الحد الأقصى للمبلغ",
  "minAmount": "الحد الأدنى للمبلغ", "maxInstallments": "الحد الأقصى للأقساط",
  "glAccount": "حساب الأستاذ", "employees": "الموظفين", "monthlyTotal": "الإجمالي الشهري",
  "flags": "علامات", "gosi": "التأمينات الاجتماعية", "loans": "القروض",
  "active": "نشط", "category": "الفئة", "frequency": "التكرار",
  "amount": "المبلغ", "startDate": "تاريخ البداية", "endDate": "تاريخ النهاية",
  "description": "الوصف", "mandatory": "إلزامي"
});

// ==========================================
// Remaining sections - smaller ones
// ==========================================

// zatca (29)
if (!en.zatca) en.zatca = {};
if (!ar.zatca) ar.zatca = {};
deepMerge(en.zatca, {
  "title": "ZATCA Integration", "subtitle": "Manage ZATCA compliance and e-invoicing",
  "compliance": "Compliance", "einvoice": "E-Invoice", "settings": "ZATCA Settings",
  "deviceId": "Device ID", "secretKey": "Secret Key", "environment": "Environment",
  "production": "Production", "sandbox": "Sandbox", "status": "Status",
  "connected": "Connected", "disconnected": "Disconnected", "lastSync": "Last Sync",
  "sync": "Sync Now", "invoices": "ZATCA Invoices", "submit": "Submit to ZATCA",
  "submitted": "Submitted", "rejected": "Rejected", "pending": "Pending",
  "clearance": "Clearance", "reporting": "Reporting", "simplified": "Simplified",
  "standard": "Standard", "validate": "Validate", "qrCode": "QR Code",
  "xml": "XML", "hash": "Hash", "uuid": "UUID", "errors": "Errors"
});
deepMerge(ar.zatca, {
  "title": "تكامل هيئة الزكاة والضريبة والجمارك", "subtitle": "إدارة الامتثال والفوترة الإلكترونية",
  "compliance": "الامتثال", "einvoice": "الفاتورة الإلكترونية", "settings": "إعدادات ZATCA",
  "deviceId": "معرف الجهاز", "secretKey": "المفتاح السري", "environment": "البيئة",
  "production": "إنتاج", "sandbox": "اختبار", "status": "الحالة",
  "connected": "متصل", "disconnected": "غير متصل", "lastSync": "آخر مزامنة",
  "sync": "مزامنة الآن", "invoices": "فواتير ZATCA", "submit": "إرسال إلى ZATCA",
  "submitted": "مُرسلة", "rejected": "مرفوضة", "pending": "معلقة",
  "clearance": "اعتماد", "reporting": "إبلاغ", "simplified": "مبسطة",
  "standard": "قياسية", "validate": "تحقق", "qrCode": "رمز QR",
  "xml": "XML", "hash": "تجزئة", "uuid": "UUID", "errors": "أخطاء"
});

// fiscalYears (27)
if (!en.fiscalYears) en.fiscalYears = {};
if (!ar.fiscalYears) ar.fiscalYears = {};
deepMerge(en.fiscalYears, {
  "title": "Fiscal Years", "subtitle": "Manage fiscal years and periods",
  "create": "Create Fiscal Year", "edit": "Edit Fiscal Year", "new": "New Fiscal Year",
  "name": "Name", "startDate": "Start Date", "endDate": "End Date",
  "status": "Status", "open": "Open", "closed": "Closed", "locked": "Locked",
  "close": "Close Year", "reopen": "Reopen Year", "setDefault": "Set as Default",
  "isDefault": "Default Year", "deleteWarning": "This action cannot be undone.",
  "deleteTitle": "Delete Fiscal Year", "closeTitle": "Close Fiscal Year",
  "closeWarning": "Closing the fiscal year cannot be undone.",
  "cannotEditClosed": "Closed year cannot be edited",
  "closedStatus": "Closed", "openStatus": "Open", "empty": "No fiscal years found",
  "listTitle": "Fiscal Years", "validation": { "dateOrder": "End date must be after start date" },
  "periods": "Periods", "end": "End"
});
deepMerge(ar.fiscalYears, {
  "title": "السنوات المالية", "subtitle": "إدارة السنوات والفترات المالية",
  "create": "إنشاء سنة مالية", "edit": "تعديل السنة المالية", "new": "سنة مالية جديدة",
  "name": "الاسم", "startDate": "تاريخ البداية", "endDate": "تاريخ النهاية",
  "status": "الحالة", "open": "مفتوحة", "closed": "مغلقة", "locked": "مقفلة",
  "close": "إغلاق السنة", "reopen": "إعادة فتح السنة", "setDefault": "تعيين كافتراضي",
  "isDefault": "السنة الافتراضية", "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "deleteTitle": "حذف السنة المالية", "closeTitle": "إغلاق السنة المالية",
  "closeWarning": "إغلاق السنة المالية لا يمكن التراجع عنه.",
  "cannotEditClosed": "لا يمكن تعديل سنة مالية مغلقة",
  "closedStatus": "مغلقة", "openStatus": "مفتوحة", "empty": "لم يتم العثور على سنوات مالية",
  "listTitle": "السنوات المالية", "validation": { "dateOrder": "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" },
  "periods": "الفترات", "end": "النهاية"
});

// freeze (27)
if (!en.freeze) en.freeze = {};
if (!ar.freeze) ar.freeze = {};
deepMerge(en.freeze, {
  "title": "Freeze Settings", "subtitle": "Manage data freeze periods",
  "periods": "Freeze Periods", "noPeriods": "No freeze periods found",
  "periodName": "Period Name", "startDate": "Start Date", "endDate": "End Date",
  "freezeType": "Freeze Type", "reason": "Reason", "frozen": "Frozen",
  "unfreeze": "Unfreeze", "affectedModules": "Affected Modules", "modules": "Modules",
  "editPeriod": "Edit Freeze Period", "createPeriod": "Create Freeze Period",
  "deletePeriod": "Delete Freeze Period", "deleteWarning": "This action cannot be undone.",
  "all": "All", "partial": "Partial", "accounting": "Accounting",
  "inventory": "Inventory", "purchasing": "Purchasing", "sales": "Sales",
  "active": "Active", "inactive": "Inactive", "pending": "Pending",
  "status": "Status", "description": "Description"
});
deepMerge(ar.freeze, {
  "title": "إعدادات التجميد", "subtitle": "إدارة فترات تجميد البيانات",
  "periods": "فترات التجميد", "noPeriods": "لم يتم العثور على فترات تجميد",
  "periodName": "اسم الفترة", "startDate": "تاريخ البداية", "endDate": "تاريخ النهاية",
  "freezeType": "نوع التجميد", "reason": "السبب", "frozen": "مجمّد",
  "unfreeze": "إلغاء التجميد", "affectedModules": "الوحدات المتأثرة", "modules": "الوحدات",
  "editPeriod": "تعديل فترة التجميد", "createPeriod": "إنشاء فترة تجميد",
  "deletePeriod": "حذف فترة التجميد", "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "all": "الكل", "partial": "جزئي", "accounting": "المحاسبة",
  "inventory": "المخزون", "purchasing": "المشتريات", "sales": "المبيعات",
  "active": "نشط", "inactive": "غير نشط", "pending": "معلق",
  "status": "الحالة", "description": "الوصف"
});

// suppliers (27)
if (!en.suppliers) en.suppliers = {};
if (!ar.suppliers) ar.suppliers = {};
deepMerge(en.suppliers, {
  "title": "Suppliers", "subtitle": "Manage suppliers and vendors",
  "create": "Create Supplier", "edit": "Edit Supplier", "new": "New Supplier",
  "name": "Supplier Name", "code": "Code", "type": "Type", "status": "Status",
  "active": "Active", "inactive": "Inactive", "phone": "Phone", "email": "Email",
  "address": "Address", "city": "City", "country": "Country", "taxId": "Tax ID",
  "contact": "Contact Person", "paymentTerms": "Payment Terms",
  "creditLimit": "Credit Limit", "balance": "Balance", "deleteWarning": "This action cannot be undone.",
  "totalSuppliers": "Total Suppliers", "totalBalance": "Total Balance",
  "category": "Category", "notes": "Notes", "bankAccount": "Bank Account",
  "transactions": "Transactions"
});
deepMerge(ar.suppliers, {
  "title": "الموردين", "subtitle": "إدارة الموردين والبائعين",
  "create": "إنشاء مورد", "edit": "تعديل المورد", "new": "مورد جديد",
  "name": "اسم المورد", "code": "الرمز", "type": "النوع", "status": "الحالة",
  "active": "نشط", "inactive": "غير نشط", "phone": "الهاتف", "email": "البريد الإلكتروني",
  "address": "العنوان", "city": "المدينة", "country": "الدولة", "taxId": "الرقم الضريبي",
  "contact": "جهة الاتصال", "paymentTerms": "شروط الدفع",
  "creditLimit": "حد الائتمان", "balance": "الرصيد", "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "totalSuppliers": "إجمالي الموردين", "totalBalance": "إجمالي الرصيد",
  "category": "الفئة", "notes": "ملاحظات", "bankAccount": "الحساب البنكي",
  "transactions": "المعاملات"
});

// allowances (26)
if (!en.allowances) en.allowances = {};
if (!ar.allowances) ar.allowances = {};
deepMerge(en.allowances, {
  "title": "Allowances", "subtitle": "Manage salary allowances",
  "create": "Create Allowance", "edit": "Edit Allowance", "new": "New Allowance",
  "delete": "Delete Allowance", "deleteWarning": "This allowance will be permanently deleted.",
  "type": "Type", "types": "Allowance Types", "amount": "Amount",
  "fixedAmount": "Fixed Amount", "percentOfBasic": "Percentage of Basic",
  "taxable": "Taxable", "mandatory": "Mandatory", "employees": "Employees",
  "monthlyTotal": "Monthly Total", "description": "Description", "category": "Category",
  "housing": "Housing", "transport": "Transport", "food": "Food",
  "communication": "Communication", "other": "Other", "active": "Active",
  "startDate": "Start Date", "endDate": "End Date", "frequency": "Frequency"
});
deepMerge(ar.allowances, {
  "title": "البدلات", "subtitle": "إدارة بدلات الرواتب",
  "create": "إنشاء بدل", "edit": "تعديل البدل", "new": "بدل جديد",
  "delete": "حذف البدل", "deleteWarning": "سيتم حذف هذا البدل نهائياً.",
  "type": "النوع", "types": "أنواع البدلات", "amount": "المبلغ",
  "fixedAmount": "مبلغ ثابت", "percentOfBasic": "نسبة من الراتب الأساسي",
  "taxable": "خاضع للضريبة", "mandatory": "إلزامي", "employees": "الموظفين",
  "monthlyTotal": "الإجمالي الشهري", "description": "الوصف", "category": "الفئة",
  "housing": "السكن", "transport": "المواصلات", "food": "الطعام",
  "communication": "الاتصالات", "other": "أخرى", "active": "نشط",
  "startDate": "تاريخ البداية", "endDate": "تاريخ النهاية", "frequency": "التكرار"
});

// documentTypes (26)
if (!en.documentTypes) en.documentTypes = {};
if (!ar.documentTypes) ar.documentTypes = {};
deepMerge(en.documentTypes, {
  "title": "Document Types", "subtitle": "Manage document types and categories",
  "create": "Create Document Type", "edit": "Edit Document Type", "new": "New Document Type",
  "documentType": "Document Type", "category": "Category", "allCategories": "All Categories",
  "types": "Types", "formats": "Formats", "allowedFormats": "Allowed Formats",
  "selectFormat": "Select Format", "mandatory": "Mandatory", "applicableTo": "Applicable To",
  "approvalLevels": "Approval Levels", "defaultValidity": "Default Validity",
  "maxFileSize": "Max File Size", "retention": "Retention Period",
  "numberingPrefix": "Numbering Prefix", "options": "Options", "settings": "Settings",
  "templates": "Templates", "documents": "Documents", "totalDocs": "Total Documents",
  "cannotDeleteWithDocs": "Cannot delete type with existing documents",
  "deleteWarning": "This document type will be permanently deleted."
});
deepMerge(ar.documentTypes, {
  "title": "أنواع المستندات", "subtitle": "إدارة أنواع وفئات المستندات",
  "create": "إنشاء نوع مستند", "edit": "تعديل نوع المستند", "new": "نوع مستند جديد",
  "documentType": "نوع المستند", "category": "الفئة", "allCategories": "جميع الفئات",
  "types": "الأنواع", "formats": "الصيغ", "allowedFormats": "الصيغ المسموحة",
  "selectFormat": "اختر الصيغة", "mandatory": "إلزامي", "applicableTo": "ينطبق على",
  "approvalLevels": "مستويات الموافقة", "defaultValidity": "الصلاحية الافتراضية",
  "maxFileSize": "الحد الأقصى لحجم الملف", "retention": "فترة الاحتفاظ",
  "numberingPrefix": "بادئة الترقيم", "options": "خيارات", "settings": "إعدادات",
  "templates": "قوالب", "documents": "المستندات", "totalDocs": "إجمالي المستندات",
  "cannotDeleteWithDocs": "لا يمكن حذف نوع يحتوي على مستندات",
  "deleteWarning": "سيتم حذف نوع المستند نهائياً."
});

// voucherTypes (26)
if (!en.voucherTypes) en.voucherTypes = {};
if (!ar.voucherTypes) ar.voucherTypes = {};
deepMerge(en.voucherTypes, {
  "title": "Voucher Types", "subtitle": "Manage journal voucher types",
  "create": "Create Voucher Type", "edit": "Edit Voucher Type", "new": "New Voucher Type",
  "name": "Name", "code": "Code", "prefix": "Prefix", "type": "Type",
  "autoPost": "Auto Post", "requireApproval": "Require Approval",
  "defaultDebitAccount": "Default Debit Account", "defaultCreditAccount": "Default Credit Account",
  "sequence": "Sequence", "active": "Active", "description": "Description",
  "category": "Category", "receipt": "Receipt", "payment": "Payment",
  "journal": "Journal", "transfer": "Transfer", "adjustment": "Adjustment",
  "opening": "Opening", "closing": "Closing", "deleteWarning": "This action cannot be undone.",
  "totalVouchers": "Total Vouchers", "usageCount": "Usage Count"
});
deepMerge(ar.voucherTypes, {
  "title": "أنواع السندات", "subtitle": "إدارة أنواع سندات القيد",
  "create": "إنشاء نوع سند", "edit": "تعديل نوع السند", "new": "نوع سند جديد",
  "name": "الاسم", "code": "الرمز", "prefix": "البادئة", "type": "النوع",
  "autoPost": "ترحيل تلقائي", "requireApproval": "يتطلب موافقة",
  "defaultDebitAccount": "حساب المدين الافتراضي", "defaultCreditAccount": "حساب الدائن الافتراضي",
  "sequence": "التسلسل", "active": "نشط", "description": "الوصف",
  "category": "الفئة", "receipt": "قبض", "payment": "صرف",
  "journal": "قيد يومية", "transfer": "تحويل", "adjustment": "تسوية",
  "opening": "افتتاح", "closing": "إقفال", "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "totalVouchers": "إجمالي السندات", "usageCount": "عدد الاستخدام"
});

// jobTitles (25)
if (!en.jobTitles) en.jobTitles = {};
if (!ar.jobTitles) ar.jobTitles = {};
deepMerge(en.jobTitles, {
  "title": "Job Titles", "subtitle": "Manage organizational job titles",
  "create": "Create Job Title", "edit": "Edit Job Title", "new": "New Job Title",
  "name": "Job Title", "nameAr": "Job Title (Arabic)", "code": "Code",
  "department": "Department", "level": "Level", "grade": "Grade",
  "minSalary": "Min Salary", "maxSalary": "Max Salary", "description": "Description",
  "active": "Active", "employees": "Employees", "totalPositions": "Total Positions",
  "vacant": "Vacant", "occupied": "Occupied", "deleteWarning": "This action cannot be undone.",
  "category": "Category", "requirements": "Requirements", "responsibilities": "Responsibilities",
  "qualifications": "Qualifications", "experience": "Experience Required"
});
deepMerge(ar.jobTitles, {
  "title": "المسميات الوظيفية", "subtitle": "إدارة المسميات الوظيفية التنظيمية",
  "create": "إنشاء مسمى وظيفي", "edit": "تعديل المسمى الوظيفي", "new": "مسمى وظيفي جديد",
  "name": "المسمى الوظيفي", "nameAr": "المسمى الوظيفي (بالعربية)", "code": "الرمز",
  "department": "القسم", "level": "المستوى", "grade": "الدرجة",
  "minSalary": "الحد الأدنى للراتب", "maxSalary": "الحد الأقصى للراتب", "description": "الوصف",
  "active": "نشط", "employees": "الموظفين", "totalPositions": "إجمالي المناصب",
  "vacant": "شاغر", "occupied": "مشغول", "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "category": "الفئة", "requirements": "المتطلبات", "responsibilities": "المسؤوليات",
  "qualifications": "المؤهلات", "experience": "الخبرة المطلوبة"
});

// Smaller sections - batch them together
// clearingAgents, withholdingTax, journalTypes, approvalWorkflows, contractTemplates, etc.

if (!en.clearingAgents) en.clearingAgents = {};
if (!ar.clearingAgents) ar.clearingAgents = {};
deepMerge(en.clearingAgents, {
  "title": "Clearing Agents", "subtitle": "Manage customs clearing agents",
  "create": "Create Agent", "edit": "Edit Agent", "new": "New Agent",
  "name": "Agent Name", "code": "Code", "licenseNumber": "License Number",
  "phone": "Phone", "email": "Email", "address": "Address",
  "city": "City", "country": "Country", "status": "Status",
  "active": "Active", "inactive": "Inactive", "rating": "Rating",
  "totalShipments": "Total Shipments", "activeClearances": "Active Clearances",
  "contact": "Contact Person", "notes": "Notes", "specialization": "Specialization",
  "ports": "Ports", "deleteWarning": "This action cannot be undone.",
  "bankDetails": "Bank Details", "commission": "Commission"
});
deepMerge(ar.clearingAgents, {
  "title": "وكلاء التخليص", "subtitle": "إدارة وكلاء التخليص الجمركي",
  "create": "إنشاء وكيل", "edit": "تعديل الوكيل", "new": "وكيل جديد",
  "name": "اسم الوكيل", "code": "الرمز", "licenseNumber": "رقم الترخيص",
  "phone": "الهاتف", "email": "البريد الإلكتروني", "address": "العنوان",
  "city": "المدينة", "country": "الدولة", "status": "الحالة",
  "active": "نشط", "inactive": "غير نشط", "rating": "التقييم",
  "totalShipments": "إجمالي الشحنات", "activeClearances": "التخليصات النشطة",
  "contact": "جهة الاتصال", "notes": "ملاحظات", "specialization": "التخصص",
  "ports": "الموانئ", "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "bankDetails": "التفاصيل البنكية", "commission": "العمولة"
});

if (!en.withholdingTax) en.withholdingTax = {};
if (!ar.withholdingTax) ar.withholdingTax = {};
deepMerge(en.withholdingTax, {
  "title": "Withholding Tax", "subtitle": "Manage withholding tax rules",
  "create": "Create Rule", "edit": "Edit Rule", "new": "New Rule",
  "rate": "Rate (%)", "threshold": "Threshold", "applicableTo": "Applicable To",
  "effectiveFrom": "Effective From", "effectiveTo": "Effective To",
  "exemptionList": "Exemption List", "category": "Category", "type": "Type",
  "description": "Description", "active": "Active", "code": "Code",
  "glAccount": "GL Account", "foreignOnly": "Foreign Only",
  "minAmount": "Minimum Amount", "maxRate": "Maximum Rate",
  "certificates": "Certificates", "reports": "Reports",
  "deleteWarning": "This action cannot be undone.",
  "totalCollected": "Total Collected", "pendingRemittance": "Pending Remittance",
  "status": "Status"
});
deepMerge(ar.withholdingTax, {
  "title": "ضريبة الاستقطاع", "subtitle": "إدارة قواعد ضريبة الاستقطاع",
  "create": "إنشاء قاعدة", "edit": "تعديل القاعدة", "new": "قاعدة جديدة",
  "rate": "النسبة (%)", "threshold": "الحد", "applicableTo": "ينطبق على",
  "effectiveFrom": "ساري من", "effectiveTo": "ساري إلى",
  "exemptionList": "قائمة الإعفاءات", "category": "الفئة", "type": "النوع",
  "description": "الوصف", "active": "نشط", "code": "الرمز",
  "glAccount": "حساب الأستاذ", "foreignOnly": "أجانب فقط",
  "minAmount": "الحد الأدنى للمبلغ", "maxRate": "الحد الأقصى للنسبة",
  "certificates": "الشهادات", "reports": "التقارير",
  "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "totalCollected": "إجمالي المحصل", "pendingRemittance": "تحويلات معلقة",
  "status": "الحالة"
});

if (!en.journalTypes) en.journalTypes = {};
if (!ar.journalTypes) ar.journalTypes = {};
deepMerge(en.journalTypes, {
  "title": "Journal Types", "subtitle": "Manage accounting journal types",
  "create": "Create Journal Type", "edit": "Edit Journal Type", "new": "New Journal Type",
  "name": "Name", "code": "Code", "prefix": "Prefix", "type": "Type",
  "autoNumber": "Auto Number", "requireApproval": "Require Approval",
  "defaultAccount": "Default Account", "active": "Active", "description": "Description",
  "general": "General", "sales": "Sales", "purchase": "Purchase",
  "cash": "Cash", "bank": "Bank", "adjustment": "Adjustment",
  "opening": "Opening", "closing": "Closing", "deleteWarning": "This action cannot be undone.",
  "sequence": "Sequence"
});
deepMerge(ar.journalTypes, {
  "title": "أنواع القيود", "subtitle": "إدارة أنواع القيود المحاسبية",
  "create": "إنشاء نوع قيد", "edit": "تعديل نوع القيد", "new": "نوع قيد جديد",
  "name": "الاسم", "code": "الرمز", "prefix": "البادئة", "type": "النوع",
  "autoNumber": "ترقيم تلقائي", "requireApproval": "يتطلب موافقة",
  "defaultAccount": "الحساب الافتراضي", "active": "نشط", "description": "الوصف",
  "general": "عام", "sales": "مبيعات", "purchase": "مشتريات",
  "cash": "نقدي", "bank": "بنكي", "adjustment": "تسوية",
  "opening": "افتتاحي", "closing": "إقفال", "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "sequence": "التسلسل"
});

if (!en.approvalWorkflows) en.approvalWorkflows = {};
if (!ar.approvalWorkflows) ar.approvalWorkflows = {};
deepMerge(en.approvalWorkflows, {
  "title": "Approval Workflows", "subtitle": "Manage approval chains",
  "create": "Create Workflow", "edit": "Edit Workflow", "new": "New Workflow",
  "name": "Workflow Name", "steps": "Steps", "addStep": "Add Step",
  "removeStep": "Remove Step", "approver": "Approver", "approverType": "Approver Type",
  "condition": "Condition", "active": "Active", "description": "Description",
  "module": "Module", "deleteWarning": "This action cannot be undone.",
  "noWorkflows": "No workflows found", "order": "Order",
  "role": "Role", "user": "User", "manager": "Manager"
});
deepMerge(ar.approvalWorkflows, {
  "title": "سير عمل الموافقات", "subtitle": "إدارة سلاسل الموافقة",
  "create": "إنشاء سير عمل", "edit": "تعديل سير العمل", "new": "سير عمل جديد",
  "name": "اسم سير العمل", "steps": "الخطوات", "addStep": "إضافة خطوة",
  "removeStep": "إزالة خطوة", "approver": "الموافِق", "approverType": "نوع الموافِق",
  "condition": "الشرط", "active": "نشط", "description": "الوصف",
  "module": "الوحدة", "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "noWorkflows": "لم يتم العثور على سير عمل", "order": "الترتيب",
  "role": "الدور", "user": "المستخدم", "manager": "المدير"
});

if (!en.contractTemplates) en.contractTemplates = {};
if (!ar.contractTemplates) ar.contractTemplates = {};
deepMerge(en.contractTemplates, {
  "title": "Contract Templates", "subtitle": "Manage contract templates",
  "create": "Create Template", "edit": "Edit Template", "new": "New Template",
  "name": "Template Name", "type": "Type", "category": "Category",
  "content": "Content", "variables": "Variables", "preview": "Preview",
  "active": "Active", "description": "Description",
  "deleteWarning": "This action cannot be undone.",
  "employment": "Employment", "service": "Service", "sales": "Sales",
  "purchase": "Purchase", "rental": "Rental", "usageCount": "Usage Count",
  "lastUsed": "Last Used"
});
deepMerge(ar.contractTemplates, {
  "title": "قوالب العقود", "subtitle": "إدارة قوالب العقود",
  "create": "إنشاء قالب", "edit": "تعديل القالب", "new": "قالب جديد",
  "name": "اسم القالب", "type": "النوع", "category": "الفئة",
  "content": "المحتوى", "variables": "المتغيرات", "preview": "معاينة",
  "active": "نشط", "description": "الوصف",
  "deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "employment": "توظيف", "service": "خدمة", "sales": "مبيعات",
  "purchase": "مشتريات", "rental": "إيجار", "usageCount": "عدد الاستخدام",
  "lastUsed": "آخر استخدام"
});

// Remaining small sections
const smallSections = {
  stockLimits: { en: { title: "Stock Limits", subtitle: "Manage stock level limits", create: "Create Limit", edit: "Edit Limit", min: "Minimum", max: "Maximum", reorderPoint: "Reorder Point", reorderQty: "Reorder Quantity", warehouse: "Warehouse", item: "Item", active: "Active", deleteWarning: "This action cannot be undone.", current: "Current Stock", below: "Below Minimum", above: "Above Maximum" }, ar: { title: "حدود المخزون", subtitle: "إدارة حدود مستويات المخزون", create: "إنشاء حد", edit: "تعديل الحد", min: "الحد الأدنى", max: "الحد الأقصى", reorderPoint: "نقطة إعادة الطلب", reorderQty: "كمية إعادة الطلب", warehouse: "المستودع", item: "الصنف", active: "نشط", deleteWarning: "لا يمكن التراجع عن هذا الإجراء.", current: "المخزون الحالي", below: "أقل من الحد الأدنى", above: "أعلى من الحد الأقصى" } },
  serialNumbers: { en: { title: "Serial Numbers", subtitle: "Track serial numbers", create: "Create Serial", assigned: "Assigned", available: "Available", item: "Item", warehouse: "Warehouse", status: "Status", active: "Active", expired: "Expired", recalled: "Recalled", history: "History", scan: "Scan", generate: "Generate" }, ar: { title: "الأرقام التسلسلية", subtitle: "تتبع الأرقام التسلسلية", create: "إنشاء رقم تسلسلي", assigned: "مخصص", available: "متاح", item: "الصنف", warehouse: "المستودع", status: "الحالة", active: "نشط", expired: "منتهي", recalled: "مسترجع", history: "السجل", scan: "مسح", generate: "توليد" } },
  shippingLines: { en: { title: "Shipping Lines", subtitle: "Manage shipping companies", create: "Create Line", edit: "Edit Line", name: "Name", code: "Code", type: "Type", routes: "Routes", vessels: "Vessels", active: "Active", contact: "Contact", deleteWarning: "This action cannot be undone." }, ar: { title: "خطوط الشحن", subtitle: "إدارة شركات الشحن", create: "إنشاء خط شحن", edit: "تعديل خط الشحن", name: "الاسم", code: "الرمز", type: "النوع", routes: "المسارات", vessels: "السفن", active: "نشط", contact: "جهة الاتصال", deleteWarning: "لا يمكن التراجع عن هذا الإجراء." } },
  inventoryCounting: { en: { title: "Inventory Counting", subtitle: "Physical inventory counts", create: "Create Count", start: "Start Count", complete: "Complete", status: "Status", warehouse: "Warehouse", items: "Items", counted: "Counted", variance: "Variance", adjust: "Adjust", approve: "Approve" }, ar: { title: "جرد المخزون", subtitle: "الجرد الفعلي للمخزون", create: "إنشاء جرد", start: "بدء الجرد", complete: "إكمال", status: "الحالة", warehouse: "المستودع", items: "الأصناف", counted: "تم جرده", variance: "الفرق", adjust: "تعديل", approve: "موافقة" } },
  valuationMethods: { en: { title: "Valuation Methods", subtitle: "Stock valuation configurations", fifo: "FIFO", lifo: "LIFO", average: "Weighted Average", specific: "Specific", standard: "Standard Cost", default: "Default", active: "Active", description: "Description", method: "Method" }, ar: { title: "طرق التقييم", subtitle: "تهيئة تقييم المخزون", fifo: "الوارد أولاً", lifo: "الوارد أخيراً", average: "المتوسط المرجح", specific: "محدد", standard: "التكلفة المعيارية", default: "افتراضي", active: "نشط", description: "الوصف", method: "الطريقة" } },
  banks: { en: { title: "Banks", subtitle: "Manage bank master data", create: "Create Bank", name: "Bank Name", code: "Code", swift: "SWIFT Code", country: "Country" }, ar: { title: "البنوك", subtitle: "إدارة بيانات البنوك", create: "إنشاء بنك", name: "اسم البنك", code: "الرمز", swift: "رمز SWIFT", country: "الدولة" } },
  companies: { en: { title: "Companies", subtitle: "Manage companies", create: "Create Company", name: "Company Name", code: "Code", active: "Active" }, ar: { title: "الشركات", subtitle: "إدارة الشركات", create: "إنشاء شركة", name: "اسم الشركة", code: "الرمز", active: "نشط" } }
};

Object.entries(smallSections).forEach(([section, translations]) => {
  if (!en[section]) en[section] = {};
  if (!ar[section]) ar[section] = {};
  deepMerge(en[section], translations.en);
  deepMerge(ar[section], translations.ar);
});

// Misc standalone keys
const miscEN = {
  "error": { "general": "An error occurred", "loadingData": "Failed to load data", "notFound": "Not found", "accountRequired": "Account is required", "balanceNotZero": "Balance must be zero", "minTwoLines": "Minimum two lines required" },
  "success": { "created": "Created successfully", "updated": "Updated successfully", "deleted": "Deleted successfully", "saved": "Saved successfully", "exported": "Exported successfully" },
  "confirm": { "delete": "Are you sure you want to delete?", "action": "Are you sure?", "save": "Save changes?" },
  "validation": { "required": "This field is required", "email": "Invalid email", "phone": "Invalid phone number", "min": "Value too small", "max": "Value too large", "minLength": "Too short", "maxLength": "Too long" },
  "table": { "noData": "No data available", "loading": "Loading...", "rowsPerPage": "Rows per page" },
  "actions": { "add": "Add", "remove": "Remove", "confirm": "Confirm", "reject": "Reject" },
  "fields": { "name": "Name", "code": "Code", "description": "Description", "status": "Status", "type": "Type" },
  "hr": { "title": "Human Resources", "subtitle": "HR management", "employees": "Employees", "attendance": "Attendance", "leave": "Leave", "payroll": "Payroll" },
  "reports": { "title": "Reports", "subtitle": "Analytics and reporting", "generate": "Generate Report", "export": "Export", "print": "Print", "filter": "Filter" },
  "accounting": { "journal": { "new": "New Journal Entry" }, "trialBalance": { "credit": "Credit", "debit": "Debit" }, "generalLedger": { "opening": "Opening Balance" } },
  "auth": { "login": "Login", "logout": "Logout" },
  "compliance": { "title": "Compliance", "subtitle": "Regulatory compliance", "status": "Status", "audit": "Audit" },
  "assets": { "title": "Assets", "subtitle": "Fixed assets management", "depreciation": "Depreciation", "disposal": "Disposal" },
  "payments": { "title": "Payments", "subtitle": "Payment management", "amount": "Amount" },
  "shipping": { "title": "Shipping", "subtitle": "Shipping management", "tracking": "Tracking" },
  "dashboard": { "welcome": "Welcome" },
  "delegations": { "title": "Delegations", "subtitle": "Manage delegations" },
  "expiry": { "title": "Expiry Tracking", "subtitle": "Track item expiry dates" },
  "myRequests": { "title": "My Requests", "subtitle": "View your requests" },
  "workflows": { "title": "Workflows", "subtitle": "Manage workflows" },
  "errors": { "load": "Failed to load data" },
  "buttonPermissions": { "title": "Button Permissions", "subtitle": "Manage button-level permissions", "button": "Button", "permission": "Permission", "module": "Module" },
  "fieldPermissions": { "title": "Field Permissions", "subtitle": "Manage field-level permissions", "field": "Field", "permission": "Permission", "module": "Module" },
  "messages": { "success": "Operation successful" },
  "info": { "noData": "No data available" },
  "loading": { "data": "Loading..." }
};

const miscAR = {
  "error": { "general": "حدث خطأ", "loadingData": "فشل في تحميل البيانات", "notFound": "غير موجود", "accountRequired": "الحساب مطلوب", "balanceNotZero": "يجب أن يكون الرصيد صفر", "minTwoLines": "الحد الأدنى سطرين" },
  "success": { "created": "تم الإنشاء بنجاح", "updated": "تم التحديث بنجاح", "deleted": "تم الحذف بنجاح", "saved": "تم الحفظ بنجاح", "exported": "تم التصدير بنجاح" },
  "confirm": { "delete": "هل أنت متأكد من الحذف؟", "action": "هل أنت متأكد؟", "save": "حفظ التغييرات؟" },
  "validation": { "required": "هذا الحقل مطلوب", "email": "بريد إلكتروني غير صالح", "phone": "رقم هاتف غير صالح", "min": "القيمة صغيرة جداً", "max": "القيمة كبيرة جداً", "minLength": "قصير جداً", "maxLength": "طويل جداً" },
  "table": { "noData": "لا توجد بيانات", "loading": "جاري التحميل...", "rowsPerPage": "صفوف في الصفحة" },
  "actions": { "add": "إضافة", "remove": "إزالة", "confirm": "تأكيد", "reject": "رفض" },
  "fields": { "name": "الاسم", "code": "الرمز", "description": "الوصف", "status": "الحالة", "type": "النوع" },
  "hr": { "title": "الموارد البشرية", "subtitle": "إدارة الموارد البشرية", "employees": "الموظفين", "attendance": "الحضور", "leave": "الإجازات", "payroll": "الرواتب" },
  "reports": { "title": "التقارير", "subtitle": "التحليلات والتقارير", "generate": "إنشاء تقرير", "export": "تصدير", "print": "طباعة", "filter": "تصفية" },
  "accounting": { "journal": { "new": "قيد يومية جديد" }, "trialBalance": { "credit": "دائن", "debit": "مدين" }, "generalLedger": { "opening": "رصيد افتتاحي" } },
  "auth": { "login": "تسجيل الدخول", "logout": "تسجيل الخروج" },
  "compliance": { "title": "الامتثال", "subtitle": "الامتثال التنظيمي", "status": "الحالة", "audit": "التدقيق" },
  "assets": { "title": "الأصول", "subtitle": "إدارة الأصول الثابتة", "depreciation": "الإهلاك", "disposal": "الاستبعاد" },
  "payments": { "title": "المدفوعات", "subtitle": "إدارة المدفوعات", "amount": "المبلغ" },
  "shipping": { "title": "الشحن", "subtitle": "إدارة الشحن", "tracking": "التتبع" },
  "dashboard": { "welcome": "مرحباً" },
  "delegations": { "title": "التفويضات", "subtitle": "إدارة التفويضات" },
  "expiry": { "title": "تتبع الصلاحية", "subtitle": "تتبع تواريخ انتهاء الصلاحية" },
  "myRequests": { "title": "طلباتي", "subtitle": "عرض طلباتك" },
  "workflows": { "title": "سير العمل", "subtitle": "إدارة سير العمل" },
  "errors": { "load": "فشل في تحميل البيانات" },
  "buttonPermissions": { "title": "صلاحيات الأزرار", "subtitle": "إدارة صلاحيات مستوى الأزرار", "button": "الزر", "permission": "الصلاحية", "module": "الوحدة" },
  "fieldPermissions": { "title": "صلاحيات الحقول", "subtitle": "إدارة صلاحيات مستوى الحقول", "field": "الحقل", "permission": "الصلاحية", "module": "الوحدة" },
  "messages": { "success": "عملية ناجحة" },
  "info": { "noData": "لا توجد بيانات" },
  "loading": { "data": "جاري التحميل..." }
};

Object.entries(miscEN).forEach(([section, translations]) => {
  if (!en[section]) en[section] = {};
  if (typeof translations === 'object') deepMerge(en[section], translations);
});
Object.entries(miscAR).forEach(([section, translations]) => {
  if (!ar[section]) ar[section] = {};
  if (typeof translations === 'object') deepMerge(ar[section], translations);
});

// Handle standalone string keys that aren't nested
const standaloneEN = {
  "expense_approved": "Expense approved",
  "expense_deleted": "Expense deleted",
  "failed_to_add_expense": "Failed to add expense",
  "failed_to_approve": "Failed to approve",
  "failed_to_delete": "Failed to delete",
  "failed_to_load_expenses": "Failed to load expenses"
};
const standaloneAR = {
  "expense_approved": "تم اعتماد المصروف",
  "expense_deleted": "تم حذف المصروف",
  "failed_to_add_expense": "فشل في إضافة المصروف",
  "failed_to_approve": "فشل في الموافقة",
  "failed_to_delete": "فشل في الحذف",
  "failed_to_load_expenses": "فشل في تحميل المصاريف"
};

Object.entries(standaloneEN).forEach(([k,v]) => { if (en[k] === undefined) en[k] = v; });
Object.entries(standaloneAR).forEach(([k,v]) => { if (ar[k] === undefined) ar[k] = v; });

// Write final files
fs.writeFileSync('./frontend-next/locales/en.json', JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync('./frontend-next/locales/ar.json', JSON.stringify(ar, null, 2) + '\n', 'utf8');

console.log('Final EN common keys:', Object.keys(en.common).length);
console.log('Final AR common keys:', Object.keys(ar.common).length);
console.log('Final EN top-level:', Object.keys(en).length);
console.log('Final AR top-level:', Object.keys(ar).length);
console.log('EN file size:', JSON.stringify(en, null, 2).length);
console.log('AR file size:', JSON.stringify(ar, null, 2).length);
console.log('\nPhase 2 complete!');
