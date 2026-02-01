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
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

interface ContractTemplate {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  category: 'employment' | 'vendor' | 'customer' | 'service' | 'lease' | 'nda' | 'sales' | 'partnership' | 'other';
  type: 'word' | 'pdf' | 'html';
  file_name?: string;
  file_size_kb?: number;
  version: string;
  placeholders: string[];
  language: 'en' | 'ar' | 'bilingual';
  requires_approval: boolean;
  approval_workflow_id?: number;
  usage_count: number;
  last_used_at?: string;
  is_default: boolean;
  is_active: boolean;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_CATEGORIES = [
  { value: 'employment', label: 'Employment', labelAr: 'توظيف', icon: '👤', color: 'blue' },
  { value: 'vendor', label: 'Vendor/Supplier', labelAr: 'موردين', icon: '🏭', color: 'green' },
  { value: 'customer', label: 'Customer', labelAr: 'عملاء', icon: '👥', color: 'purple' },
  { value: 'service', label: 'Service', labelAr: 'خدمات', icon: '⚙️', color: 'yellow' },
  { value: 'lease', label: 'Lease/Rental', labelAr: 'إيجار', icon: '🏠', color: 'orange' },
  { value: 'nda', label: 'NDA', labelAr: 'سرية', icon: '🔒', color: 'red' },
  { value: 'sales', label: 'Sales', labelAr: 'مبيعات', icon: '💰', color: 'indigo' },
  { value: 'partnership', label: 'Partnership', labelAr: 'شراكة', icon: '🤝', color: 'cyan' },
  { value: 'other', label: 'Other', labelAr: 'أخرى', icon: '📄', color: 'gray' },
];

const COMMON_PLACEHOLDERS = [
  '{{company_name}}', '{{company_name_ar}}', '{{company_cr}}', '{{company_address}}',
  '{{party_name}}', '{{party_name_ar}}', '{{party_id}}', '{{party_address}}',
  '{{contract_date}}', '{{start_date}}', '{{end_date}}', '{{contract_number}}',
  '{{amount}}', '{{amount_words}}', '{{currency}}', '{{payment_terms}}',
  '{{employee_name}}', '{{employee_id}}', '{{job_title}}', '{{department}}',
  '{{salary}}', '{{probation_period}}', '{{notice_period}}',
  '{{witness_1}}', '{{witness_2}}', '{{authorized_signatory}}'
];

function ContractTemplatesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContractTemplate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    name_ar: string;
    category: ContractTemplate['category'];
    type: ContractTemplate['type'];
    version: string;
    placeholders: string[];
    language: ContractTemplate['language'];
    requires_approval: boolean;
    is_default: boolean;
    is_active: boolean;
    description: string;
  }>({
    code: '',
    name: '',
    name_ar: '',
    category: 'other',
    type: 'word',
    version: '1.0',
    placeholders: [],
    language: 'bilingual',
    requires_approval: true,
    is_default: false,
    is_active: true,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placeholderInput, setPlaceholderInput] = useState('');

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
      const res = await fetch('http://localhost:4000/api/contract-templates', {
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
      { id: 1, code: 'EMP-PERM', name: 'Permanent Employment Contract', name_ar: 'عقد عمل دائم', category: 'employment', type: 'word', file_name: 'employment_permanent_v3.docx', file_size_kb: 125, version: '3.0', placeholders: ['{{employee_name}}', '{{employee_id}}', '{{job_title}}', '{{department}}', '{{salary}}', '{{start_date}}', '{{probation_period}}'], language: 'bilingual', requires_approval: true, usage_count: 45, last_used_at: '2024-06-15', is_default: true, is_active: true, description: 'Standard permanent employment contract per Saudi Labor Law', created_by: 'HR Admin', created_at: '2024-01-01', updated_at: '2024-03-15' },
      { id: 2, code: 'EMP-FIXED', name: 'Fixed-Term Employment Contract', name_ar: 'عقد عمل محدد المدة', category: 'employment', type: 'word', file_name: 'employment_fixed_v2.docx', file_size_kb: 118, version: '2.0', placeholders: ['{{employee_name}}', '{{job_title}}', '{{salary}}', '{{start_date}}', '{{end_date}}', '{{renewal_terms}}'], language: 'bilingual', requires_approval: true, usage_count: 28, last_used_at: '2024-06-10', is_default: false, is_active: true, created_by: 'HR Admin', created_at: '2024-01-01', updated_at: '2024-02-20' },
      { id: 3, code: 'VENDOR-STD', name: 'Vendor Service Agreement', name_ar: 'اتفاقية خدمات مورد', category: 'vendor', type: 'word', file_name: 'vendor_agreement_v4.docx', file_size_kb: 156, version: '4.0', placeholders: ['{{party_name}}', '{{party_cr}}', '{{contract_date}}', '{{amount}}', '{{payment_terms}}', '{{scope_of_work}}'], language: 'bilingual', requires_approval: true, usage_count: 32, last_used_at: '2024-06-12', is_default: true, is_active: true, description: 'Standard vendor service agreement template', created_by: 'Procurement', created_at: '2024-01-01', updated_at: '2024-04-10' },
      { id: 4, code: 'CUST-SALES', name: 'Customer Sales Contract', name_ar: 'عقد مبيعات عميل', category: 'customer', type: 'word', file_name: 'customer_sales_v2.docx', file_size_kb: 142, version: '2.1', placeholders: ['{{party_name}}', '{{contract_number}}', '{{amount}}', '{{delivery_terms}}', '{{warranty_period}}'], language: 'bilingual', requires_approval: true, usage_count: 58, last_used_at: '2024-06-18', is_default: true, is_active: true, created_by: 'Sales', created_at: '2024-01-01', updated_at: '2024-05-05' },
      { id: 5, code: 'NDA-STD', name: 'Non-Disclosure Agreement', name_ar: 'اتفاقية عدم الإفصاح', category: 'nda', type: 'word', file_name: 'nda_standard_v3.docx', file_size_kb: 85, version: '3.0', placeholders: ['{{party_name}}', '{{party_id}}', '{{contract_date}}', '{{confidentiality_period}}'], language: 'bilingual', requires_approval: false, usage_count: 42, last_used_at: '2024-06-14', is_default: true, is_active: true, description: 'Standard NDA for vendors and partners', created_by: 'Legal', created_at: '2024-01-01', updated_at: '2024-01-15' },
      { id: 6, code: 'LEASE-OFF', name: 'Office Lease Agreement', name_ar: 'عقد إيجار مكتب', category: 'lease', type: 'word', file_name: 'office_lease_v1.docx', file_size_kb: 168, version: '1.5', placeholders: ['{{property_address}}', '{{landlord_name}}', '{{lease_amount}}', '{{start_date}}', '{{end_date}}', '{{deposit}}'], language: 'bilingual', requires_approval: true, usage_count: 5, last_used_at: '2024-03-01', is_default: true, is_active: true, created_by: 'Admin', created_at: '2024-01-01', updated_at: '2024-01-20' },
      { id: 7, code: 'SVC-MAINT', name: 'Maintenance Service Contract', name_ar: 'عقد خدمات صيانة', category: 'service', type: 'word', file_name: 'maintenance_contract_v2.docx', file_size_kb: 134, version: '2.0', placeholders: ['{{service_provider}}', '{{equipment_list}}', '{{service_schedule}}', '{{amount}}', '{{start_date}}', '{{end_date}}'], language: 'en', requires_approval: true, usage_count: 12, last_used_at: '2024-05-20', is_default: false, is_active: true, created_by: 'Operations', created_at: '2024-01-01', updated_at: '2024-02-28' },
      { id: 8, code: 'PART-JV', name: 'Joint Venture Agreement', name_ar: 'اتفاقية مشروع مشترك', category: 'partnership', type: 'word', file_name: 'joint_venture_v1.docx', file_size_kb: 245, version: '1.0', placeholders: ['{{partner_1_name}}', '{{partner_2_name}}', '{{equity_split}}', '{{project_scope}}', '{{governance_structure}}'], language: 'bilingual', requires_approval: true, usage_count: 2, last_used_at: '2024-04-15', is_default: true, is_active: true, description: 'Joint venture agreement template for strategic partnerships', created_by: 'Legal', created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.version.trim()) newErrors.version = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/contract-templates/${editingItem.id}`
        : 'http://localhost:4000/api/contract-templates';
      
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
      const newItem: ContractTemplate = {
        id: editingItem?.id || Date.now(),
        ...formData,
        file_name: editingItem?.file_name,
        file_size_kb: editingItem?.file_size_kb,
        description: formData.description || undefined,
        usage_count: editingItem?.usage_count || 0,
        last_used_at: editingItem?.last_used_at,
        created_by: editingItem?.created_by || 'Current User',
        created_at: editingItem?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
    if (item && item.usage_count > 0) {
      showToast(t('contractTemplates.cannotDeleteUsed', 'Cannot delete template with usage history'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/contract-templates/${deletingId}`, {
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
    setFormData({ code: '', name: '', name_ar: '', category: 'other', type: 'word', version: '1.0', placeholders: [], language: 'bilingual', requires_approval: true, is_default: false, is_active: true, description: '' });
    setErrors({});
    setPlaceholderInput('');
  };

  const openEdit = (item: ContractTemplate) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      category: item.category,
      type: item.type,
      version: item.version,
      placeholders: item.placeholders,
      language: item.language,
      requires_approval: item.requires_approval,
      is_default: item.is_default,
      is_active: item.is_active,
      description: item.description || '',
    });
    setShowModal(true);
  };

  const addPlaceholder = (placeholder: string) => {
    if (placeholder && !formData.placeholders.includes(placeholder)) {
      setFormData({ ...formData, placeholders: [...formData.placeholders, placeholder] });
    }
    setPlaceholderInput('');
  };

  const removePlaceholder = (placeholder: string) => {
    setFormData({ ...formData, placeholders: formData.placeholders.filter(p => p !== placeholder) });
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const totalUsage = items.reduce((sum, t) => sum + t.usage_count, 0);
  const activeTemplates = items.filter(t => t.is_active).length;

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      employment: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      vendor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      customer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      service: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      lease: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      nda: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      sales: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      partnership: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[category] || colors.other;
  };

  const getCategoryInfo = (category: string) => {
    return TEMPLATE_CATEGORIES.find(c => c.value === category);
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'en': return '🇬🇧 EN';
      case 'ar': return '🇸🇦 AR';
      case 'bilingual': return '🇬🇧🇸🇦';
      default: return lang;
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('contractTemplates.title', 'Contract Templates')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('contractTemplates.title', 'Contract Templates')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('contractTemplates.subtitle', 'Manage contract and agreement templates')}
            </p>
          </div>
          {hasPermission('master:documents:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('contractTemplates.new', 'New Template')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('contractTemplates.templates', 'Templates')}</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('contractTemplates.totalUsage', 'Total Uses')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalUsage}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <TagIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('contractTemplates.active', 'Active')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{activeTemplates}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <DocumentTextIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('contractTemplates.categories', 'Categories')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{new Set(items.map(i => i.category)).size}</p>
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
            <option value="">{t('contractTemplates.allCategories', 'All Categories')}</option>
            {TEMPLATE_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length}
          </div>
        </div>
      </Card>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-3 p-8 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const catInfo = getCategoryInfo(item.category);
            return (
              <Card key={item.id} className="p-4 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{catInfo?.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{item.code}</span>
                        <span className="text-xs text-gray-400">v{item.version}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{item.name}</h3>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs">{getLanguageLabel(item.language)}</span>
                    {item.is_default && (
                      <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Default</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                    {catInfo?.label}
                  </span>
                  <span className="text-xs text-gray-400 uppercase">{item.type}</span>
                  {item.file_size_kb && (
                    <span className="text-xs text-gray-400">{item.file_size_kb}KB</span>
                  )}
                </div>

                {item.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{item.description}</p>
                )}

                {/* Placeholders preview */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.placeholders.slice(0, 4).map(ph => (
                    <span key={ph} className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded font-mono">
                      {ph.replace(/\{\{|\}\}/g, '')}
                    </span>
                  ))}
                  {item.placeholders.length > 4 && (
                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                      +{item.placeholders.length - 4}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">{item.usage_count}</span> uses
                    {item.last_used_at && (
                      <span className="ml-2">• {new Date(item.last_used_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20" title="Preview">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded dark:hover:bg-green-900/20" title="Download">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                    {hasPermission('master:documents:update') && (
                      <button onClick={() => openEdit(item)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('master:documents:delete') && item.usage_count === 0 && (
                      <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('contractTemplates.edit') : t('contractTemplates.create')}
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
              placeholder="e.g., EMP-PERM"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('contractTemplates.category', 'Category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {TEMPLATE_CATEGORIES.map(cat => (
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

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('contractTemplates.version', 'Version')}
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              error={errors.version}
              required
              placeholder="e.g., 1.0"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('contractTemplates.type', 'File Type')}
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="word">Word (.docx)</option>
                <option value="pdf">PDF (.pdf)</option>
                <option value="html">HTML Template</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('contractTemplates.language', 'Language')}
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="bilingual">🇬🇧🇸🇦 Bilingual</option>
                <option value="en">🇬🇧 English</option>
                <option value="ar">🇸🇦 Arabic</option>
              </select>
            </div>
          </div>

          {/* Placeholders */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contractTemplates.placeholders', 'Template Placeholders')}
            </label>
            <div className="flex gap-2 mb-2">
              <select
                value={placeholderInput}
                onChange={(e) => setPlaceholderInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="">Select placeholder...</option>
                {COMMON_PLACEHOLDERS.filter(p => !formData.placeholders.includes(p)).map(ph => (
                  <option key={ph} value={ph}>{ph}</option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => addPlaceholder(placeholderInput)} disabled={!placeholderInput}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.placeholders.map(ph => (
                <span key={ph} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded font-mono">
                  {ph}
                  <button onClick={() => removePlaceholder(ph)} className="hover:text-red-600">×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.requires_approval}
                onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Requires Approval</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Default Template</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
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
        message={t('contractTemplates.deleteWarning', 'This contract template will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, ContractTemplatesPage);
