import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Cog6ToothIcon, KeyIcon, PaperAirplaneIcon, BellAlertIcon, ClipboardDocumentListIcon,
  PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon,
  ArrowPathIcon, ShieldCheckIcon, SignalIcon,
} from '@heroicons/react/24/outline';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function apiFetch(path: string, opts?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface ZatcaConfig {
  id: number;
  config_key: string;
  config_value: string;
  config_type: string;
  category: string;
  description: string;
  description_ar: string;
  is_sensitive: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TAB_CATEGORIES: Record<string, string[]> = {
  setup: ['general', 'business'],
  certificates: ['certificates', 'security'],
  submission: ['submission', 'policy'],
  alerts: ['alerts', 'notifications'],
  logs: [],
};

const TABS = [
  { key: 'setup', icon: Cog6ToothIcon, en: 'Basic Setup', ar: 'الإعداد الأساسي' },
  { key: 'certificates', icon: KeyIcon, en: 'Certificates', ar: 'الشهادات' },
  { key: 'submission', icon: PaperAirplaneIcon, en: 'Submission Policy', ar: 'سياسة الإرسال' },
  { key: 'alerts', icon: BellAlertIcon, en: 'Alerts', ar: 'التنبيهات' },
  { key: 'logs', icon: ClipboardDocumentListIcon, en: 'Submission Log', ar: 'سجل الإرسال' },
];

const CONFIG_TEMPLATES: Record<string, { key: string; type: string; category: string; desc: string; desc_ar: string; sensitive?: boolean }[]> = {
  setup: [
    { key: 'vat_number', type: 'string', category: 'general', desc: 'VAT Registration Number (15 digits)', desc_ar: 'رقم التسجيل الضريبي (15 رقم)' },
    { key: 'business_name_ar', type: 'string', category: 'general', desc: 'Business Name (Arabic)', desc_ar: 'الاسم التجاري (عربي)' },
    { key: 'business_name_en', type: 'string', category: 'general', desc: 'Business Name (English)', desc_ar: 'الاسم التجاري (إنجليزي)' },
    { key: 'business_category', type: 'string', category: 'business', desc: 'Business Category', desc_ar: 'نوع النشاط' },
    { key: 'environment', type: 'string', category: 'general', desc: 'Environment: sandbox | production', desc_ar: 'البيئة: تجريبية | إنتاجية' },
    { key: 'api_base_url', type: 'string', category: 'general', desc: 'ZATCA API Base URL', desc_ar: 'رابط واجهة ZATCA الأساسي' },
  ],
  certificates: [
    { key: 'ccsid_certificate', type: 'string', category: 'certificates', desc: 'CCSID Certificate (Base64)', desc_ar: 'شهادة CCSID', sensitive: true },
    { key: 'pcsid_certificate', type: 'string', category: 'certificates', desc: 'PCSID Certificate (Base64)', desc_ar: 'شهادة PCSID', sensitive: true },
    { key: 'ccsid_expiry', type: 'string', category: 'certificates', desc: 'CCSID Expiry Date', desc_ar: 'تاريخ انتهاء CCSID' },
    { key: 'pcsid_expiry', type: 'string', category: 'certificates', desc: 'PCSID Expiry Date', desc_ar: 'تاريخ انتهاء PCSID' },
    { key: 'private_key', type: 'string', category: 'security', desc: 'Private Key (encrypted)', desc_ar: 'المفتاح الخاص', sensitive: true },
  ],
  submission: [
    { key: 'submission_mode', type: 'string', category: 'submission', desc: 'Mode: auto | manual | scheduled', desc_ar: 'وضع الإرسال' },
    { key: 'submission_delay_seconds', type: 'number', category: 'submission', desc: 'Auto-submit delay (seconds)', desc_ar: 'تأخير الإرسال التلقائي (ثانية)' },
    { key: 'batch_size', type: 'number', category: 'policy', desc: 'Max invoices per batch', desc_ar: 'الحد الأقصى للفواتير في الدفعة' },
    { key: 'retry_count', type: 'number', category: 'policy', desc: 'Retry count on failure', desc_ar: 'عدد المحاولات عند الفشل' },
  ],
  alerts: [
    { key: 'error_notification_email', type: 'string', category: 'alerts', desc: 'Error notification email', desc_ar: 'بريد إشعار الأخطاء' },
    { key: 'cert_expiry_warning_days', type: 'number', category: 'alerts', desc: 'Cert expiry warning (days)', desc_ar: 'تنبيه انتهاء الشهادة (أيام)' },
    { key: 'enable_error_notifications', type: 'boolean', category: 'alerts', desc: 'Enable error notifications', desc_ar: 'تفعيل إشعارات الأخطاء' },
    { key: 'enable_success_notifications', type: 'boolean', category: 'alerts', desc: 'Enable success notifications', desc_ar: 'تفعيل إشعارات النجاح' },
  ],
};

export default function ZatcaSettingsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();
  const canView = hasAnyPermission(['system_policies:view' as any]);
  const canManage = hasAnyPermission(['system_policies:edit' as any, 'system_policies:create' as any]);

  const [activeTab, setActiveTab] = useState('setup');
  const [configs, setConfigs] = useState<ZatcaConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ZatcaConfig | null>(null);
  const [formData, setFormData] = useState({ config_key: '', config_value: '', config_type: 'string', category: 'general', description: '', description_ar: '', is_sensitive: false, is_active: true });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/zatca/config');
      setConfigs(res.data || []);
    } catch {
      showToast(locale === 'ar' ? 'فشل تحميل الإعدادات' : 'Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [locale, showToast]);

  const fetchSubmissions = useCallback(async () => {
    setSubsLoading(true);
    try {
      const res = await apiFetch('/api/zatca?limit=20');
      setSubmissions(res.data || []);
    } catch {
      setSubmissions([]);
    } finally {
      setSubsLoading(false);
    }
  }, []);

  useEffect(() => { if (canView) fetchConfigs(); }, [canView, fetchConfigs]);
  useEffect(() => { if (activeTab === 'logs' && canView) fetchSubmissions(); }, [activeTab, canView, fetchSubmissions]);

  const getTabConfigs = (tabKey: string) => {
    const cats = TAB_CATEGORIES[tabKey] || [];
    return configs.filter(c => cats.includes(c.category));
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');
    try {
      await apiFetch('/api/zatca/config/test-connection', { method: 'POST' });
      setConnectionStatus('success');
      showToast(locale === 'ar' ? 'الاتصال ناجح' : 'Connection successful', 'success');
    } catch {
      setConnectionStatus('error');
      showToast(locale === 'ar' ? 'فشل الاتصال' : 'Connection failed', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const openCreate = (template?: typeof CONFIG_TEMPLATES['setup'][0]) => {
    setEditingConfig(null);
    setFormData({
      config_key: template?.key || '',
      config_value: '',
      config_type: template?.type || 'string',
      category: template?.category || TAB_CATEGORIES[activeTab]?.[0] || 'general',
      description: template?.desc || '',
      description_ar: template?.desc_ar || '',
      is_sensitive: template?.sensitive || false,
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (cfg: ZatcaConfig) => {
    setEditingConfig(cfg);
    setFormData({
      config_key: cfg.config_key,
      config_value: cfg.is_sensitive ? '' : cfg.config_value,
      config_type: cfg.config_type,
      category: cfg.category,
      description: cfg.description || '',
      description_ar: cfg.description_ar || '',
      is_sensitive: cfg.is_sensitive,
      is_active: cfg.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.config_key.trim()) {
      showToast(locale === 'ar' ? 'المفتاح مطلوب' : 'Key is required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingConfig) {
        const body: any = { ...formData };
        if (formData.is_sensitive && !formData.config_value) delete body.config_value;
        await apiFetch(`/api/zatca/config/${editingConfig.id}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast(locale === 'ar' ? 'تم التحديث' : 'Updated', 'success');
      } else {
        await apiFetch('/api/zatca/config', { method: 'POST', body: JSON.stringify(formData) });
        showToast(locale === 'ar' ? 'تم الإنشاء' : 'Created', 'success');
      }
      setShowModal(false);
      fetchConfigs();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await apiFetch(`/api/zatca/config/${deletingId}`, { method: 'DELETE' });
      showToast(locale === 'ar' ? 'تم الحذف' : 'Deleted', 'success');
      setDeletingId(null);
      fetchConfigs();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    }
  };

  const envConfig = configs.find(c => c.config_key === 'environment');
  const isProduction = envConfig?.config_value === 'production';
  const vatConfig = configs.find(c => c.config_key === 'vat_number');
  const ccsidExpiry = configs.find(c => c.config_key === 'ccsid_expiry');
  const pcsidExpiry = configs.find(c => c.config_key === 'pcsid_expiry');

  const daysToCertExpiry = (dateStr?: string) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  };

  const ccsidDays = daysToCertExpiry(ccsidExpiry?.config_value);
  const pcsidDays = daysToCertExpiry(pcsidExpiry?.config_value);

  if (!canView) {
    return (
      <MainLayout>
        <Head><title>ZATCA Settings - SLMS</title></Head>
        <div className="text-center py-12">
          <ShieldCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  const tabConfigs = getTabConfigs(activeTab);
  const templates = CONFIG_TEMPLATES[activeTab] || [];
  const missingTemplates = templates.filter(tmpl => !configs.find(c => c.config_key === tmpl.key));

  return (
    <MainLayout>
      <Head><title>ZATCA Settings - SLMS</title></Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ShieldCheckIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'إعدادات ZATCA — الفوترة الإلكترونية' : 'ZATCA Settings — E-Invoicing'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'Phase 2 • هيئة الزكاة والضريبة والجمارك' : 'Phase 2 • Zakat, Tax & Customs Authority'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {envConfig && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${isProduction ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                {isProduction ? 'PRODUCTION' : 'SANDBOX'}
              </span>
            )}
            {vatConfig?.config_value && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                VAT: {vatConfig.config_value}
              </span>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'إجمالي الإعدادات' : 'Total Settings'}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{configs.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'حالة الاتصال' : 'Connection'}</div>
            <div className="flex items-center gap-2">
              {connectionStatus === 'success' && <CheckCircleIcon className="h-5 w-5 text-emerald-500" />}
              {connectionStatus === 'error' && <XCircleIcon className="h-5 w-5 text-red-500" />}
              {connectionStatus === 'idle' && <SignalIcon className="h-5 w-5 text-gray-400" />}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {connectionStatus === 'success' ? (locale === 'ar' ? 'متصل' : 'Connected') :
                 connectionStatus === 'error' ? (locale === 'ar' ? 'غير متصل' : 'Failed') :
                 (locale === 'ar' ? 'لم يُختبر' : 'Not tested')}
              </span>
            </div>
          </div>
          {[{ label: 'CCSID', days: ccsidDays }, { label: 'PCSID', days: pcsidDays }].map(cert => (
            <div key={cert.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{cert.label} {locale === 'ar' ? 'الشهادة' : 'Cert'}</div>
              {cert.days !== null ? (
                <div className={`text-sm font-medium ${(cert.days ?? 0) < 30 ? 'text-red-600' : (cert.days ?? 0) < 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {(cert.days ?? 0) > 0 ? `${cert.days} ${locale === 'ar' ? 'يوم' : 'days'}` : (locale === 'ar' ? 'منتهية!' : 'Expired!')}
                </div>
              ) : <div className="text-sm text-gray-400">{locale === 'ar' ? 'غير مُعدَّ' : 'Not set'}</div>}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3">
          <Button onClick={testConnection} loading={testingConnection} variant="secondary">
            <SignalIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'اختبار الاتصال' : 'Test Connection'}
          </Button>
          <Button onClick={fetchConfigs} variant="secondary">
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Tab bar + content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                           : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  <Icon className="h-4 w-4" />
                  {locale === 'ar' ? tab.ar : tab.en}
                  {tab.key !== 'logs' && (
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-1.5 py-0.5 rounded-full">
                      {getTabConfigs(tab.key).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-4">
            {activeTab !== 'logs' ? (
              <>
                {/* Missing templates */}
                {missingTemplates.length > 0 && canManage && (
                  <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        {locale === 'ar' ? `${missingTemplates.length} إعدادات مفقودة` : `${missingTemplates.length} missing settings`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {missingTemplates.map(tmpl => (
                        <button key={tmpl.key} onClick={() => openCreate(tmpl)}
                          className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-800/40 dark:hover:bg-amber-800/60 text-amber-800 dark:text-amber-200 rounded transition-colors">
                          + {tmpl.key}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {canManage && (
                  <div className="flex justify-end mb-4">
                    <Button size="sm" onClick={() => openCreate()}>
                      <PlusIcon className="h-4 w-4 mr-1" />
                      {locale === 'ar' ? 'إضافة إعداد' : 'Add Setting'}
                    </Button>
                  </div>
                )}

                {loading ? (
                  <div className="py-12 text-center text-gray-500">{locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
                ) : tabConfigs.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <Cog6ToothIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>{locale === 'ar' ? 'لا توجد إعدادات لهذا القسم' : 'No settings in this section'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tabConfigs.map(cfg => (
                      <div key={cfg.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-sm font-mono font-medium text-gray-900 dark:text-white">{cfg.config_key}</code>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${cfg.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'}`}>
                              {cfg.is_active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'معطل' : 'Inactive')}
                            </span>
                            {cfg.is_sensitive && (
                              <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                <KeyIcon className="h-3 w-3 inline" /> {locale === 'ar' ? 'حساس' : 'Sensitive'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {locale === 'ar' ? cfg.description_ar || cfg.description : cfg.description || cfg.description_ar}
                          </p>
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-mono mt-1 block">
                            {cfg.is_sensitive ? '••••••••' : (cfg.config_value || '—')}
                          </span>
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-1 ml-3 shrink-0">
                            <button onClick={() => openEdit(cfg)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                              <PencilIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button onClick={() => setDeletingId(cfg.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Submission Log */
              subsLoading ? (
                <div className="py-12 text-center text-gray-500">{locale === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</div>
              ) : submissions.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>{locale === 'ar' ? 'لا يوجد سجل إرسال' : 'No submissions yet'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {[locale === 'ar' ? 'الفاتورة' : 'Invoice', locale === 'ar' ? 'النوع' : 'Type', locale === 'ar' ? 'الحالة' : 'Status', locale === 'ar' ? 'التاريخ' : 'Date', 'Clearance ID'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {submissions.map((s: any) => (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{s.invoice_number || s.id}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{s.document_type || '—'}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.status === 'ACCEPTED' ? 'bg-emerald-600 text-white' :
                              s.status === 'WARNING' ? 'bg-amber-500 text-white' :
                              s.status === 'REJECTED' ? 'bg-red-600 text-white' :
                              'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'}`}>
                              {s.status || 'PENDING'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 font-mono">{s.clearance_id || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingConfig ? (locale === 'ar' ? 'تعديل إعداد' : 'Edit Setting') : (locale === 'ar' ? 'إضافة إعداد' : 'Add Setting')} size="md">
        <div className="space-y-4">
          <Input label={locale === 'ar' ? 'المفتاح' : 'Config Key'} value={formData.config_key}
            onChange={(e: any) => setFormData({ ...formData, config_key: e.target.value })} disabled={!!editingConfig} />
          {formData.is_sensitive && editingConfig && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {locale === 'ar' ? 'اترك فارغاً للاحتفاظ بالقيمة الحالية' : 'Leave empty to keep current value'}
            </p>
          )}
          {formData.config_type === 'boolean' ? (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.config_value === 'true'}
                onChange={e => setFormData({ ...formData, config_value: String(e.target.checked) })} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'القيمة' : 'Value'}</span>
            </label>
          ) : (
            <Input label={locale === 'ar' ? 'القيمة' : 'Value'} value={formData.config_value}
              onChange={(e: any) => setFormData({ ...formData, config_value: e.target.value })}
              type={formData.config_type === 'number' ? 'number' : formData.is_sensitive ? 'password' : 'text'} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select value={formData.config_type} onChange={e => setFormData({ ...formData, config_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الفئة' : 'Category'}</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {['general','business','certificates','security','submission','policy','alerts','notifications'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <Input label={locale === 'ar' ? 'الوصف (EN)' : 'Description (EN)'} value={formData.description}
            onChange={(e: any) => setFormData({ ...formData, description: e.target.value })} />
          <Input label={locale === 'ar' ? 'الوصف (AR)' : 'Description (AR)'} value={formData.description_ar}
            onChange={(e: any) => setFormData({ ...formData, description_ar: e.target.value })} />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.is_sensitive} onChange={e => setFormData({ ...formData, is_sensitive: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'حساس' : 'Sensitive'}</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'نشط' : 'Active'}</span>
            </label>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSave} loading={saving}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف الإعداد' : 'Delete Setting'}
        message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا الإعداد؟' : 'Are you sure you want to delete this setting?'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'} cancelText={locale === 'ar' ? 'إلغاء' : 'Cancel'} variant="danger" />
    </MainLayout>
  );
}
