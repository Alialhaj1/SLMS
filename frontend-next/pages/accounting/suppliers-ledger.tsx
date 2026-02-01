import { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import {
  TruckIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface SupplierTransaction {
  id: number;
  date: string;
  reference: string;
  description: string;
  descriptionAr: string;
  type: 'invoice' | 'payment' | 'credit_note' | 'debit_note';
  debit: number;
  credit: number;
  balance: number;
}

interface Supplier {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  openingBalance: number;
  currentBalance: number;
  creditLimit: number;
  paymentTerms: number;
  lastTransactionDate: string;
  status: 'active' | 'on_hold' | 'blocked';
  transactions: SupplierTransaction[];
}

const mockSuppliers: Supplier[] = [
  {
    id: 1,
    code: 'SUP-001',
    name: 'Global Shipping Co.',
    nameAr: 'شركة الشحن العالمية',
    category: 'Logistics',
    categoryAr: 'خدمات لوجستية',
    openingBalance: 50000,
    currentBalance: 125000,
    creditLimit: 200000,
    paymentTerms: 30,
    lastTransactionDate: '2024-01-28',
    status: 'active',
    transactions: [
      { id: 1, date: '2024-01-28', reference: 'INV-2024-001', description: 'Shipping Services Jan', descriptionAr: 'خدمات شحن يناير', type: 'invoice', debit: 45000, credit: 0, balance: 125000 },
      { id: 2, date: '2024-01-20', reference: 'PAY-2024-015', description: 'Payment for Dec Invoice', descriptionAr: 'دفعة لفاتورة ديسمبر', type: 'payment', debit: 0, credit: 30000, balance: 80000 },
      { id: 3, date: '2024-01-15', reference: 'INV-2024-089', description: 'Customs Clearance', descriptionAr: 'تخليص جمركي', type: 'invoice', debit: 25000, credit: 0, balance: 110000 },
    ],
  },
  {
    id: 2,
    code: 'SUP-002',
    name: 'Office Solutions Ltd.',
    nameAr: 'حلول المكاتب المحدودة',
    category: 'Office Supplies',
    categoryAr: 'مستلزمات مكتبية',
    openingBalance: 5000,
    currentBalance: 8500,
    creditLimit: 25000,
    paymentTerms: 15,
    lastTransactionDate: '2024-01-25',
    status: 'active',
    transactions: [
      { id: 1, date: '2024-01-25', reference: 'INV-2024-156', description: 'Office Furniture', descriptionAr: 'أثاث مكتبي', type: 'invoice', debit: 12000, credit: 0, balance: 8500 },
      { id: 2, date: '2024-01-18', reference: 'PAY-2024-022', description: 'Partial Payment', descriptionAr: 'دفعة جزئية', type: 'payment', debit: 0, credit: 8500, balance: -3500 },
    ],
  },
  {
    id: 3,
    code: 'SUP-003',
    name: 'Tech Equipment ME',
    nameAr: 'معدات التكنولوجيا الشرق الأوسط',
    category: 'IT Equipment',
    categoryAr: 'معدات تقنية',
    openingBalance: 0,
    currentBalance: 75000,
    creditLimit: 100000,
    paymentTerms: 45,
    lastTransactionDate: '2024-01-22',
    status: 'on_hold',
    transactions: [
      { id: 1, date: '2024-01-22', reference: 'INV-2024-200', description: 'Server Equipment', descriptionAr: 'معدات خوادم', type: 'invoice', debit: 75000, credit: 0, balance: 75000 },
    ],
  },
  {
    id: 4,
    code: 'SUP-004',
    name: 'Maintenance Pro',
    nameAr: 'الصيانة المحترفة',
    category: 'Services',
    categoryAr: 'خدمات',
    openingBalance: 2000,
    currentBalance: -5000,
    creditLimit: 15000,
    paymentTerms: 30,
    lastTransactionDate: '2024-01-10',
    status: 'active',
    transactions: [
      { id: 1, date: '2024-01-10', reference: 'CN-2024-005', description: 'Credit Note - Service Refund', descriptionAr: 'إشعار دائن - استرداد خدمة', type: 'credit_note', debit: 0, credit: 7000, balance: -5000 },
    ],
  },
];

export default function SuppliersLedgerPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<number>>(new Set());
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    setTimeout(() => {
      setSuppliers(mockSuppliers);
      setLoading(false);
    }, 500);
  }, []);

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.nameAr.includes(searchQuery) ||
      supplier.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || supplier.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || supplier.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedSuppliers);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSuppliers(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
      active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', label: 'Active', labelAr: 'نشط' },
      on_hold: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200', label: 'On Hold', labelAr: 'موقوف' },
      blocked: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', label: 'Blocked', labelAr: 'محظور' },
    };
    const config = statusConfig[status] || statusConfig.active;
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', config.bg, config.text)}>
        {locale === 'ar' ? config.labelAr : config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
      invoice: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', label: 'Invoice', labelAr: 'فاتورة' },
      payment: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', label: 'Payment', labelAr: 'دفعة' },
      credit_note: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-200', label: 'Credit Note', labelAr: 'إشعار دائن' },
      debit_note: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-200', label: 'Debit Note', labelAr: 'إشعار مدين' },
    };
    const config = typeConfig[type] || typeConfig.invoice;
    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', config.bg, config.text)}>
        {locale === 'ar' ? config.labelAr : config.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalPayables = suppliers.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0);
  const totalAdvances = suppliers.reduce((sum, s) => sum + (s.currentBalance < 0 ? Math.abs(s.currentBalance) : 0), 0);
  const overdueSuppliersCount = suppliers.filter(s => s.currentBalance > 0 && s.status !== 'active').length;

  const stats = [
    { label: locale === 'ar' ? 'إجمالي الموردين' : 'Total Suppliers', value: suppliers.length.toString(), icon: TruckIcon, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: locale === 'ar' ? 'إجمالي المستحقات' : 'Total Payables', value: formatCurrency(totalPayables), icon: CurrencyDollarIcon, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
    { label: locale === 'ar' ? 'السلف المدفوعة' : 'Advances Paid', value: formatCurrency(totalAdvances), icon: CheckCircleIcon, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: locale === 'ar' ? 'موردون متأخرون' : 'Overdue', value: overdueSuppliersCount.toString(), icon: ExclamationTriangleIcon, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'كشف حساب الموردين - SLMS' : 'Suppliers Ledger - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TruckIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'كشف حساب الموردين' : 'Suppliers Ledger'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'عرض أرصدة وحركات الموردين' : 'View supplier balances and transactions'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري تصدير البيانات...' : 'Exporting data...', 'info')}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </Button>
            <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري الطباعة...' : 'Printing...', 'info')}>
              <PrinterIcon className="h-4 w-4 mr-2" />
              {locale === 'ar' ? 'طباعة' : 'Print'}
            </Button>
          </div>
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
                placeholder={locale === 'ar' ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
              <option value="Logistics">{locale === 'ar' ? 'خدمات لوجستية' : 'Logistics'}</option>
              <option value="Office Supplies">{locale === 'ar' ? 'مستلزمات مكتبية' : 'Office Supplies'}</option>
              <option value="IT Equipment">{locale === 'ar' ? 'معدات تقنية' : 'IT Equipment'}</option>
              <option value="Services">{locale === 'ar' ? 'خدمات' : 'Services'}</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
              <option value="on_hold">{locale === 'ar' ? 'موقوف' : 'On Hold'}</option>
              <option value="blocked">{locale === 'ar' ? 'محظور' : 'Blocked'}</option>
            </select>
          </div>
        </div>

        {/* Suppliers List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center">
              <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا يوجد موردون' : 'No suppliers found'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id}>
                  {/* Supplier Header Row */}
                  <div 
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => toggleExpanded(supplier.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                          {expandedSuppliers.has(supplier.id) ? (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{supplier.code}</span>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {locale === 'ar' ? supplier.nameAr : supplier.name}
                            </h3>
                            {getStatusBadge(supplier.status)}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {locale === 'ar' ? supplier.categoryAr : supplier.category} • 
                            {locale === 'ar' ? ` آخر حركة: ${supplier.lastTransactionDate}` : ` Last: ${supplier.lastTransactionDate}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</p>
                        <p className={clsx(
                          'text-lg font-bold',
                          supplier.currentBalance > 0 ? 'text-red-600' : supplier.currentBalance < 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'
                        )}>
                          {formatCurrency(supplier.currentBalance)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Transactions */}
                  {expandedSuppliers.has(supplier.id) && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 px-4 pb-4">
                      <div className="ml-8 overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                              <th className="py-2 text-left">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                              <th className="py-2 text-left">{locale === 'ar' ? 'المرجع' : 'Reference'}</th>
                              <th className="py-2 text-left">{locale === 'ar' ? 'البيان' : 'Description'}</th>
                              <th className="py-2 text-left">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                              <th className="py-2 text-right">{locale === 'ar' ? 'مدين' : 'Debit'}</th>
                              <th className="py-2 text-right">{locale === 'ar' ? 'دائن' : 'Credit'}</th>
                              <th className="py-2 text-right">{locale === 'ar' ? 'الرصيد' : 'Balance'}</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            {supplier.transactions.map((tx) => (
                              <tr key={tx.id} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="py-2 text-gray-900 dark:text-white">{tx.date}</td>
                                <td className="py-2 font-mono text-gray-900 dark:text-white">{tx.reference}</td>
                                <td className="py-2 text-gray-900 dark:text-white">{locale === 'ar' ? tx.descriptionAr : tx.description}</td>
                                <td className="py-2">{getTypeBadge(tx.type)}</td>
                                <td className="py-2 text-right text-red-600">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                                <td className="py-2 text-right text-green-600">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                                <td className="py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(tx.balance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="ml-8 mt-4 flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => { setSelectedSupplier(supplier); setIsDetailModalOpen(true); }}>
                          <DocumentTextIcon className="h-4 w-4 mr-1" />
                          {locale === 'ar' ? 'كشف تفصيلي' : 'Full Statement'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={locale === 'ar' ? 'كشف حساب تفصيلي' : 'Detailed Statement'}
        size="lg"
      >
        {selectedSupplier && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المورد' : 'Supplier'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedSupplier.nameAr : selectedSupplier.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الكود' : 'Code'}</p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">{selectedSupplier.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'حد الائتمان' : 'Credit Limit'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedSupplier.creditLimit)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedSupplier.paymentTerms} {locale === 'ar' ? 'يوم' : 'days'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(selectedSupplier.openingBalance)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</p>
                <p className={clsx('text-lg font-bold', selectedSupplier.currentBalance > 0 ? 'text-red-600' : 'text-green-600')}>
                  {formatCurrency(selectedSupplier.currentBalance)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الرصيد المتاح' : 'Available Credit'}</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedSupplier.creditLimit - selectedSupplier.currentBalance)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري الطباعة...' : 'Printing...', 'info')}>
                <PrinterIcon className="h-4 w-4 mr-1" />
                {locale === 'ar' ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري التصدير...' : 'Exporting...', 'info')}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                {locale === 'ar' ? 'تصدير PDF' : 'Export PDF'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
