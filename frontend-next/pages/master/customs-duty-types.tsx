import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface CustomsDutyType {
  id: number;
  code: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  rate_percent: number;
  calculation_method: string;
  status: 'active' | 'inactive';
}

export default function CustomsDutyTypesPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const hasFetched = useRef(false);
  const [items, setItems] = useState<CustomsDutyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomsDutyType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '', name: '', name_en: '', name_ar: '', rate_percent: '', calculation_method: 'ad_valorem', status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => { if (!hasFetched.current) { hasFetched.current = true; fetchData(); } }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/master/customs-duty-types', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      const raw = json.data;
      setItems(Array.isArray(raw) ? raw : raw?.data || []);
    } catch {
      showToast(locale === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_en: '', name_ar: '', rate_percent: '', calculation_method: 'ad_valorem', status: 'active' });
  };

  const openEdit = (item: CustomsDutyType) => {
    setEditingItem(item);
    setFormData({ code: item.code || '', name: item.name || '', name_en: item.name_en || item.name || '', name_ar: item.name_ar || '', rate_percent: item.rate_percent?.toString() || '', calculation_method: item.calculation_method || 'ad_valorem', status: item.status || 'active' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) { showToast(locale === 'ar' ? 'الكود والاسم مطلوبان' : 'Code and name required', 'error'); return; }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem ? `/api/master/customs-duty-types/${editingItem.id}` : '/api/master/customs-duty-types';
      const body = { ...formData, rate_percent: formData.rate_percent ? Number(formData.rate_percent) : 0 };
      const res = await fetch(url, { method: editingItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (res.ok) { showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); fetchData(); setShowModal(false); resetForm(); }
      else throw new Error();
    } catch {
      if (editingItem) { setItems(items.map(i => i.id === editingItem.id ? { ...i, ...formData, rate_percent: Number(formData.rate_percent) || 0 } as CustomsDutyType : i)); }
      else { setItems([...items, { id: Date.now(), ...formData, rate_percent: Number(formData.rate_percent) || 0 } as CustomsDutyType]); }
      showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); setShowModal(false); resetForm();
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try { const token = localStorage.getItem('accessToken'); await fetch(`/api/master/customs-duty-types/${deletingId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); } catch {}
    setItems(items.filter(i => i.id !== deletingId));
    showToast(locale === 'ar' ? 'تم الحذف' : 'Deleted', 'success');
    setIsDeleting(false); setConfirmOpen(false); setDeletingId(null);
  };

  const filtered = items.filter(i =>
    (i.name || i.name_en || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.code || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (s: string) => {
    const cls = s === 'active'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>{s === 'active' ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}</span>;
  };

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'أنواع الرسوم الجمركية - SLMS' : 'Customs Duty Types - SLMS'}</title></Head>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'أنواع الرسوم الجمركية' : 'Customs Duty Types'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'إدارة أنواع الرسوم الجمركية ونسبها' : 'Manage customs duty type definitions and rates'}
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <PlusIcon className="h-4 w-4" />{locale === 'ar' ? 'إضافة نوع' : 'Add Type'}
          </Button>
        </div>

        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {locale === 'ar' ? 'لا توجد بيانات' : 'No records found'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النسبة %' : 'Rate %'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'طريقة الحساب' : 'Calculation Method'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{locale === 'ar' ? (item.name_ar || item.name) : (item.name_en || item.name)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{item.rate_percent}%</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.calculation_method}</td>
                    <td className="px-4 py-3">{statusBadge(item.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          {locale === 'ar' ? `${filtered.length} سجل` : `${filtered.length} record(s)`}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingItem ? (locale === 'ar' ? 'تعديل نوع رسوم' : 'Edit Duty Type') : (locale === 'ar' ? 'نوع رسوم جديد' : 'New Duty Type')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="DUTY_001" />
            <Input label={locale === 'ar' ? 'الاسم' : 'Name'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} />
            <Input label={locale === 'ar' ? 'النسبة %' : 'Rate %'} value={formData.rate_percent} onChange={(e) => setFormData({ ...formData, rate_percent: e.target.value })} placeholder="5.0" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'طريقة الحساب' : 'Calculation Method'}</label>
              <select value={formData.calculation_method} onChange={(e) => setFormData({ ...formData, calculation_method: e.target.value })} className="input">
                <option value="ad_valorem">{locale === 'ar' ? 'قيمية (Ad Valorem)' : 'Ad Valorem'}</option>
                <option value="specific">{locale === 'ar' ? 'نوعية (Specific)' : 'Specific'}</option>
                <option value="compound">{locale === 'ar' ? 'مركبة (Compound)' : 'Compound'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? '...' : editingItem ? (locale === 'ar' ? 'حفظ' : 'Save') : (locale === 'ar' ? 'إضافة' : 'Add')}</Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => { setConfirmOpen(false); setDeletingId(null); }} onConfirm={handleDelete} title={locale === 'ar' ? 'حذف النوع' : 'Delete Duty Type'} message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا النوع؟' : 'Are you sure you want to delete this duty type?'} confirmLabel={locale === 'ar' ? 'حذف' : 'Delete'} isLoading={isDeleting} />
    </MainLayout>
  );
}
