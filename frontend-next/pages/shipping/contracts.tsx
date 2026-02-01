import { useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  DocumentCheckIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ShippingContract {
  id: number;
  contractNumber: string;
  carrier: string;
  carrierAr: string;
  type: 'annual' | 'spot' | 'volume' | 'exclusive';
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'pending-renewal';
  startDate: string;
  endDate: string;
  value: number;
  routes: number;
  shipments: number;
}

const mockContracts: ShippingContract[] = [
  { id: 1, contractNumber: 'SC-2024-001', carrier: 'Maersk Line', carrierAr: 'ميرسك لاين', type: 'annual', status: 'active', startDate: '2024-01-01', endDate: '2024-12-31', value: 500000, routes: 8, shipments: 45 },
  { id: 2, contractNumber: 'SC-2024-002', carrier: 'MSC', carrierAr: 'MSC للشحن', type: 'volume', status: 'active', startDate: '2024-01-01', endDate: '2024-06-30', value: 320000, routes: 5, shipments: 28 },
  { id: 3, contractNumber: 'SC-2024-003', carrier: 'Hapag-Lloyd', carrierAr: 'هاباج لويد', type: 'spot', status: 'pending-renewal', startDate: '2023-07-01', endDate: '2024-01-31', value: 180000, routes: 3, shipments: 15 },
  { id: 4, contractNumber: 'SC-2024-004', carrier: 'CMA CGM', carrierAr: 'CMA CGM', type: 'exclusive', status: 'expired', startDate: '2023-01-01', endDate: '2023-12-31', value: 450000, routes: 6, shipments: 52 },
  { id: 5, contractNumber: 'SC-2024-005', carrier: 'Evergreen', carrierAr: 'إيفرجرين', type: 'annual', status: 'draft', startDate: '2024-02-01', endDate: '2025-01-31', value: 280000, routes: 4, shipments: 0 },
];

export default function ShippingContractsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const [contracts] = useState<ShippingContract[]>(mockContracts);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedContract, setSelectedContract] = useState<ShippingContract | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredContracts = contracts.filter(c => selectedStatus === 'all' || c.status === selectedStatus);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      annual: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      spot: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      volume: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      exclusive: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      annual: { en: 'Annual', ar: 'سنوي' },
      spot: { en: 'Spot', ar: 'فوري' },
      volume: { en: 'Volume', ar: 'حجم' },
      exclusive: { en: 'Exclusive', ar: 'حصري' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[type])}>
        {locale === 'ar' ? labels[type]?.ar : labels[type]?.en}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      terminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'pending-renewal': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    };
    const labels: Record<string, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      active: { en: 'Active', ar: 'نشط' },
      expired: { en: 'Expired', ar: 'منتهي' },
      terminated: { en: 'Terminated', ar: 'ملغي' },
      'pending-renewal': { en: 'Pending Renewal', ar: 'بانتظار التجديد' },
    };
    return (
      <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', styles[status])}>
        {locale === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </span>
    );
  };

  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const totalValue = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + c.value, 0);
  const pendingRenewal = contracts.filter(c => c.status === 'pending-renewal').length;
  const totalShipments = contracts.reduce((sum, c) => sum + c.shipments, 0);

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'عقود الشحن - SLMS' : 'Shipping Contracts - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <DocumentCheckIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'عقود الشحن' : 'Shipping Contracts'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'إدارة عقود الناقلين والشحن' : 'Manage carrier and shipping contracts'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {locale === 'ar' ? 'عقد جديد' : 'New Contract'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600"><CheckCircleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'العقود النشطة' : 'Active Contracts'}</p>
                <p className="text-xl font-semibold text-green-600">{activeContracts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><CurrencyDollarIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'القيمة الإجمالية' : 'Total Value'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"><ExclamationTriangleIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'بانتظار التجديد' : 'Pending Renewal'}</p>
                <p className="text-xl font-semibold text-yellow-600">{pendingRenewal}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600"><TruckIcon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'الشحنات' : 'Shipments'}</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{totalShipments}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
              <option value="pending-renewal">{locale === 'ar' ? 'بانتظار التجديد' : 'Pending Renewal'}</option>
              <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
              <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'رقم العقد' : 'Contract #'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الناقل' : 'Carrier'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'القيمة' : 'Value'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الفترة' : 'Period'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{contract.contractNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{locale === 'ar' ? contract.carrierAr : contract.carrier}</td>
                    <td className="px-4 py-3">{getTypeBadge(contract.type)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(contract.value)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{contract.startDate} - {contract.endDate}</td>
                    <td className="px-4 py-3">{getStatusBadge(contract.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedContract(contract)}><EyeIcon className="h-4 w-4" /></Button>
                        <Button size="sm" variant="secondary" onClick={() => showToast(locale === 'ar' ? 'تعديل...' : 'Edit...', 'info')}><PencilIcon className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedContract} onClose={() => setSelectedContract(null)} title={locale === 'ar' ? 'تفاصيل العقد' : 'Contract Details'} size="lg">
        {selectedContract && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white text-lg">{selectedContract.contractNumber}</h3>
              <div className="flex gap-2">{getTypeBadge(selectedContract.type)}{getStatusBadge(selectedContract.status)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الناقل' : 'Carrier'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{locale === 'ar' ? selectedContract.carrierAr : selectedContract.carrier}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'القيمة' : 'Value'}</p>
                <p className="font-medium text-green-600">{formatCurrency(selectedContract.value)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'المسارات' : 'Routes'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedContract.routes}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'الشحنات' : 'Shipments'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedContract.shipments}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ البدء' : 'Start Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedContract.startDate}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{locale === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedContract.endDate}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
              <Button onClick={() => showToast(locale === 'ar' ? 'تم التجديد' : 'Renewed', 'success')}>{locale === 'ar' ? 'تجديد' : 'Renew'}</Button>
              <Button variant="secondary" onClick={() => setSelectedContract(null)}>{locale === 'ar' ? 'إغلاق' : 'Close'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={locale === 'ar' ? 'عقد جديد' : 'New Contract'}>
        <div className="space-y-4">
          <p className="text-gray-500 dark:text-gray-400">{locale === 'ar' ? 'نموذج إنشاء عقد جديد' : 'Create new contract form'}</p>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => { setShowCreateModal(false); showToast(locale === 'ar' ? 'تم الحفظ' : 'Saved', 'success'); }}>{locale === 'ar' ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
