/**
 * 📜 License Management - إدارة التراخيص
 * ========================================
 * إدارة التراخيص والتصاريح التجارية
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ArrowUpTrayIcon,
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

interface License {
  id: number;
  license_number: string;
  name: string;
  name_ar: string;
  type: 'commercial' | 'municipal' | 'trade' | 'import_export' | 'customs' | 'transport' | 'other';
  issuing_authority: string;
  issuing_authority_ar: string;
  issue_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'pending_renewal' | 'suspended';
  renewal_cost?: number;
  document_url?: string;
  notes?: string;
}

export default function LicensesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const canManage = hasPermission('licenses:manage');

  const licenseTypes = [
    { value: 'commercial', label: 'Commercial Registration', label_ar: 'السجل التجاري' },
    { value: 'municipal', label: 'Municipal License', label_ar: 'رخصة البلدية' },
    { value: 'trade', label: 'Trade License', label_ar: 'رخصة التجارة' },
    { value: 'import_export', label: 'Import/Export License', label_ar: 'رخصة الاستيراد/التصدير' },
    { value: 'customs', label: 'Customs License', label_ar: 'رخصة جمركية' },
    { value: 'transport', label: 'Transport License', label_ar: 'رخصة نقل' },
    { value: 'other', label: 'Other', label_ar: 'أخرى' },
  ];

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      setLicenses([
        {
          id: 1, license_number: 'CR-1234567890', name: 'Commercial Registration',
          name_ar: 'السجل التجاري', type: 'commercial',
          issuing_authority: 'Ministry of Commerce', issuing_authority_ar: 'وزارة التجارة',
          issue_date: '2020-01-15', expiry_date: '2025-01-14', status: 'active', renewal_cost: 1200
        },
        {
          id: 2, license_number: 'ML-2024-5678', name: 'Municipal Operating License',
          name_ar: 'رخصة تشغيل البلدية', type: 'municipal',
          issuing_authority: 'Riyadh Municipality', issuing_authority_ar: 'أمانة الرياض',
          issue_date: '2024-01-01', expiry_date: '2024-12-31', status: 'active', renewal_cost: 3500
        },
        {
          id: 3, license_number: 'IE-9876543', name: 'Import/Export License',
          name_ar: 'رخصة استيراد وتصدير', type: 'import_export',
          issuing_authority: 'SAGIA', issuing_authority_ar: 'هيئة الاستثمار',
          issue_date: '2022-06-01', expiry_date: '2024-02-28', status: 'pending_renewal', renewal_cost: 5000
        },
        {
          id: 4, license_number: 'CL-2023-001', name: 'Customs Broker License',
          name_ar: 'رخصة مخلص جمركي', type: 'customs',
          issuing_authority: 'Saudi Customs', issuing_authority_ar: 'الجمارك السعودية',
          issue_date: '2023-03-15', expiry_date: '2024-03-14', status: 'expired', renewal_cost: 8000
        },
        {
          id: 5, license_number: 'TL-2024-789', name: 'Freight Transport License',
          name_ar: 'رخصة نقل بضائع', type: 'transport',
          issuing_authority: 'Transport Authority', issuing_authority_ar: 'هيئة النقل',
          issue_date: '2024-01-01', expiry_date: '2025-12-31', status: 'active', renewal_cost: 2500
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLicense = async () => {
    if (!selectedLicense) return;
    try {
      if (selectedLicense.id === 0) {
        setLicenses(prev => [...prev, { ...selectedLicense, id: Date.now() }]);
      } else {
        setLicenses(prev => prev.map(l => l.id === selectedLicense.id ? selectedLicense : l));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDeleteLicense = async () => {
    if (!selectedLicense) return;
    setLicenses(prev => prev.filter(l => l.id !== selectedLicense.id));
    showToast(t('common.deleteSuccess') || 'Deleted', 'success');
    setConfirmDelete(false);
    setSelectedLicense(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending_renewal': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'suspended': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="w-4 h-4" />;
      case 'pending_renewal': return <ClockIcon className="w-4 h-4" />;
      case 'expired': return <ExclamationTriangleIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getDaysRemaining = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredLicenses = licenses.filter(license => {
    if (filterType !== 'all' && license.type !== filterType) return false;
    if (filterStatus !== 'all' && license.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return license.name.toLowerCase().includes(query) ||
             license.name_ar.includes(query) ||
             license.license_number.toLowerCase().includes(query);
    }
    return true;
  });

  const activeLicenses = licenses.filter(l => l.status === 'active');
  const expiringSoon = licenses.filter(l => {
    const days = getDaysRemaining(l.expiry_date);
    return days > 0 && days <= 30 && l.status === 'active';
  });
  const expiredLicenses = licenses.filter(l => l.status === 'expired');

  return (
    <MainLayout>
      <Head>
        <title>{t('compliance.licenses') || 'Licenses'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <DocumentTextIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('compliance.licenses') || 'License Management'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {locale === 'ar' ? 'إدارة التراخيص والتصاريح التجارية' : 'Manage business licenses and permits'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary">
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export
            </Button>
            <Button onClick={() => {
              setSelectedLicense({
                id: 0, license_number: '', name: '', name_ar: '', type: 'commercial',
                issuing_authority: '', issuing_authority_ar: '',
                issue_date: new Date().toISOString().split('T')[0], expiry_date: '',
                status: 'active'
              });
              setIsModalOpen(true);
            }} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              Add License
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{activeLicenses.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Active Licenses</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{expiringSoon.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Expiring Soon (30d)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{expiredLicenses.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Expired</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <DocumentTextIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{licenses.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Total Licenses</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search licenses..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
              </div>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Types</option>
                {licenseTypes.map(lt => (
                  <option key={lt.value} value={lt.value}>{locale === 'ar' ? lt.label_ar : lt.label}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending_renewal">Pending Renewal</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
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
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">License</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Authority</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Validity</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Days Left</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLicenses.map((license) => {
                    const daysLeft = getDaysRemaining(license.expiry_date);
                    return (
                      <tr key={license.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {locale === 'ar' ? license.name_ar : license.name}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{license.license_number}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {licenseTypes.find(lt => lt.value === license.type)?.[locale === 'ar' ? 'label_ar' : 'label']}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {locale === 'ar' ? license.issuing_authority_ar : license.issuing_authority}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p>{license.issue_date}</p>
                            <p className="text-gray-500">to {license.expiry_date}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx('font-medium', 
                            daysLeft < 0 ? 'text-red-600' : 
                            daysLeft < 30 ? 'text-yellow-600' : 'text-green-600'
                          )}>
                            {daysLeft < 0 ? 'Expired' : daysLeft}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(license.status))}>
                            {getStatusIcon(license.status)}
                            {license.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => { setSelectedLicense(license); setIsModalOpen(true); }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                              <PencilIcon className="w-4 h-4 text-blue-600" />
                            </button>
                            <button onClick={() => { setSelectedLicense(license); setConfirmDelete(true); }}
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

      {/* License Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedLicense?.id ? 'Edit License' : 'Add License'} size="lg">
        {selectedLicense && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="License Name (EN)" value={selectedLicense.name}
                onChange={(e) => setSelectedLicense({ ...selectedLicense, name: e.target.value })} />
              <Input label="License Name (AR)" value={selectedLicense.name_ar} dir="rtl"
                onChange={(e) => setSelectedLicense({ ...selectedLicense, name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="License Number" value={selectedLicense.license_number}
                onChange={(e) => setSelectedLicense({ ...selectedLicense, license_number: e.target.value })} />
              <div>
                <label className="block text-sm font-medium mb-2">License Type</label>
                <select value={selectedLicense.type}
                  onChange={(e) => setSelectedLicense({ ...selectedLicense, type: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  {licenseTypes.map(lt => (
                    <option key={lt.value} value={lt.value}>{locale === 'ar' ? lt.label_ar : lt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Issuing Authority (EN)" value={selectedLicense.issuing_authority}
                onChange={(e) => setSelectedLicense({ ...selectedLicense, issuing_authority: e.target.value })} />
              <Input label="Issuing Authority (AR)" value={selectedLicense.issuing_authority_ar} dir="rtl"
                onChange={(e) => setSelectedLicense({ ...selectedLicense, issuing_authority_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Issue Date" type="date" value={selectedLicense.issue_date}
                onChange={(e) => setSelectedLicense({ ...selectedLicense, issue_date: e.target.value })} />
              <Input label="Expiry Date" type="date" value={selectedLicense.expiry_date}
                onChange={(e) => setSelectedLicense({ ...selectedLicense, expiry_date: e.target.value })} />
              <Input label="Renewal Cost (SAR)" type="number" value={selectedLicense.renewal_cost || ''}
                onChange={(e) => setSelectedLicense({ ...selectedLicense, renewal_cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select value={selectedLicense.status}
                onChange={(e) => setSelectedLicense({ ...selectedLicense, status: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="active">Active</option>
                <option value="pending_renewal">Pending Renewal</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveLicense}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteLicense} title="Delete License"
        message="Are you sure you want to delete this license record?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}
