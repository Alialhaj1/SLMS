/**
 * Phase 3: Add remaining 550 missing translation keys
 */
const fs = require('fs');
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

function ensure(obj, section) { if (!obj[section]) obj[section] = {}; }

// Standalone string keys (not nested)
if (en["Failed to fetch expense requests"] === undefined) en["Failed to fetch expense requests"] = "Failed to fetch expense requests";
if (en["Failed to fetch payment requests"] === undefined) en["Failed to fetch payment requests"] = "Failed to fetch payment requests";
if (en["Failed to fetch transfer requests"] === undefined) en["Failed to fetch transfer requests"] = "Failed to fetch transfer requests";
if (ar["Failed to fetch expense requests"] === undefined) ar["Failed to fetch expense requests"] = "فشل في جلب طلبات المصاريف";
if (ar["Failed to fetch payment requests"] === undefined) ar["Failed to fetch payment requests"] = "فشل في جلب طلبات الدفع";
if (ar["Failed to fetch transfer requests"] === undefined) ar["Failed to fetch transfer requests"] = "فشل في جلب طلبات التحويل";

// ---- actions ----
ensure(en, 'actions'); ensure(ar, 'actions');
deepMerge(en.actions, { back: "Back", print: "Print", select: "Select" });
deepMerge(ar.actions, { back: "رجوع", print: "طباعة", select: "اختيار" });

// ---- alerts (supplement) ----
ensure(en, 'alerts'); ensure(ar, 'alerts');
deepMerge(en.alerts, { channel: "Channel", historyCount: "History Count", historyDetails: "History Details", message: "Message", noHistory: "No history found", rule: "Rule", searchHistory: "Search History", searchPlaceholder: "Search alerts...", status: "Status", triggeredAt: "Triggered At" });
deepMerge(ar.alerts, { channel: "القناة", historyCount: "عدد السجلات", historyDetails: "تفاصيل السجل", message: "الرسالة", noHistory: "لا يوجد سجل", rule: "القاعدة", searchHistory: "بحث في السجل", searchPlaceholder: "بحث في التنبيهات...", status: "الحالة", triggeredAt: "تم التشغيل في" });

// ---- allowances (supplement) ----
ensure(en, 'allowances'); ensure(ar, 'allowances');
deepMerge(en.allowances, { allCategories: "All Categories", allowance: "Allowance", applicability: "Applicability", applicableTo: "Applicable To", calculationType: "Calculation Type", cannotDeleteWithEmployees: "Cannot delete allowance assigned to employees", glAccount: "GL Account", inclusions: "Inclusions", maxAmount: "Maximum Amount", minAmount: "Minimum Amount", percentage: "Percentage" });
deepMerge(ar.allowances, { allCategories: "جميع الفئات", allowance: "البدل", applicability: "القابلية", applicableTo: "ينطبق على", calculationType: "نوع الحساب", cannotDeleteWithEmployees: "لا يمكن حذف بدل مخصص لموظفين", glAccount: "حساب الأستاذ", inclusions: "التضمينات", maxAmount: "الحد الأقصى للمبلغ", minAmount: "الحد الأدنى للمبلغ", percentage: "النسبة" });

// ---- approval (supplement) ----
ensure(en, 'approval'); ensure(ar, 'approval');
deepMerge(en.approval, { activateImmediately: "Activate Immediately", canDelegate: "Can Delegate", canReject: "Can Reject", condition: "Condition", conditional: "Conditional", description: "Description", nameAr: "Name (Arabic)", nameEn: "Name (English)", pending: "Pending", requiredApprovals: "Required Approvals", timeout: "Timeout" });
deepMerge(ar.approval, { activateImmediately: "تفعيل فوري", canDelegate: "يمكن التفويض", canReject: "يمكن الرفض", condition: "الشرط", conditional: "مشروط", description: "الوصف", nameAr: "الاسم (بالعربية)", nameEn: "الاسم (بالإنجليزية)", pending: "معلق", requiredApprovals: "الموافقات المطلوبة", timeout: "المهلة" });

// ---- approvalWorkflows (supplement) ----
ensure(en, 'approvalWorkflows'); ensure(ar, 'approvalWorkflows');
deepMerge(en.approvalWorkflows, { allCategories: "All Categories", applicableTo: "Applicable To", avgSteps: "Average Steps", cannotDeleteUsed: "Cannot delete workflow in use", category: "Category", maxAmount: "Maximum Amount", minAmount: "Minimum Amount", needStep: "At least one step is required", reminderHours: "Reminder Hours", totalUsage: "Total Usage", workflows: "Workflows" });
deepMerge(ar.approvalWorkflows, { allCategories: "جميع الفئات", applicableTo: "ينطبق على", avgSteps: "متوسط الخطوات", cannotDeleteUsed: "لا يمكن حذف سير عمل قيد الاستخدام", category: "الفئة", maxAmount: "الحد الأقصى للمبلغ", minAmount: "الحد الأدنى للمبلغ", needStep: "يجب إضافة خطوة واحدة على الأقل", reminderHours: "ساعات التذكير", totalUsage: "إجمالي الاستخدام", workflows: "سير العمل" });

// ---- assets (supplement) ----
ensure(en, 'assets'); ensure(ar, 'assets');
deepMerge(en.assets, { fixedAssets: "Fixed Assets", fixedAssetsSubtitle: "Manage fixed assets", maintenance: "Maintenance" });
deepMerge(ar.assets, { fixedAssets: "الأصول الثابتة", fixedAssetsSubtitle: "إدارة الأصول الثابتة", maintenance: "الصيانة" });

// ---- auth (supplement) ----
ensure(en, 'auth'); ensure(ar, 'auth');
deepMerge(en.auth, { requestSubmitted: "Request Submitted", requestSubmittedMessage: "Your request has been submitted successfully" });
deepMerge(ar.auth, { requestSubmitted: "تم إرسال الطلب", requestSubmittedMessage: "تم إرسال طلبك بنجاح" });

// ---- banks (supplement) ----
ensure(en, 'banks'); ensure(ar, 'banks');
deepMerge(en.banks, { addBank: "Add Bank", disconnected: "Disconnected", syncFailed: "Sync Failed", syncSuccess: "Sync Successful" });
deepMerge(ar.banks, { addBank: "إضافة بنك", disconnected: "غير متصل", syncFailed: "فشل المزامنة", syncSuccess: "تمت المزامنة بنجاح" });

// ---- buttonPermissions (supplement) ----
ensure(en, 'buttonPermissions'); ensure(ar, 'buttonPermissions');
deepMerge(en.buttonPermissions, { info1: "Button permissions control which actions users can perform", info2: "Assign permissions to roles to control access", info3: "Changes take effect immediately", info4: "Admins always have full access", infoTitle: "Button Permissions Info" });
deepMerge(ar.buttonPermissions, { info1: "صلاحيات الأزرار تتحكم في الإجراءات المتاحة للمستخدمين", info2: "قم بتعيين الصلاحيات للأدوار للتحكم في الوصول", info3: "التغييرات تسري فوراً", info4: "المشرفون لديهم صلاحيات كاملة دائماً", infoTitle: "معلومات صلاحيات الأزرار" });

// ---- clearingAgents (supplement) ----
ensure(en, 'clearingAgents'); ensure(ar, 'clearingAgents');
deepMerge(en.clearingAgents, { commissionRate: "Commission Rate", contactInfo: "Contact Information", contactPerson: "Contact Person", creditLimit: "Credit Limit", customsId: "Customs ID", financial: "Financial", license: "License", licenseExpiry: "License Expiry", paymentTerms: "Payment Terms", preferred: "Preferred", specializations: "Specializations", taxNumber: "Tax Number", website: "Website" });
deepMerge(ar.clearingAgents, { commissionRate: "نسبة العمولة", contactInfo: "معلومات الاتصال", contactPerson: "جهة الاتصال", creditLimit: "حد الائتمان", customsId: "الرقم الجمركي", financial: "المالية", license: "الترخيص", licenseExpiry: "انتهاء الترخيص", paymentTerms: "شروط الدفع", preferred: "مفضل", specializations: "التخصصات", taxNumber: "الرقم الضريبي", website: "الموقع الإلكتروني" });

// ---- common ----
ensure(en, 'common'); ensure(ar, 'common');
deepMerge(en.common, { id: "ID" });
deepMerge(ar.common, { id: "المعرف" });

// ---- companies (supplement) ----
ensure(en, 'companies'); ensure(ar, 'companies');
deepMerge(en.companies, { addBranch: "Add Branch", level: "Level", listView: "List View", noParent: "No Parent", parentCompany: "Parent Company", treeView: "Tree View" });
deepMerge(ar.companies, { addBranch: "إضافة فرع", level: "المستوى", listView: "عرض قائمة", noParent: "بدون أصل", parentCompany: "الشركة الأم", treeView: "عرض شجري" });

// ---- compliance (supplement) ----
ensure(en, 'compliance'); ensure(ar, 'compliance');
deepMerge(en.compliance, { conformity: "Conformity", licenses: "Licenses", origin: "Origin", regulations: "Regulations" });
deepMerge(ar.compliance, { conformity: "المطابقة", licenses: "التراخيص", origin: "المنشأ", regulations: "اللوائح" });

// ---- confirm (supplement) ----
ensure(en, 'confirm'); ensure(ar, 'confirm');
deepMerge(en.confirm, { post: "Post this entry?", reverse: "Reverse this entry?" });
deepMerge(ar.confirm, { post: "ترحيل هذا القيد؟", reverse: "عكس هذا القيد؟" });

// ---- contractTemplates (supplement) ----
ensure(en, 'contractTemplates'); ensure(ar, 'contractTemplates');
deepMerge(en.contractTemplates, { allCategories: "All Categories", cannotDeleteUsed: "Cannot delete template in use", categories: "Categories", language: "Language", placeholders: "Placeholders", templates: "Templates", totalUsage: "Total Usage", version: "Version" });
deepMerge(ar.contractTemplates, { allCategories: "جميع الفئات", cannotDeleteUsed: "لا يمكن حذف قالب قيد الاستخدام", categories: "الفئات", language: "اللغة", placeholders: "المتغيرات", templates: "القوالب", totalUsage: "إجمالي الاستخدام", version: "الإصدار" });

// ---- dashboard (supplement) ----
ensure(en, 'dashboard'); ensure(ar, 'dashboard');
if (!en.dashboard.alerts) en.dashboard.alerts = {};
if (!ar.dashboard.alerts) ar.dashboard.alerts = {};
deepMerge(en.dashboard.alerts, { viewAll: "View All" });
deepMerge(ar.dashboard.alerts, { viewAll: "عرض الكل" });

// ---- deductions (supplement) ----
ensure(en, 'deductions'); ensure(ar, 'deductions');
deepMerge(en.deductions, { allCategories: "All Categories", applicableTo: "Applicable To", calculationType: "Calculation Type", cannotDeleteMandatory: "Cannot delete mandatory deduction", cannotDeleteWithEmployees: "Cannot delete deduction assigned to employees", daysFormula: "Days Formula" });
deepMerge(ar.deductions, { allCategories: "جميع الفئات", applicableTo: "ينطبق على", calculationType: "نوع الحساب", cannotDeleteMandatory: "لا يمكن حذف خصم إلزامي", cannotDeleteWithEmployees: "لا يمكن حذف خصم مخصص لموظفين", daysFormula: "صيغة الأيام" });

// ---- departments (supplement) ----
ensure(en, 'departments'); ensure(ar, 'departments');
deepMerge(en.departments, { cannotDeleteWithChildren: "Cannot delete department with sub-departments", cannotDeleteWithEmployees: "Cannot delete department with employees" });
deepMerge(ar.departments, { cannotDeleteWithChildren: "لا يمكن حذف قسم يحتوي على أقسام فرعية", cannotDeleteWithEmployees: "لا يمكن حذف قسم يحتوي على موظفين" });

// ---- fieldPermissions (supplement) ----
ensure(en, 'fieldPermissions'); ensure(ar, 'fieldPermissions');
deepMerge(en.fieldPermissions, { info1: "Field permissions control which fields users can view or edit", info2: "Set permissions per role for each module", info3: "Changes take effect on next page load", info4: "Hidden fields are completely invisible to users", infoTitle: "Field Permissions Info" });
deepMerge(ar.fieldPermissions, { info1: "صلاحيات الحقول تتحكم في الحقول التي يمكن للمستخدمين عرضها أو تعديلها", info2: "تعيين الصلاحيات لكل دور في كل وحدة", info3: "التغييرات تسري عند تحميل الصفحة التالي", info4: "الحقول المخفية غير مرئية تماماً للمستخدمين", infoTitle: "معلومات صلاحيات الحقول" });

// ---- fields (supplement) ----
ensure(en, 'fields'); ensure(ar, 'fields');
deepMerge(en.fields, { account: "Account", costCenter: "Cost Center", line: "Line", referenceNo: "Reference No", total: "Total" });
deepMerge(ar.fields, { account: "الحساب", costCenter: "مركز التكلفة", line: "البند", referenceNo: "رقم المرجع", total: "الإجمالي" });

// ---- fiscalYears (supplement) ----
ensure(en, 'fiscalYears'); ensure(ar, 'fiscalYears');
deepMerge(en.fiscalYears, { active: "Active", createFirst: "Create your first fiscal year", created: "Fiscal year created", current: "Current", currentYear: "Current Year", deleteFiscalYear: "Delete Fiscal Year", deleteMessage: "Are you sure you want to delete this fiscal year?", deleted: "Fiscal year deleted", noData: "No fiscal years found", period: "Period", reopened: "Fiscal year reopened", setAsCurrent: "Set as Current", setAsCurrentYear: "Set as Current Year", setCurrent: "Set Current", updated: "Fiscal year updated" });
deepMerge(ar.fiscalYears, { active: "نشطة", createFirst: "أنشئ أول سنة مالية", created: "تم إنشاء السنة المالية", current: "الحالية", currentYear: "السنة الحالية", deleteFiscalYear: "حذف السنة المالية", deleteMessage: "هل أنت متأكد من حذف هذه السنة المالية؟", deleted: "تم حذف السنة المالية", noData: "لم يتم العثور على سنوات مالية", period: "الفترة", reopened: "تم إعادة فتح السنة المالية", setAsCurrent: "تعيين كحالية", setAsCurrentYear: "تعيين كسنة حالية", setCurrent: "تعيين الحالية", updated: "تم تحديث السنة المالية" });

// ---- freeze (supplement) ----
ensure(en, 'freeze'); ensure(ar, 'freeze');
deepMerge(en.freeze, { addPeriod: "Add Period", autoFreezeDesc: "Automatically freeze periods after a set number of days", autoFreezeSettings: "Auto Freeze Settings", confirmFreeze: "Confirm Freeze", confirmFreezeMessage: "Are you sure you want to freeze this period?", confirmUnfreeze: "Confirm Unfreeze", confirmUnfreezeMessage: "Are you sure you want to unfreeze this period?", dateRange: "Date Range", enableAutoFreeze: "Enable Auto Freeze", freeze: "Freeze", freezeAfterDays: "Freeze After Days", freezeSuccess: "Period frozen successfully", full: "Full", notifyBeforeDays: "Notify Before Days", open: "Open", period: "Period", reasonPlaceholder: "Enter reason for freeze...", requireApproval: "Require Approval", superAdminBypass: "Super Admin Bypass", type: "Type", unfreezeSuccess: "Period unfrozen successfully", warning1: "Frozen periods cannot be modified", warning2: "All transactions in this period will be locked", warning3: "Only super admins can unfreeze periods", warningTitle: "Freeze Warning" });
deepMerge(ar.freeze, { addPeriod: "إضافة فترة", autoFreezeDesc: "تجميد الفترات تلقائياً بعد عدد محدد من الأيام", autoFreezeSettings: "إعدادات التجميد التلقائي", confirmFreeze: "تأكيد التجميد", confirmFreezeMessage: "هل أنت متأكد من تجميد هذه الفترة؟", confirmUnfreeze: "تأكيد إلغاء التجميد", confirmUnfreezeMessage: "هل أنت متأكد من إلغاء تجميد هذه الفترة؟", dateRange: "نطاق التاريخ", enableAutoFreeze: "تفعيل التجميد التلقائي", freeze: "تجميد", freezeAfterDays: "تجميد بعد أيام", freezeSuccess: "تم تجميد الفترة بنجاح", full: "كامل", notifyBeforeDays: "إشعار قبل أيام", open: "مفتوح", period: "الفترة", reasonPlaceholder: "أدخل سبب التجميد...", requireApproval: "يتطلب موافقة", superAdminBypass: "تجاوز المشرف الأعلى", type: "النوع", unfreezeSuccess: "تم إلغاء تجميد الفترة بنجاح", warning1: "الفترات المجمدة لا يمكن تعديلها", warning2: "جميع المعاملات في هذه الفترة ستكون مقفلة", warning3: "فقط المشرفون يمكنهم إلغاء التجميد", warningTitle: "تحذير التجميد" });

// ---- hr (supplement) ----
ensure(en, 'hr'); ensure(ar, 'hr');
deepMerge(en.hr, { advances: "Advances", employeesSubtitle: "Manage employee records", expenses: "Expenses", salaries: "Salaries", salariesSubtitle: "Salary management" });
deepMerge(ar.hr, { advances: "السلف", employeesSubtitle: "إدارة سجلات الموظفين", expenses: "المصاريف", salaries: "الرواتب", salariesSubtitle: "إدارة الرواتب" });

// ---- info (supplement) ----
ensure(en, 'info'); ensure(ar, 'info');
deepMerge(en.info, { noPermission: "You do not have permission to access this resource" });
deepMerge(ar.info, { noPermission: "ليس لديك صلاحية للوصول إلى هذا المورد" });

// ---- inventoryCounting (supplement) ----
ensure(en, 'inventoryCounting'); ensure(ar, 'inventoryCounting');
deepMerge(en.inventoryCounting, { countingDate: "Counting Date", date: "Date", edit: "Edit Count", newCount: "New Count", progress: "Progress", type: "Type" });
deepMerge(ar.inventoryCounting, { countingDate: "تاريخ الجرد", date: "التاريخ", edit: "تعديل الجرد", newCount: "جرد جديد", progress: "التقدم", type: "النوع" });

// ---- jobTitles (supplement) ----
ensure(en, 'jobTitles'); ensure(ar, 'jobTitles');
deepMerge(en.jobTitles, { allCategories: "All Categories", allDepartments: "All Departments", cannotDeleteWithEmployees: "Cannot delete job title with assigned employees", filled: "Filled", headcount: "Headcount", maxMustBeGreater: "Maximum salary must be greater than minimum", position: "Position", positionAr: "Position (Arabic)", positions: "Positions", reportsTo: "Reports To", salaryRange: "Salary Range" });
deepMerge(ar.jobTitles, { allCategories: "جميع الفئات", allDepartments: "جميع الأقسام", cannotDeleteWithEmployees: "لا يمكن حذف مسمى وظيفي مخصص لموظفين", filled: "مشغول", headcount: "عدد الموظفين", maxMustBeGreater: "الحد الأقصى للراتب يجب أن يكون أكبر من الحد الأدنى", position: "المنصب", positionAr: "المنصب (بالعربية)", positions: "المناصب", reportsTo: "يتبع لـ", salaryRange: "نطاق الراتب" });

// ---- journalTypes (supplement) ----
ensure(en, 'journalTypes'); ensure(ar, 'journalTypes');
deepMerge(en.journalTypes, { allowsManual: "Allows Manual", approvalLevels: "Approval Levels", autoNumbered: "Auto Numbered", autoNumbering: "Auto Numbering", cannotDeleteSystem: "Cannot delete system journal type", defaultCredit: "Default Credit Account", defaultDebit: "Default Debit Account", features: "Features", format: "Format", nextNumber: "Next Number", numbering: "Numbering", requiresApproval: "Requires Approval", sampleNumber: "Sample Number", system: "System" });
deepMerge(ar.journalTypes, { allowsManual: "يسمح بالإدخال اليدوي", approvalLevels: "مستويات الموافقة", autoNumbered: "ترقيم تلقائي", autoNumbering: "الترقيم التلقائي", cannotDeleteSystem: "لا يمكن حذف نوع قيد نظامي", defaultCredit: "حساب الدائن الافتراضي", defaultDebit: "حساب المدين الافتراضي", features: "الميزات", format: "الصيغة", nextNumber: "الرقم التالي", numbering: "الترقيم", requiresApproval: "يتطلب موافقة", sampleNumber: "رقم نموذجي", system: "نظامي" });

// ---- master (supplement) ----
ensure(en, 'master'); ensure(ar, 'master');
if (!en.master.roles) en.master.roles = {};
if (!ar.master.roles) ar.master.roles = {};
if (!en.master.roles.hints) en.master.roles.hints = {};
if (!ar.master.roles.hints) ar.master.roles.hints = {};
if (!en.master.roles.messages) en.master.roles.messages = {};
if (!ar.master.roles.messages) ar.master.roles.messages = {};
deepMerge(en.master.roles.hints, { templatePermissions: "Template permissions will be copied to the new role" });
deepMerge(ar.master.roles.hints, { templatePermissions: "سيتم نسخ صلاحيات القالب إلى الدور الجديد" });
deepMerge(en.master.roles.messages, { cloned: "Role cloned successfully" });
deepMerge(ar.master.roles.messages, { cloned: "تم نسخ الدور بنجاح" });

// ---- messages (supplement) ----
ensure(en, 'messages'); ensure(ar, 'messages');
deepMerge(en.messages, { cloned: "Cloned successfully" });
deepMerge(ar.messages, { cloned: "تم النسخ بنجاح" });

// ---- payments (supplement) ----
ensure(en, 'payments'); ensure(ar, 'payments');
deepMerge(en.payments, { addGateway: "Add Payment Gateway" });
deepMerge(ar.payments, { addGateway: "إضافة بوابة دفع" });

// ---- payrollPeriods (supplement) ----
ensure(en, 'payrollPeriods'); ensure(ar, 'payrollPeriods');
deepMerge(en.payrollPeriods, { allStatuses: "All Statuses", autoFill: "Auto Fill", cannotDeleteLocked: "Cannot delete locked period", cannotDeleteProcessed: "Cannot delete processed period", cannotEditLocked: "Cannot edit locked period", cutoffDate: "Cutoff Date", dates: "Dates", deductions: "Deductions", gross: "Gross", invalidDays: "Invalid working days", lastPaid: "Last Paid", month: "Month", net: "Net", openPeriod: "Open Period", paymentDate: "Payment Date", periodType: "Period Type", periods: "Periods", timeline: "Timeline", workingDays: "Working Days", year: "Year", yearTotal: "Year Total" });
deepMerge(ar.payrollPeriods, { allStatuses: "جميع الحالات", autoFill: "ملء تلقائي", cannotDeleteLocked: "لا يمكن حذف فترة مقفلة", cannotDeleteProcessed: "لا يمكن حذف فترة تمت معالجتها", cannotEditLocked: "لا يمكن تعديل فترة مقفلة", cutoffDate: "تاريخ القطع", dates: "التواريخ", deductions: "الخصومات", gross: "الإجمالي", invalidDays: "أيام عمل غير صالحة", lastPaid: "آخر دفعة", month: "الشهر", net: "الصافي", openPeriod: "فترة مفتوحة", paymentDate: "تاريخ الدفع", periodType: "نوع الفترة", periods: "الفترات", timeline: "الجدول الزمني", workingDays: "أيام العمل", year: "السنة", yearTotal: "إجمالي السنة" });

// ---- reports (supplement) ----
ensure(en, 'reports'); ensure(ar, 'reports');
deepMerge(en.reports, { categories: "Categories", categoryBreakdown: "Category Breakdown", expensesByCategory: "Expenses by Category", exported: "Report Exported", totalExpenses: "Total Expenses", totalTransactions: "Total Transactions" });
deepMerge(ar.reports, { categories: "الفئات", categoryBreakdown: "توزيع حسب الفئة", expensesByCategory: "المصاريف حسب الفئة", exported: "تم تصدير التقرير", totalExpenses: "إجمالي المصاريف", totalTransactions: "إجمالي المعاملات" });

// ---- security (supplement) ----
ensure(en, 'security'); ensure(ar, 'security');
deepMerge(en.security, { accessWarning: "Access Warning", accessWarningMessage: "You are about to modify security settings", auditLogin: "Audit Login", auditPassword: "Audit Password Changes", auditPermissions: "Audit Permission Changes", auditRetention: "Audit Log Retention", disabled: "Disabled", enableTfa: "Enable 2FA", expiryDays: "Expiry Days", extendOnActivity: "Extend on Activity", forever: "Forever", historyCount: "History Count", ipPlaceholder: "Enter IP address...", last10: "Last 10", last3: "Last 3", last5: "Last 5", manual: "Manual", maxConcurrent: "Max Concurrent", never: "Never", none: "None", passwordStrength: "Password Strength", rememberMeDays: "Remember Me Days", requireEmailVerification: "Require Email Verification", requirePhoneVerification: "Require Phone Verification", requireSymbols: "Require Symbols", singleDevice: "Single Device", tfa: "Two-Factor Authentication", tfaApp: "Authenticator App", tfaDescription: "Add an extra layer of security", tfaEmail: "Email", tfaMethods: "2FA Methods", tfaRequiredAdmins: "Required for Admins", tfaSms: "SMS", unlimited: "Unlimited" });
deepMerge(ar.security, { accessWarning: "تحذير الوصول", accessWarningMessage: "أنت على وشك تعديل إعدادات الأمان", auditLogin: "تدقيق تسجيل الدخول", auditPassword: "تدقيق تغيير كلمات المرور", auditPermissions: "تدقيق تغيير الصلاحيات", auditRetention: "الاحتفاظ بسجل التدقيق", disabled: "معطل", enableTfa: "تفعيل المصادقة الثنائية", expiryDays: "أيام الانتهاء", extendOnActivity: "تمديد عند النشاط", forever: "للأبد", historyCount: "عدد السجلات", ipPlaceholder: "أدخل عنوان IP...", last10: "آخر 10", last3: "آخر 3", last5: "آخر 5", manual: "يدوي", maxConcurrent: "الحد الأقصى المتزامن", never: "أبداً", none: "بدون", passwordStrength: "قوة كلمة المرور", rememberMeDays: "أيام تذكرني", requireEmailVerification: "يتطلب التحقق بالبريد", requirePhoneVerification: "يتطلب التحقق بالهاتف", requireSymbols: "يتطلب رموز", singleDevice: "جهاز واحد", tfa: "المصادقة الثنائية", tfaApp: "تطبيق المصادقة", tfaDescription: "إضافة طبقة أمان إضافية", tfaEmail: "البريد الإلكتروني", tfaMethods: "طرق المصادقة الثنائية", tfaRequiredAdmins: "مطلوب للمشرفين", tfaSms: "رسالة نصية", unlimited: "غير محدود" });

// ---- serialNumbers (supplement) ----
ensure(en, 'serialNumbers'); ensure(ar, 'serialNumbers');
deepMerge(en.serialNumbers, { batchNumber: "Batch Number", edit: "Edit Serial", expiryDate: "Expiry Date", printLabels: "Print Labels", purchaseDate: "Purchase Date", searchPlaceholder: "Search serial numbers...", serialNumber: "Serial Number", warranty: "Warranty", warrantyEndDate: "Warranty End Date" });
deepMerge(ar.serialNumbers, { batchNumber: "رقم الدفعة", edit: "تعديل الرقم التسلسلي", expiryDate: "تاريخ الانتهاء", printLabels: "طباعة الملصقات", purchaseDate: "تاريخ الشراء", searchPlaceholder: "بحث في الأرقام التسلسلية...", serialNumber: "الرقم التسلسلي", warranty: "الضمان", warrantyEndDate: "تاريخ انتهاء الضمان" });

// ---- settings (LARGE supplement - ~130 keys) ----
ensure(en, 'settings'); ensure(ar, 'settings');
deepMerge(en.settings, {
  accessLogging: "Access Logging", action: "Action", activeCompanies: "Active Companies", activeUsers: "Active Users",
  addressInfo: "Address Information", affected: "Affected", aiAccounting: "AI Accounting", aiAccountingDesc: "AI-powered accounting features",
  aiFeatures: "AI Features", aiIntelligence: "AI Intelligence", aiIntelligenceDesc: "Intelligent automation and predictions",
  amount: "Amount", anomalySensitivity: "Anomaly Sensitivity", anonymization: "Anonymization",
  anonymizationMethod: "Anonymization Method", autoApproveAbove: "Auto Approve Above", autoCategorization: "Auto Categorization",
  autoElimination: "Auto Elimination", autoRetrain: "Auto Retrain", automation: "Automation",
  automationDesc: "Automation settings", backupEmail: "Backup Email", basicInfo: "Basic Information",
  branding: "Branding", brandingDesc: "Customize branding and appearance", capabilities: "Capabilities",
  category: "Category", channel: "Channel", check: "Check", classification: "Classification",
  code: "Code", colors: "Colors", companies: "Companies", companiesDesc: "Company settings",
  companyDisplayName: "Company Display Name", comparativePeriod: "Comparative Period",
  compliance: "Compliance", condition: "Condition", confidenceThreshold: "Confidence Threshold",
  configure: "Configure", connectionTestFailed: "Connection test failed", connectionTestSuccess: "Connection test successful",
  consentTracking: "Consent Tracking", consolidation: "Consolidation", consolidationDesc: "Consolidation settings",
  consolidationFrequency: "Consolidation Frequency", consolidationGroups: "Consolidation Groups",
  contactInfo: "Contact Information", contactUs: "Contact Us", coreModules: "Core Modules",
  createAlert: "Create Alert", critical: "Critical", currentPlan: "Current Plan",
  dataExport: "Data Export", dataGovernance: "Data Governance", dataGovernanceDesc: "Data governance and privacy settings",
  dataRetention: "Data Retention", defaultClassification: "Default Classification",
  defaultRetention: "Default Retention", detectionSettings: "Detection Settings",
  disclosureTemplate: "Disclosure Template", editAlert: "Edit Alert",
  emailBranding: "Email Branding", emailHeaderBg: "Email Header Background",
  emailVerification: "Email Verification", enableAnomalyDetection: "Enable Anomaly Detection",
  enableAnonymization: "Enable Anonymization", enableClassification: "Enable Classification",
  enableClustering: "Enable Clustering", enableForecasting: "Enable Forecasting",
  enableMFA: "Enable MFA", enforcement: "Enforcement", entities: "Entities",
  event: "Event", exchangeRateSource: "Exchange Rate Source", extendedModules: "Extended Modules",
  faviconUrl: "Favicon URL", featureSelection: "Feature Selection", features: "Features",
  firstTimeAdoption: "First Time Adoption", formatting: "Formatting", framework: "Framework",
  generalConfig: "General Configuration", governanceScanner: "Governance Scanner",
  governanceScannerDesc: "Scan for governance compliance", gracePeriod: "Grace Period",
  gracePeriodDesc: "Allow grace period before enforcement", high: "High",
  identity: "Identity", ifrsCompliance: "IFRS Compliance",
  ifrsComplianceDesc: "IFRS compliance settings", includeInactive: "Include Inactive",
  informational: "Informational", integrationHub: "Integration Hub",
  integrationHubDesc: "Manage integrations", intercompanyMatching: "Intercompany Matching",
  lastConsolidated: "Last Consolidated", lastSync: "Last Sync",
  learningMode: "Learning Mode", legalName: "Legal Name",
  loginBackground: "Login Background", logoUrl: "Logo URL", low: "Low",
  maxSuggestions: "Max Suggestions", methods: "Methods", mfa: "MFA",
  mfaDesc: "Multi-factor authentication settings", mlModel: "ML Model",
  modelConfig: "Model Configuration", modulesDesc: "Modules settings",
  month: "Month", parent: "Parent", passed: "Passed",
  piiDetection: "PII Detection", plans: "Plans", predictionHorizon: "Prediction Horizon",
  predictiveAnalytics: "Predictive Analytics", preview: "Preview",
  recipients: "Recipients", recoveryCodes: "Recovery Codes",
  recoveryOptions: "Recovery Options", regionalization: "Regionalization",
  registrationNumber: "Registration Number", rememberDevice: "Remember Device",
  reportingCurrency: "Reporting Currency", requiredForAdmins: "Required for Admins",
  requiredForAll: "Required for All", retention: "Retention",
  retentionPolicy: "Retention Policy", reviewQueue: "Review Queue",
  rightToErasure: "Right to Erasure", rules: "Rules",
  runScan: "Run Scan", runs: "Runs", sampleButton: "Sample Button",
  sampleEmailBody: "Sample Email Body", scanComplete: "Scan Complete",
  scanning: "Scanning", secondaryColor: "Secondary Color",
  severity: "Severity", showPoweredBy: "Show Powered By",
  since: "Since", smartAlerts: "Smart Alerts", smartAlertsDesc: "AI-powered smart alerts",
  smartReconciliation: "Smart Reconciliation", sms: "SMS",
  standards: "Standards", status: "Status", subscription: "Subscription",
  subscriptionDesc: "Subscription and billing settings", tenant: "Tenant",
  tenantCode: "Tenant Code", tenantDesc: "Tenant settings",
  tenantIdentity: "Tenant Identity", tenantName: "Tenant Name",
  test: "Test", testConnection: "Test Connection",
  testNotificationSent: "Test notification sent", testing: "Testing",
  thresholds: "Thresholds", totalBranches: "Total Branches",
  totalCompanies: "Total Companies", totalModuleUsers: "Total Module Users",
  totalModules: "Total Modules", totp: "TOTP",
  trainingFrequency: "Training Frequency", transitionDate: "Transition Date",
  trigger: "Trigger", upgrade: "Upgrade", usage: "Usage",
  varianceThreshold: "Variance Threshold", warnings: "Warnings",
  weekStartsOn: "Week Starts On"
});

deepMerge(ar.settings, {
  accessLogging: "تسجيل الوصول", action: "الإجراء", activeCompanies: "الشركات النشطة", activeUsers: "المستخدمين النشطين",
  addressInfo: "معلومات العنوان", affected: "المتأثر", aiAccounting: "المحاسبة الذكية", aiAccountingDesc: "ميزات المحاسبة المدعومة بالذكاء الاصطناعي",
  aiFeatures: "ميزات الذكاء الاصطناعي", aiIntelligence: "الذكاء الاصطناعي", aiIntelligenceDesc: "الأتمتة الذكية والتنبؤات",
  amount: "المبلغ", anomalySensitivity: "حساسية الشذوذ", anonymization: "إخفاء الهوية",
  anonymizationMethod: "طريقة إخفاء الهوية", autoApproveAbove: "موافقة تلقائية فوق", autoCategorization: "التصنيف التلقائي",
  autoElimination: "الحذف التلقائي", autoRetrain: "إعادة التدريب التلقائي", automation: "الأتمتة",
  automationDesc: "إعدادات الأتمتة", backupEmail: "بريد النسخ الاحتياطي", basicInfo: "المعلومات الأساسية",
  branding: "العلامة التجارية", brandingDesc: "تخصيص العلامة التجارية والمظهر", capabilities: "الإمكانيات",
  category: "الفئة", channel: "القناة", check: "فحص", classification: "التصنيف",
  code: "الرمز", colors: "الألوان", companies: "الشركات", companiesDesc: "إعدادات الشركات",
  companyDisplayName: "الاسم المعروض للشركة", comparativePeriod: "الفترة المقارنة",
  compliance: "الامتثال", condition: "الشرط", confidenceThreshold: "حد الثقة",
  configure: "تهيئة", connectionTestFailed: "فشل اختبار الاتصال", connectionTestSuccess: "نجح اختبار الاتصال",
  consentTracking: "تتبع الموافقات", consolidation: "التوحيد", consolidationDesc: "إعدادات التوحيد",
  consolidationFrequency: "تكرار التوحيد", consolidationGroups: "مجموعات التوحيد",
  contactInfo: "معلومات الاتصال", contactUs: "اتصل بنا", coreModules: "الوحدات الأساسية",
  createAlert: "إنشاء تنبيه", critical: "حرج", currentPlan: "الباقة الحالية",
  dataExport: "تصدير البيانات", dataGovernance: "حوكمة البيانات", dataGovernanceDesc: "إعدادات حوكمة البيانات والخصوصية",
  dataRetention: "الاحتفاظ بالبيانات", defaultClassification: "التصنيف الافتراضي",
  defaultRetention: "الاحتفاظ الافتراضي", detectionSettings: "إعدادات الكشف",
  disclosureTemplate: "قالب الإفصاح", editAlert: "تعديل التنبيه",
  emailBranding: "علامة البريد التجارية", emailHeaderBg: "خلفية رأس البريد",
  emailVerification: "التحقق بالبريد", enableAnomalyDetection: "تفعيل كشف الشذوذ",
  enableAnonymization: "تفعيل إخفاء الهوية", enableClassification: "تفعيل التصنيف",
  enableClustering: "تفعيل التجميع", enableForecasting: "تفعيل التنبؤ",
  enableMFA: "تفعيل المصادقة المتعددة", enforcement: "التطبيق", entities: "الكيانات",
  event: "الحدث", exchangeRateSource: "مصدر سعر الصرف", extendedModules: "الوحدات الموسعة",
  faviconUrl: "رابط الأيقونة المفضلة", featureSelection: "اختيار الميزات", features: "الميزات",
  firstTimeAdoption: "التطبيق الأول", formatting: "التنسيق", framework: "الإطار",
  generalConfig: "الإعدادات العامة", governanceScanner: "ماسح الحوكمة",
  governanceScannerDesc: "فحص الامتثال للحوكمة", gracePeriod: "فترة السماح",
  gracePeriodDesc: "السماح بفترة سماح قبل التطبيق", high: "عالي",
  identity: "الهوية", ifrsCompliance: "الامتثال لمعايير IFRS",
  ifrsComplianceDesc: "إعدادات الامتثال لمعايير IFRS", includeInactive: "تضمين غير النشط",
  informational: "معلوماتي", integrationHub: "مركز التكامل",
  integrationHubDesc: "إدارة التكاملات", intercompanyMatching: "مطابقة العمليات البينية",
  lastConsolidated: "آخر توحيد", lastSync: "آخر مزامنة",
  learningMode: "وضع التعلم", legalName: "الاسم القانوني",
  loginBackground: "خلفية تسجيل الدخول", logoUrl: "رابط الشعار", low: "منخفض",
  maxSuggestions: "الحد الأقصى للاقتراحات", methods: "الطرق", mfa: "المصادقة المتعددة",
  mfaDesc: "إعدادات المصادقة متعددة العوامل", mlModel: "نموذج التعلم الآلي",
  modelConfig: "تهيئة النموذج", modulesDesc: "إعدادات الوحدات",
  month: "الشهر", parent: "الأصل", passed: "نجح",
  piiDetection: "كشف المعلومات الشخصية", plans: "الباقات", predictionHorizon: "أفق التنبؤ",
  predictiveAnalytics: "التحليلات التنبؤية", preview: "معاينة",
  recipients: "المستلمون", recoveryCodes: "رموز الاسترداد",
  recoveryOptions: "خيارات الاسترداد", regionalization: "الإقليمية",
  registrationNumber: "رقم التسجيل", rememberDevice: "تذكر الجهاز",
  reportingCurrency: "عملة التقارير", requiredForAdmins: "مطلوب للمشرفين",
  requiredForAll: "مطلوب للجميع", retention: "الاحتفاظ",
  retentionPolicy: "سياسة الاحتفاظ", reviewQueue: "قائمة المراجعة",
  rightToErasure: "حق المسح", rules: "القواعد",
  runScan: "تشغيل الفحص", runs: "التشغيلات", sampleButton: "زر نموذجي",
  sampleEmailBody: "نص بريد نموذجي", scanComplete: "اكتمل الفحص",
  scanning: "جاري الفحص", secondaryColor: "اللون الثانوي",
  severity: "الخطورة", showPoweredBy: "إظهار مدعوم من",
  since: "منذ", smartAlerts: "التنبيهات الذكية", smartAlertsDesc: "تنبيهات ذكية مدعومة بالذكاء الاصطناعي",
  smartReconciliation: "المطابقة الذكية", sms: "رسالة نصية",
  standards: "المعايير", status: "الحالة", subscription: "الاشتراك",
  subscriptionDesc: "إعدادات الاشتراك والفوترة", tenant: "المستأجر",
  tenantCode: "رمز المستأجر", tenantDesc: "إعدادات المستأجر",
  tenantIdentity: "هوية المستأجر", tenantName: "اسم المستأجر",
  test: "اختبار", testConnection: "اختبار الاتصال",
  testNotificationSent: "تم إرسال إشعار اختباري", testing: "جاري الاختبار",
  thresholds: "العتبات", totalBranches: "إجمالي الفروع",
  totalCompanies: "إجمالي الشركات", totalModuleUsers: "إجمالي مستخدمي الوحدات",
  totalModules: "إجمالي الوحدات", totp: "TOTP",
  trainingFrequency: "تكرار التدريب", transitionDate: "تاريخ الانتقال",
  trigger: "المحفز", upgrade: "ترقية", usage: "الاستخدام",
  varianceThreshold: "حد التباين", warnings: "التحذيرات",
  weekStartsOn: "بداية الأسبوع"
});

// ---- shipping (supplement) ----
ensure(en, 'shipping'); ensure(ar, 'shipping');
deepMerge(en.shipping, { addCarrier: "Add Carrier" });
deepMerge(ar.shipping, { addCarrier: "إضافة ناقل" });

// ---- shippingLines (supplement) ----
ensure(en, 'shippingLines'); ensure(ar, 'shippingLines');
deepMerge(en.shippingLines, { contactPerson: "Contact Person", country: "Country", new: "New Shipping Line", paymentTerms: "Payment Terms", preferred: "Preferred", website: "Website" });
deepMerge(ar.shippingLines, { contactPerson: "جهة الاتصال", country: "الدولة", new: "خط شحن جديد", paymentTerms: "شروط الدفع", preferred: "مفضل", website: "الموقع الإلكتروني" });

// ---- stockLimits (supplement) ----
ensure(en, 'stockLimits'); ensure(ar, 'stockLimits');
deepMerge(en.stockLimits, { critical: "Critical", currentStock: "Current Stock", low: "Low", maximumQty: "Maximum Quantity", minimumQty: "Minimum Quantity", normal: "Normal", overstock: "Overstock" });
deepMerge(ar.stockLimits, { critical: "حرج", currentStock: "المخزون الحالي", low: "منخفض", maximumQty: "الكمية القصوى", minimumQty: "الكمية الدنيا", normal: "عادي", overstock: "فائض" });

// ---- success (supplement) ----
ensure(en, 'success'); ensure(ar, 'success');
deepMerge(en.success, { posted: "Posted successfully", reversed: "Reversed successfully" });
deepMerge(ar.success, { posted: "تم الترحيل بنجاح", reversed: "تم العكس بنجاح" });

// ---- suppliers (supplement) ----
ensure(en, 'suppliers'); ensure(ar, 'suppliers');
deepMerge(en.suppliers, { activeSupplier: "Active Supplier", company: "Company", companyInfo: "Company Information", companyName: "Company Name", contactInfo: "Contact Information", contactPerson: "Contact Person", createSubtitle: "Add a new supplier", createSupplier: "Create Supplier", created: "Supplier created successfully", currency: "Currency", location: "Location", mobile: "Mobile", paymentNotes: "Payment Notes", postalCode: "Postal Code", streetAddress: "Street Address", taxNumber: "Tax Number", terms: "Terms", website: "Website" });
deepMerge(ar.suppliers, { activeSupplier: "مورد نشط", company: "الشركة", companyInfo: "معلومات الشركة", companyName: "اسم الشركة", contactInfo: "معلومات الاتصال", contactPerson: "جهة الاتصال", createSubtitle: "إضافة مورد جديد", createSupplier: "إنشاء مورد", created: "تم إنشاء المورد بنجاح", currency: "العملة", location: "الموقع", mobile: "الجوال", paymentNotes: "ملاحظات الدفع", postalCode: "الرمز البريدي", streetAddress: "عنوان الشارع", taxNumber: "الرقم الضريبي", terms: "الشروط", website: "الموقع الإلكتروني" });

// ---- table (supplement) ----
ensure(en, 'table'); ensure(ar, 'table');
deepMerge(en.table, { columnSettings: "Column Settings", export: "Export", selectedCount: "Selected" });
deepMerge(ar.table, { columnSettings: "إعدادات الأعمدة", export: "تصدير", selectedCount: "المحدد" });

// ---- validation (supplement) ----
ensure(en, 'validation'); ensure(ar, 'validation');
deepMerge(en.validation, { dateOrder: "End date must be after start date", endDateAfterStart: "End date must be after start date", invalidEmail: "Invalid email address", maxGreaterMin: "Maximum must be greater than minimum", positive: "Must be positive", positiveNumber: "Must be a positive number", reorderGreaterMin: "Reorder point must be greater than minimum" });
deepMerge(ar.validation, { dateOrder: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية", endDateAfterStart: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية", invalidEmail: "بريد إلكتروني غير صالح", maxGreaterMin: "الحد الأقصى يجب أن يكون أكبر من الحد الأدنى", positive: "يجب أن يكون موجب", positiveNumber: "يجب أن يكون رقم موجب", reorderGreaterMin: "نقطة إعادة الطلب يجب أن تكون أكبر من الحد الأدنى" });

// ---- valuationMethods (supplement) ----
ensure(en, 'valuationMethods'); ensure(ar, 'valuationMethods');
deepMerge(en.valuationMethods, { appliesTo: "Applies To", create: "Create Method", edit: "Edit Method", lastCalculation: "Last Calculation", newMethod: "New Method" });
deepMerge(ar.valuationMethods, { appliesTo: "ينطبق على", create: "إنشاء طريقة", edit: "تعديل الطريقة", lastCalculation: "آخر حساب", newMethod: "طريقة جديدة" });

// ---- voucherTypes (supplement) ----
ensure(en, 'voucherTypes'); ensure(ar, 'voucherTypes');
deepMerge(en.voucherTypes, { affectsBank: "Affects Bank", affectsCash: "Affects Cash", allClasses: "All Classes", allTypes: "All Types", approvalThreshold: "Approval Threshold", autoNumbering: "Auto Numbering", cannotDeleteSystem: "Cannot delete system voucher type", class: "Class", defaultAccount: "Default Account", features: "Features", format: "Format", journalType: "Journal Type", nextNumber: "Next Number", numbering: "Numbering", printTemplate: "Print Template", requiresApproval: "Requires Approval", requiresAttachment: "Requires Attachment", sampleNumber: "Sample Number", transType: "Transaction Type" });
deepMerge(ar.voucherTypes, { affectsBank: "يؤثر على البنك", affectsCash: "يؤثر على النقدية", allClasses: "جميع الفئات", allTypes: "جميع الأنواع", approvalThreshold: "حد الموافقة", autoNumbering: "ترقيم تلقائي", cannotDeleteSystem: "لا يمكن حذف نوع سند نظامي", class: "الفئة", defaultAccount: "الحساب الافتراضي", features: "الميزات", format: "الصيغة", journalType: "نوع القيد", nextNumber: "الرقم التالي", numbering: "الترقيم", printTemplate: "قالب الطباعة", requiresApproval: "يتطلب موافقة", requiresAttachment: "يتطلب مرفق", sampleNumber: "رقم نموذجي", transType: "نوع المعاملة" });

// ---- withholdingTax (supplement) ----
ensure(en, 'withholdingTax'); ensure(ar, 'withholdingTax');
deepMerge(en.withholdingTax, { allPaymentTypes: "All Payment Types", appliesTo: "Applies To", countries: "Countries", country: "Country", exemptionConditions: "Exemption Conditions", generalRates: "General Rates", nonResident: "Non-Resident", nonResidentRate: "Non-Resident Rate", paymentType: "Payment Type", paymentTypes: "Payment Types", rates: "Rates", resident: "Resident", residentRate: "Resident Rate", treaty: "Treaty", treatyRate: "Treaty Rate", treatyRates: "Treaty Rates", zatcaCode: "ZATCA Code" });
deepMerge(ar.withholdingTax, { allPaymentTypes: "جميع أنواع الدفع", appliesTo: "ينطبق على", countries: "الدول", country: "الدولة", exemptionConditions: "شروط الإعفاء", generalRates: "النسب العامة", nonResident: "غير مقيم", nonResidentRate: "نسبة غير المقيم", paymentType: "نوع الدفع", paymentTypes: "أنواع الدفع", rates: "النسب", resident: "مقيم", residentRate: "نسبة المقيم", treaty: "اتفاقية", treatyRate: "نسبة الاتفاقية", treatyRates: "نسب الاتفاقيات", zatcaCode: "رمز ZATCA" });

// ---- zatca (supplement) ----
ensure(en, 'zatca'); ensure(ar, 'zatca');
deepMerge(en.zatca, { accepted: "Accepted", checkCredentials: "Check Credentials", complianceLogs: "Compliance Logs", configKey: "Config Key", configValue: "Config Value", configuration: "Configuration", connectionFailed: "Connection Failed", connectionSuccess: "Connection Success", credentialsValid: "Credentials Valid", deleteConfigWarning: "Are you sure you want to delete this configuration?", editConfig: "Edit Configuration", encrypted: "Encrypted", invoiceNumber: "Invoice Number", invoiceType: "Invoice Type", message: "Message", newConfig: "New Configuration", required: "Required", responseCode: "Response Code", startTest: "Start Test", submissionDate: "Submission Date", testConnection: "Test Connection", testDescription: "Test connection to ZATCA", testing: "Testing...", value: "Value", warnings: "Warnings" });
deepMerge(ar.zatca, { accepted: "مقبولة", checkCredentials: "التحقق من بيانات الاعتماد", complianceLogs: "سجلات الامتثال", configKey: "مفتاح التهيئة", configValue: "قيمة التهيئة", configuration: "التهيئة", connectionFailed: "فشل الاتصال", connectionSuccess: "نجح الاتصال", credentialsValid: "بيانات الاعتماد صحيحة", deleteConfigWarning: "هل أنت متأكد من حذف هذه التهيئة؟", editConfig: "تعديل التهيئة", encrypted: "مشفر", invoiceNumber: "رقم الفاتورة", invoiceType: "نوع الفاتورة", message: "الرسالة", newConfig: "تهيئة جديدة", required: "مطلوب", responseCode: "رمز الاستجابة", startTest: "بدء الاختبار", submissionDate: "تاريخ الإرسال", testConnection: "اختبار الاتصال", testDescription: "اختبار الاتصال بـ ZATCA", testing: "جاري الاختبار...", value: "القيمة", warnings: "التحذيرات" });

// Write files
fs.writeFileSync('./frontend-next/locales/en.json', JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync('./frontend-next/locales/ar.json', JSON.stringify(ar, null, 2) + '\n', 'utf8');

console.log('EN common keys:', Object.keys(en.common).length);
console.log('AR common keys:', Object.keys(ar.common).length);
console.log('EN sections:', Object.keys(en).length);
console.log('AR sections:', Object.keys(ar).length);
console.log('EN file size:', (JSON.stringify(en, null, 2).length / 1024).toFixed(1) + 'KB');
console.log('AR file size:', (JSON.stringify(ar, null, 2).length / 1024).toFixed(1) + 'KB');
console.log('\nPhase 3 complete!');
