/**
 * ============================================================================
 * API Configuration Constants — Arabic Specification §14
 * ============================================================================
 * Centralized API configuration per specification §14.1 & §14.2
 *
 * Usage:
 *   import { API_CONFIG, ENDPOINT_PERMISSIONS } from './apiConfig';
 *   const baseUrl = API_CONFIG.baseUrl;
 *   const perm = ENDPOINT_PERMISSIONS['/api/v1/shipments']['GET'];
 * ============================================================================
 */

// ===========================
// §14.1 — General Rules
// ===========================

export const API_CONFIG = {
  /** Base URL for all versioned API endpoints */
  baseUrl: '/api/v1',

  /** Current API version */
  version: 'v1',

  /** Authentication scheme */
  authScheme: 'Bearer',

  /** JWT payload must contain tenant_id for tenant-scoped access */
  jwtRequiredFields: ['sub', 'email', 'tenant_id', 'roles', 'login_context'] as const,

  /** Rate limiting: requests per window */
  rateLimit: {
    /** General API: 1000 requests per minute per tenant */
    api: { windowMs: 60_000, max: 1000 },
    /** Authentication: 50 requests per 15 minutes */
    auth: { windowMs: 15 * 60_000, max: 50 },
    /** Settings: 20 requests per minute */
    settings: { windowMs: 60_000, max: 20 },
    /** Password reset: 3 per hour */
    passwordReset: { windowMs: 60 * 60_000, max: 3 },
    /** Delete operations: 10 per minute per user */
    delete: { windowMs: 60_000, max: 10 },
    /** Bulk updates: 20 per minute per user */
    bulkUpdate: { windowMs: 60_000, max: 20 },
  },

  /** Default pagination */
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },

  /** Standard response format */
  responseFormat: {
    success: 'boolean',
    data: 'T | T[]',
    message: 'string (optional)',
    pagination: '{page, limit, total, totalPages} (for lists)',
  },
} as const;


// ===========================
// §14.2 — Core Endpoints
// ===========================

export interface EndpointDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  descriptionAr: string;
  permission: string | null; // null = public or auth-only
  module: string;
}

/**
 * Core API endpoints as specified in §14.2
 */
export const CORE_ENDPOINTS: EndpointDefinition[] = [
  // ── Authentication (المصادقة) ──────────────────────────────────────
  {
    method: 'POST',
    path: '/api/v1/auth/verify-company',
    description: 'Verify company code before login',
    descriptionAr: 'التحقق من كود الشركة قبل تسجيل الدخول',
    permission: null,
    module: 'auth',
  },
  {
    method: 'POST',
    path: '/api/v1/auth/tenant/login',
    description: 'Tenant user login with JWT',
    descriptionAr: 'تسجيل دخول مستخدم المستأجر مع JWT',
    permission: null,
    module: 'auth',
  },
  {
    method: 'POST',
    path: '/api/v1/auth/refresh',
    description: 'Refresh access token',
    descriptionAr: 'تجديد رمز الوصول',
    permission: null,
    module: 'auth',
  },
  {
    method: 'POST',
    path: '/api/v1/auth/logout',
    description: 'Logout and revoke tokens',
    descriptionAr: 'تسجيل الخروج وإلغاء الرموز',
    permission: null,
    module: 'auth',
  },

  // ── Shipments (الشحنات) ────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/shipments',
    description: 'List all shipments (paginated)',
    descriptionAr: 'عرض جميع الشحنات (مع التقسيم)',
    permission: 'shipments:view',
    module: 'shipments',
  },
  {
    method: 'POST',
    path: '/api/v1/shipments',
    description: 'Create new shipment',
    descriptionAr: 'إنشاء شحنة جديدة',
    permission: 'shipments:create',
    module: 'shipments',
  },
  {
    method: 'PUT',
    path: '/api/v1/shipments/:id',
    description: 'Update shipment',
    descriptionAr: 'تحديث شحنة',
    permission: 'shipments:edit',
    module: 'shipments',
  },
  {
    method: 'DELETE',
    path: '/api/v1/shipments/:id',
    description: 'Delete shipment (soft delete)',
    descriptionAr: 'حذف شحنة (حذف ناعم)',
    permission: 'shipments:delete',
    module: 'shipments',
  },

  // ── Procurement (المشتريات) ────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/procurement',
    description: 'List purchase orders',
    descriptionAr: 'عرض أوامر الشراء',
    permission: 'procurement:view',
    module: 'procurement',
  },
  {
    method: 'POST',
    path: '/api/v1/procurement',
    description: 'Create purchase order',
    descriptionAr: 'إنشاء أمر شراء',
    permission: 'procurement:create',
    module: 'procurement',
  },

  // ── Customs (الجمارك) ──────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/customs-declarations',
    description: 'List customs declarations',
    descriptionAr: 'عرض البيانات الجمركية',
    permission: 'customs:view',
    module: 'customs',
  },
  {
    method: 'POST',
    path: '/api/v1/customs-declarations',
    description: 'Submit customs declaration',
    descriptionAr: 'تقديم بيان جمركي',
    permission: 'customs:submit',
    module: 'customs',
  },

  // ── Accounting (المحاسبة) ──────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/journals',
    description: 'List journal entries',
    descriptionAr: 'عرض القيود المحاسبية',
    permission: 'accounting:view',
    module: 'accounting',
  },
  {
    method: 'POST',
    path: '/api/v1/journals',
    description: 'Create journal entry',
    descriptionAr: 'إنشاء قيد محاسبي',
    permission: 'accounting:create',
    module: 'accounting',
  },

  // ── Admin / Tenants (الإدارة) ─────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/tenants',
    description: 'List all tenants (platform admin)',
    descriptionAr: 'عرض جميع المستأجرين (مدير المنصة)',
    permission: 'platform:tenants',
    module: 'admin',
  },
  {
    method: 'POST',
    path: '/api/v1/tenants',
    description: 'Create new tenant',
    descriptionAr: 'إنشاء مستأجر جديد',
    permission: 'platform:tenants',
    module: 'admin',
  },
];

/**
 * Quick-lookup map: path+method → permission
 * Usage: ENDPOINT_PERMISSIONS['/api/v1/shipments']['GET'] → 'shipments:view'
 */
export const ENDPOINT_PERMISSIONS: Record<string, Record<string, string | null>> = {};
for (const ep of CORE_ENDPOINTS) {
  if (!ENDPOINT_PERMISSIONS[ep.path]) {
    ENDPOINT_PERMISSIONS[ep.path] = {};
  }
  ENDPOINT_PERMISSIONS[ep.path][ep.method] = ep.permission;
}
