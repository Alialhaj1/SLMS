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
  Cog6ToothIcon,
  PencilSquareIcon,
  EyeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface DefaultAccountMapping {
  id: number;
  category: string;
  categoryAr: string;
  accountCode: string;
  accountName: string;
  accountNameAr: string;
  notes?: string;
}

const mockMappings: DefaultAccountMapping[] = [
  { id: 1, category: 'Prepaid Expenses', categoryAr: 'مصروفات مدفوعة مقدماً', accountCode: '120100', accountName: 'Prepaid Expenses', accountNameAr: 'مصروفات مدفوعة مقدماً' },
  { id: 2, category: 'Deferred Revenue', categoryAr: 'إيرادات مؤجلة', accountCode: '230200', accountName: 'Deferred Revenue', accountNameAr: 'إيرادات مؤجلة' },
  { id: 3, category: 'Cheques Payable', categoryAr: 'شيكات مستحقة الدفع', accountCode: '210400', accountName: 'Cheques Payable', accountNameAr: 'شيكات مستحقة الدفع' },
];

export default function DefaultAccountsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.Accounting.DefaultAccounts.View]);
  const canManage = hasAnyPermission([MenuPermissions.Accounting.DefaultAccounts.Manage]);

  const [items] = useState<DefaultAccountMapping[]>(mockMappings);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DefaultAccountMapping | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [formData, setFormData] = useState({ accountCode: '', accountName: '', accountNameAr: '' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      if (!q) return true;
      return (
        m.category.toLowerCase().includes(q) ||
        m.categoryAr.toLowerCase().includes(q) ||
        m.accountCode.toLowerCase().includes(q) ||
        m.accountName.toLowerCase().includes(q) ||
        m.accountNameAr.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const openEdit = (m: DefaultAccountMapping) => {
    if (!canManage) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    setSelected(m);
    setFormData({ accountCode: m.accountCode, accountName: m.accountName, accountNameAr: m.accountNameAr });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!canManage) {
      showToast(locale === 'ar' ? 'غير مصرح' : 'Access denied', 'error');
      return;
    }
    showToast(locale === 'ar' ? 'تم الحفظ (تجريبي)' : 'Saved (demo)', 'success');
    setEditOpen(false);
  };

  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'الحسابات الافتراضية - SLMS' : 'Default Accounts - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <Cog6ToothIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{locale === 'ar' ? 'لا تملك صلاحية عرض الحسابات الافتراضية.' : "You don't have permission to view default accounts."}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الحسابات الافتراضية - SLMS' : 'Default Accounts - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
              <Cog6ToothIcon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'الحسابات الافتراضية' : 'Default Accounts'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'تحديد الحسابات الافتراضية للعمليات المحاسبية' : 'Configure default accounts for accounting flows'}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تصدير (تجريبي)' : 'Export (demo)', 'info')}>
            <ArrowDownTrayIcon className="h-4 w-4" />
            {locale === 'ar' ? 'تصدير' : 'Export'}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-md">
              <Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث بالتصنيف أو كود الحساب...' : 'Search by category or account code...'} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'التصنيف' : 'Category'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'كود الحساب' : 'Account Code'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{locale === 'ar' ? m.categoryAr : m.category}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{m.accountCode}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? m.accountNameAr : m.accountName}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setSelected(m)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <Button size="sm" onClick={() => openEdit(m)}>
                          <PencilSquareIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected && !editOpen} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل' : 'Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{locale === 'ar' ? selected.categoryAr : selected.category}</h3>
              <p className="text-sm text-gray-500">{selected.accountCode} — {locale === 'ar' ? selected.accountNameAr : selected.accountName}</p>
            </div>
            {canManage && (
              <div className="pt-4 border-t dark:border-gray-700">
                <Button onClick={() => openEdit(selected)}>
                  <PencilSquareIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={canManage && editOpen} onClose={() => setEditOpen(false)} title={locale === 'ar' ? 'تعديل الحساب الافتراضي' : 'Edit Default Account'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'كود الحساب' : 'Account Code'} value={formData.accountCode} onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })} />
            <Input label={locale === 'ar' ? 'اسم الحساب (EN)' : 'Account Name (EN)'} value={formData.accountName} onChange={(e) => setFormData({ ...formData, accountName: e.target.value })} />
            <Input label={locale === 'ar' ? 'اسم الحساب (AR)' : 'Account Name (AR)'} value={formData.accountNameAr} onChange={(e) => setFormData({ ...formData, accountNameAr: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSave}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
