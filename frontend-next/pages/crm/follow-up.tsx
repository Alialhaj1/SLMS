import { useMemo, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  ClockIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type FollowUpStatus = 'open' | 'in_progress' | 'done' | 'overdue';
type FollowUpPriority = 'low' | 'medium' | 'high';

interface FollowUpItem {
  id: number;
  reference: string;
  customer: string;
  customerAr: string;
  subject: string;
  subjectAr: string;
  dueDate: string;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  owner: string;
}

const mockFollowUps: FollowUpItem[] = [
  { id: 1, reference: 'FU-2025-001', customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', subject: 'Confirm delivery window', subjectAr: 'تأكيد موعد التسليم', dueDate: '2025-12-30', status: 'open', priority: 'high', owner: 'Sales Team' },
  { id: 2, reference: 'FU-2025-002', customer: 'Saudi Logistics Co.', customerAr: 'الشركة السعودية للخدمات اللوجستية', subject: 'Collect missing documents', subjectAr: 'استكمال المستندات الناقصة', dueDate: '2025-12-28', status: 'overdue', priority: 'high', owner: 'Operations' },
  { id: 3, reference: 'FU-2025-003', customer: 'Global Import Export', customerAr: 'الاستيراد والتصدير العالمية', subject: 'Quote follow-up', subjectAr: 'متابعة عرض السعر', dueDate: '2026-01-03', status: 'in_progress', priority: 'medium', owner: 'Account Manager' },
  { id: 4, reference: 'FU-2025-004', customer: 'Premium Shipping LLC', customerAr: 'الشحن المتميز ذ.م.م', subject: 'Schedule meeting', subjectAr: 'تحديد موعد اجتماع', dueDate: '2026-01-10', status: 'open', priority: 'low', owner: 'Sales Team' },
  { id: 5, reference: 'FU-2025-005', customer: 'Al-Faisal Trading', customerAr: 'شركة الفيصل للتجارة', subject: 'Close opportunity', subjectAr: 'إغلاق الفرصة', dueDate: '2025-12-26', status: 'done', priority: 'medium', owner: 'Account Manager' },
];

export default function FollowUpPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();

  const [items] = useState<FollowUpItem[]>(mockFollowUps);
  const [selectedStatus, setSelectedStatus] = useState<'all' | FollowUpStatus>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | FollowUpPriority>('all');
  const [selected, setSelected] = useState<FollowUpItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    customerAr: '',
    subject: '',
    subjectAr: '',
    dueDate: '',
    priority: 'medium' as FollowUpPriority,
    owner: '',
    status: 'open' as FollowUpStatus,
  });

  const filtered = useMemo(() => {
    return items.filter(i => {
      const sOk = selectedStatus === 'all' || i.status === selectedStatus;
      const pOk = selectedPriority === 'all' || i.priority === selectedPriority;
      return sOk && pOk;
    });
  }, [items, selectedStatus, selectedPriority]);

  const getStatusBadge = (status: FollowUpStatus) => {
    const styles: Record<FollowUpStatus, string> = {
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<FollowUpStatus, { en: string; ar: string }> = {
      open: { en: 'Open', ar: 'مفتوح' },
      in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
      done: { en: 'Done', ar: 'منجز' },
      overdue: { en: 'Overdue', ar: 'متأخر' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status].ar : labels[status].en}
      </span>
    );
  };

  const getPriorityBadge = (priority: FollowUpPriority) => {
    const styles: Record<FollowUpPriority, string> = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<FollowUpPriority, { en: string; ar: string }> = {
      low: { en: 'Low', ar: 'منخفض' },
      medium: { en: 'Medium', ar: 'متوسط' },
      high: { en: 'High', ar: 'مرتفع' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[priority])}>
        {locale === 'ar' ? labels[priority].ar : labels[priority].en}
      </span>
    );
  };

  const openCount = items.filter(i => i.status === 'open' || i.status === 'in_progress').length;
  const overdueCount = items.filter(i => i.status === 'overdue').length;
  const doneCount = items.filter(i => i.status === 'done').length;
  const highPriority = items.filter(i => i.priority === 'high').length;

  const handleCreate = () => {
    showToast(locale === 'ar' ? 'تم الإنشاء (تجريبي)' : 'Created (demo)', 'success');
    setCreateOpen(false);
    setFormData({ customer: '', customerAr: '', subject: '', subjectAr: '', dueDate: '', priority: 'medium', owner: '', status: 'open' });
  };

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'المتابعة - SLMS' : 'Follow Up - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <ClockIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{locale === 'ar' ? 'المتابعة' : 'Follow Up'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'إدارة مهام المتابعة مع العملاء والمستندات والمكالمات' : 'Manage follow-ups for customers, documents, and calls'}</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            {locale === 'ar' ? 'مهمة جديدة' : 'New Task'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><ChatBubbleBottomCenterTextIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'مفتوحة' : 'Open'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{openCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600"><XCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متأخرة' : 'Overdue'}</p>
                <p className="text-xl font-semibold text-red-600">{overdueCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'منجزة' : 'Done'}</p>
                <p className="text-xl font-semibold text-green-600">{doneCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600"><CalendarDaysIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'أولوية عالية' : 'High Priority'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{highPriority}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="open">{locale === 'ar' ? 'مفتوح' : 'Open'}</option>
                <option value="in_progress">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                <option value="done">{locale === 'ar' ? 'منجز' : 'Done'}</option>
                <option value="overdue">{locale === 'ar' ? 'متأخر' : 'Overdue'}</option>
              </select>
              <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value as any)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'كل الأولويات' : 'All Priority'}</option>
                <option value="low">{locale === 'ar' ? 'منخفض' : 'Low'}</option>
                <option value="medium">{locale === 'ar' ? 'متوسط' : 'Medium'}</option>
                <option value="high">{locale === 'ar' ? 'مرتفع' : 'High'}</option>
              </select>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المرجع' : 'Ref'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الموضوع' : 'Subject'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تاريخ الاستحقاق' : 'Due'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الأولوية' : 'Priority'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المالك' : 'Owner'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{i.reference}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? i.customerAr : i.customer}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? i.subjectAr : i.subject}</td>
                    <td className="px-4 py-3 text-gray-500">{i.dueDate}</td>
                    <td className="px-4 py-3">{getPriorityBadge(i.priority)}</td>
                    <td className="px-4 py-3">{getStatusBadge(i.status)}</td>
                    <td className="px-4 py-3 text-gray-500">{i.owner}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(i)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تعديل (تجريبي)' : 'Edit (demo)', 'info')}><PencilIcon className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={locale === 'ar' ? 'تفاصيل المتابعة' : 'Follow-up Details'} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.reference}</h3>
                <p className="text-sm text-gray-500">{locale === 'ar' ? selected.customerAr : selected.customer}</p>
              </div>
              <div className="flex items-center gap-2">
                {getPriorityBadge(selected.priority)}
                {getStatusBadge(selected.status)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الموضوع' : 'Subject'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selected.subjectAr : selected.subject}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الاستحقاق' : 'Due date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.dueDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المالك' : 'Owner'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selected.owner}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الإجراء' : 'Action'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? 'تحديث الحالة/إضافة ملاحظة' : 'Update status / add note'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم التحديث (تجريبي)' : 'Updated (demo)', 'success')}>
                <CheckCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تمييز كمنجز' : 'Mark Done'}
              </Button>
              <Button variant="danger" onClick={() => showToast(locale === 'ar' ? 'تم الإلغاء (تجريبي)' : 'Cancelled (demo)', 'error')}>
                <XCircleIcon className="h-4 w-4" />
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={locale === 'ar' ? 'مهمة متابعة جديدة' : 'New Follow-up Task'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'العميل (EN)' : 'Customer (EN)'} value={formData.customer} onChange={(e) => setFormData({ ...formData, customer: e.target.value })} />
            <Input label={locale === 'ar' ? 'العميل (AR)' : 'Customer (AR)'} value={formData.customerAr} onChange={(e) => setFormData({ ...formData, customerAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'الموضوع (EN)' : 'Subject (EN)'} value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
            <Input label={locale === 'ar' ? 'الموضوع (AR)' : 'Subject (AR)'} value={formData.subjectAr} onChange={(e) => setFormData({ ...formData, subjectAr: e.target.value })} />
            <Input label={locale === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'} value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} placeholder="YYYY-MM-DD" />
            <Input label={locale === 'ar' ? 'المالك' : 'Owner'} value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} placeholder={locale === 'ar' ? 'الفريق/المستخدم' : 'Team/User'} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الأولوية' : 'Priority'}</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })} className="input">
                <option value="low">{locale === 'ar' ? 'منخفض' : 'Low'}</option>
                <option value="medium">{locale === 'ar' ? 'متوسط' : 'Medium'}</option>
                <option value="high">{locale === 'ar' ? 'مرتفع' : 'High'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="input">
                <option value="open">{locale === 'ar' ? 'مفتوح' : 'Open'}</option>
                <option value="in_progress">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                <option value="done">{locale === 'ar' ? 'منجز' : 'Done'}</option>
                <option value="overdue">{locale === 'ar' ? 'متأخر' : 'Overdue'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleCreate}>{locale === 'ar' ? 'إنشاء' : 'Create'}</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
