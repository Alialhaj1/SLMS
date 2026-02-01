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
import { DocumentDuplicateIcon, PlusIcon, EyeIcon } from '@heroicons/react/24/outline';

interface InvoiceTemplate { id: number; code: string; nameEn: string; nameAr: string; isActive: boolean; }

const mockTemplates: InvoiceTemplate[] = [
  { id: 1, code: 'TPL-001', nameEn: 'Standard Invoice', nameAr: 'فاتورة قياسية', isActive: true },
  { id: 2, code: 'TPL-002', nameEn: 'Tax Invoice', nameAr: 'فاتورة ضريبية', isActive: true },
  { id: 3, code: 'TPL-003', nameEn: 'Simplified Invoice', nameAr: 'فاتورة مبسطة', isActive: true },
];

export default function InvoiceTemplatesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canView = hasAnyPermission([MenuPermissions.MasterData.InvoiceTemplates.View]);
  const canCreate = hasAnyPermission([MenuPermissions.MasterData.InvoiceTemplates.Create]);

  const [items] = useState<InvoiceTemplate[]>(mockTemplates);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InvoiceTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', nameEn: '', nameAr: '' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((t) => !q || t.code.toLowerCase().includes(q) || t.nameEn.toLowerCase().includes(q) || t.nameAr.toLowerCase().includes(q));
  }, [items, search]);

  if (!canView) {
    return (
      <MainLayout>
        <Head><title>{locale === 'ar' ? 'قوالب الفواتير - SLMS' : 'Invoice Templates - SLMS'}</title></Head>
        <div className="text-center py-12"><DocumentDuplicateIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" /><h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</h2></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head><title>{locale === 'ar' ? 'قوالب الفواتير - SLMS' : 'Invoice Templates - SLMS'}</title></Head>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3"><div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><DocumentDuplicateIcon className="h-6 w-6 text-purple-600 dark:text-purple-300" /></div><div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'قوالب الفواتير' : 'Invoice Templates'}</h1><p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قوالب تصميم الفواتير' : 'Invoice design templates'}</p></div></div>
          {canCreate && <Button onClick={() => setCreateOpen(true)}><PlusIcon className="h-4 w-4" />{locale === 'ar' ? 'إضافة قالب' : 'Add Template'}</Button>}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"><Input label={locale === 'ar' ? 'بحث' : 'Search'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={locale === 'ar' ? 'بحث...' : 'Search...'} /></div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"><table className="w-full"><thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الاسم' : 'Name'}</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-700">{filtered.map((t) => (<tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.code}</td><td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? t.nameAr : t.nameEn}</td><td className="px-4 py-3"><Button size="sm" variant="secondary" onClick={() => setSelected(t)}><EyeIcon className="h-4 w-4" /></Button></td></tr>))}</tbody></table></div>
      </div>
      <Modal isOpen={!!selected && !createOpen} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل' : 'Details'} size="md">{selected && <div className="space-y-3"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">{locale === 'ar' ? selected.nameAr : selected.nameEn}</h3><p className="text-sm text-gray-500">{selected.code}</p></div>}</Modal>
      <Modal isOpen={canCreate && createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'قالب جديد' : 'New Template'} size="md"><div className="space-y-4"><Input label={locale === 'ar' ? 'الكود' : 'Code'} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} /><Input label={locale === 'ar' ? 'الاسم (EN)' : 'Name (EN)'} value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} /><Input label={locale === 'ar' ? 'الاسم (AR)' : 'Name (AR)'} value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} /><div className="flex gap-2 pt-4 border-t dark:border-gray-700"><Button onClick={() => { showToast(locale === 'ar' ? 'تمت الإضافة (تجريبي)' : 'Added (demo)', 'success'); setCreateOpen(false); }}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button><Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button></div></div></Modal>
    </MainLayout>
  );
}
