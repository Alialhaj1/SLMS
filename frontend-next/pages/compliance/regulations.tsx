/**
 * 📋 Regulations & Compliance - اللوائح والامتثال
 * =================================================
 * إدارة اللوائح التنظيمية ومتطلبات الامتثال
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  ScaleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  LinkIcon,
  BookOpenIcon,
  ShieldCheckIcon,
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

interface Regulation {
  id: number;
  code: string;
  title: string;
  title_ar: string;
  category: 'customs' | 'trade' | 'tax' | 'labor' | 'environmental' | 'health_safety' | 'other';
  issuing_authority: string;
  issuing_authority_ar: string;
  effective_date: string;
  last_updated: string;
  description: string;
  description_ar: string;
  compliance_status: 'compliant' | 'non_compliant' | 'partial' | 'under_review';
  priority: 'high' | 'medium' | 'low';
  applicable_to: string[];
  requirements: string[];
  document_url?: string;
  next_review_date?: string;
  responsible_person?: string;
  notes?: string;
}

export default function RegulationsPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const canManage = hasPermission('regulations:manage');

  const categories = [
    { value: 'customs', label: 'Customs', label_ar: 'جمارك' },
    { value: 'trade', label: 'Trade & Commerce', label_ar: 'التجارة' },
    { value: 'tax', label: 'Tax & VAT', label_ar: 'الضرائب' },
    { value: 'labor', label: 'Labor Law', label_ar: 'قوانين العمل' },
    { value: 'environmental', label: 'Environmental', label_ar: 'بيئية' },
    { value: 'health_safety', label: 'Health & Safety', label_ar: 'الصحة والسلامة' },
    { value: 'other', label: 'Other', label_ar: 'أخرى' },
  ];

  useEffect(() => {
    fetchRegulations();
  }, []);

  const fetchRegulations = async () => {
    setLoading(true);
    try {
      setRegulations([
        {
          id: 1, code: 'REG-CUS-001', title: 'Customs Declaration Requirements',
          title_ar: 'متطلبات التصريح الجمركي', category: 'customs',
          issuing_authority: 'Saudi Customs', issuing_authority_ar: 'هيئة الجمارك السعودية',
          effective_date: '2023-01-01', last_updated: '2024-01-15',
          description: 'Requirements for customs declarations including documentation and procedures',
          description_ar: 'متطلبات التصريحات الجمركية بما في ذلك الوثائق والإجراءات',
          compliance_status: 'compliant', priority: 'high',
          applicable_to: ['Import', 'Export', 'Customs Clearance'],
          requirements: ['Bill of Lading', 'Commercial Invoice', 'Certificate of Origin', 'Packing List'],
          next_review_date: '2024-06-01', responsible_person: 'Customs Manager'
        },
        {
          id: 2, code: 'REG-TAX-001', title: 'VAT Compliance Guidelines',
          title_ar: 'إرشادات الامتثال لضريبة القيمة المضافة', category: 'tax',
          issuing_authority: 'ZATCA', issuing_authority_ar: 'هيئة الزكاة والضريبة والجمارك',
          effective_date: '2018-01-01', last_updated: '2024-01-01',
          description: 'Value Added Tax compliance requirements for businesses',
          description_ar: 'متطلبات الامتثال لضريبة القيمة المضافة للشركات',
          compliance_status: 'compliant', priority: 'high',
          applicable_to: ['All Transactions', 'Invoicing', 'Reporting'],
          requirements: ['VAT Registration', 'Tax Invoices', 'Quarterly Returns', 'E-Invoicing'],
          next_review_date: '2024-03-31', responsible_person: 'Finance Manager'
        },
        {
          id: 3, code: 'REG-LAB-001', title: 'Labor Law Compliance',
          title_ar: 'الامتثال لقانون العمل', category: 'labor',
          issuing_authority: 'Ministry of Human Resources', issuing_authority_ar: 'وزارة الموارد البشرية',
          effective_date: '2022-03-01', last_updated: '2023-12-15',
          description: 'Labor law requirements including working hours, contracts, and benefits',
          description_ar: 'متطلبات قانون العمل بما في ذلك ساعات العمل والعقود والمزايا',
          compliance_status: 'partial', priority: 'high',
          applicable_to: ['Employment Contracts', 'Working Hours', 'Leave Management'],
          requirements: ['Employment Contracts', 'Wage Protection', 'Working Hour Limits', 'Annual Leave'],
          next_review_date: '2024-02-28', responsible_person: 'HR Manager'
        },
        {
          id: 4, code: 'REG-ENV-001', title: 'Environmental Waste Management',
          title_ar: 'إدارة النفايات البيئية', category: 'environmental',
          issuing_authority: 'Ministry of Environment', issuing_authority_ar: 'وزارة البيئة',
          effective_date: '2021-06-01', last_updated: '2023-09-01',
          description: 'Requirements for waste disposal and environmental protection',
          description_ar: 'متطلبات التخلص من النفايات وحماية البيئة',
          compliance_status: 'under_review', priority: 'medium',
          applicable_to: ['Warehouse Operations', 'Packaging', 'Disposal'],
          requirements: ['Waste Segregation', 'Licensed Disposal', 'Reporting', 'Training'],
          next_review_date: '2024-04-15', responsible_person: 'Operations Manager'
        },
        {
          id: 5, code: 'REG-HS-001', title: 'Workplace Safety Standards',
          title_ar: 'معايير السلامة في مكان العمل', category: 'health_safety',
          issuing_authority: 'Civil Defense', issuing_authority_ar: 'الدفاع المدني',
          effective_date: '2020-01-01', last_updated: '2023-11-01',
          description: 'Occupational health and safety requirements for workplace',
          description_ar: 'متطلبات الصحة والسلامة المهنية في مكان العمل',
          compliance_status: 'compliant', priority: 'high',
          applicable_to: ['All Facilities', 'Warehouse', 'Offices'],
          requirements: ['Fire Safety', 'First Aid', 'PPE', 'Emergency Exits', 'Training'],
          next_review_date: '2024-05-01', responsible_person: 'Safety Officer'
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRegulation = async () => {
    if (!selectedRegulation) return;
    try {
      if (selectedRegulation.id === 0) {
        setRegulations(prev => [...prev, { 
          ...selectedRegulation, 
          id: Date.now(),
          code: `REG-${selectedRegulation.category.toUpperCase().slice(0, 3)}-${(regulations.length + 1).toString().padStart(3, '0')}`
        }]);
      } else {
        setRegulations(prev => prev.map(r => r.id === selectedRegulation.id ? selectedRegulation : r));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDeleteRegulation = async () => {
    if (!selectedRegulation) return;
    setRegulations(prev => prev.filter(r => r.id !== selectedRegulation.id));
    showToast(t('common.deleteSuccess') || 'Deleted', 'success');
    setConfirmDelete(false);
    setSelectedRegulation(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'non_compliant': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'under_review': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircleIcon className="w-4 h-4" />;
      case 'non_compliant': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'partial': return <ClockIcon className="w-4 h-4" />;
      case 'under_review': return <BookOpenIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'customs': return '🛃';
      case 'trade': return '📊';
      case 'tax': return '💰';
      case 'labor': return '👷';
      case 'environmental': return '🌿';
      case 'health_safety': return '⛑️';
      default: return '📋';
    }
  };

  const filteredRegulations = regulations.filter(reg => {
    if (filterCategory !== 'all' && reg.category !== filterCategory) return false;
    if (filterStatus !== 'all' && reg.compliance_status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return reg.title.toLowerCase().includes(query) ||
             reg.title_ar.includes(query) ||
             reg.code.toLowerCase().includes(query);
    }
    return true;
  });

  const compliantCount = regulations.filter(r => r.compliance_status === 'compliant').length;
  const nonCompliantCount = regulations.filter(r => r.compliance_status === 'non_compliant' || r.compliance_status === 'partial').length;
  const complianceRate = regulations.length > 0 ? Math.round((compliantCount / regulations.length) * 100) : 0;

  return (
    <MainLayout>
      <Head>
        <title>{t('compliance.regulations') || 'Regulations'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ScaleIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('compliance.regulations') || 'Regulations & Compliance'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {locale === 'ar' ? 'إدارة اللوائح ومتطلبات الامتثال' : 'Manage regulations and compliance requirements'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary">
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export Report
            </Button>
            <Button onClick={() => {
              setSelectedRegulation({
                id: 0, code: '', title: '', title_ar: '', category: 'customs',
                issuing_authority: '', issuing_authority_ar: '',
                effective_date: new Date().toISOString().split('T')[0], last_updated: new Date().toISOString().split('T')[0],
                description: '', description_ar: '', compliance_status: 'under_review',
                priority: 'medium', applicable_to: [], requirements: []
              });
              setIsModalOpen(true);
            }} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              Add Regulation
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <ShieldCheckIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{complianceRate}%</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Compliance Rate</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{compliantCount}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Fully Compliant</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{nonCompliantCount}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Needs Attention</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <DocumentTextIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{regulations.length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Total Regulations</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search regulations..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
              </div>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{locale === 'ar' ? cat.label_ar : cat.label}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Status</option>
                <option value="compliant">Compliant</option>
                <option value="partial">Partial</option>
                <option value="non_compliant">Non-Compliant</option>
                <option value="under_review">Under Review</option>
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
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Regulation</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Authority</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Review Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRegulations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {locale === 'ar' ? reg.title_ar : reg.title}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">{reg.code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span>{getCategoryIcon(reg.category)}</span>
                          <span className="text-sm">{categories.find(c => c.value === reg.category)?.[locale === 'ar' ? 'label_ar' : 'label']}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {locale === 'ar' ? reg.issuing_authority_ar : reg.issuing_authority}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('px-2 py-1 rounded border text-xs font-medium uppercase', getPriorityBadge(reg.priority))}>
                          {reg.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(reg.compliance_status))}>
                          {getStatusIcon(reg.compliance_status)}
                          {reg.compliance_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{reg.next_review_date || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => { setSelectedRegulation(reg); setIsModalOpen(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <PencilIcon className="w-4 h-4 text-blue-600" />
                          </button>
                          <button onClick={() => { setSelectedRegulation(reg); setConfirmDelete(true); }}
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

      {/* Regulation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedRegulation?.id ? 'Edit Regulation' : 'Add Regulation'} size="xl">
        {selectedRegulation && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Title (EN)" value={selectedRegulation.title}
                onChange={(e) => setSelectedRegulation({ ...selectedRegulation, title: e.target.value })} />
              <Input label="Title (AR)" value={selectedRegulation.title_ar} dir="rtl"
                onChange={(e) => setSelectedRegulation({ ...selectedRegulation, title_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select value={selectedRegulation.category}
                  onChange={(e) => setSelectedRegulation({ ...selectedRegulation, category: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{locale === 'ar' ? cat.label_ar : cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select value={selectedRegulation.priority}
                  onChange={(e) => setSelectedRegulation({ ...selectedRegulation, priority: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Issuing Authority (EN)" value={selectedRegulation.issuing_authority}
                onChange={(e) => setSelectedRegulation({ ...selectedRegulation, issuing_authority: e.target.value })} />
              <Input label="Issuing Authority (AR)" value={selectedRegulation.issuing_authority_ar} dir="rtl"
                onChange={(e) => setSelectedRegulation({ ...selectedRegulation, issuing_authority_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Effective Date" type="date" value={selectedRegulation.effective_date}
                onChange={(e) => setSelectedRegulation({ ...selectedRegulation, effective_date: e.target.value })} />
              <Input label="Next Review Date" type="date" value={selectedRegulation.next_review_date || ''}
                onChange={(e) => setSelectedRegulation({ ...selectedRegulation, next_review_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description (EN)</label>
              <textarea value={selectedRegulation.description}
                onChange={(e) => setSelectedRegulation({ ...selectedRegulation, description: e.target.value })}
                rows={3} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description (AR)</label>
              <textarea value={selectedRegulation.description_ar} dir="rtl"
                onChange={(e) => setSelectedRegulation({ ...selectedRegulation, description_ar: e.target.value })}
                rows={3} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Compliance Status</label>
                <select value={selectedRegulation.compliance_status}
                  onChange={(e) => setSelectedRegulation({ ...selectedRegulation, compliance_status: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <option value="compliant">Compliant</option>
                  <option value="partial">Partial</option>
                  <option value="non_compliant">Non-Compliant</option>
                  <option value="under_review">Under Review</option>
                </select>
              </div>
              <Input label="Responsible Person" value={selectedRegulation.responsible_person || ''}
                onChange={(e) => setSelectedRegulation({ ...selectedRegulation, responsible_person: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveRegulation}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteRegulation} title="Delete Regulation"
        message="Are you sure you want to delete this regulation?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}
