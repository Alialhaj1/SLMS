/**
 * ✅ Conformity Certificates - شهادات المطابقة
 * =============================================
 * إدارة شهادات المطابقة للمنتجات
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CubeIcon,
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

interface ConformityCertificate {
  id: number;
  certificate_number: string;
  product_name: string;
  product_name_ar: string;
  product_code: string;
  standard_type: 'saso' | 'gcc' | 'iso' | 'ce' | 'fda' | 'other';
  issuing_body: string;
  issuing_body_ar: string;
  issue_date: string;
  expiry_date: string;
  shipment_reference?: string;
  quantity: number;
  unit: string;
  country_of_origin: string;
  status: 'valid' | 'expired' | 'pending' | 'rejected';
  notes?: string;
}

export default function ConformityCertificatesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<ConformityCertificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<ConformityCertificate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStandard, setFilterStandard] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const canManage = hasPermission('certificates:manage');

  const standardTypes = [
    { value: 'saso', label: 'SASO', label_ar: 'ساسو' },
    { value: 'gcc', label: 'GCC Conformity', label_ar: 'مطابقة خليجية' },
    { value: 'iso', label: 'ISO', label_ar: 'آيزو' },
    { value: 'ce', label: 'CE Marking', label_ar: 'علامة CE' },
    { value: 'fda', label: 'FDA', label_ar: 'FDA' },
    { value: 'other', label: 'Other', label_ar: 'أخرى' },
  ];

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      setCertificates([
        {
          id: 1, certificate_number: 'COC-2024-001', product_name: 'Electronic Components',
          product_name_ar: 'مكونات إلكترونية', product_code: 'EC-001', standard_type: 'saso',
          issuing_body: 'SASO', issuing_body_ar: 'هيئة المواصفات والمقاييس',
          issue_date: '2024-01-10', expiry_date: '2025-01-09', shipment_reference: 'SHP-2024-001',
          quantity: 5000, unit: 'PCS', country_of_origin: 'China', status: 'valid'
        },
        {
          id: 2, certificate_number: 'COC-2024-002', product_name: 'Food Products',
          product_name_ar: 'منتجات غذائية', product_code: 'FP-002', standard_type: 'gcc',
          issuing_body: 'GSO', issuing_body_ar: 'هيئة التقييس الخليجية',
          issue_date: '2024-01-15', expiry_date: '2024-07-14', shipment_reference: 'SHP-2024-002',
          quantity: 10000, unit: 'KG', country_of_origin: 'UAE', status: 'valid'
        },
        {
          id: 3, certificate_number: 'COC-2023-015', product_name: 'Medical Devices',
          product_name_ar: 'أجهزة طبية', product_code: 'MD-003', standard_type: 'fda',
          issuing_body: 'FDA', issuing_body_ar: 'إدارة الغذاء والدواء',
          issue_date: '2023-06-01', expiry_date: '2024-01-31', shipment_reference: 'SHP-2023-015',
          quantity: 500, unit: 'PCS', country_of_origin: 'USA', status: 'expired'
        },
        {
          id: 4, certificate_number: 'COC-2024-003', product_name: 'Industrial Machinery',
          product_name_ar: 'آلات صناعية', product_code: 'IM-004', standard_type: 'ce',
          issuing_body: 'TUV', issuing_body_ar: 'TUV',
          issue_date: '2024-01-18', expiry_date: '2026-01-17', shipment_reference: 'SHP-2024-003',
          quantity: 25, unit: 'UNITS', country_of_origin: 'Germany', status: 'valid'
        },
        {
          id: 5, certificate_number: 'COC-2024-004', product_name: 'Automotive Parts',
          product_name_ar: 'قطع غيار سيارات', product_code: 'AP-005', standard_type: 'iso',
          issuing_body: 'SGS', issuing_body_ar: 'SGS',
          issue_date: '2024-01-20', expiry_date: '', shipment_reference: 'SHP-2024-004',
          quantity: 2000, unit: 'PCS', country_of_origin: 'Japan', status: 'pending'
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCertificate = async () => {
    if (!selectedCertificate) return;
    try {
      if (selectedCertificate.id === 0) {
        setCertificates(prev => [...prev, { 
          ...selectedCertificate, 
          id: Date.now(),
          certificate_number: `COC-${new Date().getFullYear()}-${(certificates.length + 1).toString().padStart(3, '0')}`
        }]);
      } else {
        setCertificates(prev => prev.map(c => c.id === selectedCertificate.id ? selectedCertificate : c));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDeleteCertificate = async () => {
    if (!selectedCertificate) return;
    setCertificates(prev => prev.filter(c => c.id !== selectedCertificate.id));
    showToast(t('common.deleteSuccess') || 'Deleted', 'success');
    setConfirmDelete(false);
    setSelectedCertificate(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'rejected': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckBadgeIcon className="w-4 h-4" />;
      case 'pending': return <ClockIcon className="w-4 h-4" />;
      case 'expired': return <ExclamationTriangleIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    if (filterStandard !== 'all' && cert.standard_type !== filterStandard) return false;
    if (filterStatus !== 'all' && cert.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return cert.product_name.toLowerCase().includes(query) ||
             cert.product_name_ar.includes(query) ||
             cert.certificate_number.toLowerCase().includes(query) ||
             cert.product_code.toLowerCase().includes(query);
    }
    return true;
  });

  const validCerts = certificates.filter(c => c.status === 'valid');
  const pendingCerts = certificates.filter(c => c.status === 'pending');
  const expiredCerts = certificates.filter(c => c.status === 'expired');

  return (
    <MainLayout>
      <Head>
        <title>{t('compliance.conformity') || 'Conformity Certificates'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ShieldCheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('compliance.conformity') || 'Conformity Certificates'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {locale === 'ar' ? 'إدارة شهادات المطابقة للمنتجات' : 'Manage product conformity certificates'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary">
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export
            </Button>
            <Button onClick={() => {
              setSelectedCertificate({
                id: 0, certificate_number: '', product_name: '', product_name_ar: '',
                product_code: '', standard_type: 'saso', issuing_body: '', issuing_body_ar: '',
                issue_date: new Date().toISOString().split('T')[0], expiry_date: '',
                quantity: 0, unit: 'PCS', country_of_origin: '', status: 'pending'
              });
              setIsModalOpen(true);
            }} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              Add Certificate
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckBadgeIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{validCerts.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Valid Certificates</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{pendingCerts.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Pending</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{expiredCerts.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Expired</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <CubeIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{certificates.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Total Certificates</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search certificates..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
              </div>
              <select value={filterStandard} onChange={(e) => setFilterStandard(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Standards</option>
                {standardTypes.map(st => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Status</option>
                <option value="valid">Valid</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="rejected">Rejected</option>
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
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Certificate</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Standard</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Origin</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Validity</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {cert.certificate_number}
                          </p>
                          <p className="text-xs text-gray-500">{cert.issuing_body}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{locale === 'ar' ? cert.product_name_ar : cert.product_name}</p>
                          <p className="text-xs text-gray-500">{cert.product_code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs font-medium uppercase">
                          {cert.standard_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{cert.country_of_origin}</td>
                      <td className="px-4 py-3 text-end text-sm">
                        {cert.quantity.toLocaleString()} {cert.unit}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <p>{cert.issue_date}</p>
                        <p className="text-gray-500">{cert.expiry_date ? `to ${cert.expiry_date}` : 'N/A'}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(cert.status))}>
                          {getStatusIcon(cert.status)}
                          {cert.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => { setSelectedCertificate(cert); setIsModalOpen(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <PencilIcon className="w-4 h-4 text-blue-600" />
                          </button>
                          <button onClick={() => { setSelectedCertificate(cert); setConfirmDelete(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <TrashIcon className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedCertificate?.id ? 'Edit Certificate' : 'Add Conformity Certificate'} size="lg">
        {selectedCertificate && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Product Name (EN)" value={selectedCertificate.product_name}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, product_name: e.target.value })} />
              <Input label="Product Name (AR)" value={selectedCertificate.product_name_ar} dir="rtl"
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, product_name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Product Code" value={selectedCertificate.product_code}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, product_code: e.target.value })} />
              <div>
                <label className="block text-sm font-medium mb-2">Standard Type</label>
                <select value={selectedCertificate.standard_type}
                  onChange={(e) => setSelectedCertificate({ ...selectedCertificate, standard_type: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  {standardTypes.map(st => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Issuing Body (EN)" value={selectedCertificate.issuing_body}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, issuing_body: e.target.value })} />
              <Input label="Issuing Body (AR)" value={selectedCertificate.issuing_body_ar} dir="rtl"
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, issuing_body_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Issue Date" type="date" value={selectedCertificate.issue_date}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, issue_date: e.target.value })} />
              <Input label="Expiry Date" type="date" value={selectedCertificate.expiry_date}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, expiry_date: e.target.value })} />
              <Input label="Country of Origin" value={selectedCertificate.country_of_origin}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, country_of_origin: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Quantity" type="number" value={selectedCertificate.quantity}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, quantity: parseInt(e.target.value) || 0 })} />
              <Input label="Unit" value={selectedCertificate.unit}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, unit: e.target.value })} />
              <Input label="Shipment Reference" value={selectedCertificate.shipment_reference || ''}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, shipment_reference: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select value={selectedCertificate.status}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, status: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="pending">Pending</option>
                <option value="valid">Valid</option>
                <option value="expired">Expired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveCertificate}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteCertificate} title="Delete Certificate"
        message="Are you sure you want to delete this certificate?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}
