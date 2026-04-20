/**
 * ============================================================================
 * MODULES MANAGEMENT - Enable/Disable Platform Modules
 * ============================================================================
 * 3-column grid with emoji icons, toggle switches, version info,
 * warning banner for platform-wide changes.
 *
 * @module pages/admin/modules
 * @version 2.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/useToast';
import {
  CubeIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

/* ── Types ── */
interface Module {
  id: number;
  name: string;
  name_ar?: string;
  key: string;
  description?: string;
  description_ar?: string;
  icon?: string;
  version?: string;
  enabled: boolean;
  category?: string;
  is_core?: boolean;
  tenant_count?: number;
}

/* ── Module Icons ── */
const MODULE_ICONS: Record<string, string> = {
  shipments: '🚢',
  customs: '📋',
  expenses: '💳',
  warehouses: '🏪',
  suppliers: '📦',
  reports: '📊',
  invoicing: '🧾',
  crm: '🤝',
  hr: '👥',
  fleet: '🚛',
  analytics: '📈',
  notifications: '🔔',
  api: '🔗',
  backup: '💾',
  audit: '📝',
  sms: '📱',
};

/* ── Category Colors ── */
const CATEGORY_COLORS: Record<string, string> = {
  core: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
  operations: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
  finance: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  integration: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
  system: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-700/50',
};

export default function ModulesPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isRTL = locale === 'ar';

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<Module | null>(null);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { setLoading(false); return; }
      const res = await fetch('http://localhost:4000/api/modules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setModules(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
    } catch {
      // Use demo data if API not ready
      setModules([
        { id: 1, name: 'Shipments', name_ar: 'الشحنات', key: 'shipments', description: 'Manage shipments and tracking', description_ar: 'إدارة الشحنات والتتبع', version: '2.1.0', enabled: true, category: 'core', is_core: true, tenant_count: 12 },
        { id: 2, name: 'Customs', name_ar: 'الجمارك', key: 'customs', description: 'Customs clearance management', description_ar: 'إدارة التخليص الجمركي', version: '1.5.0', enabled: true, category: 'operations', is_core: false, tenant_count: 10 },
        { id: 3, name: 'Expenses', name_ar: 'المصروفات', key: 'expenses', description: 'Track and manage expenses', description_ar: 'تتبع وإدارة المصروفات', version: '1.8.0', enabled: true, category: 'finance', is_core: false, tenant_count: 14 },
        { id: 4, name: 'Warehouses', name_ar: 'المستودعات', key: 'warehouses', description: 'Warehouse management system', description_ar: 'نظام إدارة المستودعات', version: '1.2.0', enabled: true, category: 'operations', is_core: false, tenant_count: 8 },
        { id: 5, name: 'Suppliers', name_ar: 'الموردين', key: 'suppliers', description: 'Supplier management', description_ar: 'إدارة الموردين', version: '1.0.0', enabled: true, category: 'operations', is_core: false, tenant_count: 11 },
        { id: 6, name: 'Reports', name_ar: 'التقارير', key: 'reports', description: 'Advanced reporting and analytics', description_ar: 'التقارير والتحليلات المتقدمة', version: '2.0.0', enabled: true, category: 'core', is_core: true, tenant_count: 14 },
        { id: 7, name: 'Invoicing', name_ar: 'الفوترة', key: 'invoicing', description: 'Invoice management system', description_ar: 'نظام إدارة الفواتير', version: '1.3.0', enabled: false, category: 'finance', is_core: false, tenant_count: 0 },
        { id: 8, name: 'CRM', name_ar: 'إدارة العملاء', key: 'crm', description: 'Customer relationship management', description_ar: 'إدارة علاقات العملاء', version: '0.9.0', enabled: false, category: 'operations', is_core: false, tenant_count: 0 },
        { id: 9, name: 'Fleet', name_ar: 'الأسطول', key: 'fleet', description: 'Fleet and vehicle management', description_ar: 'إدارة الأسطول والمركبات', version: '0.5.0', enabled: false, category: 'operations', is_core: false, tenant_count: 0 },
        { id: 10, name: 'SMS Gateway', name_ar: 'بوابة الرسائل', key: 'sms', description: 'SMS notifications gateway', description_ar: 'بوابة إشعارات الرسائل النصية', version: '1.0.0', enabled: true, category: 'integration', is_core: false, tenant_count: 6 },
        { id: 11, name: 'API Gateway', name_ar: 'بوابة API', key: 'api', description: 'Public API for integrations', description_ar: 'واجهة برمجة عامة للتكاملات', version: '1.1.0', enabled: true, category: 'integration', is_core: false, tenant_count: 3 },
        { id: 12, name: 'Auto Backup', name_ar: 'النسخ الاحتياطي', key: 'backup', description: 'Automatic backup system', description_ar: 'نظام النسخ الاحتياطي التلقائي', version: '1.0.0', enabled: true, category: 'system', is_core: true, tenant_count: 14 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const handleToggle = (mod: Module) => {
    if (mod.is_core && mod.enabled) {
      showToast('error', isRTL ? 'لا يمكن تعطيل وحدة أساسية' : 'Cannot disable a core module');
      return;
    }
    setPendingToggle(mod);
    setShowWarning(true);
  };

  const confirmToggle = async () => {
    if (!pendingToggle) return;
    setToggleLoading(pendingToggle.id);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/modules/${pendingToggle.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !pendingToggle.enabled }),
      });
      if (!res.ok) throw new Error('API failed');
      // Only update local state AFTER confirmed API success
      setModules(prev => prev.map(m => m.id === pendingToggle.id ? { ...m, enabled: !m.enabled } : m));
      showToast('success', isRTL ? '✅ تم تحديث حالة الوحدة' : '✅ Module status updated');
    } catch {
      showToast('error', isRTL
        ? `❌ فشل في ${pendingToggle.enabled ? 'تعطيل' : 'تفعيل'} الوحدة — لم يتم التطبيق على حسابات العملاء`
        : `❌ Failed to ${pendingToggle.enabled ? 'disable' : 'enable'} module — not applied to tenant accounts`);
    } finally {
      setToggleLoading(null);
      setShowWarning(false);
      setPendingToggle(null);
    }
  };

  const filtered = search
    ? modules.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.name_ar?.includes(search) ||
        m.key.toLowerCase().includes(search.toLowerCase()))
    : modules;
  const enabledCount = modules.filter(m => m.enabled).length;

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'الوحدات' : 'Modules'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              🧩 {isRTL ? 'إدارة الوحدات' : 'Module Management'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRTL ? `${enabledCount} من ${modules.length} وحدات مفعّلة` : `${enabledCount} of ${modules.length} modules enabled`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isRTL ? 'بحث...' : 'Search...'}
                className="pl-9 rtl:pr-9 rtl:pl-3 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56"
              />
            </div>
            <button
              onClick={fetchModules}
              className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title={isRTL ? 'تحديث' : 'Refresh'}
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {isRTL
              ? '⚠️ تعطيل وحدة على مستوى المنصة يؤثر على جميع العملاء. الوحدات الأساسية لا يمكن تعطيلها.'
              : '⚠️ Disabling a module platform-wide affects all customers. Core modules cannot be disabled.'}
          </p>
        </div>

        {/* Module Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded-xl" />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 rounded-full" />
                </div>
                <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-48" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(mod => {
              const icon = MODULE_ICONS[mod.key] || mod.icon || '📦';
              const catColor = CATEGORY_COLORS[mod.category || 'system'] || CATEGORY_COLORS.system;
              return (
                <div
                  key={mod.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl border transition-all ${
                    mod.enabled
                      ? 'border-gray-200 dark:border-slate-700 border-t-4 border-t-blue-500 hover:shadow-md'
                      : 'border-gray-200 dark:border-slate-700 opacity-70'
                  } p-5 relative`}
                >
                  {mod.is_core && (
                    <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded font-bold">
                        CORE
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-3xl">{icon}</div>
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(mod)}
                      disabled={toggleLoading === mod.id || (mod.is_core && mod.enabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        mod.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
                      } ${(mod.is_core && mod.enabled) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`absolute top-0.5 ${mod.enabled ? 'right-0.5 rtl:left-0.5 rtl:right-auto' : 'left-0.5 rtl:right-0.5 rtl:left-auto'} w-5 h-5 bg-white rounded-full shadow transition-transform`} />
                    </button>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                    {isRTL ? (mod.name_ar || mod.name) : mod.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {isRTL ? (mod.description_ar || mod.description) : mod.description}
                  </p>
                  {/* Disabled Alert (QA 04-05) */}
                  {!mod.enabled && (
                    <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-[11px] font-semibold text-red-700 dark:text-red-400">
                        {isRTL ? '🚫 هذه الوحدة معطّلة — العملاء لا يرونها' : '🚫 This module is disabled — tenants cannot see it'}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${catColor}`}>
                      {mod.category || 'system'}
                    </span>
                    <div className="flex items-center gap-2">
                      {mod.tenant_count !== undefined && mod.tenant_count > 0 && (
                        <span className="text-[10px] text-gray-400">
                          👥 {mod.tenant_count}
                        </span>
                      )}
                      {mod.version && (
                        <span className="text-[10px] font-mono text-gray-400">
                          v{mod.version}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Warning Confirmation Modal ── */}
      {showWarning && pendingToggle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowWarning(false); setPendingToggle(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-3xl mb-3">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {pendingToggle.enabled
                  ? (isRTL ? 'تعطيل الوحدة' : 'Disable Module')
                  : (isRTL ? 'تفعيل الوحدة' : 'Enable Module')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {pendingToggle.enabled
                  ? (isRTL
                      ? `سيؤدي هذا إلى تعطيل "${pendingToggle.name_ar || pendingToggle.name}" لجميع المستأجرين${pendingToggle.tenant_count ? ` (${pendingToggle.tenant_count} مستأجر)` : ''}`
                      : `This will disable "${pendingToggle.name}" for ALL tenants${pendingToggle.tenant_count ? ` (${pendingToggle.tenant_count} tenants affected)` : ''}`)
                  : (isRTL
                      ? `سيؤدي هذا إلى تفعيل "${pendingToggle.name_ar || pendingToggle.name}" لجميع المستأجرين`
                      : `This will enable "${pendingToggle.name}" for ALL tenants`)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowWarning(false); setPendingToggle(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmToggle}
                disabled={toggleLoading === pendingToggle.id}
                className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
                  pendingToggle.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {toggleLoading === pendingToggle.id ? '...' : (pendingToggle.enabled
                  ? (isRTL ? 'تعطيل' : 'Disable')
                  : (isRTL ? 'تفعيل' : 'Enable'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
