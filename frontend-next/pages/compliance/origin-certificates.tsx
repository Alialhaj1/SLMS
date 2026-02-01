/**
 * 🌍 Certificate of Origin - شهادات المنشأ
 * ==========================================
 * إدارة شهادات المنشأ للصادرات
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  GlobeAltIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CheckBadgeIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  TruckIcon,
  PrinterIcon,
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

interface OriginCertificate {
  id: number;
  certificate_number: string;
  exporter_name: string;
  exporter_name_ar: string;
  importer_name: string;
  importer_country: string;
  product_description: string;
  product_description_ar: string;
  hs_code: string;
  quantity: number;
  unit: string;
  gross_weight: number;
  net_weight: number;
  country_of_origin: string;
  port_of_loading: string;
  port_of_discharge: string;
  invoice_number: string;
  invoice_date: string;
  issue_date: string;
  chamber_of_commerce: string;
  status: 'draft' | 'submitted' | 'approved' | 'issued' | 'rejected';
  notes?: string;
}

export default function OriginCertificatesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<OriginCertificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<OriginCertificate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const canManage = hasPermission('certificates:manage');

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      setCertificates([
        {
          id: 1, certificate_number: 'COO-2024-001',
          exporter_name: 'Saudi Exports Co.', exporter_name_ar: 'شركة الصادرات السعودية',
          importer_name: 'European Trading GmbH', importer_country: 'Germany',
          product_description: 'Petrochemical Products', product_description_ar: 'منتجات بتروكيماوية',
          hs_code: '2710.19.31', quantity: 50000, unit: 'MT',
          gross_weight: 52000, net_weight: 50000, country_of_origin: 'Saudi Arabia',
          port_of_loading: 'Jubail Port', port_of_discharge: 'Hamburg Port',
          invoice_number: 'INV-2024-001', invoice_date: '2024-01-15', issue_date: '2024-01-18',
          chamber_of_commerce: 'Riyadh Chamber', status: 'issued'
        },
        {
          id: 2, certificate_number: 'COO-2024-002',
          exporter_name: 'Al-Marai Food Co.', exporter_name_ar: 'شركة المراعي للأغذية',
          importer_name: 'Dubai Foods LLC', importer_country: 'UAE',
          product_description: 'Dairy Products', product_description_ar: 'منتجات ألبان',
          hs_code: '0401.20.10', quantity: 10000, unit: 'KG',
          gross_weight: 11000, net_weight: 10000, country_of_origin: 'Saudi Arabia',
          port_of_loading: 'Jeddah Port', port_of_discharge: 'Jebel Ali Port',
          invoice_number: 'INV-2024-002', invoice_date: '2024-01-18', issue_date: '',
          chamber_of_commerce: 'Jeddah Chamber', status: 'approved'
        },
        {
          id: 3, certificate_number: 'COO-2024-003',
          exporter_name: 'SABIC', exporter_name_ar: 'سابك',
          importer_name: 'Asian Chemicals Ltd', importer_country: 'India',
          product_description: 'Polyethylene Granules', product_description_ar: 'حبيبات بولي إيثيلين',
          hs_code: '3901.10.90', quantity: 25000, unit: 'MT',
          gross_weight: 26000, net_weight: 25000, country_of_origin: 'Saudi Arabia',
          port_of_loading: 'Jubail Port', port_of_discharge: 'Mumbai Port',
          invoice_number: 'INV-2024-003', invoice_date: '2024-01-20', issue_date: '',
          chamber_of_commerce: 'Eastern Province Chamber', status: 'submitted'
        },
        {
          id: 4, certificate_number: 'COO-2024-004',
          exporter_name: 'Saudi Dates Co.', exporter_name_ar: 'شركة التمور السعودية',
          importer_name: 'UK Foods Import', importer_country: 'United Kingdom',
          product_description: 'Premium Medjool Dates', product_description_ar: 'تمور مجدول فاخرة',
          hs_code: '0804.10.00', quantity: 5000, unit: 'KG',
          gross_weight: 5500, net_weight: 5000, country_of_origin: 'Saudi Arabia',
          port_of_loading: 'Dammam Port', port_of_discharge: 'London Gateway',
          invoice_number: 'INV-2024-004', invoice_date: '2024-01-22', issue_date: '',
          chamber_of_commerce: 'Riyadh Chamber', status: 'draft'
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
          certificate_number: `COO-${new Date().getFullYear()}-${(certificates.length + 1).toString().padStart(3, '0')}`
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

  const handleSubmit = (cert: OriginCertificate) => {
    setCertificates(prev => prev.map(c => c.id === cert.id ? { ...c, status: 'submitted' } : c));
    showToast('Certificate submitted for approval', 'success');
  };

  const handleApprove = (cert: OriginCertificate) => {
    setCertificates(prev => prev.map(c => c.id === cert.id ? { ...c, status: 'approved' } : c));
    showToast('Certificate approved', 'success');
  };

  const handleIssue = (cert: OriginCertificate) => {
    setCertificates(prev => prev.map(c => 
      c.id === cert.id ? { ...c, status: 'issued', issue_date: new Date().toISOString().split('T')[0] } : c
    ));
    showToast('Certificate issued', 'success');
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
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'submitted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'issued': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    if (filterStatus !== 'all' && cert.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return cert.certificate_number.toLowerCase().includes(query) ||
             cert.exporter_name.toLowerCase().includes(query) ||
             cert.importer_name.toLowerCase().includes(query) ||
             cert.product_description.toLowerCase().includes(query);
    }
    return true;
  });

  const draftCerts = certificates.filter(c => c.status === 'draft');
  const submittedCerts = certificates.filter(c => c.status === 'submitted');
  const issuedCerts = certificates.filter(c => c.status === 'issued');

  return (
    <MainLayout>
      <Head>
        <title>{t('compliance.origin') || 'Certificate of Origin'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <GlobeAltIcon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('compliance.origin') || 'Certificate of Origin'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {locale === 'ar' ? 'إدارة شهادات المنشأ للصادرات' : 'Manage certificates of origin for exports'}
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
                id: 0, certificate_number: '', exporter_name: '', exporter_name_ar: '',
                importer_name: '', importer_country: '', product_description: '', product_description_ar: '',
                hs_code: '', quantity: 0, unit: 'MT', gross_weight: 0, net_weight: 0,
                country_of_origin: 'Saudi Arabia', port_of_loading: '', port_of_discharge: '',
                invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], issue_date: '',
                chamber_of_commerce: '', status: 'draft'
              });
              setIsModalOpen(true);
            }} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              New Certificate
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-gray-600">
              <DocumentDuplicateIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{draftCerts.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Draft</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{submittedCerts.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Pending Approval</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckBadgeIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{issuedCerts.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Issued</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <GlobeAltIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{certificates.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Total</p>
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
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="issued">Issued</option>
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
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Exporter</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Destination</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Quantity</th>
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
                          <p className="text-xs text-gray-500">{cert.invoice_number}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{locale === 'ar' ? cert.exporter_name_ar : cert.exporter_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{cert.importer_country}</p>
                          <p className="text-xs text-gray-500">{cert.importer_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[150px] truncate">
                        <div>
                          <p>{locale === 'ar' ? cert.product_description_ar : cert.product_description}</p>
                          <p className="text-xs text-gray-500 font-mono">{cert.hs_code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-end">
                        {cert.quantity.toLocaleString()} {cert.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(cert.status))}>
                          {cert.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          {cert.status === 'draft' && (
                            <button onClick={() => handleSubmit(cert)}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Submit">
                              <TruckIcon className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {cert.status === 'submitted' && canManage && (
                            <button onClick={() => handleApprove(cert)}
                              className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Approve">
                              <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          {cert.status === 'approved' && canManage && (
                            <button onClick={() => handleIssue(cert)}
                              className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Issue">
                              <PrinterIcon className="w-4 h-4 text-green-600" />
                            </button>
                          )}
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
        title={selectedCertificate?.id ? 'Edit Certificate' : 'New Certificate of Origin'} size="xl">
        {selectedCertificate && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Exporter Name (EN)" value={selectedCertificate.exporter_name}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, exporter_name: e.target.value })} />
              <Input label="Exporter Name (AR)" value={selectedCertificate.exporter_name_ar} dir="rtl"
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, exporter_name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Importer Name" value={selectedCertificate.importer_name}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, importer_name: e.target.value })} />
              <Input label="Importer Country" value={selectedCertificate.importer_country}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, importer_country: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Product Description (EN)" value={selectedCertificate.product_description}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, product_description: e.target.value })} />
              <Input label="Product Description (AR)" value={selectedCertificate.product_description_ar} dir="rtl"
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, product_description_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input label="HS Code" value={selectedCertificate.hs_code}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, hs_code: e.target.value })} />
              <Input label="Quantity" type="number" value={selectedCertificate.quantity}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, quantity: parseInt(e.target.value) || 0 })} />
              <Input label="Unit" value={selectedCertificate.unit}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, unit: e.target.value })} />
              <Input label="Country of Origin" value={selectedCertificate.country_of_origin}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, country_of_origin: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Gross Weight (KG)" type="number" value={selectedCertificate.gross_weight}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, gross_weight: parseFloat(e.target.value) || 0 })} />
              <Input label="Net Weight (KG)" type="number" value={selectedCertificate.net_weight}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, net_weight: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Port of Loading" value={selectedCertificate.port_of_loading}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, port_of_loading: e.target.value })} />
              <Input label="Port of Discharge" value={selectedCertificate.port_of_discharge}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, port_of_discharge: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Invoice Number" value={selectedCertificate.invoice_number}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, invoice_number: e.target.value })} />
              <Input label="Invoice Date" type="date" value={selectedCertificate.invoice_date}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, invoice_date: e.target.value })} />
              <Input label="Chamber of Commerce" value={selectedCertificate.chamber_of_commerce}
                onChange={(e) => setSelectedCertificate({ ...selectedCertificate, chamber_of_commerce: e.target.value })} />
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
        message="Are you sure you want to delete this certificate of origin?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}
