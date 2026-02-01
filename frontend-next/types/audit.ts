/**
 * 📋 AUDIT LOG TYPES - أنواع سجل التدقيق
 * =====================================================
 */

/**
 * أنواع الأحداث
 */
export type AuditEventType = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'STATUS_CHANGE'
  | 'EXPORT'
  | 'IMPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'POST'
  | 'REVERSE'
  | 'VOID';

/**
 * أنواع الموارد
 */
export type AuditResource = 
  | 'user'
  | 'role'
  | 'company'
  | 'branch'
  | 'shipment'
  | 'expense'
  | 'journal'
  | 'account'
  | 'item'
  | 'customer'
  | 'vendor'
  | 'supplier'
  | 'warehouse'
  | 'fiscal_year'
  | 'period'
  | 'setting'
  | 'system';

/**
 * سجل التدقيق
 */
export interface AuditLog {
  id: string;
  /** نوع الحدث */
  eventType: AuditEventType;
  /** نوع المورد */
  resource: AuditResource;
  /** معرّف المورد */
  resourceId: string;
  /** اسم المورد (للعرض) */
  resourceName?: string;
  /** معرّف المستخدم */
  userId: string;
  /** اسم المستخدم */
  userName: string;
  /** البريد الإلكتروني */
  userEmail?: string;
  /** معرّف الشركة */
  companyId?: string;
  /** اسم الشركة */
  companyName?: string;
  /** معرّف الفرع */
  branchId?: string;
  /** اسم الفرع */
  branchName?: string;
  /** وقت الحدث */
  timestamp: string;
  /** عنوان IP */
  ipAddress?: string;
  /** User Agent */
  userAgent?: string;
  /** البيانات القديمة */
  oldValues?: Record<string, any>;
  /** البيانات الجديدة */
  newValues?: Record<string, any>;
  /** التغييرات (ملخص) */
  changes?: AuditChange[];
  /** ملاحظات إضافية */
  notes?: string;
  /** حالة النجاح */
  success: boolean;
  /** رسالة الخطأ (إذا فشل) */
  errorMessage?: string;
}

/**
 * تفاصيل التغيير
 */
export interface AuditChange {
  field: string;
  fieldLabel?: string;
  oldValue: any;
  newValue: any;
}

/**
 * فلاتر البحث
 */
export interface AuditLogFilters {
  eventType?: AuditEventType;
  resource?: AuditResource;
  userId?: string;
  companyId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  success?: boolean;
}

/**
 * نتيجة البحث
 */
export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * خيارات التصدير
 */
export interface AuditExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filters?: AuditLogFilters;
  columns?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

/**
 * إحصائيات سجل التدقيق
 */
export interface AuditStats {
  totalEvents: number;
  todayEvents: number;
  weekEvents: number;
  monthEvents: number;
  topUsers: {
    userId: string;
    userName: string;
    count: number;
  }[];
  topResources: {
    resource: AuditResource;
    count: number;
  }[];
  eventsByType: {
    eventType: AuditEventType;
    count: number;
  }[];
}
