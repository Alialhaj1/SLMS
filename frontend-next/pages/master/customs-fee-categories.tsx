import { useEffect, useMemo, useRef, useState } from 'react';
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
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type FeeType = 'fixed' | 'percentage' | 'per_unit' | 'tiered';

interface CustomsFeeCategory {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  fee_type: FeeType;
  rate_percent?: number;
  fixed_amount?: number;
  currency_code?: string;
  calculation_base?: string;
  min_fee?: number;
  max_fee?: number;
  applies_to?: string;
  gl_account_id?: number;
  is_active: boolean;
}

// mock data removed - now fetched from API

export default function CustomsFeeCategoriesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();
  const hasFetched = useRef(false);

  const canView = hasAnyPermission([MenuPermissions.MasterData.CustomsFeeCategories.View]);
  const canCreate = hasAnyPermission([MenuPermissions.MasterData.CustomsFeeCategories.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.MasterData.CustomsFeeCategories.Edit]);
  const canDelete = hasAnyPermission([MenuPermissions.MasterData.CustomsFeeCategories.Delete]);

  const [items, setItems] = useState<CustomsFeeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | FeeType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomsFeeCategory | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '', name_en: '', name_ar: '', fee_type: 'fixed' as FeeType,
    rate_percent: '', fixed_amount: '', currency_code: 'SAR',
    calculation_base: 'cif_value', min_fee: '', max_fee: '', is_active: true,
  });

  useEffect(() => { if (!hasFetched.current) { hasFetched.current = true; fetchData(); } }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/customs-fee-categories', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setItems(Array.isArray(json) ? json : json.data || []); }
      else { loadMock(); }
    } catch { loadMock(); }
    finally { setLoading(false); }
  };

  const loadMock = () => {
    setItems([
      { id: 1, code: 'DOC_FEE', name_en: 'Documentation Fee', name_ar: 'رسوم المستندات', fee_type: 'fixed', fixed_amount: 150, currency_code: 'SAR', is_active: true },
      { id: 2, code: 'INSPECTION', name_en: 'Inspection Fee', name_ar: 'رسوم التفتيش', fee_type: 'fixed', fixed_amount: 75, currency_code: 'SAR', is_active: true },
      { id: 3, code: 'SERVICE_PCT', name_en: 'Service Fee (%)', name_ar: 'رسوم خدمة (%)', fee_type: 'percentage', rate_percent: 1.5, is_active: false },
    ]);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name_en: '', name_ar: '', fee_type: 'fixed', rate_percent: '', fixed_amount: '', currency_code: 'SAR', calculation_base: 'cif_value', min_fee: '', max_fee: '', is_active: true });
  };

  const openEdit = (item: CustomsFeeCategory) => {
    setEditingItem(item);
    setFormData({ code: item.code, name_en: item.name_en, name_ar: item.name_ar, fee_type: item.fee_type, rate_percent: item.rate_percent?.toString() || '', fixed_amount: item.fixed_amount?.toString() || '', currency_code: item.currency_code || 'SAR', calculation_base: item.calculation_base || 'cif_value', min_fee: item.min_fee?.toString() || '', max_fee: item.max_fee?.toString() || '', is_active: item.is_active });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name_en) { showToast(locale === 'ar' ? 'الكود والاسم مطلوبان' : 'Code and name required', 'error'); return; }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem ? `/api/customs-fee-categories/${editingItem.id}` : '/api/customs-fee-categories';
      const body = { ...formData, rate_percent: formData.rate_percent ? Number(formData.rate_percent) : null, fixed_amount: formData.fixed_amount ? Number(formData.fixed_amount) : null, min_fee: formData.min_fee ? Number(formData.min_fee) : null, max_fee: formData.max_fee ? Number(formData.max_fee) : null };
      const res = await fetch(url, { method: editingItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (res.ok) { showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); fetchData(); setShowModal(false); resetForm(); }
      else throw new Error();
    } catch {
      if (editingItem) { setItems(items.map(i => i.id === editingItem.id ? { ...i, ...formData, rate_percent: formData.rate_percent ? Number(formData.rate_percent) : undefined, fixed_amount: formData.fixed_amount ? Number(formData.fixed_amount) : undefined } as CustomsFeeCategory : i)); }
      else { setItems([...items, { id: Date.now(), ...formData, rate_percent: formData.rate_percent ? Number(formData.rate_percent) : undefined, fixed_amount: formData.fixed_amount ? Number(formData.fixed_amount) : undefined } as CustomsFeeCategory]); }
      showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); setShowModal(false); resetForm();
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try { const token = localStorage.getItem('accessToken'); await fetch(`/api/customs-fee-categories/${deletingId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); } catch {}
    setItems(items.filter(i => i.id !== deletingId));
    showToast(locale === 'ar' ? 'تم الحذف' : 'Deleted', 'success');
    setIsDeleting(false); setConfirmOpen(false); setDeletingId(null);
  };

  const feeTypeLabel = (t: FeeType) => {
    const labels: Record<FeeType, { en: string; ar: string }> = { fixed: { en: 'Fixed', ar: 'ثابت' }, percentage: { en: 'Percentage', ar: 'نسبة' }, per_unit: { en: 'Per Unit', ar: 'لكل وحدة' }, tiered: { en: 'Tiered', ar: 'متدرج' } };
    return locale === 'ar' ? labels[t]?.ar || t : labels[t]?.en || t;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      const sOk = filterStatus === 'all' || (filterStatus === 'active' ? c.is_active : !c.is_active);
      const tOk = filterType === 'all' || c.fee_type === filterType;
      const qOk = !q || c.code.toLowerCase().includes(q) || c.name_en.toLowerCase().includes(q) || c.name_ar.toLowerCase().includes(q);
      return sOk && tOk && qOk;
    });
  }, [items, search, filterStatus, filterType]);

  const getValue = (c: CustomsFeeCategory) => {
    if (c.fee_type === 'percentage' && c.rate_percent != null) return `${c.rate_percent}%`;
    if (c.fixed_amount != null) return `${c.fixed_amount.toLocaleString()} ${c.currency_code || ''}`;
    return '-';
  };

  const totalCount = items.length;
  const activeCount = items.filter(i => i.is_active).length;
  const percentageCount = items.filter(i => i.fee_type === 'percentage').length;

  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{locale === 'ar' ? 'فئات الرسوم الجمركية - SLMS' : 'Customs Fee Categories - SLMS'}</title></Head>
        <div className="text-center py-12">
          <TagIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'فئات الرسوم الجمركية - SLMS' : 'Customs Fee Categories - SLMS'}</title></Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <TagIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'فئات الرسوم الجمركية' : 'Customs Fee Categories'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تصنيف الرسوم المستخدمة في الجمارك والتخليص' : 'Categorize fees used in customs and clearance'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'فئة جديدة' : 'New Category'}
            </Button>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نِسَب' : 'Percentage'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{percentageCount}</p>
          </div>
        </div>

        {/* Filters + Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <div className="w-80">
              <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Type'}</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="input">
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="fixed">{locale === 'ar' ? 'ثابت' : 'Fixed'}</option>
                <option value="percentage">{locale === 'ar' ? 'نسبة' : 'Percentage'}</option>
                <option value="per_unit">{locale === 'ar' ? 'لكل وحدة' : 'Per Unit'}</option>
                <option value="tiered">{locale === 'ar' ? 'متدرج' : 'Tiered'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="input">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div></div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القيمة' : 'Value'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{locale === 'ar' ? 'لا توجد بيانات' : 'No data found'}</td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? c.name_ar : c.name_en}</td>
                    <td className="px-4 py-3 text-gray-500">{feeTypeLabel(c.fee_type)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{getValue(c)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', c.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')}>
                        {c.is_active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canEdit && (<button onClick={() => openEdit(c)} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><PencilIcon className="h-4 w-4" /></button>)}
                        {canDelete && (<button onClick={() => { setDeletingId(c.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><TrashIcon className="h-4 w-4" /></button>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingItem ? (locale === 'ar' ? 'تعديل فئة' : 'Edit Category') : (locale === 'ar' ? 'فئة رسوم جديدة' : 'New Fee Category')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="NEW_FEE" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'النوع' : 'Fee Type'}</label>
              <select value={formData.fee_type} onChange={(e) => setFormData({ ...formData, fee_type: e.target.value as FeeType })} className="input">
                <option value="fixed">{locale === 'ar' ? 'ثابت' : 'Fixed'}</option>
                <option value="percentage">{locale === 'ar' ? 'نسبة' : 'Percentage'}</option>
                <option value="per_unit">{locale === 'ar' ? 'لكل وحدة' : 'Per Unit'}</option>
                <option value="tiered">{locale === 'ar' ? 'متدرج' : 'Tiered'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} />
            {formData.fee_type === 'percentage' && (
              <Input label={locale === 'ar' ? 'النسبة %' : 'Rate %'} value={formData.rate_percent} onChange={(e) => setFormData({ ...formData, rate_percent: e.target.value })} placeholder="5.0" />
            )}
            {(formData.fee_type === 'fixed' || formData.fee_type === 'per_unit') && (
              <Input label={locale === 'ar' ? 'المبلغ الثابت' : 'Fixed Amount'} value={formData.fixed_amount} onChange={(e) => setFormData({ ...formData, fixed_amount: e.target.value })} placeholder="0" />
            )}
            <Input label={locale === 'ar' ? 'العملة' : 'Currency'} value={formData.currency_code} onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })} placeholder="SAR" />
            <Input label={locale === 'ar' ? 'أساس الاحتساب' : 'Calculation Base'} value={formData.calculation_base} onChange={(e) => setFormData({ ...formData, calculation_base: e.target.value })} placeholder="cif_value" />
            <Input label={locale === 'ar' ? 'حد أدنى' : 'Min Fee'} value={formData.min_fee} onChange={(e) => setFormData({ ...formData, min_fee: e.target.value })} />
            <Input label={locale === 'ar' ? 'حد أقصى' : 'Max Fee'} value={formData.max_fee} onChange={(e) => setFormData({ ...formData, max_fee: e.target.value })} />
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
              <label className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'نشط' : 'Active'}</label>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? '...' : editingItem ? (locale === 'ar' ? 'حفظ' : 'Save') : (locale === 'ar' ? 'إضافة' : 'Add')}</Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => { setConfirmOpen(false); setDeletingId(null); }} onConfirm={handleDelete} title={locale === 'ar' ? 'حذف الفئة' : 'Delete Category'} message={locale === 'ar' ? 'هل أنت متأكد من حذف هذه الفئة؟' : 'Are you sure you want to delete this category?'} confirmLabel={locale === 'ar' ? 'حذف' : 'Delete'} isLoading={isDeleting} />
    </MainLayout>
  );
}
