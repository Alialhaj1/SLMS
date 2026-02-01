import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ComplianceItem {
  id: number;
  name: string;
  nameAr: string;
  category: 'license' | 'certificate' | 'regulation' | 'audit';
  status: 'compliant' | 'non-compliant' | 'pending' | 'expiring';
  expiryDate: string | null;
  daysRemaining: number | null;
  lastReview: string;
  nextReview: string;
  responsible: string;
  responsibleAr: string;
}

const mockItems: ComplianceItem[] = [
  { id: 1, name: 'Customs Broker License', nameAr: 'رخصة مخلص جمركي', category: 'license', status: 'compliant', expiryDate: '2025-06-30', daysRemaining: 518, lastReview: '2024-01-15', nextReview: '2024-07-15', responsible: 'Legal Dept', responsibleAr: 'الإدارة القانونية' },
  { id: 2, name: 'ISO 9001 Certification', nameAr: 'شهادة ISO 9001', category: 'certificate', status: 'compliant', expiryDate: '2025-12-31', daysRemaining: 702, lastReview: '2024-01-10', nextReview: '2024-12-10', responsible: 'Quality Dept', responsibleAr: 'إدارة الجودة' },
  { id: 3, name: 'SASO Compliance', nameAr: 'امتثال ساسو', category: 'regulation', status: 'expiring', expiryDate: '2024-03-15', daysRemaining: 46, lastReview: '2024-01-20', nextReview: '2024-02-20', responsible: 'Compliance Officer', responsibleAr: 'مسؤول الامتثال' },
  { id: 4, name: 'Annual Financial Audit', nameAr: 'التدقيق المالي السنوي', category: 'audit', status: 'pending', expiryDate: null, daysRemaining: null, lastReview: '2023-12-31', nextReview: '2024-02-28', responsible: 'Finance Dept', responsibleAr: 'الإدارة المالية' },
  { id: 5, name: 'Trade License', nameAr: 'الرخصة التجارية', category: 'license', status: 'compliant', expiryDate: '2024-12-31', daysRemaining: 337, lastReview: '2024-01-05', nextReview: '2024-06-05', responsible: 'Admin Dept', responsibleAr: 'الإدارة' },
  { id: 6, name: 'VAT Registration', nameAr: 'التسجيل في الضريبة', category: 'regulation', status: 'compliant', expiryDate: null, daysRemaining: null, lastReview: '2024-01-01', nextReview: '2024-12-01', responsible: 'Finance Dept', responsibleAr: 'الإدارة المالية' },
  { id: 7, name: 'Data Protection Audit', nameAr: 'تدقيق حماية البيانات', category: 'audit', status: 'non-compliant', expiryDate: null, daysRemaining: null, lastReview: '2023-11-15', nextReview: '2024-02-15', responsible: 'IT Dept', responsibleAr: 'إدارة تقنية المعلومات' },
  { id: 8, name: 'Fire Safety Certificate', nameAr: 'شهادة السلامة من الحريق', category: 'certificate', status: 'expiring', expiryDate: '2024-02-28', daysRemaining: 31, lastReview: '2023-12-20', nextReview: '2024-02-01', responsible: 'Facilities', responsibleAr: 'إدارة المرافق' },
];

export default function ComplianceReportsPage() {
  const { t, locale } = useTranslation();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const [items] = useState<ComplianceItem[]>(mockItems);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);

  const categories = [
    { value: 'all', label: 'All', labelAr: 'الكل' },
    { value: 'license', label: 'Licenses', labelAr: 'التراخيص' },
    { value: 'certificate', label: 'Certificates', labelAr: 'الشهادات' },
    { value: 'regulation', label: 'Regulations', labelAr: 'اللوائح' },
    { value: 'audit', label: 'Audits', labelAr: 'التدقيق' },
  ];

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    return matchesCategory && matchesStatus;
  });

  const handleExport = () => {
    showToast(locale === 'ar' ? 'جاري التصدير...' : 'Exporting...', 'info');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'non-compliant': return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'expiring': return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      compliant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'non-compliant': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      expiring: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      compliant: { en: 'Compliant', ar: 'متوافق' },
      'non-compliant': { en: 'Non-Compliant', ar: 'غير متوافق' },
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      expiring: { en: 'Expiring', ar: 'قارب على الانتهاء' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      license: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      certificate: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      regulation: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      audit: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    const labels: Record<string, { ar: string }> = {
      license: { ar: 'ترخيص' },
      certificate: { ar: 'شهادة' },
      regulation: { ar: 'لائحة' },
      audit: { ar: 'تدقيق' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full capitalize', styles[category])}>
        {locale === 'ar' ? labels[category]?.ar : category}
      </span>
    );
  };

  const compliantCount = items.filter(i => i.status === 'compliant').length;
  const nonCompliantCount = items.filter(i => i.status === 'non-compliant').length;
  const expiringCount = items.filter(i => i.status === 'expiring').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const complianceRate = ((compliantCount / items.length) * 100).toFixed(1);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تقارير الامتثال - SLMS' : 'Compliance Reports - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'تقارير الامتثال' : 'Compliance Reports'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'مراقبة حالة الامتثال والتراخيص' : 'Monitor compliance and license status'}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'تصدير' : 'Export'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                <ChartBarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'معدل الامتثال' : 'Compliance Rate'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{complianceRate}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'متوافق' : 'Compliant'}</p>
                <p className="text-xl font-semibold text-green-600">{compliantCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600">
                <XCircleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'غير متوافق' : 'Non-Compliant'}</p>
                <p className="text-xl font-semibold text-red-600">{nonCompliantCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                <ExclamationTriangleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قارب على الانتهاء' : 'Expiring'}</p>
                <p className="text-xl font-semibold text-orange-600">{expiringCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600">
                <ClockIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</p>
                <p className="text-xl font-semibold text-yellow-600">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'الفئة' : 'Category'}</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{locale === 'ar' ? cat.labelAr : cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="compliant">{locale === 'ar' ? 'متوافق' : 'Compliant'}</option>
                <option value="non-compliant">{locale === 'ar' ? 'غير متوافق' : 'Non-Compliant'}</option>
                <option value="expiring">{locale === 'ar' ? 'قارب على الانتهاء' : 'Expiring'}</option>
                <option value="pending">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Compliance Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'البند' : 'Item'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المسؤول' : 'Responsible'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? item.nameAr : item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getCategoryBadge(item.category)}</td>
                    <td className="px-4 py-3">
                      {item.expiryDate ? (
                        <div>
                          <span className="text-gray-900 dark:text-white">{item.expiryDate}</span>
                          {item.daysRemaining !== null && item.daysRemaining <= 60 && (
                            <p className="text-xs text-orange-500">{item.daysRemaining} {locale === 'ar' ? 'يوم متبقي' : 'days left'}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{locale === 'ar' ? item.responsibleAr : item.responsible}</td>
                    <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedItem(item)}>
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

      {/* Item Detail Modal */}
      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={locale === 'ar' ? 'تفاصيل الامتثال' : 'Compliance Details'} size="lg">
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedItem.status)}
                <h3 className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedItem.nameAr : selectedItem.name}</h3>
              </div>
              {getStatusBadge(selectedItem.status)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الفئة' : 'Category'}</p>
                <p className="font-medium mt-1">{getCategoryBadge(selectedItem.category)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المسؤول' : 'Responsible'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedItem.responsibleAr : selectedItem.responsible}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'آخر مراجعة' : 'Last Review'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedItem.lastReview}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المراجعة القادمة' : 'Next Review'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedItem.nextReview}</p>
              </div>
              {selectedItem.expiryDate && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedItem.expiryDate} ({selectedItem.daysRemaining} {locale === 'ar' ? 'يوم متبقي' : 'days remaining'})</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button>{locale === 'ar' ? 'تحديث الحالة' : 'Update Status'}</Button>
              <Button variant="secondary" onClick={handleExport}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                {locale === 'ar' ? 'تصدير' : 'Export'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
