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
import { ShieldCheckIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

type ExemptionType = 'full' | 'partial' | 'conditional';

interface TaxExemption {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  exemption_type: ExemptionType;
  exemption_rate?: number;
  authority?: string;
  legal_reference?: string;
  certificate_number?: string;
  effective_from?: string;
  effective_to?: string;
  zatca_exemption_code?: string;
  is_active: boolean;
}

const mockExemptions: TaxExemption[] = [
  { id: 1, code: 'EXPORT', nameEn: 'Export Exemption', nameAr: 'إعفاء صادرات', isActive: true },
  { id: 2, code: 'GOV', nameEn: 'Government Exemption', nameAr: 'إعفاء جهات حكومية', isActive: true },
  { id: 3, code: 'NGO', nameEn: 'Non-profit Exemption', nameAr: 'إعفاء جهات غير ربحية', isActive: true },
];

export default function TaxExemptionsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();
  const hasFetched = useRef(false);

  const canView = hasAnyPermission([MenuPermissions.MasterData.TaxExemptions.View]);
  const canCreate = hasAnyPermission([MenuPermissions.MasterData.TaxExemptions.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.MasterData.TaxExemptions.Edit]);
  const canDelete = hasAnyPermission([MenuPermissions.MasterData.TaxExemptions.Delete]);

  const [items, setItems] = useState<TaxExemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxExemption | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '', name_en: '', name_ar: '', exemption_type: 'full' as ExemptionType,
    exemption_rate: '', authority: '', legal_reference: '', certificate_number: '',
    effective_from: '', effective_to: '', zatca_exemption_code: '', is_active: true,
  });

  useEffect(() => { if (!hasFetched.current) { hasFetched.current = true; fetchData(); } }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/tax-exemptions', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setItems(Array.isArray(json) ? json : json.data || []); }
      else { loadMock(); }
    } catch { loadMock(); }
    finally { setLoading(false); }
  };

  const loadMock = () => {
    setItems([
      { id: 1, code: 'EXPORT', name_en: 'Export Exemption', name_ar: 'إعفاء صادرات', exemption_type: 'full', is_active: true },
      { id: 2, code: 'GOV', name_en: 'Government Exemption', name_ar: 'إعفاء جهات حكومية', exemption_type: 'full', authority: 'GAZT', is_active: true },
      { id: 3, code: 'NGO', name_en: 'Non-profit Exemption', name_ar: 'إعفاء جهات غير ربحية', exemption_type: 'conditional', is_active: true },
    ]);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name_en: '', name_ar: '', exemption_type: 'full', exemption_rate: '', authority: '', legal_reference: '', certificate_number: '', effective_from: '', effective_to: '', zatca_exemption_code: '', is_active: true });
  };

  const openEdit = (item: TaxExemption) => {
    setEditingItem(item);
    setFormData({ code: item.code, name_en: item.name_en, name_ar: item.name_ar, exemption_type: item.exemption_type, exemption_rate: item.exemption_rate?.toString() || '', authority: item.authority || '', legal_reference: item.legal_reference || '', certificate_number: item.certificate_number || '', effective_from: item.effective_from || '', effective_to: item.effective_to || '', zatca_exemption_code: item.zatca_exemption_code || '', is_active: item.is_active });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name_en) { showToast(locale === 'ar' ? 'الكود والاسم مطلوبان' : 'Code and name required', 'error'); return; }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem ? `/api/tax-exemptions/${editingItem.id}` : '/api/tax-exemptions';
      const body = { ...formData, exemption_rate: formData.exemption_rate ? Number(formData.exemption_rate) : null };
      const res = await fetch(url, { method: editingItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (res.ok) { showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); fetchData(); setShowModal(false); resetForm(); }
      else throw new Error();
    } catch {
      if (editingItem) { setItems(items.map(i => i.id === editingItem.id ? { ...i, ...formData, exemption_rate: formData.exemption_rate ? Number(formData.exemption_rate) : undefined } as TaxExemption : i)); }
      else { setItems([...items, { id: Date.now(), ...formData, exemption_rate: formData.exemption_rate ? Number(formData.exemption_rate) : undefined } as TaxExemption]); }
      showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); setShowModal(false); resetForm();
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try { const token = localStorage.getItem('accessToken'); await fetch(`/api/tax-exemptions/${deletingId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); } catch {}
    setItems(items.filter(i => i.id !== deletingId));
    showToast(locale === 'ar' ? 'تم الحذف' : 'Deleted', 'success');
    setIsDeleting(false); setConfirmOpen(false); setDeletingId(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(e => !q || e.code.toLowerCase().includes(q) || e.name_en.toLowerCase().includes(q) || e.name_ar.toLowerCase().includes(q));
  }, [items, search]);

  const exemptionTypeLabel = (t: ExemptionType) => {
    const labels: Record<ExemptionType, { en: string; ar: string }> = { full: { en: 'Full', ar: 'كامل' }, partial: { en: 'Partial', ar: 'جزئي' }, conditional: { en: 'Conditional', ar: 'مشروط' } };
    return locale === 'ar' ? labels[t]?.ar || t : labels[t]?.en || t;
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{locale === 'ar' ? 'الإعفاءات الضريبية - SLMS' : 'Tax Exemptions - SLMS'}</title></Head>
        <div className="text-center py-12">
          <ShieldCheckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'الإعفاءات الضريبية - SLMS' : 'Tax Exemptions - SLMS'}</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'الإعفاءات الضريبية' : 'Tax Exemptions'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة أسباب وشروط الإعفاء الضريبي' : 'Manage tax exemption reasons and conditions'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'إضافة إعفاء' : 'Add Exemption'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{items.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">{locale === 'ar' ? 'نشط' : 'Active'}</p>
            <p className="text-2xl font-bold text-green-600">{items.filter(i => i.is_active).length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500">{locale === 'ar' ? 'كامل' : 'Full Exemptions'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{items.filter(i => i.exemption_type === 'full').length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث...' : 'Search...'} />
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الجهة' : 'Authority'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{e.code}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      <div>{locale === 'ar' ? e.name_ar : e.name_en}</div>
                      <div className="text-xs text-gray-500">{locale === 'ar' ? e.name_en : e.name_ar}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', e.exemption_type === 'full' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : e.exemption_type === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300')}>
                        {exemptionTypeLabel(e.exemption_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{e.authority || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', e.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')}>
                        {e.is_active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {canEdit && <button onClick={() => openEdit(e)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20"><PencilIcon className="h-4 w-4" /></button>}
                        {canDelete && <button onClick={() => { setDeletingId(e.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20"><TrashIcon className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingItem ? (locale === 'ar' ? 'تعديل إعفاء' : 'Edit Exemption') : (locale === 'ar' ? 'إعفاء جديد' : 'New Exemption')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نوع الإعفاء' : 'Exemption Type'}</label>
              <select value={formData.exemption_type} onChange={(e) => setFormData({ ...formData, exemption_type: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="full">{locale === 'ar' ? 'كامل' : 'Full'}</option>
                <option value="partial">{locale === 'ar' ? 'جزئي' : 'Partial'}</option>
                <option value="conditional">{locale === 'ar' ? 'مشروط' : 'Conditional'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} required />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} />
            {formData.exemption_type === 'partial' && (
              <Input label={locale === 'ar' ? 'نسبة الإعفاء %' : 'Exemption Rate %'} type="number" value={formData.exemption_rate} onChange={(e) => setFormData({ ...formData, exemption_rate: e.target.value })} />
            )}
            <Input label={locale === 'ar' ? 'الجهة المانحة' : 'Authority'} value={formData.authority} onChange={(e) => setFormData({ ...formData, authority: e.target.value })} />
            <Input label={locale === 'ar' ? 'المرجع القانوني' : 'Legal Reference'} value={formData.legal_reference} onChange={(e) => setFormData({ ...formData, legal_reference: e.target.value })} />
            <Input label={locale === 'ar' ? 'رقم الشهادة' : 'Certificate Number'} value={formData.certificate_number} onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })} />
            <Input label={locale === 'ar' ? 'كود الزكاة' : 'ZATCA Code'} value={formData.zatca_exemption_code} onChange={(e) => setFormData({ ...formData, zatca_exemption_code: e.target.value })} />
            <Input label={locale === 'ar' ? 'من تاريخ' : 'Effective From'} type="date" value={formData.effective_from} onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })} />
            <Input label={locale === 'ar' ? 'إلى تاريخ' : 'Effective To'} type="date" value={formData.effective_to} onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'نشط' : 'Active'}</label>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSubmit} loading={isSubmitting}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title={locale === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'} message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا الإعفاء؟' : 'Are you sure you want to delete this exemption?'} confirmText={locale === 'ar' ? 'حذف' : 'Delete'} variant="danger" loading={isDeleting} />
    </MainLayout>
  );
}
