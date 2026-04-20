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
import { MenuPermissions } from '../../config/menu.permissions';
import {
  ShieldCheckIcon, PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
  CalendarDaysIcon, DocumentTextIcon, ChartBarIcon,
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

interface Exemption {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  notes_en?: string;
  notes_ar?: string;
  is_active: boolean;
  exemption_type: string | null;
  exemption_number: string | null;
  rate_percent: number | null;
  exemption_level: string | null;
  hs_codes: string | null;
  country_id: number | null;
  country_name_en?: string;
  country_name_ar?: string;
  fta_agreement: string | null;
  beneficiary: string | null;
  effective_from: string | null;
  effective_to: string | null;
  max_quantity: number | null;
  max_value: number | null;
  decision_number: string | null;
  description: string | null;
  description_ar: string | null;
}

const EXEMPTION_TYPES = [
  { value: 'full', en: 'Full', ar: 'كامل', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'partial', en: 'Partial', ar: 'جزئي', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'conditional', en: 'Conditional', ar: 'مشروط', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
];

const EXEMPTION_LEVELS = [
  { value: 'national', en: 'National', ar: 'وطني' },
  { value: 'regional', en: 'Regional', ar: 'إقليمي' },
  { value: 'bilateral', en: 'Bilateral', ar: 'ثنائي' },
  { value: 'multilateral', en: 'Multilateral', ar: 'متعدد الأطراف' },
];

const emptyForm = {
  code: '', name_en: '', name_ar: '', notes_en: '', notes_ar: '', is_active: true,
  exemption_type: '', exemption_number: '', rate_percent: '', exemption_level: '',
  hs_codes: '', country_id: '', fta_agreement: '', beneficiary: '',
  effective_from: '', effective_to: '', max_quantity: '', max_value: '',
  decision_number: '', description: '', description_ar: '',
};

export default function CustomsExemptionsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();
  const isAr = locale === 'ar';

  const canView = hasAnyPermission([MenuPermissions.Logistics.CustomsExemptions.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Logistics.CustomsExemptions.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Logistics.CustomsExemptions.Edit]);
  const canDelete = hasAnyPermission([MenuPermissions.Logistics.CustomsExemptions.Delete]);

  const [items, setItems] = useState<Exemption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Exemption | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await apiFetch(`/api/customs-exemptions?${params}`);
      setItems(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalItems(res.pagination?.totalItems || 0);
    } catch {
      showToast(isAr ? 'فشل التحميل' : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, isAr, showToast]);

  useEffect(() => {
    if (!canView) return;
    const t = setTimeout(fetchItems, 300);
    return () => clearTimeout(t);
  }, [canView, fetchItems]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (item: Exemption) => {
    setEditing(item);
    setForm({
      code: item.code, name_en: item.name_en, name_ar: item.name_ar,
      notes_en: item.notes_en || '', notes_ar: item.notes_ar || '', is_active: item.is_active,
      exemption_type: item.exemption_type || '', exemption_number: item.exemption_number || '',
      rate_percent: item.rate_percent != null ? String(item.rate_percent) : '',
      exemption_level: item.exemption_level || '', hs_codes: item.hs_codes || '',
      country_id: item.country_id ? String(item.country_id) : '',
      fta_agreement: item.fta_agreement || '', beneficiary: item.beneficiary || '',
      effective_from: item.effective_from || '', effective_to: item.effective_to || '',
      max_quantity: item.max_quantity != null ? String(item.max_quantity) : '',
      max_value: item.max_value != null ? String(item.max_value) : '',
      decision_number: item.decision_number || '',
      description: item.description || '', description_ar: item.description_ar || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name_en.trim() || !form.name_ar.trim()) {
      showToast(isAr ? 'اكمل الحقول المطلوبة' : 'Fill required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        code: form.code.trim(), name_en: form.name_en.trim(), name_ar: form.name_ar.trim(),
        notes_en: form.notes_en || null, notes_ar: form.notes_ar || null, is_active: form.is_active,
        exemption_type: form.exemption_type || null, exemption_number: form.exemption_number || null,
        rate_percent: form.rate_percent ? parseFloat(form.rate_percent) : null,
        exemption_level: form.exemption_level || null, hs_codes: form.hs_codes || null,
        country_id: form.country_id ? parseInt(form.country_id) : null,
        fta_agreement: form.fta_agreement || null, beneficiary: form.beneficiary || null,
        effective_from: form.effective_from || null, effective_to: form.effective_to || null,
        max_quantity: form.max_quantity ? parseFloat(form.max_quantity) : null,
        max_value: form.max_value ? parseFloat(form.max_value) : null,
        decision_number: form.decision_number || null,
        description: form.description || null, description_ar: form.description_ar || null,
      };
      if (editing) {
        await apiFetch(`/api/customs-exemptions/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast(isAr ? 'تم التحديث' : 'Updated', 'success');
      } else {
        await apiFetch('/api/customs-exemptions', { method: 'POST', body: JSON.stringify(body) });
        showToast(isAr ? 'تم الإنشاء' : 'Created', 'success');
      }
      setShowModal(false);
      fetchItems();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await apiFetch(`/api/customs-exemptions/${deletingId}`, { method: 'DELETE' });
      showToast(isAr ? 'تم الحذف' : 'Deleted', 'success');
      setDeletingId(null);
      fetchItems();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    }
  };

  const getTypeInfo = (type: string | null) => EXEMPTION_TYPES.find(t => t.value === type);

  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{isAr ? 'الإعفاءات الجمركية' : 'Customs Exemptions'} - SLMS</title></Head>
        <div className="text-center py-12">
          <ShieldCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{isAr ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  // Quick stats
  const fullCount = items.filter(i => i.exemption_type === 'full').length;
  const partialCount = items.filter(i => i.exemption_type === 'partial').length;
  const activeCount = items.filter(i => i.is_active).length;

  return (
    <MainLayout>
      <Head><title>{isAr ? 'الإعفاءات الجمركية' : 'Customs Exemptions'} - SLMS</title></Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <ShieldCheckIcon className="h-7 w-7 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isAr ? 'الإعفاءات الجمركية' : 'Customs Exemptions'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isAr ? 'إعفاءات كاملة وجزئية ومشروطة' : 'Full, partial, and conditional exemptions'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4 mr-1" />
              {isAr ? 'إضافة إعفاء' : 'Add Exemption'}
            </Button>
          )}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: isAr ? 'الإجمالي' : 'Total', value: totalItems, color: 'text-gray-700' },
            { label: isAr ? 'نشط' : 'Active', value: activeCount, color: 'text-emerald-600' },
            { label: isAr ? 'كامل' : 'Full', value: fullCount, color: 'text-emerald-600' },
            { label: isAr ? 'جزئي' : 'Partial', value: partialCount, color: 'text-amber-600' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</div>
              <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder={isAr ? 'بحث...' : 'Search...'} value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-500">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{isAr ? 'لا توجد إعفاءات' : 'No exemptions found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {[isAr ? 'الكود' : 'Code', isAr ? 'الاسم' : 'Name', isAr ? 'النوع' : 'Type', isAr ? 'المعدل' : 'Rate', isAr ? 'المستوى' : 'Level', isAr ? 'FTA' : 'FTA', isAr ? 'الفترة' : 'Period', isAr ? 'الحالة' : 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map(item => {
                    const typeInfo = getTypeInfo(item.exemption_type);
                    const levelInfo = EXEMPTION_LEVELS.find(l => l.value === item.exemption_level);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-white">{item.code}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{isAr ? item.name_ar : item.name_en}</div>
                          {item.beneficiary && <div className="text-xs text-gray-500">{item.beneficiary}</div>}
                        </td>
                        <td className="px-4 py-3">
                          {typeInfo ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                              {isAr ? typeInfo.ar : typeInfo.en}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {item.rate_percent != null ? `${item.rate_percent}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {levelInfo ? (isAr ? levelInfo.ar : levelInfo.en) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.fta_agreement || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.effective_from || item.effective_to ? (
                            <div className="flex items-center gap-1">
                              <CalendarDaysIcon className="h-3.5 w-3.5" />
                              {item.effective_from || '∞'} → {item.effective_to || '∞'}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-200 text-gray-600'}`}>
                            {item.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <PencilIcon className="h-4 w-4 text-gray-500" />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => setDeletingId(item.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                <TrashIcon className="h-4 w-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500">
              {isAr ? `صفحة ${page} من ${totalPages} • ${totalItems}` : `Page ${page} of ${totalPages} • ${totalItems} items`}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{isAr ? 'السابق' : 'Prev'}</Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{isAr ? 'التالي' : 'Next'}</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal — enhanced fields */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editing ? (isAr ? 'تعديل إعفاء' : 'Edit Exemption') : (isAr ? 'إعفاء جديد' : 'New Exemption')} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Section: Basic */}
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-600 pb-1">
            {isAr ? 'البيانات الأساسية' : 'Basic Information'}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Input label={isAr ? 'الكود *' : 'Code *'} value={form.code}
              onChange={(e: any) => setForm({ ...form, code: e.target.value })} />
            <Input label={isAr ? 'الاسم (EN) *' : 'Name (EN) *'} value={form.name_en}
              onChange={(e: any) => setForm({ ...form, name_en: e.target.value })} />
            <Input label={isAr ? 'الاسم (AR) *' : 'Name (AR) *'} value={form.name_ar}
              onChange={(e: any) => setForm({ ...form, name_ar: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'نوع الإعفاء' : 'Exemption Type'}</label>
              <select value={form.exemption_type} onChange={e => setForm({ ...form, exemption_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">{isAr ? 'اختر...' : 'Select...'}</option>
                {EXEMPTION_TYPES.map(t => <option key={t.value} value={t.value}>{isAr ? t.ar : t.en}</option>)}
              </select>
            </div>
            <Input label={isAr ? 'رقم الإعفاء' : 'Exemption Number'} value={form.exemption_number}
              onChange={(e: any) => setForm({ ...form, exemption_number: e.target.value })} />
            <Input label={isAr ? 'نسبة الإعفاء %' : 'Rate %'} type="number" value={form.rate_percent}
              onChange={(e: any) => setForm({ ...form, rate_percent: e.target.value })} />
          </div>

          {/* Section: Scope */}
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-600 pb-1 mt-2">
            {isAr ? 'النطاق' : 'Scope'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'مستوى الإعفاء' : 'Level'}</label>
              <select value={form.exemption_level} onChange={e => setForm({ ...form, exemption_level: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">{isAr ? 'اختر...' : 'Select...'}</option>
                {EXEMPTION_LEVELS.map(l => <option key={l.value} value={l.value}>{isAr ? l.ar : l.en}</option>)}
              </select>
            </div>
            <Input label={isAr ? 'اتفاقية تجارة حرة' : 'FTA Agreement'} value={form.fta_agreement}
              onChange={(e: any) => setForm({ ...form, fta_agreement: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={isAr ? 'أكواد HS (مفصولة بفاصلة)' : 'HS Codes (comma separated)'} value={form.hs_codes}
              onChange={(e: any) => setForm({ ...form, hs_codes: e.target.value })} placeholder="e.g. 8471,8517" />
            <Input label={isAr ? 'المستفيد' : 'Beneficiary'} value={form.beneficiary}
              onChange={(e: any) => setForm({ ...form, beneficiary: e.target.value })} />
          </div>
          <Input label={isAr ? 'رقم القرار' : 'Decision Number'} value={form.decision_number}
            onChange={(e: any) => setForm({ ...form, decision_number: e.target.value })} />

          {/* Section: Limits */}
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-600 pb-1 mt-2">
            {isAr ? 'الفترة والحدود' : 'Period & Limits'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label={isAr ? 'من تاريخ' : 'Effective From'} type="date" value={form.effective_from}
              onChange={(e: any) => setForm({ ...form, effective_from: e.target.value })} />
            <Input label={isAr ? 'إلى تاريخ' : 'Effective To'} type="date" value={form.effective_to}
              onChange={(e: any) => setForm({ ...form, effective_to: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={isAr ? 'أقصى كمية' : 'Max Quantity'} type="number" value={form.max_quantity}
              onChange={(e: any) => setForm({ ...form, max_quantity: e.target.value })} />
            <Input label={isAr ? 'أقصى قيمة' : 'Max Value'} type="number" value={form.max_value}
              onChange={(e: any) => setForm({ ...form, max_value: e.target.value })} />
          </div>

          {/* Section: Description */}
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-600 pb-1 mt-2">
            {isAr ? 'الوصف' : 'Description'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label={isAr ? 'الوصف (EN)' : 'Description (EN)'} value={form.description}
              onChange={(e: any) => setForm({ ...form, description: e.target.value })} />
            <Input label={isAr ? 'الوصف (AR)' : 'Description (AR)'} value={form.description_ar}
              onChange={(e: any) => setForm({ ...form, description_ar: e.target.value })} />
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{isAr ? 'نشط' : 'Active'}</span>
          </label>

          <div className="flex gap-2 pt-4 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
            <Button onClick={handleSave} loading={saving}>{isAr ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete}
        title={isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
        message={isAr ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'This action cannot be undone.'}
        confirmText={isAr ? 'حذف' : 'Delete'} cancelText={isAr ? 'إلغاء' : 'Cancel'} variant="danger" />
    </MainLayout>
  );
}
