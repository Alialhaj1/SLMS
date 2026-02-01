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
  BanknotesIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  PrinterIcon,
  CalculatorIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface CashInventorySession {
  id: number;
  sessionNumber: string;
  date: string;
  cashAccount: string;
  cashAccountAr: string;
  countedBy: string;
  verifiedBy: string;
  systemBalance: number;
  actualBalance: number;
  difference: number;
  status: 'in_progress' | 'completed' | 'discrepancy' | 'approved';
  notes: string;
  denominations: CashDenomination[];
}

interface CashDenomination {
  denomination: number;
  currency: string;
  quantity: number;
  total: number;
}

const mockSessions: CashInventorySession[] = [
  {
    id: 1,
    sessionNumber: 'CI-2024-001',
    date: '2024-01-28',
    cashAccount: 'Main Cash',
    cashAccountAr: 'الصندوق الرئيسي',
    countedBy: 'Ahmed Ali',
    verifiedBy: 'Mohammed Hassan',
    systemBalance: 175000,
    actualBalance: 175000,
    difference: 0,
    status: 'approved',
    notes: 'Daily cash count - balanced',
    denominations: [
      { denomination: 500, currency: 'SAR', quantity: 200, total: 100000 },
      { denomination: 100, currency: 'SAR', quantity: 500, total: 50000 },
      { denomination: 50, currency: 'SAR', quantity: 300, total: 15000 },
      { denomination: 10, currency: 'SAR', quantity: 800, total: 8000 },
      { denomination: 5, currency: 'SAR', quantity: 400, total: 2000 },
    ],
  },
  {
    id: 2,
    sessionNumber: 'CI-2024-002',
    date: '2024-01-27',
    cashAccount: 'Main Cash',
    cashAccountAr: 'الصندوق الرئيسي',
    countedBy: 'Sara Ahmed',
    verifiedBy: 'Mohammed Hassan',
    systemBalance: 168500,
    actualBalance: 168350,
    difference: -150,
    status: 'discrepancy',
    notes: 'Small shortage - under investigation',
    denominations: [
      { denomination: 500, currency: 'SAR', quantity: 195, total: 97500 },
      { denomination: 100, currency: 'SAR', quantity: 480, total: 48000 },
      { denomination: 50, currency: 'SAR', quantity: 290, total: 14500 },
      { denomination: 10, currency: 'SAR', quantity: 750, total: 7500 },
      { denomination: 5, currency: 'SAR', quantity: 170, total: 850 },
    ],
  },
  {
    id: 3,
    sessionNumber: 'CI-2024-003',
    date: '2024-01-28',
    cashAccount: 'Petty Cash',
    cashAccountAr: 'صندوق المصروفات النثرية',
    countedBy: 'Fatima Omar',
    verifiedBy: '',
    systemBalance: 5000,
    actualBalance: 0,
    difference: 0,
    status: 'in_progress',
    notes: 'Petty cash count in progress',
    denominations: [],
  },
];

export default function CashInventoryPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('accounting:manage');

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<CashInventorySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CashInventorySession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Denomination count state
  const [denominationCounts, setDenominationCounts] = useState({
    d500: 0, d100: 0, d50: 0, d20: 0, d10: 0, d5: 0, d1: 0,
    c50: 0, c25: 0, c10: 0, c5: 0,
  });

  useEffect(() => {
    setTimeout(() => {
      setSessions(mockSessions);
      setLoading(false);
    }, 500);
  }, []);

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.sessionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.cashAccount.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.countedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string; labelAr: string; icon: any }> = {
      in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', label: 'In Progress', labelAr: 'قيد التنفيذ', icon: ClockIcon },
      completed: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200', label: 'Completed', labelAr: 'مكتمل', icon: CheckCircleIcon },
      discrepancy: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', label: 'Discrepancy', labelAr: 'تباين', icon: ExclamationTriangleIcon },
      approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', label: 'Approved', labelAr: 'معتمد', icon: CheckCircleIcon },
    };
    const config = statusConfig[status] || statusConfig.in_progress;
    const Icon = config.icon;
    return (
      <span className={clsx('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full', config.bg, config.text)}>
        <Icon className="h-3 w-3" />
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

  const calculateTotal = () => {
    return (denominationCounts.d500 * 500) + (denominationCounts.d100 * 100) + 
           (denominationCounts.d50 * 50) + (denominationCounts.d20 * 20) + 
           (denominationCounts.d10 * 10) + (denominationCounts.d5 * 5) + 
           (denominationCounts.d1 * 1) + (denominationCounts.c50 * 0.5) + 
           (denominationCounts.c25 * 0.25) + (denominationCounts.c10 * 0.1) + 
           (denominationCounts.c5 * 0.05);
  };

  const handleApprove = () => {
    if (selectedSession) {
      setSessions(sessions.map(s => s.id === selectedSession.id ? { ...s, status: 'approved' as const, verifiedBy: 'Current User' } : s));
      showToast(locale === 'ar' ? 'تم اعتماد جرد النقدية' : 'Cash inventory approved', 'success');
      setConfirmApprove(false);
      setSelectedSession(null);
    }
  };

  const approvedSessions = sessions.filter(s => s.status === 'approved').length;
  const discrepancySessions = sessions.filter(s => s.status === 'discrepancy').length;
  const totalDifference = sessions.reduce((sum, s) => sum + s.difference, 0);

  const stats = [
    { label: locale === 'ar' ? 'جلسات الجرد' : 'Count Sessions', value: sessions.length.toString(), icon: DocumentTextIcon, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: locale === 'ar' ? 'معتمدة' : 'Approved', value: approvedSessions.toString(), icon: CheckCircleIcon, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: locale === 'ar' ? 'تباينات' : 'Discrepancies', value: discrepancySessions.toString(), icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
    { label: locale === 'ar' ? 'إجمالي الفروقات' : 'Total Difference', value: formatCurrency(totalDifference), icon: CalculatorIcon, color: totalDifference === 0 ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'جرد النقدية - SLMS' : 'Cash Inventory - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'جرد النقدية' : 'Cash Inventory'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'جرد ومطابقة الأرصدة النقدية' : 'Count and reconcile cash balances'}
              </p>
            </div>
          </div>
          {canManage && (
            <Button onClick={() => { setSelectedSession(null); setIsCountModalOpen(true); }}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {locale === 'ar' ? 'جرد جديد' : 'New Count'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="in_progress">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
              <option value="completed">{locale === 'ar' ? 'مكتمل' : 'Completed'}</option>
              <option value="discrepancy">{locale === 'ar' ? 'تباين' : 'Discrepancy'}</option>
              <option value="approved">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
            </select>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center">
              <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'لا توجد جلسات جرد' : 'No inventory sessions'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSessions.map((session) => (
                <div key={session.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm text-gray-500">{session.sessionNumber}</span>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {locale === 'ar' ? session.cashAccountAr : session.cashAccount}
                        </h3>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'التاريخ' : 'Date'}</p>
                          <p className="font-medium text-gray-900 dark:text-white">{session.date}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رصيد النظام' : 'System Balance'}</p>
                          <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(session.systemBalance)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الرصيد الفعلي' : 'Actual Balance'}</p>
                          <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(session.actualBalance)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفرق' : 'Difference'}</p>
                          <p className={clsx('font-medium', session.difference === 0 ? 'text-green-600' : 'text-red-600')}>
                            {formatCurrency(session.difference)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setSelectedSession(session); setIsModalOpen(true); }}>
                        {locale === 'ar' ? 'التفاصيل' : 'Details'}
                      </Button>
                      {canManage && session.status === 'completed' && (
                        <Button size="sm" onClick={() => { setSelectedSession(session); setConfirmApprove(true); }}>
                          {locale === 'ar' ? 'اعتماد' : 'Approve'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={locale === 'ar' ? 'تفاصيل الجرد' : 'Inventory Details'}
        size="lg"
      >
        {selectedSession && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رقم الجلسة' : 'Session Number'}</p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">{selectedSession.sessionNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'التاريخ' : 'Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedSession.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الجارد' : 'Counted By'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedSession.countedBy}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'المدقق' : 'Verified By'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedSession.verifiedBy || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'رصيد النظام' : 'System Balance'}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(selectedSession.systemBalance)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الرصيد الفعلي' : 'Actual Balance'}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(selectedSession.actualBalance)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الفرق' : 'Difference'}</p>
                <p className={clsx('text-lg font-bold', selectedSession.difference === 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(selectedSession.difference)}
                </p>
              </div>
            </div>

            {selectedSession.denominations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">{locale === 'ar' ? 'تفاصيل الفئات' : 'Denomination Breakdown'}</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left">{locale === 'ar' ? 'الفئة' : 'Denomination'}</th>
                        <th className="px-4 py-2 text-right">{locale === 'ar' ? 'العدد' : 'Quantity'}</th>
                        <th className="px-4 py-2 text-right">{locale === 'ar' ? 'المجموع' : 'Total'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {selectedSession.denominations.map((d, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">{d.denomination} {d.currency}</td>
                          <td className="px-4 py-2 text-right">{d.quantity}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <td className="px-4 py-2 font-bold" colSpan={2}>{locale === 'ar' ? 'الإجمالي' : 'Total'}</td>
                        <td className="px-4 py-2 text-right font-bold">{formatCurrency(selectedSession.actualBalance)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {selectedSession.notes && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'ملاحظات' : 'Notes'}</p>
                <p className="text-gray-900 dark:text-white">{selectedSession.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => showToast(locale === 'ar' ? 'جاري الطباعة...' : 'Printing...', 'info')}>
                <PrinterIcon className="h-4 w-4 mr-1" />
                {locale === 'ar' ? 'طباعة' : 'Print'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Count Modal */}
      <Modal
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        title={locale === 'ar' ? 'جرد نقدي جديد' : 'New Cash Count'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'التاريخ' : 'Date'} type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{locale === 'ar' ? 'الصندوق' : 'Cash Account'}</label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>{locale === 'ar' ? 'الصندوق الرئيسي' : 'Main Cash'}</option>
                <option>{locale === 'ar' ? 'صندوق المصروفات النثرية' : 'Petty Cash'}</option>
              </select>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">{locale === 'ar' ? 'عد الفئات' : 'Denomination Count'}</h4>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: 'd500', label: '500 SAR' },
                { key: 'd100', label: '100 SAR' },
                { key: 'd50', label: '50 SAR' },
                { key: 'd20', label: '20 SAR' },
                { key: 'd10', label: '10 SAR' },
                { key: 'd5', label: '5 SAR' },
                { key: 'd1', label: '1 SAR' },
                { key: 'c50', label: '50 Halalas' },
              ].map(d => (
                <div key={d.key}>
                  <label className="block text-xs text-gray-500 mb-1">{d.label}</label>
                  <input
                    type="number"
                    min="0"
                    value={denominationCounts[d.key as keyof typeof denominationCounts]}
                    onChange={(e) => setDenominationCounts({ ...denominationCounts, [d.key]: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-600 dark:text-blue-400">{locale === 'ar' ? 'الإجمالي المحسوب' : 'Calculated Total'}</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(calculateTotal())}</p>
          </div>

          <Input label={locale === 'ar' ? 'ملاحظات' : 'Notes'} placeholder={locale === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'} />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsCountModalOpen(false)}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => { setIsCountModalOpen(false); showToast(locale === 'ar' ? 'تم حفظ الجرد' : 'Inventory saved', 'success'); }}>
              {locale === 'ar' ? 'حفظ الجرد' : 'Save Count'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmApprove}
        onClose={() => setConfirmApprove(false)}
        onConfirm={handleApprove}
        title={locale === 'ar' ? 'اعتماد الجرد' : 'Approve Inventory'}
        message={locale === 'ar' ? 'هل أنت متأكد من اعتماد جرد النقدية هذا؟' : 'Are you sure you want to approve this cash inventory?'}
        confirmText={locale === 'ar' ? 'اعتماد' : 'Approve'}
        variant="primary"
      />
    </MainLayout>
  );
}
