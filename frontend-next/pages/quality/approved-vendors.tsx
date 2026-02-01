import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  CheckBadgeIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type VendorApprovalStatus = 'approved' | 'pending' | 'suspended';

interface ApprovedVendor {
  id: number;
  vendorCode: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  score: number;
  approvedAt?: string;
  status: VendorApprovalStatus;
}

const mockVendors: ApprovedVendor[] = [
  { id: 1, vendorCode: 'VND-1001', name: 'Gulf Logistics Supplies', nameAr: 'مستلزمات الخليج اللوجستية', category: 'Packaging', categoryAr: 'التغليف', score: 92, approvedAt: '2025-11-01', status: 'approved' },
  { id: 2, vendorCode: 'VND-2033', name: 'Secure Transport Co.', nameAr: 'شركة النقل الآمن', category: 'Transport', categoryAr: 'النقل', score: 88, approvedAt: '2025-09-18', status: 'approved' },
  { id: 3, vendorCode: 'VND-8890', name: 'Quick Customs Services', nameAr: 'خدمات الجمارك السريعة', category: 'Services', categoryAr: 'خدمات', score: 76, approvedAt: undefined, status: 'pending' },
  { id: 4, vendorCode: 'VND-4502', name: 'ColdChain Partners', nameAr: 'شركاء السلسلة الباردة', category: 'Warehousing', categoryAr: 'مستودعات', score: 61, approvedAt: '2025-04-10', status: 'suspended' },
];

export default function ApprovedVendorsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Quality.View, MenuPermissions.Quality.ApprovedVendors.View]);
  const canCreate = hasAnyPermission([MenuPermissions.Quality.Create, MenuPermissions.Quality.ApprovedVendors.Create]);
  const canEdit = hasAnyPermission([MenuPermissions.Quality.Edit, MenuPermissions.Quality.ApprovedVendors.Edit]);

  const [items] = useState<ApprovedVendor[]>(mockVendors);
  const [selectedStatus, setSelectedStatus] = useState<'all' | VendorApprovalStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'Packaging' | 'Transport' | 'Services' | 'Warehousing'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ApprovedVendor | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    vendorCode: '',
    name: '',
    nameAr: '',
    category: 'Services' as ApprovedVendor['category'],
    categoryAr: '',
    score: '80',
    status: 'pending' as VendorApprovalStatus,
  });

  const statusBadge = (s: VendorApprovalStatus) => {
    const styles: Record<VendorApprovalStatus, string> = {
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<VendorApprovalStatus, { en: string; ar: string }> = {
      approved: { en: 'Approved', ar: 'معتمد' },
      pending: { en: 'Pending', ar: 'قيد المراجعة' },
      suspended: { en: 'Suspended', ar: 'موقوف' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[s])}>
        {locale === 'ar' ? labels[s].ar : labels[s].en}
      </span>
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((v) => {
      const sOk = selectedStatus === 'all' || v.status === selectedStatus;
      const cOk = selectedCategory === 'all' || v.category === selectedCategory;
      const qOk =
        !q ||
        v.vendorCode.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.nameAr.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.categoryAr.toLowerCase().includes(q);
      return sOk && cOk && qOk;
    });
  }, [items, selectedStatus, selectedCategory, search]);

  const totalCount = items.length;
  const approvedCount = items.filter((i) => i.status === 'approved').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  const openCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!canCreate) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تم الإرسال للمراجعة (تجريبي)' : 'Submitted for review (demo)', 'success');
    setCreateOpen(false);
    setFormData({ vendorCode: '', name: '', nameAr: '', category: 'Services', categoryAr: '', score: '80', status: 'pending' });
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'الموردين المعتمدين - SLMS' : 'Approved Vendors - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <CheckBadgeIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض الموردين المعتمدين.' : "You don't have permission to view approved vendors."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الموردين المعتمدين - SLMS' : 'Approved Vendors - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <CheckBadgeIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'الموردين المعتمدين' : 'Approved Vendors'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قائمة الموردين المعتمدين حسب الجودة' : 'Quality-based approved vendor list'}</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <PlusIcon className="h-4 w-4" />
              {locale === 'ar' ? 'طلب اعتماد' : 'Request Approval'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الإجمالي' : 'Total'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'معتمد' : 'Approved'}</p>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد المراجعة' : 'Pending'}</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-72">
                <Input
                  label={locale === 'ar' ? 'بحث' : 'Search'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={locale === 'ar' ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الفئة' : 'Category'}</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="Packaging">{locale === 'ar' ? 'التغليف' : 'Packaging'}</option>
                  <option value="Transport">{locale === 'ar' ? 'النقل' : 'Transport'}</option>
                  <option value="Services">{locale === 'ar' ? 'خدمات' : 'Services'}</option>
                  <option value="Warehousing">{locale === 'ar' ? 'مستودعات' : 'Warehousing'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="input">
                  <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All status'}</option>
                  <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
                  <option value="pending">{locale === 'ar' ? 'قيد المراجعة' : 'Pending'}</option>
                  <option value="suspended">{locale === 'ar' ? 'موقوف' : 'Suspended'}</option>
                </select>
              </div>
            </div>
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المورد' : 'Vendor'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التقييم' : 'Score'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تاريخ الاعتماد' : 'Approved At'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{v.vendorCode}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? v.nameAr : v.name}</td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? v.categoryAr : v.category}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{v.score}</td>
                    <td className="px-4 py-3 text-gray-500">{v.approvedAt || '-'}</td>
                    <td className="px-4 py-3">{statusBadge(v.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(v)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل المورد' : 'Vendor Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.vendorCode}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.nameAr : selected.name}</p>
              </div>
              {statusBadge(selected.status)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفئة' : 'Category'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.categoryAr : selected.category}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'التقييم' : 'Score'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.score}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الاعتماد' : 'Approved At'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.approvedAt || '-'}</p>
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
                <Button onClick={() => showToast(locale === 'ar' ? 'تم الاعتماد (تجريبي)' : 'Approved (demo)', 'success')}>
                  <CheckCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'اعتماد' : 'Approve'}
                </Button>
                <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'قيد المراجعة (تجريبي)' : 'Pending (demo)', 'info')}>
                  <ClockIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'قيد المراجعة' : 'Mark Pending'}
                </Button>
                <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإيقاف (تجريبي)' : 'Suspended (demo)', 'error')}>
                  <XCircleIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'إيقاف' : 'Suspend'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'طلب اعتماد مورد' : 'Vendor Approval Request'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'كود المورد' : 'Vendor Code'} value={formData.vendorCode} onChange={(e) => setFormData({ ...formData, vendorCode: e.target.value })} placeholder="VND-9999" />
            <Input label={locale === 'ar' ? 'التقييم' : 'Score'} value={formData.score} onChange={(e) => setFormData({ ...formData, score: e.target.value })} placeholder="80" />
            <Input label={locale === 'ar' ? 'اسم المورد (EN)' : 'Vendor Name (EN)'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label={locale === 'ar' ? 'اسم المورد (AR)' : 'Vendor Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الفئة' : 'Category'}</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })} className="input">
                <option value="Packaging">{locale === 'ar' ? 'التغليف' : 'Packaging'}</option>
                <option value="Transport">{locale === 'ar' ? 'النقل' : 'Transport'}</option>
                <option value="Services">{locale === 'ar' ? 'خدمات' : 'Services'}</option>
                <option value="Warehousing">{locale === 'ar' ? 'مستودعات' : 'Warehousing'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'اسم الفئة (AR)' : 'Category (AR)'} value={formData.categoryAr} onChange={(e) => setFormData({ ...formData, categoryAr: e.target.value })} placeholder={locale === 'ar' ? 'خدمات' : 'خدمات'} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="pending">{locale === 'ar' ? 'قيد المراجعة' : 'Pending'}</option>
                <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
                <option value="suspended">{locale === 'ar' ? 'موقوف' : 'Suspended'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إرسال' : 'Submit'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
