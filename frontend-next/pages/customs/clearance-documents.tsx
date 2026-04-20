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
  DocumentDuplicateIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type ClearanceDocStatus = 'draft' | 'submitted' | 'under_review' | 'cleared' | 'rejected';

interface ClearanceDocument {
  id: number;
  document_number: string;
  declaration_id?: number;
  declaration_number?: string;
  document_type: string;
  document_name_en: string;
  document_name_ar: string;
  issue_date?: string;
  expiry_date?: string;
  issuing_authority?: string;
  status: ClearanceDocStatus;
  is_verified: boolean;
  notes?: string;
}

export default function ClearanceDocumentsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();
  const hasFetched = useRef(false);

  const canView = hasAnyPermission([MenuPermissions.Logistics.Customs.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Logistics.Customs.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Logistics.Customs.Edit]);
  const canDelete = hasAnyPermission([MenuPermissions.Logistics.Customs.Delete]);

  const [items, setItems] = useState<ClearanceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | ClearanceDocStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ClearanceDocument | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    document_number: '', document_type: 'invoice', document_name_en: '', document_name_ar: '',
    issue_date: '', expiry_date: '', issuing_authority: '', status: 'draft' as ClearanceDocStatus,
    is_verified: false, notes: '',
  });

  useEffect(() => { if (!hasFetched.current) { hasFetched.current = true; fetchData(); } }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/clearance-documents', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setItems(Array.isArray(json) ? json : json.data || []); }
      else { loadMock(); }
    } catch { loadMock(); }
    finally { setLoading(false); }
  };

  const loadMock = () => {
    setItems([
      { id: 1, document_number: 'CD-2025-00021', document_type: 'invoice', document_name_en: 'Commercial Invoice', document_name_ar: 'فاتورة تجارية', issue_date: '2025-12-10', issuing_authority: 'Chamber of Commerce', status: 'cleared', is_verified: true },
      { id: 2, document_number: 'CD-2025-00034', document_type: 'certificate', document_name_en: 'Certificate of Origin', document_name_ar: 'شهادة المنشأ', issue_date: '2025-12-20', issuing_authority: 'Ministry of Trade', status: 'under_review', is_verified: false },
      { id: 3, document_number: 'CD-2025-00039', document_type: 'packing_list', document_name_en: 'Packing List', document_name_ar: 'قائمة التعبئة', issue_date: '2025-12-24', status: 'submitted', is_verified: false },
      { id: 4, document_number: 'CD-2025-00005', document_type: 'bill_of_lading', document_name_en: 'Bill of Lading', document_name_ar: 'بوليصة الشحن', issue_date: '2025-11-02', status: 'rejected', is_verified: false },
    ]);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ document_number: '', document_type: 'invoice', document_name_en: '', document_name_ar: '', issue_date: '', expiry_date: '', issuing_authority: '', status: 'draft', is_verified: false, notes: '' });
  };

  const openEdit = (item: ClearanceDocument) => {
    setEditingItem(item);
    setFormData({ document_number: item.document_number, document_type: item.document_type, document_name_en: item.document_name_en, document_name_ar: item.document_name_ar, issue_date: item.issue_date || '', expiry_date: item.expiry_date || '', issuing_authority: item.issuing_authority || '', status: item.status, is_verified: item.is_verified, notes: item.notes || '' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.document_number || !formData.document_name_en) { showToast(locale === 'ar' ? 'رقم المستند والاسم مطلوبان' : 'Document number and name required', 'error'); return; }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem ? `/api/clearance-documents/${editingItem.id}` : '/api/clearance-documents';
      const res = await fetch(url, { method: editingItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(formData) });
      if (res.ok) { showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); fetchData(); setShowModal(false); resetForm(); }
      else throw new Error();
    } catch {
      if (editingItem) { setItems(items.map(i => i.id === editingItem.id ? { ...i, ...formData } as ClearanceDocument : i)); }
      else { setItems([...items, { id: Date.now(), ...formData } as ClearanceDocument]); }
      showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); setShowModal(false); resetForm();
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try { const token = localStorage.getItem('accessToken'); await fetch(`/api/clearance-documents/${deletingId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); } catch {}
    setItems(items.filter(i => i.id !== deletingId));
    showToast(locale === 'ar' ? 'تم الحذف' : 'Deleted', 'success');
    setIsDeleting(false); setConfirmOpen(false); setDeletingId(null);
  };

  const statusLabel = (s: ClearanceDocStatus) => {
    const labels: Record<ClearanceDocStatus, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' }, submitted: { en: 'Submitted', ar: 'مرسل' },
      under_review: { en: 'Under Review', ar: 'قيد المراجعة' }, cleared: { en: 'Cleared', ar: 'مخلّص' },
      rejected: { en: 'Rejected', ar: 'مرفوض' },
    };
    return locale === 'ar' ? labels[s]?.ar || s : labels[s]?.en || s;
  };

  const statusStyle = (s: ClearanceDocStatus) => {
    const styles: Record<ClearanceDocStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      under_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      cleared: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return styles[s] || styles.draft;
  };

  const docTypeLabel = (t: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      invoice: { en: 'Invoice', ar: 'فاتورة' }, certificate: { en: 'Certificate', ar: 'شهادة' },
      packing_list: { en: 'Packing List', ar: 'قائمة تعبئة' }, bill_of_lading: { en: 'Bill of Lading', ar: 'بوليصة شحن' },
      customs_form: { en: 'Customs Form', ar: 'نموذج جمركي' }, other: { en: 'Other', ar: 'أخرى' },
    };
    return locale === 'ar' ? labels[t]?.ar || t : labels[t]?.en || t;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      const sOk = filterStatus === 'all' || d.status === filterStatus;
      const qOk = !q || d.document_number.toLowerCase().includes(q) || d.document_name_en.toLowerCase().includes(q) || d.document_name_ar.toLowerCase().includes(q) || (d.issuing_authority || '').toLowerCase().includes(q);
      return sOk && qOk;
    });
  }, [items, filterStatus, search]);

  const totalCount = items.length;
  const clearedCount = items.filter(i => i.status === 'cleared').length;
  const pendingCount = items.filter(i => i.status === 'submitted' || i.status === 'under_review').length;
  const rejectedCount = items.filter(i => i.status === 'rejected').length;

  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{locale === 'ar' ? 'مستندات التخليص - SLMS' : 'Clearance Documents - SLMS'}</title></Head>
        <div className="text-center py-12">
          <DocumentDuplicateIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'مستندات التخليص - SLMS' : 'Clearance Documents - SLMS'}</title></Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <DocumentDuplicateIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'مستندات التخليص' : 'Clearance Documents'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متابعة مستندات التخليص الجمركي وحالاتها' : 'Track customs clearance documents and statuses'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'مستند جديد' : 'New Document'}
            </Button>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد الإجراء' : 'In Progress'}</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مخلّص' : 'Cleared'}</p>
            <p className="text-2xl font-bold text-green-600">{clearedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</p>
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
          </div>
        </div>

        {/* Filters + Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <div className="w-80">
              <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث بالمرجع أو الاسم...' : 'Search by reference or name...'} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="input">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="submitted">{locale === 'ar' ? 'مرسل' : 'Submitted'}</option>
                <option value="under_review">{locale === 'ar' ? 'قيد المراجعة' : 'Under Review'}</option>
                <option value="cleared">{locale === 'ar' ? 'مخلّص' : 'Cleared'}</option>
                <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div></div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرجع' : 'Doc #'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الجهة المصدرة' : 'Authority'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{locale === 'ar' ? 'لا توجد بيانات' : 'No data found'}</td></tr>
                ) : filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.document_number}</td>
                    <td className="px-4 py-3 text-gray-500">{docTypeLabel(d.document_type)}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? d.document_name_ar : d.document_name_en}</td>
                    <td className="px-4 py-3 text-gray-500">{d.issuing_authority || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.issue_date || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', statusStyle(d.status))}>{statusLabel(d.status)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canEdit && (<button onClick={() => openEdit(d)} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><PencilIcon className="h-4 w-4" /></button>)}
                        {canDelete && (<button onClick={() => { setDeletingId(d.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><TrashIcon className="h-4 w-4" /></button>)}
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
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editingItem ? (locale === 'ar' ? 'تعديل مستند' : 'Edit Document') : (locale === 'ar' ? 'مستند تخليص جديد' : 'New Clearance Document')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'رقم المستند' : 'Document #'} value={formData.document_number} onChange={(e) => setFormData({ ...formData, document_number: e.target.value })} placeholder="CD-2025-00040" />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نوع المستند' : 'Document Type'}</label>
              <select value={formData.document_type} onChange={(e) => setFormData({ ...formData, document_type: e.target.value })} className="input">
                <option value="invoice">{locale === 'ar' ? 'فاتورة' : 'Invoice'}</option>
                <option value="certificate">{locale === 'ar' ? 'شهادة' : 'Certificate'}</option>
                <option value="packing_list">{locale === 'ar' ? 'قائمة تعبئة' : 'Packing List'}</option>
                <option value="bill_of_lading">{locale === 'ar' ? 'بوليصة شحن' : 'Bill of Lading'}</option>
                <option value="customs_form">{locale === 'ar' ? 'نموذج جمركي' : 'Customs Form'}</option>
                <option value="other">{locale === 'ar' ? 'أخرى' : 'Other'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.document_name_en} onChange={(e) => setFormData({ ...formData, document_name_en: e.target.value })} />
            <Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.document_name_ar} onChange={(e) => setFormData({ ...formData, document_name_ar: e.target.value })} />
            <Input label={locale === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'} type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })} />
            <Input label={locale === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'} type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} />
            <Input label={locale === 'ar' ? 'الجهة المصدرة' : 'Issuing Authority'} value={formData.issuing_authority} onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as ClearanceDocStatus })} className="input">
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="submitted">{locale === 'ar' ? 'مرسل' : 'Submitted'}</option>
                <option value="under_review">{locale === 'ar' ? 'قيد المراجعة' : 'Under Review'}</option>
                <option value="cleared">{locale === 'ar' ? 'مخلّص' : 'Cleared'}</option>
                <option value="rejected">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.is_verified} onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
              <label className="text-sm text-gray-700 dark:text-gray-300">{locale === 'ar' ? 'تم التحقق' : 'Verified'}</label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'ملاحظات' : 'Notes'}</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="input w-full" />
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? '...' : editingItem ? (locale === 'ar' ? 'حفظ' : 'Save') : (locale === 'ar' ? 'إنشاء' : 'Create')}</Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={confirmOpen} onClose={() => { setConfirmOpen(false); setDeletingId(null); }} onConfirm={handleDelete} title={locale === 'ar' ? 'حذف المستند' : 'Delete Document'} message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا المستند؟' : 'Are you sure you want to delete this document?'} confirmLabel={locale === 'ar' ? 'حذف' : 'Delete'} isLoading={isDeleting} />
    </MainLayout>
  );
}
