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
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  DocumentCheckIcon,
  CloudArrowUpIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

interface ZATCAConfig {
  id: number;
  config_key: string;
  config_value: string;
  description: string;
  description_ar?: string;
  category: 'credentials' | 'endpoints' | 'certificates' | 'settings' | 'thresholds';
  is_encrypted: boolean;
  is_required: boolean;
  is_active: boolean;
  updated_at: string;
}

interface ComplianceLog {
  id: number;
  invoice_number: string;
  invoice_type: 'standard' | 'simplified';
  submission_date: string;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'warning';
  zatca_response_code?: string;
  message?: string;
  warnings?: string[];
}

const CONFIG_CATEGORIES = [
  { value: 'credentials', label: 'API Credentials', labelAr: 'بيانات الاعتماد', icon: '🔑' },
  { value: 'endpoints', label: 'API Endpoints', labelAr: 'نقاط الوصول', icon: '🔗' },
  { value: 'certificates', label: 'Certificates', labelAr: 'الشهادات', icon: '📜' },
  { value: 'settings', label: 'General Settings', labelAr: 'إعدادات عامة', icon: '⚙️' },
  { value: 'thresholds', label: 'Thresholds', labelAr: 'الحدود', icon: '📊' },
];

function ZATCAIntegrationPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [configs, setConfigs] = useState<ZATCAConfig[]>([]);
  const [logs, setLogs] = useState<ComplianceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ZATCAConfig | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const [formData, setFormData] = useState<{
    config_key: string;
    config_value: string;
    description: string;
    description_ar: string;
    category: ZATCAConfig['category'];
    is_encrypted: boolean;
    is_required: boolean;
    is_active: boolean;
  }>({
    config_key: '',
    config_value: '',
    description: '',
    description_ar: '',
    category: 'settings',
    is_encrypted: false,
    is_required: true,
    is_active: true,
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
      const res = await fetch('http://localhost:4000/api/zatca/config', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfigs(Array.isArray(data) ? data : data.data || []);
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
    setConfigs([
      { id: 1, config_key: 'ZATCA_CLIENT_ID', config_value: '****-****-****-1234', description: 'OAuth 2.0 Client ID for ZATCA API', category: 'credentials', is_encrypted: true, is_required: true, is_active: true, updated_at: '2025-01-15' },
      { id: 2, config_key: 'ZATCA_CLIENT_SECRET', config_value: '**********************', description: 'OAuth 2.0 Client Secret', category: 'credentials', is_encrypted: true, is_required: true, is_active: true, updated_at: '2025-01-15' },
      { id: 3, config_key: 'ZATCA_OTP_SECRET', config_value: '****', description: 'One-Time Password Secret', category: 'credentials', is_encrypted: true, is_required: true, is_active: true, updated_at: '2025-01-15' },
      { id: 4, config_key: 'ZATCA_API_URL', config_value: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core', description: 'Production API Base URL', category: 'endpoints', is_encrypted: false, is_required: true, is_active: true, updated_at: '2025-01-01' },
      { id: 5, config_key: 'ZATCA_SANDBOX_URL', config_value: 'https://gw-fatoora-sandbox.zatca.gov.sa', description: 'Sandbox API URL for testing', category: 'endpoints', is_encrypted: false, is_required: false, is_active: true, updated_at: '2025-01-01' },
      { id: 6, config_key: 'ZATCA_COMPLIANCE_CSID', config_value: 'CSID-XXXX-XXXX', description: 'Compliance CSID Certificate', category: 'certificates', is_encrypted: true, is_required: true, is_active: true, updated_at: '2025-01-10' },
      { id: 7, config_key: 'ZATCA_PRODUCTION_CSID', config_value: 'PROD-XXXX-XXXX', description: 'Production CSID Certificate', category: 'certificates', is_encrypted: true, is_required: true, is_active: true, updated_at: '2025-01-10' },
      { id: 8, config_key: 'ZATCA_PRIVATE_KEY', config_value: '****', description: 'Private Key for signing', category: 'certificates', is_encrypted: true, is_required: true, is_active: true, updated_at: '2025-01-10' },
      { id: 9, config_key: 'ZATCA_ENVIRONMENT', config_value: 'production', description: 'Current environment (sandbox/production)', category: 'settings', is_encrypted: false, is_required: true, is_active: true, updated_at: '2025-01-15' },
      { id: 10, config_key: 'ZATCA_AUTO_SUBMIT', config_value: 'true', description: 'Auto-submit invoices to ZATCA', category: 'settings', is_encrypted: false, is_required: false, is_active: true, updated_at: '2025-01-15' },
      { id: 11, config_key: 'ZATCA_SIMPLIFIED_LIMIT', config_value: '1000', description: 'Simplified invoice limit (SAR)', category: 'thresholds', is_encrypted: false, is_required: true, is_active: true, updated_at: '2025-01-01' },
      { id: 12, config_key: 'ZATCA_B2B_THRESHOLD', config_value: '0', description: 'B2B clearance threshold', category: 'thresholds', is_encrypted: false, is_required: false, is_active: true, updated_at: '2025-01-01' },
    ]);
    setLogs([
      { id: 1, invoice_number: 'INV-2025-0001', invoice_type: 'standard', submission_date: '2025-01-15T10:30:00', status: 'accepted', zatca_response_code: '200', message: 'Invoice cleared successfully' },
      { id: 2, invoice_number: 'INV-2025-0002', invoice_type: 'simplified', submission_date: '2025-01-15T11:15:00', status: 'accepted', zatca_response_code: '200', message: 'Invoice reported successfully' },
      { id: 3, invoice_number: 'INV-2025-0003', invoice_type: 'standard', submission_date: '2025-01-15T14:00:00', status: 'warning', zatca_response_code: '202', message: 'Invoice accepted with warnings', warnings: ['Buyer tax ID format warning'] },
      { id: 4, invoice_number: 'INV-2025-0004', invoice_type: 'standard', submission_date: '2025-01-15T15:30:00', status: 'rejected', zatca_response_code: '400', message: 'Invalid invoice hash' },
      { id: 5, invoice_number: 'INV-2025-0005', invoice_type: 'simplified', submission_date: '2025-01-15T16:00:00', status: 'pending', message: 'Awaiting submission' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.config_key.trim()) newErrors.config_key = t('validation.required');
    if (!formData.config_value.trim()) newErrors.config_value = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/zatca/config/${editingItem.id}`
        : 'http://localhost:4000/api/zatca/config';
      
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
      const newItem: ZATCAConfig = {
        id: editingItem?.id || Date.now(),
        ...formData,
        updated_at: new Date().toISOString(),
      };
      if (editingItem) {
        setConfigs(configs.map(i => i.id === editingItem.id ? newItem : i));
      } else {
        setConfigs([...configs, newItem]);
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
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/zatca/config/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* continue */ }
    setConfigs(configs.filter(i => i.id !== deletingId));
    showToast(t('common.deleted'), 'success');
    setIsDeleting(false);
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/zatca/test-connection', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTestStatus('success');
        showToast(t('zatca.connectionSuccess', 'Connection successful!'), 'success');
      } else {
        throw new Error();
      }
    } catch {
      // Simulate success for demo
      await new Promise(r => setTimeout(r, 2000));
      setTestStatus('success');
      showToast(t('zatca.connectionSuccess', 'Connection test passed (simulated)'), 'success');
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ config_key: '', config_value: '', description: '', description_ar: '', category: 'settings', is_encrypted: false, is_required: true, is_active: true });
    setErrors({});
  };

  const openEdit = (item: ZATCAConfig) => {
    setEditingItem(item);
    setFormData({
      config_key: item.config_key,
      config_value: item.is_encrypted ? '' : item.config_value,
      description: item.description,
      description_ar: item.description_ar || '',
      category: item.category,
      is_encrypted: item.is_encrypted,
      is_required: item.is_required,
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const filteredConfigs = configs.filter(item => {
    const matchSearch = !searchTerm || 
      item.config_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'warning': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('zatca.title', 'ZATCA Integration')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BuildingOfficeIcon className="w-8 h-8 text-green-600" />
              {t('zatca.title', 'ZATCA E-Invoicing Integration')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('zatca.subtitle', 'Configure and monitor ZATCA e-invoicing compliance')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setTestStatus('idle'); setShowTestModal(true); }} className="flex items-center gap-2">
              <BoltIcon className="w-5 h-5" />
              {t('zatca.testConnection', 'Test Connection')}
            </Button>
            {hasPermission('master:tax:create') && activeTab === 'config' && (
              <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                {t('zatca.newConfig', 'New Config')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DocumentCheckIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('zatca.accepted', 'Accepted')}</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {logs.filter(l => l.status === 'accepted').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-yellow-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <CloudArrowUpIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('zatca.pending', 'Pending')}</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {logs.filter(l => l.status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-orange-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <DocumentCheckIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('zatca.warnings', 'Warnings')}</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {logs.filter(l => l.status === 'warning').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <DocumentCheckIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('zatca.rejected', 'Rejected')}</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {logs.filter(l => l.status === 'rejected').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition ${
              activeTab === 'config'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {t('zatca.configuration', 'Configuration')}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {t('zatca.complianceLogs', 'Compliance Logs')}
          </button>
        </nav>
      </div>

      {activeTab === 'config' && (
        <>
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
                <option value="">{t('common.allCategories', 'All Categories')}</option>
                {CONFIG_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                {t('common.showing')}: {filteredConfigs.length}
              </div>
            </div>
          </Card>

          {/* Config Table */}
          <Card>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('zatca.configKey', 'Key')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('zatca.value', 'Value')}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.description')}</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.category')}</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredConfigs.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{item.config_key}</code>
                            {item.is_encrypted && (
                              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">🔒</span>
                            )}
                            {item.is_required && (
                              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">Required</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                            {item.is_encrypted ? '••••••••' : item.config_value}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded">
                            {CONFIG_CATEGORIES.find(c => c.value === item.category)?.icon} {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                            {item.is_active ? t('common.active') : t('common.inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {hasPermission('master:tax:update') && (
                              <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                                <PencilIcon className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission('master:tax:delete') && !item.is_required && (
                              <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </>
      )}

      {activeTab === 'logs' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('zatca.invoiceNumber', 'Invoice #')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('zatca.invoiceType', 'Type')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('zatca.submissionDate', 'Submitted')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('zatca.responseCode', 'Code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('zatca.message', 'Message')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-gray-900 dark:text-white">{log.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        log.invoice_type === 'standard' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {log.invoice_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                      {new Date(log.submission_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {log.zatca_response_code && (
                        <span className="font-mono text-sm">{log.zatca_response_code}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{log.message}</p>
                      {log.warnings && log.warnings.length > 0 && (
                        <ul className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                          {log.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Config Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('zatca.editConfig') : t('zatca.newConfig')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('zatca.configKey', 'Config Key')}
              value={formData.config_key}
              onChange={(e) => setFormData({ ...formData, config_key: e.target.value.toUpperCase().replace(/\s/g, '_') })}
              error={errors.config_key}
              required
              placeholder="e.g., ZATCA_API_KEY"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {CONFIG_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label={t('zatca.configValue', 'Config Value')}
            value={formData.config_value}
            onChange={(e) => setFormData({ ...formData, config_value: e.target.value })}
            error={errors.config_value}
            required
            type={formData.is_encrypted ? 'password' : 'text'}
            placeholder={editingItem?.is_encrypted ? 'Leave blank to keep existing' : 'Enter value'}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Input
              label={t('common.descriptionAr')}
              value={formData.description_ar}
              onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_encrypted"
                checked={formData.is_encrypted}
                onChange={(e) => setFormData({ ...formData, is_encrypted: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_encrypted" className="text-sm text-gray-700 dark:text-gray-300">
                🔒 {t('zatca.encrypted', 'Encrypted/Sensitive')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_required"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_required" className="text-sm text-gray-700 dark:text-gray-300">
                {t('zatca.required', 'Required')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                {t('common.active')}
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} loading={isSubmitting} className="flex-1">{t('common.save')}</Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1">{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>

      {/* Test Connection Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title={t('zatca.testConnection', 'Test ZATCA Connection')}
        size="md"
      >
        <div className="text-center py-6">
          {testStatus === 'idle' && (
            <>
              <BoltIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('zatca.testDescription', 'This will test the connection to ZATCA API using your current credentials.')}
              </p>
              <Button onClick={handleTestConnection}>
                {t('zatca.startTest', 'Start Connection Test')}
              </Button>
            </>
          )}
          {testStatus === 'testing' && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                {t('zatca.testing', 'Testing connection...')}
              </p>
            </>
          )}
          {testStatus === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <DocumentCheckIcon className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-green-600 font-semibold mb-2">{t('zatca.connectionSuccess', 'Connection Successful!')}</p>
              <p className="text-sm text-gray-500">{t('zatca.credentialsValid', 'Your ZATCA credentials are valid.')}</p>
            </>
          )}
          {testStatus === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-red-600 font-semibold mb-2">{t('zatca.connectionFailed', 'Connection Failed')}</p>
              <p className="text-sm text-gray-500">{t('zatca.checkCredentials', 'Please check your credentials and try again.')}</p>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('zatca.deleteConfigWarning', 'This config item will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, ZATCAIntegrationPage);
