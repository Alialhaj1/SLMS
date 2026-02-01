/**
 * 🔧 Maintenance Contracts - عقود الصيانة
 * =========================================
 * إدارة عقود صيانة الأصول
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

interface MaintenanceContract {
  id: number;
  contract_number: string;
  title: string;
  title_ar: string;
  asset_ids: number[];
  asset_names: string[];
  vendor_name: string;
  vendor_name_ar: string;
  vendor_phone: string;
  vendor_email: string;
  contract_type: 'annual' | 'biannual' | 'quarterly' | 'monthly' | 'on_call';
  start_date: string;
  end_date: string;
  contract_value: number;
  payment_terms: string;
  coverage: string[];
  sla_response_hours: number;
  status: 'active' | 'expired' | 'pending_renewal' | 'cancelled';
  last_service_date?: string;
  next_service_date?: string;
  notes?: string;
}

export default function MaintenanceContractsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<MaintenanceContract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const canManage = hasPermission('maintenance:manage');

  const contractTypes = [
    { value: 'annual', label: 'Annual', label_ar: 'سنوي' },
    { value: 'biannual', label: 'Bi-Annual', label_ar: 'نصف سنوي' },
    { value: 'quarterly', label: 'Quarterly', label_ar: 'ربع سنوي' },
    { value: 'monthly', label: 'Monthly', label_ar: 'شهري' },
    { value: 'on_call', label: 'On-Call', label_ar: 'عند الطلب' },
  ];

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      setContracts([
        {
          id: 1, contract_number: 'MC-2024-001', title: 'Building HVAC Maintenance',
          title_ar: 'صيانة نظام التكييف', asset_ids: [1], asset_names: ['Office Building'],
          vendor_name: 'CoolTech Services', vendor_name_ar: 'كول تك للخدمات',
          vendor_phone: '+966-11-1234567', vendor_email: 'support@cooltech.sa',
          contract_type: 'annual', start_date: '2024-01-01', end_date: '2024-12-31',
          contract_value: 48000, payment_terms: 'Quarterly',
          coverage: ['Preventive Maintenance', 'Emergency Repairs', 'Parts Replacement'],
          sla_response_hours: 4, status: 'active', last_service_date: '2024-01-10', next_service_date: '2024-04-10'
        },
        {
          id: 2, contract_number: 'MC-2024-002', title: 'Fleet Vehicle Maintenance',
          title_ar: 'صيانة أسطول المركبات', asset_ids: [2], asset_names: ['Delivery Truck'],
          vendor_name: 'AutoCare Pro', vendor_name_ar: 'أوتوكير برو',
          vendor_phone: '+966-12-9876543', vendor_email: 'fleet@autocare.sa',
          contract_type: 'quarterly', start_date: '2024-01-01', end_date: '2024-12-31',
          contract_value: 24000, payment_terms: 'Per Service',
          coverage: ['Oil Change', 'Tire Rotation', 'Brake Inspection', 'General Service'],
          sla_response_hours: 24, status: 'active', last_service_date: '2024-01-05', next_service_date: '2024-04-05'
        },
        {
          id: 3, contract_number: 'MC-2023-005', title: 'Server Room Equipment',
          title_ar: 'معدات غرفة الخوادم', asset_ids: [3], asset_names: ['Server Equipment'],
          vendor_name: 'TechSupport SA', vendor_name_ar: 'تك سبورت',
          vendor_phone: '+966-11-5551234', vendor_email: 'support@techsupport.sa',
          contract_type: 'annual', start_date: '2023-03-15', end_date: '2024-03-14',
          contract_value: 36000, payment_terms: 'Annual',
          coverage: ['24/7 Monitoring', 'Hardware Replacement', 'Software Updates'],
          sla_response_hours: 2, status: 'pending_renewal'
        },
        {
          id: 4, contract_number: 'MC-2023-003', title: 'Forklift Maintenance',
          title_ar: 'صيانة الرافعة الشوكية', asset_ids: [4], asset_names: ['Forklift'],
          vendor_name: 'Industrial Equip Services', vendor_name_ar: 'خدمات المعدات الصناعية',
          vendor_phone: '+966-13-4445555', vendor_email: 'service@indequip.sa',
          contract_type: 'biannual', start_date: '2023-01-01', end_date: '2023-12-31',
          contract_value: 18000, payment_terms: 'Semi-Annual',
          coverage: ['Hydraulic System', 'Engine Service', 'Safety Inspection'],
          sla_response_hours: 8, status: 'expired'
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContract = async () => {
    if (!selectedContract) return;
    try {
      if (selectedContract.id === 0) {
        setContracts(prev => [...prev, { 
          ...selectedContract, 
          id: Date.now(),
          contract_number: `MC-${new Date().getFullYear()}-${(contracts.length + 1).toString().padStart(3, '0')}`
        }]);
      } else {
        setContracts(prev => prev.map(c => c.id === selectedContract.id ? selectedContract : c));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDeleteContract = async () => {
    if (!selectedContract) return;
    setContracts(prev => prev.filter(c => c.id !== selectedContract.id));
    showToast(t('common.deleteSuccess') || 'Deleted', 'success');
    setConfirmDelete(false);
    setSelectedContract(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending_renewal': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'pending_renewal': return <ClockIcon className="w-4 h-4 text-yellow-600" />;
      case 'expired': return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredContracts = contracts.filter(contract => {
    if (filterStatus !== 'all' && contract.status !== filterStatus) return false;
    if (filterType !== 'all' && contract.contract_type !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return contract.title.toLowerCase().includes(query) ||
             contract.title_ar.includes(query) ||
             contract.vendor_name.toLowerCase().includes(query) ||
             contract.contract_number.toLowerCase().includes(query);
    }
    return true;
  });

  const activeContracts = contracts.filter(c => c.status === 'active');
  const pendingRenewal = contracts.filter(c => c.status === 'pending_renewal');
  const totalAnnualValue = activeContracts.reduce((sum, c) => sum + c.contract_value, 0);

  return (
    <MainLayout>
      <Head>
        <title>{t('assets.maintenance') || 'Maintenance Contracts'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <WrenchScrewdriverIcon className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('assets.maintenance') || 'Maintenance Contracts'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {locale === 'ar' ? 'إدارة عقود صيانة الأصول' : 'Manage asset maintenance contracts'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary">
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export
            </Button>
            <Button onClick={() => {
              setSelectedContract({
                id: 0, contract_number: '', title: '', title_ar: '',
                asset_ids: [], asset_names: [], vendor_name: '', vendor_name_ar: '',
                vendor_phone: '', vendor_email: '', contract_type: 'annual',
                start_date: new Date().toISOString().split('T')[0], end_date: '',
                contract_value: 0, payment_terms: '', coverage: [],
                sla_response_hours: 24, status: 'active'
              });
              setIsModalOpen(true);
            }} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              New Contract
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{activeContracts.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Active Contracts</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{pendingRenewal.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Pending Renewal</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{(totalAnnualValue / 1000).toFixed(0)}K</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Annual Value (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-purple-600">
              <BuildingOfficeIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{new Set(contracts.flatMap(c => c.vendor_name)).size}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Vendors</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search contracts..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
              </div>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Types</option>
                {contractTypes.map(ct => (
                  <option key={ct.value} value={ct.value}>{locale === 'ar' ? ct.label_ar : ct.label}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending_renewal">Pending Renewal</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Contract</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">SLA</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredContracts.map((contract) => {
                    const daysLeft = getDaysRemaining(contract.end_date);
                    return (
                      <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {locale === 'ar' ? contract.title_ar : contract.title}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{contract.contract_number}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">{locale === 'ar' ? contract.vendor_name_ar : contract.vendor_name}</p>
                            <p className="text-xs text-gray-500">{contract.vendor_phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">
                          {contract.contract_type.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p>{contract.start_date} - {contract.end_date}</p>
                            <p className={clsx('text-xs', daysLeft < 30 ? 'text-red-500' : daysLeft < 90 ? 'text-yellow-500' : 'text-gray-500')}>
                              {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-end font-medium">{contract.contract_value.toLocaleString()} SAR</td>
                        <td className="px-4 py-3 text-center text-sm">{contract.sla_response_hours}h</td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(contract.status))}>
                            {getStatusIcon(contract.status)}
                            {contract.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => { setSelectedContract(contract); setIsModalOpen(true); }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                              <PencilIcon className="w-4 h-4 text-blue-600" />
                            </button>
                            <button onClick={() => { setSelectedContract(contract); setConfirmDelete(true); }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                              <TrashIcon className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Contract Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedContract?.id ? 'Edit Contract' : 'New Maintenance Contract'} size="lg">
        {selectedContract && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Contract Title (EN)" value={selectedContract.title}
                onChange={(e) => setSelectedContract({ ...selectedContract, title: e.target.value })} />
              <Input label="Contract Title (AR)" value={selectedContract.title_ar} dir="rtl"
                onChange={(e) => setSelectedContract({ ...selectedContract, title_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Vendor Name (EN)" value={selectedContract.vendor_name}
                onChange={(e) => setSelectedContract({ ...selectedContract, vendor_name: e.target.value })} />
              <Input label="Vendor Name (AR)" value={selectedContract.vendor_name_ar} dir="rtl"
                onChange={(e) => setSelectedContract({ ...selectedContract, vendor_name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Vendor Phone" value={selectedContract.vendor_phone}
                onChange={(e) => setSelectedContract({ ...selectedContract, vendor_phone: e.target.value })} />
              <Input label="Vendor Email" type="email" value={selectedContract.vendor_email}
                onChange={(e) => setSelectedContract({ ...selectedContract, vendor_email: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Contract Type</label>
                <select value={selectedContract.contract_type}
                  onChange={(e) => setSelectedContract({ ...selectedContract, contract_type: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  {contractTypes.map(ct => (
                    <option key={ct.value} value={ct.value}>{locale === 'ar' ? ct.label_ar : ct.label}</option>
                  ))}
                </select>
              </div>
              <Input label="Start Date" type="date" value={selectedContract.start_date}
                onChange={(e) => setSelectedContract({ ...selectedContract, start_date: e.target.value })} />
              <Input label="End Date" type="date" value={selectedContract.end_date}
                onChange={(e) => setSelectedContract({ ...selectedContract, end_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Contract Value (SAR)" type="number" value={selectedContract.contract_value}
                onChange={(e) => setSelectedContract({ ...selectedContract, contract_value: parseFloat(e.target.value) || 0 })} />
              <Input label="Payment Terms" value={selectedContract.payment_terms}
                onChange={(e) => setSelectedContract({ ...selectedContract, payment_terms: e.target.value })} />
              <Input label="SLA Response (Hours)" type="number" value={selectedContract.sla_response_hours}
                onChange={(e) => setSelectedContract({ ...selectedContract, sla_response_hours: parseInt(e.target.value) || 24 })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select value={selectedContract.status}
                onChange={(e) => setSelectedContract({ ...selectedContract, status: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="active">Active</option>
                <option value="pending_renewal">Pending Renewal</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveContract}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteContract} title="Delete Contract"
        message="Are you sure you want to delete this maintenance contract?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}
