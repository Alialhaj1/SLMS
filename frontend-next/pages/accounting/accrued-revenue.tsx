import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  CurrencyDollarIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface AccruedRevenueItem {
  id: number;
  code: string;
  description: string;
  descriptionAr: string;
  customer: string;
  customerAr: string;
  contractRef: string;
  revenueType: 'service' | 'rental' | 'subscription' | 'milestone' | 'interest';
  period: string;
  accrualDate: string;
  recognitionDate: string;
  amount: number;
  recognizedAmount: number;
  pendingAmount: number;
  status: 'pending' | 'partial' | 'recognized' | 'reversed';
  notes: string;
}

const mockItems: AccruedRevenueItem[] = [
  {
    id: 1,
    code: 'AR-2024-001',
    description: 'Logistics Services - Q1 2024',
    descriptionAr: 'خدمات لوجستية - الربع الأول 2024',
    customer: 'ABC Trading Co.',
    customerAr: 'شركة ABC التجارية',
    contractRef: 'CON-2024-001',
    revenueType: 'service',
    period: 'Q1 2024',
    accrualDate: '2024-01-31',
    recognitionDate: '2024-02-15',
    amount: 150000,
    recognizedAmount: 100000,
    pendingAmount: 50000,
    status: 'partial',
    notes: 'Monthly logistics contract',
  },
  {
    id: 2,
    code: 'AR-2024-002',
    description: 'Warehouse Rental - January',
    descriptionAr: 'إيجار مستودع - يناير',
    customer: 'XYZ Logistics',
    customerAr: 'XYZ للخدمات اللوجستية',
    contractRef: 'RNT-2023-089',
    revenueType: 'rental',
    period: 'January 2024',
    accrualDate: '2024-01-31',
    recognitionDate: '2024-01-31',
    amount: 45000,
    recognizedAmount: 45000,
    pendingAmount: 0,
    status: 'recognized',
    notes: 'Annual warehouse lease',
  },
  {
    id: 3,
    code: 'AR-2024-003',
    description: 'Software Subscription - Annual',
    descriptionAr: 'اشتراك برمجي - سنوي',
    customer: 'Tech Solutions ME',
    customerAr: 'حلول التقنية الشرق الأوسط',
    contractRef: 'SUB-2024-012',
    revenueType: 'subscription',
    period: '2024',
    accrualDate: '2024-01-31',
    recognitionDate: '',
    amount: 120000,
    recognizedAmount: 0,
    pendingAmount: 120000,
    status: 'pending',
    notes: 'Deferred recognition over 12 months',
  },
  {
    id: 4,
    code: 'AR-2024-004',
    description: 'Project Milestone 2',
    descriptionAr: 'مرحلة المشروع الثانية',
    customer: 'Government Entity',
    customerAr: 'جهة حكومية',
    contractRef: 'PRJ-2023-056',
    revenueType: 'milestone',
    period: 'Q1 2024',
    accrualDate: '2024-01-25',
    recognitionDate: '2024-01-30',
    amount: 500000,
    recognizedAmount: 500000,
    pendingAmount: 0,
    status: 'recognized',
    notes: 'Milestone completed and approved',
  },
];

export default function AccruedRevenuePage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('accounting:manage');

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AccruedRevenueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AccruedRevenueItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    setTimeout(() => {
      setItems(mockItems);
      setLoading(false);
    }, 500);
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.descriptionAr.includes(searchQuery) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.revenueType === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200', label: 'Pending', labelAr: 'معلق' },
      partial: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', label: 'Partial', labelAr: 'جزئي' },
      recognized: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', label: 'Recognized', labelAr: 'معترف به' },
      reversed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', label: 'Reversed', labelAr: 'معكوس' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', config.bg, config.text)}>
        {locale === 'ar' ? config.labelAr : config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; labelAr: string }> = {
      service: { label: 'Service', labelAr: 'خدمة' },
      rental: { label: 'Rental', labelAr: 'إيجار' },
      subscription: { label: 'Subscription', labelAr: 'اشتراك' },
      milestone: { label: 'Milestone', labelAr: 'مرحلة' },
      interest: { label: 'Interest', labelAr: 'فائدة' },
    };
    const config = typeConfig[type] || typeConfig.service;
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
        {locale === 'ar' ? config.labelAr : config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDelete = () => {
    if (selectedItem) {
      setItems(items.filter(i => i.id !== selectedItem.id));
      showToast(locale === 'ar' ? 'تم حذف السجل بنجاح' : 'Record deleted successfully', 'success');
      setConfirmDelete(false);
      setSelectedItem(null);
    }
  };

  const handleRecognize = (item: AccruedRevenueItem) => {
    setItems(items.map(i => i.id === item.id ? { ...i, status: 'recognized' as const, recognizedAmount: i.amount, pendingAmount: 0, recognitionDate: new Date().toISOString().split('T')[0] } : i));
    showToast(locale === 'ar' ? 'تم الاعتراف بالإيراد بنجاح' : 'Revenue recognized successfully', 'success');
  };

  const totalAccrued = items.reduce((sum, i) => sum + i.amount, 0);
  const totalRecognized = items.reduce((sum, i) => sum + i.recognizedAmount, 0);
  const totalPending = items.reduce((sum, i) => sum + i.pendingAmount, 0);

  const stats = [
    { label: locale === 'ar' ? 'إجمالي المستحق' : 'Total Accrued', value: formatCurrency(totalAccrued), icon: CurrencyDollarIcon, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: locale === 'ar' ? 'المعترف به' : 'Recognized', value: formatCurrency(totalRecognized), icon: CheckCircleIcon, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: locale === 'ar' ? 'المعلق' : 'Pending', value: formatCurrency(totalPending), icon: ClockIcon, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
    { label: locale === 'ar' ? 'عدد السجلات' : 'Records', value: items.length.toString(), icon: DocumentTextIcon, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'الإيرادات المستحقة - SLMS' : 'Accrued Revenue - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'الإيرادات المستحقة' : 'Accrued Revenue'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة الإيرادات المستحقة والاعتراف بها' : 'Manage accrued revenue and recognition'}
              </p>
            </div>
          </div>
          {canManage && (
            <Button onClick={() => { setSelectedItem(null); setIsModalOpen(true); }}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {locale === 'ar' ? 'إضافة إيراد مستحق' : 'Add Accrued Revenue'}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className={clsx('p-2 rounded-lg', stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
              <option value="service">{locale === 'ar' ? 'خدمة' : 'Service'}</option>
              <option value="rental">{locale === 'ar' ? 'إيجار' : 'Rental'}</option>
              <option value="subscription">{locale === 'ar' ? 'اشتراك' : 'Subscription'}</option>
              <option value="milestone">{locale === 'ar' ? 'مرحلة' : 'Milestone'}</option>
              <option value="interest">{locale === 'ar' ? 'فائدة' : 'Interest'}</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
              <option value="partial">{locale === 'ar' ? 'جزئي' : 'Partial'}</option>
              <option value="recognized">{locale === 'ar' ? 'معترف به' : 'Recognized'}</option>
              <option value="reversed">{locale === 'ar' ? 'معكوس' : 'Reversed'}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد سجلات' : 'No records found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الكود' : 'Code'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الوصف' : 'Description'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المبلغ' : 'Amount'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'المعترف به' : 'Recognized'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white">{item.code}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900 dark:text-white">{locale === 'ar' ? item.descriptionAr : item.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.period}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{locale === 'ar' ? item.customerAr : item.customer}</td>
                      <td className="px-4 py-3">{getTypeBadge(item.revenueType)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(item.amount)}</td>
                      <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(item.recognizedAmount)}</td>
                      <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canManage && item.status !== 'recognized' && (
                            <button
                              onClick={() => handleRecognize(item)}
                              className="p-1 text-green-500 hover:text-green-600"
                              title={locale === 'ar' ? 'اعتراف' : 'Recognize'}
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canManage && (
                            <>
                              <button
                                onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}
                                className="p-1 text-gray-500 hover:text-blue-600"
                                title={locale === 'ar' ? 'تعديل' : 'Edit'}
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { setSelectedItem(item); setConfirmDelete(true); }}
                                className="p-1 text-gray-500 hover:text-red-600"
                                title={locale === 'ar' ? 'حذف' : 'Delete'}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
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

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? (locale === 'ar' ? 'تعديل الإيراد المستحق' : 'Edit Accrued Revenue') : (locale === 'ar' ? 'إضافة إيراد مستحق' : 'Add Accrued Revenue')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'الوصف بالإنجليزية' : 'Description (English)'} placeholder="Revenue description" defaultValue={selectedItem?.description} />
            <Input label={locale === 'ar' ? 'الوصف بالعربية' : 'Description (Arabic)'} placeholder="وصف الإيراد" defaultValue={selectedItem?.descriptionAr} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'العميل' : 'Customer'} placeholder="Customer name" defaultValue={selectedItem?.customer} />
            <Input label={locale === 'ar' ? 'مرجع العقد' : 'Contract Reference'} placeholder="CON-2024-001" defaultValue={selectedItem?.contractRef} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'نوع الإيراد' : 'Revenue Type'}</label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" defaultValue={selectedItem?.revenueType}>
                <option value="service">{locale === 'ar' ? 'خدمة' : 'Service'}</option>
                <option value="rental">{locale === 'ar' ? 'إيجار' : 'Rental'}</option>
                <option value="subscription">{locale === 'ar' ? 'اشتراك' : 'Subscription'}</option>
                <option value="milestone">{locale === 'ar' ? 'مرحلة' : 'Milestone'}</option>
                <option value="interest">{locale === 'ar' ? 'فائدة' : 'Interest'}</option>
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الفترة' : 'Period'} placeholder="Q1 2024" defaultValue={selectedItem?.period} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'تاريخ الاستحقاق' : 'Accrual Date'} type="date" defaultValue={selectedItem?.accrualDate} />
            <Input label={locale === 'ar' ? 'المبلغ' : 'Amount'} type="number" placeholder="0.00" defaultValue={selectedItem?.amount.toString()} />
          </div>
          <Input label={locale === 'ar' ? 'ملاحظات' : 'Notes'} placeholder={locale === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'} defaultValue={selectedItem?.notes} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => { setIsModalOpen(false); showToast(locale === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully', 'success'); }}>
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={locale === 'ar' ? 'حذف السجل' : 'Delete Record'}
        message={locale === 'ar' ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?'}
        confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
        variant="danger"
      />
    </MainLayout>
  );
}
