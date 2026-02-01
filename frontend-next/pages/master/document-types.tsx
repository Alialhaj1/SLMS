import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Card from '../../components/ui/Card';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

interface DocumentType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  category: 'legal' | 'hr' | 'financial' | 'operational' | 'technical' | 'commercial' | 'compliance' | 'other';
  file_formats: string[];
  max_file_size_mb: number;
  requires_approval: boolean;
  approval_levels: number;
  requires_expiry: boolean;
  default_validity_days?: number;
  is_confidential: boolean;
  retention_period_years: number;
  numbering_prefix?: string;
  auto_numbering: boolean;
  requires_version_control: boolean;
  requires_digital_signature: boolean;
  applicable_to: 'all' | 'employees' | 'customers' | 'suppliers' | 'shipments' | 'contracts';
  template_available: boolean;
  document_count: number;
  is_mandatory: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
}

const DOCUMENT_CATEGORIES = [
  { value: 'legal', label: 'Legal', labelAr: 'قانوني', icon: '⚖️', color: 'red' },
  { value: 'hr', label: 'HR', labelAr: 'موارد بشرية', icon: '👥', color: 'blue' },
  { value: 'financial', label: 'Financial', labelAr: 'مالي', icon: '💰', color: 'green' },
  { value: 'operational', label: 'Operational', labelAr: 'تشغيلي', icon: '⚙️', color: 'yellow' },
  { value: 'technical', label: 'Technical', labelAr: 'تقني', icon: '🔧', color: 'purple' },
  { value: 'commercial', label: 'Commercial', labelAr: 'تجاري', icon: '📊', color: 'indigo' },
  { value: 'compliance', label: 'Compliance', labelAr: 'امتثال', icon: '✅', color: 'orange' },
  { value: 'other', label: 'Other', labelAr: 'أخرى', icon: '📁', color: 'gray' },
];

const FILE_FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'doc', label: 'DOC/DOCX' },
  { value: 'xls', label: 'XLS/XLSX' },
  { value: 'jpg', label: 'JPG/JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'zip', label: 'ZIP' },
  { value: 'xml', label: 'XML' },
];

function DocumentTypesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DocumentType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    name_ar: string;
    category: DocumentType['category'];
    file_formats: string[];
    max_file_size_mb: number;
    requires_approval: boolean;
    approval_levels: number;
    requires_expiry: boolean;
    default_validity_days: number;
    is_confidential: boolean;
    retention_period_years: number;
    numbering_prefix: string;
    auto_numbering: boolean;
    requires_version_control: boolean;
    requires_digital_signature: boolean;
    applicable_to: DocumentType['applicable_to'];
    template_available: boolean;
    is_mandatory: boolean;
    is_active: boolean;
    description: string;
  }>({
    code: '',
    name: '',
    name_ar: '',
    category: 'other',
    file_formats: ['pdf'],
    max_file_size_mb: 10,
    requires_approval: false,
    approval_levels: 1,
    requires_expiry: false,
    default_validity_days: 365,
    is_confidential: false,
    retention_period_years: 5,
    numbering_prefix: '',
    auto_numbering: true,
    requires_version_control: false,
    requires_digital_signature: false,
    applicable_to: 'all',
    template_available: false,
    is_mandatory: false,
    is_active: true,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/document-types', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.data || []);
      } else {
        loadMockData();
      }
    } catch {
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setItems([
      { id: 1, code: 'CR', name: 'Commercial Registration', name_ar: 'السجل التجاري', category: 'legal', file_formats: ['pdf', 'jpg'], max_file_size_mb: 5, requires_approval: true, approval_levels: 2, requires_expiry: true, default_validity_days: 365, is_confidential: false, retention_period_years: 10, numbering_prefix: 'CR', auto_numbering: true, requires_version_control: true, requires_digital_signature: false, applicable_to: 'all', template_available: false, document_count: 5, is_mandatory: true, is_active: true, description: 'Company commercial registration certificate', created_at: '2024-01-01' },
      { id: 2, code: 'VAT-CERT', name: 'VAT Certificate', name_ar: 'شهادة ضريبة القيمة المضافة', category: 'financial', file_formats: ['pdf'], max_file_size_mb: 3, requires_approval: false, approval_levels: 1, requires_expiry: true, default_validity_days: 365, is_confidential: false, retention_period_years: 7, numbering_prefix: 'VAT', auto_numbering: true, requires_version_control: true, requires_digital_signature: false, applicable_to: 'all', template_available: false, document_count: 3, is_mandatory: true, is_active: true, created_at: '2024-01-01' },
      { id: 3, code: 'EMP-CONTRACT', name: 'Employment Contract', name_ar: 'عقد عمل', category: 'hr', file_formats: ['pdf', 'doc'], max_file_size_mb: 5, requires_approval: true, approval_levels: 2, requires_expiry: false, is_confidential: true, retention_period_years: 10, numbering_prefix: 'EC', auto_numbering: true, requires_version_control: true, requires_digital_signature: true, applicable_to: 'employees', template_available: true, document_count: 125, is_mandatory: true, is_active: true, description: 'Employee employment contract', created_at: '2024-01-01' },
      { id: 4, code: 'ID-COPY', name: 'ID Copy (Iqama/Passport)', name_ar: 'صورة الهوية/الإقامة', category: 'hr', file_formats: ['pdf', 'jpg', 'png'], max_file_size_mb: 3, requires_approval: false, approval_levels: 1, requires_expiry: true, default_validity_days: 365, is_confidential: true, retention_period_years: 5, auto_numbering: false, requires_version_control: false, requires_digital_signature: false, applicable_to: 'employees', template_available: false, document_count: 130, is_mandatory: true, is_active: true, created_at: '2024-01-01' },
      { id: 5, code: 'CUST-CONTRACT', name: 'Customer Contract', name_ar: 'عقد عميل', category: 'commercial', file_formats: ['pdf'], max_file_size_mb: 10, requires_approval: true, approval_levels: 3, requires_expiry: true, default_validity_days: 365, is_confidential: true, retention_period_years: 7, numbering_prefix: 'CC', auto_numbering: true, requires_version_control: true, requires_digital_signature: true, applicable_to: 'customers', template_available: true, document_count: 45, is_mandatory: false, is_active: true, created_at: '2024-01-01' },
      { id: 6, code: 'SUPP-CONTRACT', name: 'Supplier Contract', name_ar: 'عقد مورد', category: 'commercial', file_formats: ['pdf'], max_file_size_mb: 10, requires_approval: true, approval_levels: 2, requires_expiry: true, default_validity_days: 365, is_confidential: true, retention_period_years: 7, numbering_prefix: 'SC', auto_numbering: true, requires_version_control: true, requires_digital_signature: true, applicable_to: 'suppliers', template_available: true, document_count: 28, is_mandatory: false, is_active: true, created_at: '2024-01-01' },
      { id: 7, code: 'BL', name: 'Bill of Lading', name_ar: 'بوليصة شحن', category: 'operational', file_formats: ['pdf', 'jpg'], max_file_size_mb: 5, requires_approval: false, approval_levels: 1, requires_expiry: false, is_confidential: false, retention_period_years: 7, numbering_prefix: 'BL', auto_numbering: false, requires_version_control: false, requires_digital_signature: false, applicable_to: 'shipments', template_available: false, document_count: 320, is_mandatory: true, is_active: true, description: 'Shipping bill of lading', created_at: '2024-01-01' },
      { id: 8, code: 'CI', name: 'Commercial Invoice', name_ar: 'فاتورة تجارية', category: 'financial', file_formats: ['pdf', 'xls'], max_file_size_mb: 5, requires_approval: false, approval_levels: 1, requires_expiry: false, is_confidential: false, retention_period_years: 7, numbering_prefix: 'CI', auto_numbering: false, requires_version_control: false, requires_digital_signature: false, applicable_to: 'shipments', template_available: true, document_count: 285, is_mandatory: true, is_active: true, created_at: '2024-01-01' },
      { id: 9, code: 'COO', name: 'Certificate of Origin', name_ar: 'شهادة منشأ', category: 'compliance', file_formats: ['pdf'], max_file_size_mb: 3, requires_approval: false, approval_levels: 1, requires_expiry: false, is_confidential: false, retention_period_years: 7, auto_numbering: false, requires_version_control: false, requires_digital_signature: false, applicable_to: 'shipments', template_available: false, document_count: 180, is_mandatory: false, is_active: true, created_at: '2024-01-01' },
      { id: 10, code: 'TECH-SPEC', name: 'Technical Specification', name_ar: 'مواصفات فنية', category: 'technical', file_formats: ['pdf', 'doc', 'xls'], max_file_size_mb: 20, requires_approval: true, approval_levels: 2, requires_expiry: false, is_confidential: true, retention_period_years: 5, numbering_prefix: 'TS', auto_numbering: true, requires_version_control: true, requires_digital_signature: false, applicable_to: 'all', template_available: true, document_count: 45, is_mandatory: false, is_active: true, created_at: '2024-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (formData.file_formats.length === 0) newErrors.file_formats = t('documentTypes.selectFormat', 'Select at least one format');
    if (formData.max_file_size_mb < 1) newErrors.max_file_size_mb = t('validation.positive');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/document-types/${editingItem.id}`
        : 'http://localhost:4000/api/document-types';
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(t('common.success'), 'success');
        fetchData();
        setShowModal(false);
        resetForm();
      } else {
        throw new Error();
      }
    } catch {
      const newItem: DocumentType = {
        id: editingItem?.id || Date.now(),
        ...formData,
        default_validity_days: formData.requires_expiry ? formData.default_validity_days : undefined,
        numbering_prefix: formData.numbering_prefix || undefined,
        description: formData.description || undefined,
        document_count: editingItem?.document_count || 0,
        created_at: new Date().toISOString(),
      };
      if (editingItem) {
        setItems(items.map(i => i.id === editingItem.id ? newItem : i));
      } else {
        setItems([...items, newItem]);
      }
      showToast(t('common.success'), 'success');
      setShowModal(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const item = items.find(i => i.id === deletingId);
    if (item && item.document_count > 0) {
      showToast(t('documentTypes.cannotDeleteWithDocs', 'Cannot delete type with existing documents'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/document-types/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* continue */ }
    setItems(items.filter(i => i.id !== deletingId));
    showToast(t('common.deleted'), 'success');
    setIsDeleting(false);
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', category: 'other', file_formats: ['pdf'], max_file_size_mb: 10, requires_approval: false, approval_levels: 1, requires_expiry: false, default_validity_days: 365, is_confidential: false, retention_period_years: 5, numbering_prefix: '', auto_numbering: true, requires_version_control: false, requires_digital_signature: false, applicable_to: 'all', template_available: false, is_mandatory: false, is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: DocumentType) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      category: item.category,
      file_formats: item.file_formats,
      max_file_size_mb: item.max_file_size_mb,
      requires_approval: item.requires_approval,
      approval_levels: item.approval_levels,
      requires_expiry: item.requires_expiry,
      default_validity_days: item.default_validity_days || 365,
      is_confidential: item.is_confidential,
      retention_period_years: item.retention_period_years,
      numbering_prefix: item.numbering_prefix || '',
      auto_numbering: item.auto_numbering,
      requires_version_control: item.requires_version_control,
      requires_digital_signature: item.requires_digital_signature,
      applicable_to: item.applicable_to,
      template_available: item.template_available,
      is_mandatory: item.is_mandatory,
      is_active: item.is_active,
      description: item.description || '',
    });
    setShowModal(true);
  };

  const toggleFormat = (format: string) => {
    if (formData.file_formats.includes(format)) {
      setFormData({ ...formData, file_formats: formData.file_formats.filter(f => f !== format) });
    } else {
      setFormData({ ...formData, file_formats: [...formData.file_formats, format] });
    }
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const totalDocs = items.reduce((sum, d) => sum + d.document_count, 0);
  const mandatoryCount = items.filter(d => d.is_mandatory).length;
  const withTemplates = items.filter(d => d.template_available).length;

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      legal: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      hr: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      financial: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      operational: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      technical: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      commercial: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      compliance: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[category] || colors.other;
  };

  const getCategoryInfo = (category: string) => {
    return DOCUMENT_CATEGORIES.find(c => c.value === category);
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('documentTypes.title', 'Document Types')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('documentTypes.title', 'Document Types')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('documentTypes.subtitle', 'Define document categories, requirements, and policies')}
            </p>
          </div>
          {hasPermission('master:documents:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('documentTypes.new', 'New Document Type')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FolderIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('documentTypes.types', 'Types')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DocumentDuplicateIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('documentTypes.totalDocs', 'Total Documents')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalDocs}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <TagIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('documentTypes.mandatory', 'Mandatory')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{mandatoryCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <DocumentTextIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('documentTypes.templates', 'Templates')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{withTemplates}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('documentTypes.allCategories', 'All Categories')}</option>
            {DOCUMENT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('documentTypes.documentType', 'Document Type')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('documentTypes.category', 'Category')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('documentTypes.formats', 'Formats')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('documentTypes.settings', 'Settings')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('documentTypes.documents', 'Docs')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const catInfo = getCategoryInfo(item.category);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{catInfo?.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{item.code}</span>
                              {item.is_mandatory && (
                                <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">Required</span>
                              )}
                              {item.is_confidential && (
                                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">🔒</span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                            {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                          {catInfo?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {item.file_formats.map(fmt => (
                            <span key={fmt} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded uppercase">
                              {fmt}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Max {item.max_file_size_mb}MB</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {item.requires_approval && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded" title={`${item.approval_levels} levels`}>
                              ✅{item.approval_levels}
                            </span>
                          )}
                          {item.requires_expiry && (
                            <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded" title="Expiry tracking">
                              ⏰
                            </span>
                          )}
                          {item.requires_version_control && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded" title="Version control">
                              📝
                            </span>
                          )}
                          {item.template_available && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded" title="Template available">
                              📄
                            </span>
                          )}
                          {item.requires_digital_signature && (
                            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded" title="Digital signature">
                              ✍️
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.document_count}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('master:documents:update') && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('master:documents:delete') && item.document_count === 0 && (
                            <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('documentTypes.edit') : t('documentTypes.create')}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., BL, CI, CR"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('documentTypes.category', 'Category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {DOCUMENT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />
            <Input
              label={t('common.nameAr')}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('documentTypes.allowedFormats', 'Allowed File Formats')} <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {FILE_FORMATS.map(fmt => (
                <button
                  key={fmt.value}
                  type="button"
                  onClick={() => toggleFormat(fmt.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                    formData.file_formats.includes(fmt.value)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
            {errors.file_formats && <p className="text-sm text-red-600 mt-1">{errors.file_formats}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('documentTypes.maxFileSize', 'Max File Size (MB)')}
              type="number"
              min="1"
              value={formData.max_file_size_mb}
              onChange={(e) => setFormData({ ...formData, max_file_size_mb: Number(e.target.value) })}
              error={errors.max_file_size_mb}
            />
            <Input
              label={t('documentTypes.retention', 'Retention (Years)')}
              type="number"
              min="1"
              value={formData.retention_period_years}
              onChange={(e) => setFormData({ ...formData, retention_period_years: Number(e.target.value) })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('documentTypes.applicableTo', 'Applicable To')}
              </label>
              <select
                value={formData.applicable_to}
                onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="all">All</option>
                <option value="employees">Employees</option>
                <option value="customers">Customers</option>
                <option value="suppliers">Suppliers</option>
                <option value="shipments">Shipments</option>
                <option value="contracts">Contracts</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('documentTypes.numberingPrefix', 'Numbering Prefix')}
              value={formData.numbering_prefix}
              onChange={(e) => setFormData({ ...formData, numbering_prefix: e.target.value.toUpperCase() })}
              placeholder="e.g., DOC"
            />
            <Input
              label={t('documentTypes.approvalLevels', 'Approval Levels')}
              type="number"
              min="1"
              max="5"
              value={formData.approval_levels}
              onChange={(e) => setFormData({ ...formData, approval_levels: Number(e.target.value) })}
              disabled={!formData.requires_approval}
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('documentTypes.options', 'Document Options')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'requires_approval', label: 'Requires Approval' },
                { key: 'requires_expiry', label: 'Track Expiry' },
                { key: 'is_confidential', label: 'Confidential' },
                { key: 'auto_numbering', label: 'Auto Numbering' },
                { key: 'requires_version_control', label: 'Version Control' },
                { key: 'requires_digital_signature', label: 'Digital Signature' },
                { key: 'template_available', label: 'Template Available' },
                { key: 'is_mandatory', label: 'Mandatory' },
              ].map(opt => (
                <div key={opt.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={opt.key}
                    checked={formData[opt.key as keyof typeof formData] as boolean}
                    onChange={(e) => setFormData({ ...formData, [opt.key]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor={opt.key} className="text-sm text-gray-700 dark:text-gray-300">
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {formData.requires_expiry && (
            <Input
              label={t('documentTypes.defaultValidity', 'Default Validity (Days)')}
              type="number"
              min="1"
              value={formData.default_validity_days}
              onChange={(e) => setFormData({ ...formData, default_validity_days: Number(e.target.value) })}
            />
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">{t('common.active')}</label>
          </div>

          <Input
            label={t('common.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} loading={isSubmitting} className="flex-1">{t('common.save')}</Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1">{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('documentTypes.deleteWarning', 'This document type will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, DocumentTypesPage);
