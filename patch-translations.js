/**
 * Patch missing translations into en.json and ar.json
 * Run: node patch-translations.js
 */
const fs = require('fs');

const enPath = './frontend-next/locales/en.json';
const arPath = './frontend-next/locales/ar.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

function setNestedValue(obj, key, value) {
  const parts = key.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// ==========================================
// 1. MISSING IN ENGLISH (18 keys) - all notifications.*
// ==========================================
const missingInEn = {
  "notifications.categories.all": "All",
  "notifications.categories.system": "System",
  "notifications.errors.dismissFailed": "Failed to dismiss notification",
  "notifications.errors.loadFailed": "Failed to load notifications",
  "notifications.errors.markReadFailed": "Failed to mark as read",
  "notifications.markAllRead": "Mark all as read",
  "notifications.markAsRead": "Mark as read",
  "notifications.noNotifications": "No notifications",
  "notifications.noNotificationsDescription": "You're up to date! No new notifications.",
  "notifications.success.dismissed": "Notification dismissed",
  "notifications.success.markedAllRead": "All notifications marked as read",
  "notifications.timeAgo.daysAgo": "{{days}} days ago",
  "notifications.timeAgo.hoursAgo": "{{hours}} hours ago",
  "notifications.timeAgo.justNow": "Just now",
  "notifications.timeAgo.minutesAgo": "{{minutes}} minutes ago",
  "notifications.unreadOnly": "Unread only",
  "notifications.untitled": "Notification",
  "notifications.viewAll": "View All"
};

// ==========================================
// 2. MISSING IN ARABIC (326 keys)
// ==========================================
const missingInAr = {
  // --- chequeBooks (31) ---
  "chequeBooks.activeBooks": "الدفاتر النشطة",
  "chequeBooks.allBanks": "جميع البنوك",
  "chequeBooks.allStatuses": "جميع الحالات",
  "chequeBooks.available": "متاح",
  "chequeBooks.bank": "البنك",
  "chequeBooks.bankAccount": "الحساب البنكي",
  "chequeBooks.cannotDeleteUsed": "لا يمكن حذف دفتر شيكات يحتوي على شيكات صادرة",
  "chequeBooks.chequePrefix": "بادئة الشيك",
  "chequeBooks.chequeRange": "نطاق أرقام الشيكات",
  "chequeBooks.create": "إنشاء دفتر شيكات",
  "chequeBooks.current": "الحالي",
  "chequeBooks.deleteWarning": "سيتم حذف دفتر الشيكات نهائياً.",
  "chequeBooks.edit": "تعديل دفتر شيكات",
  "chequeBooks.endMustBeGreater": "رقم النهاية يجب أن يكون أكبر من البداية",
  "chequeBooks.endNumber": "رقم النهاية",
  "chequeBooks.expiry": "انتهاء الصلاحية",
  "chequeBooks.expiryDate": "تاريخ الانتهاء",
  "chequeBooks.issueDate": "تاريخ الإصدار",
  "chequeBooks.new": "دفتر شيكات جديد",
  "chequeBooks.preview": "معاينة",
  "chequeBooks.range": "نطاق الشيكات",
  "chequeBooks.series": "السلسلة",
  "chequeBooks.seriesName": "اسم السلسلة",
  "chequeBooks.setDefault": "تعيين كافتراضي",
  "chequeBooks.startNumber": "رقم البداية",
  "chequeBooks.subtitle": "تتبع مخزون دفاتر الشيكات واستخدامها",
  "chequeBooks.title": "دفاتر الشيكات",
  "chequeBooks.totalLeaves": "إجمالي الأوراق",
  "chequeBooks.totalLeavesCalc": "إجمالي الأوراق",
  "chequeBooks.usage": "الاستخدام",
  "chequeBooks.usedLeaves": "المستخدمة",

  // --- fiscalPeriods (31) ---
  "fiscalPeriods.adjustment": "تسوية",
  "fiscalPeriods.adjustmentPeriod": "فترة التسوية",
  "fiscalPeriods.closePeriod": "إغلاق الفترة",
  "fiscalPeriods.closed": "مغلقة",
  "fiscalPeriods.closedPeriods": "مغلقة",
  "fiscalPeriods.create": "إنشاء فترة",
  "fiscalPeriods.dateRange": "نطاق التاريخ",
  "fiscalPeriods.deleteWarning": "حذف الفترة قد يؤثر على التقارير المالية.",
  "fiscalPeriods.edit": "تعديل الفترة",
  "fiscalPeriods.endDate": "تاريخ النهاية",
  "fiscalPeriods.fiscalYear": "السنة المالية",
  "fiscalPeriods.generate": "توليد سنة",
  "fiscalPeriods.generateDescription": "سيتم إنشاء 12 فترة شهرية للسنة المالية المحددة.",
  "fiscalPeriods.generatePeriods": "توليد الفترات المالية",
  "fiscalPeriods.locked": "مقفلة",
  "fiscalPeriods.lockedPeriods": "مقفلة",
  "fiscalPeriods.new": "فترة جديدة",
  "fiscalPeriods.open": "مفتوحة",
  "fiscalPeriods.openPeriods": "مفتوحة",
  "fiscalPeriods.period": "الفترة",
  "fiscalPeriods.periodClosed": "تم إغلاق الفترة بنجاح",
  "fiscalPeriods.periodNumber": "رقم الفترة",
  "fiscalPeriods.periodReopened": "تم إعادة فتح الفترة بنجاح",
  "fiscalPeriods.periodType": "نوع الفترة",
  "fiscalPeriods.periods": "فترات",
  "fiscalPeriods.periodsGenerated": "تم توليد 12 فترة بنجاح",
  "fiscalPeriods.reopenPeriod": "إعادة فتح الفترة",
  "fiscalPeriods.startDate": "تاريخ البداية",
  "fiscalPeriods.subtitle": "إدارة الفترات المحاسبية وإقفال نهاية السنة",
  "fiscalPeriods.title": "الفترات المالية",
  "fiscalPeriods.yearEnd": "فترة نهاية السنة",

  // --- alerts (28) ---
  "alerts.activateImmediately": "تفعيل فوري",
  "alerts.active": "نشط",
  "alerts.channels": "قنوات الإشعار",
  "alerts.condition": "الشرط (اختياري)",
  "alerts.cooldown": "فترة الانتظار (دقائق)",
  "alerts.cooldownDesc": "الحد الأدنى للوقت بين التنبيهات المتكررة",
  "alerts.createFirst": "أنشئ أول تنبيه",
  "alerts.createRule": "إنشاء قاعدة تنبيه",
  "alerts.critical": "حرج",
  "alerts.deleteConfirm": "هل أنت متأكد من حذف قاعدة التنبيه؟ لا يمكن التراجع عن هذا الإجراء.",
  "alerts.deleteRule": "حذف قاعدة التنبيه",
  "alerts.description": "الوصف",
  "alerts.editRule": "تعديل قاعدة التنبيه",
  "alerts.eventType": "نوع الحدث",
  "alerts.history": "سجل التنبيهات",
  "alerts.info": "معلومات",
  "alerts.lastTriggered": "آخر تشغيل",
  "alerts.nameAr": "الاسم (بالعربية)",
  "alerts.nameEn": "الاسم (بالإنجليزية)",
  "alerts.noRules": "لا توجد قواعد تنبيه",
  "alerts.rules": "قواعد التنبيه",
  "alerts.severity": "الخطورة",
  "alerts.subtitle": "إعداد وإدارة تنبيهات النظام",
  "alerts.title": "التنبيهات",
  "alerts.totalRules": "إجمالي القواعد",
  "alerts.triggered": "مرات التشغيل",
  "alerts.triggers": "تشغيلات",
  "alerts.warning": "تحذير",

  // --- costCenters (27) ---
  "costCenters.actions.add": "إضافة مركز تكلفة",
  "costCenters.activeOnlySuffix": "فقط",
  "costCenters.delete.message": "لا يمكن التراجع عن هذا الإجراء.",
  "costCenters.delete.title": "حذف مركز التكلفة",
  "costCenters.empty.ctaHint": "ابدأ بإنشاء مركز تكلفة جديد",
  "costCenters.empty.searchHint": "حاول تعديل معايير البحث",
  "costCenters.empty.title": "لم يتم العثور على مراكز تكلفة",
  "costCenters.fields.code": "رمز مركز التكلفة",
  "costCenters.fields.name": "اسم مركز التكلفة",
  "costCenters.fields.nameAr": "اسم مركز التكلفة (بالعربية)",
  "costCenters.fields.parent": "الأصل",
  "costCenters.loading": "جاري تحميل مراكز التكلفة...",
  "costCenters.messages.createSuccess": "تم إنشاء مركز التكلفة بنجاح",
  "costCenters.messages.deleteFailed": "فشل حذف مركز التكلفة",
  "costCenters.messages.deleteSuccess": "تم حذف مركز التكلفة بنجاح",
  "costCenters.messages.loadFailed": "فشل تحميل مراكز التكلفة",
  "costCenters.messages.loginRequired": "يرجى تسجيل الدخول مجدداً",
  "costCenters.messages.saveFailed": "فشل حفظ مركز التكلفة",
  "costCenters.messages.updateSuccess": "تم تحديث مركز التكلفة بنجاح",
  "costCenters.modal.createTitle": "إنشاء مركز تكلفة",
  "costCenters.modal.editTitle": "تعديل مركز التكلفة",
  "costCenters.pageTitle": "مراكز التكلفة - SLMS",
  "costCenters.searchPlaceholder": "البحث بالاسم أو الرمز...",
  "costCenters.subtitle": "إدارة مراكز التكلفة (رئيسية وفرعية)",
  "costCenters.title": "مراكز التكلفة",
  "costCenters.validation.codeRequired": "رمز مركز التكلفة مطلوب",
  "costCenters.validation.nameRequired": "اسم مركز التكلفة مطلوب",

  // --- notifications (27) ---
  "notifications.apiKey": "مفتاح API",
  "notifications.autoDismiss": "إخفاء تلقائي (ثوانٍ)",
  "notifications.daily": "يومي",
  "notifications.digest": "ملخص البريد الإلكتروني",
  "notifications.digestDesc": "دمج الإشعارات المتعددة في بريد ملخص واحد.",
  "notifications.digestTime": "إرسال في",
  "notifications.emailSettings": "إعدادات البريد الإلكتروني",
  "notifications.event": "الحدث",
  "notifications.frequency": "التكرار",
  "notifications.fromEmail": "البريد المرسل",
  "notifications.fromName": "اسم المرسل",
  "notifications.inAppSettings": "إشعارات داخل التطبيق",
  "notifications.maxNotifications": "الحد الأقصى للإشعارات المحفوظة",
  "notifications.provider": "المزود",
  "notifications.pushSettings": "إشعارات الدفع",
  "notifications.quietEnd": "وقت الانتهاء",
  "notifications.quietHours": "ساعات الهدوء",
  "notifications.quietHoursDesc": "خلال ساعات الهدوء، سيتم إرسال الإشعارات الحرجة فقط.",
  "notifications.quietStart": "وقت البدء",
  "notifications.schedule": "جدول التسليم",
  "notifications.scheduleNote": "ملاحظة",
  "notifications.scheduleNoteDesc": "الإشعارات الحرجة والأمنية ستُرسل فوراً بغض النظر عن إعدادات الجدول.",
  "notifications.smsSettings": "إعدادات الرسائل النصية",
  "notifications.vapidKey": "مفتاح VAPID العام",
  "notifications.weekendDesc": "السماح بالإشعارات غير الحرجة خلال عطلة نهاية الأسبوع",
  "notifications.weekendNotifications": "إشعارات نهاية الأسبوع",
  "notifications.weekly": "أسبوعي",

  // --- financialYears (23) ---
  "financialYears.cannotEditClosed": "لا يمكن تعديل سنة مالية مغلقة",
  "financialYears.close": "إغلاق",
  "financialYears.closeTitle": "إغلاق السنة المالية",
  "financialYears.closeWarning": "إغلاق السنة المالية لا يمكن التراجع عنه.",
  "financialYears.closed": "تم إغلاق السنة المالية",
  "financialYears.closedStatus": "مغلقة",
  "financialYears.create": "إنشاء سنة مالية",
  "financialYears.deleteTitle": "حذف السنة المالية",
  "financialYears.deleteWarning": "لا يمكن التراجع عن هذا الإجراء.",
  "financialYears.edit": "تعديل السنة المالية",
  "financialYears.empty": "لم يتم العثور على سنوات مالية",
  "financialYears.end": "النهاية",
  "financialYears.isDefault": "تعيين كافتراضي",
  "financialYears.listTitle": "السنوات",
  "financialYears.name": "الاسم",
  "financialYears.new": "سنة مالية جديدة",
  "financialYears.openStatus": "مفتوحة",
  "financialYears.setDefault": "تعيين الافتراضي",
  "financialYears.start": "البداية",
  "financialYears.status": "الحالة",
  "financialYears.subtitle": "إنشاء وتعيين وإغلاق السنوات المالية",
  "financialYears.title": "السنوات المالية",
  "financialYears.validation.dateOrder": "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",

  // --- taxCodes (22) ---
  "taxCodes.allApplies": "جميع التطبيقات",
  "taxCodes.appliesTo": "ينطبق على",
  "taxCodes.create": "إنشاء رمز ضريبي",
  "taxCodes.customsRate": "الجمارك (%)",
  "taxCodes.edit": "تعديل رمز ضريبي",
  "taxCodes.effectiveFrom": "ساري من",
  "taxCodes.effectiveTo": "ساري إلى",
  "taxCodes.exciseRate": "الإنتقائية (%)",
  "taxCodes.exempt": "معفى",
  "taxCodes.new": "رمز ضريبي جديد",
  "taxCodes.otherTaxes": "أخرى",
  "taxCodes.reverseCharge": "الاحتساب العكسي",
  "taxCodes.standard": "قياسي",
  "taxCodes.subtitle": "رموز المعاملات الضريبية المجمعة",
  "taxCodes.taxRates": "معدلات الضريبة",
  "taxCodes.title": "الرموز الضريبية",
  "taxCodes.type": "النوع",
  "taxCodes.vatRate": "نسبة ضريبة القيمة المضافة (%)",
  "taxCodes.withholdingRate": "نسبة الاستقطاع (%)",
  "taxCodes.zatca": "هيئة الزكاة والضريبة والجمارك",
  "taxCodes.zatcaCode": "رمز ZATCA",
  "taxCodes.zeroRated": "نسبة صفر",

  // --- departments (19) ---
  "departments.allLevels": "جميع المستويات",
  "departments.budget": "الميزانية",
  "departments.costCenter": "مركز التكلفة",
  "departments.create": "إنشاء قسم",
  "departments.deleteWarning": "حذف هذا القسم سيؤثر على جميع الأقسام الفرعية. هل أنت متأكد؟",
  "departments.edit": "تعديل القسم",
  "departments.employees": "الموظفين",
  "departments.level": "المستوى",
  "departments.levels": "مستويات التسلسل",
  "departments.location": "الموقع",
  "departments.manager": "المدير",
  "departments.new": "قسم جديد",
  "departments.noParent": "بدون أصل (مستوى أعلى)",
  "departments.parent": "القسم الأصل",
  "departments.subtitle": "إدارة الأقسام التنظيمية والتسلسل الهرمي",
  "departments.title": "الأقسام",
  "departments.total": "إجمالي الأقسام",
  "departments.totalBudget": "إجمالي الميزانية",
  "departments.totalEmployees": "إجمالي الموظفين",

  // --- taxTypes (19) ---
  "taxTypes.appliesTo": "ينطبق على",
  "taxTypes.calculationMethod": "طريقة الحساب",
  "taxTypes.category": "الفئة",
  "taxTypes.create": "إنشاء نوع ضريبة",
  "taxTypes.defaultRate": "النسبة الافتراضية %",
  "taxTypes.edit": "تعديل نوع الضريبة",
  "taxTypes.excise": "إنتقائية",
  "taxTypes.glPayable": "حساب الأستاذ المستحق",
  "taxTypes.glReceivable": "حساب الأستاذ المدين",
  "taxTypes.inclusive": "شامل الضريبة",
  "taxTypes.new": "نوع ضريبة جديد",
  "taxTypes.rate": "النسبة",
  "taxTypes.recoverable": "قابل للاسترداد",
  "taxTypes.reportingFrequency": "تكرار التقارير",
  "taxTypes.subtitle": "تعريفات ضريبة القيمة المضافة والجمارك والانتقائية والاستقطاع والزكاة",
  "taxTypes.taxAuthority": "الجهة الضريبية",
  "taxTypes.title": "أنواع الضرائب",
  "taxTypes.vat": "ضريبة القيمة المضافة",
  "taxTypes.zakat": "الزكاة",

  // --- taxRates (18) ---
  "taxRates.create": "إنشاء معدل ضريبة",
  "taxRates.default": "افتراضي",
  "taxRates.defaultRates": "المعدلات الافتراضية",
  "taxRates.edit": "تعديل معدل الضريبة",
  "taxRates.effectiveDate": "تاريخ السريان",
  "taxRates.effectiveFrom": "ساري من",
  "taxRates.effectiveTo": "ساري إلى",
  "taxRates.highRates": "معدلات مرتفعة",
  "taxRates.itemCategory": "فئة الصنف",
  "taxRates.maxAmount": "الحد الأقصى للمبلغ",
  "taxRates.minAmount": "الحد الأدنى للمبلغ",
  "taxRates.new": "معدل ضريبة جديد",
  "taxRates.rate": "النسبة (%)",
  "taxRates.region": "المنطقة",
  "taxRates.subtitle": "إدارة معدلات الضرائب وتهيئة ضريبة القيمة المضافة",
  "taxRates.taxType": "نوع الضريبة",
  "taxRates.title": "معدلات الضرائب",
  "taxRates.zeroRates": "معدلات صفرية",

  // --- freeze (14) ---
  "freeze.affectedModules": "الوحدات المتأثرة",
  "freeze.editPeriod": "تعديل فترة التجميد",
  "freeze.endDate": "تاريخ النهاية",
  "freeze.freezeType": "نوع التجميد",
  "freeze.frozen": "مجمّد",
  "freeze.modules": "الوحدات",
  "freeze.noPeriods": "لم يتم العثور على فترات تجميد",
  "freeze.periodName": "اسم الفترة",
  "freeze.periods": "فترات التجميد",
  "freeze.reason": "السبب",
  "freeze.startDate": "تاريخ البداية",
  "freeze.subtitle": "إدارة فترات تجميد البيانات",
  "freeze.title": "إعدادات التجميد",
  "freeze.unfreeze": "إلغاء التجميد",

  // --- master (14) ---
  "master.backupSettings.buttons.backup": "نسخ احتياطي الآن",
  "master.backupSettings.days": "أيام",
  "master.backupSettings.fields.autoBackup": "نسخ احتياطي تلقائي",
  "master.backupSettings.fields.encryption": "التشفير",
  "master.backupSettings.fields.frequency": "تكرار النسخ الاحتياطي",
  "master.backupSettings.fields.lastBackup": "آخر نسخ احتياطي",
  "master.backupSettings.fields.location": "موقع النسخ الاحتياطي",
  "master.backupSettings.fields.retention": "فترة الاحتفاظ",
  "master.backupSettings.messages.backupStarted": "بدأ النسخ الاحتياطي بنجاح",
  "master.backupSettings.messages.updated": "تم تحديث إعدادات النسخ الاحتياطي بنجاح",
  "master.backupSettings.title": "إعدادات النسخ الاحتياطي",
  "master.systemSetup.messages.updated": "تم تحديث إعدادات النظام بنجاح",
  "master.systemSetup.title": "إعداد النظام",
  "master.systemSetup.type": "النوع",

  // --- security (14) ---
  "security.access": "الوصول",
  "security.audit": "التدقيق",
  "security.auditEvents": "أحداث التدقيق",
  "security.ipWhitelist": "قائمة IP المسموحة",
  "security.medium": "متوسط",
  "security.minLength": "الحد الأدنى للطول",
  "security.password": "كلمة المرور",
  "security.requirements": "المتطلبات",
  "security.session": "الجلسة",
  "security.sessionTimeout": "مهلة الجلسة (دقائق)",
  "security.strong": "قوي",
  "security.subtitle": "إدارة سياسات الأمان وكلمات المرور",
  "security.title": "سياسات الأمان",
  "security.weak": "ضعيف",

  // --- approval (12) ---
  "approval.addStep": "إضافة خطوة",
  "approval.approverType": "نوع الموافِق",
  "approval.createFirst": "أنشئ أول سير عمل",
  "approval.createWorkflow": "إنشاء سير عمل",
  "approval.deleteConfirm": "هل أنت متأكد من حذف سير العمل هذا؟",
  "approval.deleteWorkflow": "حذف سير العمل",
  "approval.editStep": "تعديل الخطوة",
  "approval.editWorkflow": "تعديل سير العمل",
  "approval.noWorkflows": "لم يتم العثور على سير عمل",
  "approval.resourceType": "نوع المورد",
  "approval.stepName": "اسم الخطوة",
  "approval.steps": "الخطوات",

  // --- bankAccounts (9) ---
  "bankAccounts.allCurrencies": "جميع العملات",
  "bankAccounts.allTypes": "جميع الأنواع",
  "bankAccounts.cannotDeleteDefault": "لا يمكن حذف الحساب الافتراضي",
  "bankAccounts.invalidIban": "رقم IBAN غير صالح",
  "bankAccounts.new": "حساب بنكي جديد",
  "bankAccounts.overdraftLimit": "حد السحب",
  "bankAccounts.pending": "معلق",
  "bankAccounts.reconciled": "تمت المطابقة",
  "bankAccounts.totalBalance": "إجمالي الرصيد",

  // --- invoiceItems (6) ---
  "invoiceItems.costCenter": "مركز التكلفة",
  "invoiceItems.editItem": "تعديل الصنف",
  "invoiceItems.project": "المشروع",
  "invoiceItems.selectWarehouse": "اختر المستودع",
  "invoiceItems.update": "تحديث",
  "invoiceItems.warehouse": "المستودع",

  // --- menu (6) ---
  "menu.logistics.landedCost.allocation": "توزيع التكلفة المحملة",
  "menu.logistics.landedCost.costTypes": "أنواع تكاليف الشحن",
  "menu.logistics.landedCost.settings": "إعدادات التكلفة المحملة",
  "menu.logistics.shipmentManagement.carrierEvaluations": "تقييمات الناقلين",
  "menu.logistics.shipmentManagement.carrierQuotes": "عروض أسعار الناقلين",
  "menu.logistics.shipmentManagement.shipmentAlerts": "تنبيهات الشحنات",

  // --- reminders (3) ---
  "reminders.addRule": "إضافة قاعدة",
  "reminders.subtitle": "إدارة قواعد التذكير للمدفوعات المعلقة",
  "reminders.title": "تذكيرات الدفع",

  // --- renewals (2) ---
  "renewals.subtitle": "تتبع التراخيص والعقود والاشتراكات",
  "renewals.title": "تنبيهات التجديد",

  // --- validation (1) ---
  "validation.required": "هذا الحقل مطلوب"
};

// Apply patches
let enCount = 0;
Object.entries(missingInEn).forEach(([key, value]) => {
  setNestedValue(en, key, value);
  enCount++;
});

let arCount = 0;
Object.entries(missingInAr).forEach(([key, value]) => {
  setNestedValue(ar, key, value);
  arCount++;
});

// Write back
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + '\n', 'utf8');

console.log(`Patched EN: ${enCount} keys added`);
console.log(`Patched AR: ${arCount} keys added`);
console.log('Done!');
