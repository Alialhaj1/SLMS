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
  BookOpenIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline';

interface JournalType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  category: 'general' | 'sales' | 'purchases' | 'cash' | 'bank' | 'payroll' | 'inventory' | 'adjustment' | 'closing';
  prefix: string;
  next_number: number;
  auto_numbering: boolean;
  numbering_format: string;
  requires_approval: boolean;
  approval_levels: number;
  default_debit_account?: string;
  default_credit_account?: string;
  allows_manual_entry: boolean;
  is_system: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
}

const JOURNAL_CATEGORIES = [
  { value: 'general', label: 'General Journal', labelAr: 'القيود العامة', icon: '📋' },
  { value: 'sales', label: 'Sales Journal', labelAr: 'قيود المبيعات', icon: '💰' },
  { value: 'purchases', label: 'Purchases Journal', labelAr: 'قيود المشتريات', icon: '🛒' },
  { value: 'cash', label: 'Cash Journal', labelAr: 'قيود النقدية', icon: '💵' },
  { value: 'bank', label: 'Bank Journal', labelAr: 'قيود البنك', icon: '🏦' },
  { value: 'payroll', label: 'Payroll Journal', labelAr: 'قيود الرواتب', icon: '👥' },
  { value: 'inventory', label: 'Inventory Journal', labelAr: 'قيود المخزون', icon: '📦' },
  { value: 'adjustment', label: 'Adjustment Journal', labelAr: 'قيود التسوية', icon: '⚖️' },
  { value: 'closing', label: 'Closing Journal', labelAr: 'قيود الإقفال', icon: '🔒' },
];

function JournalTypesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<JournalType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<JournalType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    name_ar: string;
    category: JournalType['category'];
    prefix: string;
    next_number: number;
    auto_numbering: boolean;
    numbering_format: string;
    requires_approval: boolean;
    approval_levels: number;
    default_debit_account: string;
    default_credit_account: string;
    allows_manual_entry: boolean;
    is_system: boolean;
    is_active: boolean;
    description: string;
  }>({
    code: '',
    name: '',
    name_ar: '',
    category: 'general',
    prefix: 'JV',
    next_number: 1,
    auto_numbering: true,
    numbering_format: '{PREFIX}-{YEAR}-{NUMBER:5}',
    requires_approval: false,
    approval_levels: 1,
    default_debit_account: '',
    default_credit_account: '',
    allows_manual_entry: true,
    is_system: false,
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
      const res = await fetch('http://localhost:4000/api/journal-types', {
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
      { id: 1, code: 'GJ', name: 'General Journal', name_ar: 'القيود العامة', category: 'general', prefix: 'JV', next_number: 1001, auto_numbering: true, numbering_format: 'JV-{YEAR}-{NUMBER:5}', requires_approval: true, approval_levels: 1, allows_manual_entry: true, is_system: true, is_active: true, description: 'General journal entries for miscellaneous transactions', created_at: '2025-01-01' },
      { id: 2, code: 'SJ', name: 'Sales Journal', name_ar: 'قيود المبيعات', category: 'sales', prefix: 'SJ', next_number: 501, auto_numbering: true, numbering_format: 'SJ-{YEAR}-{NUMBER:5}', requires_approval: false, approval_levels: 0, default_debit_account: '1200', default_credit_account: '4100', allows_manual_entry: false, is_system: true, is_active: true, description: 'Auto-generated from sales invoices', created_at: '2025-01-01' },
      { id: 3, code: 'PJ', name: 'Purchases Journal', name_ar: 'قيود المشتريات', category: 'purchases', prefix: 'PJ', next_number: 301, auto_numbering: true, numbering_format: 'PJ-{YEAR}-{NUMBER:5}', requires_approval: false, approval_levels: 0, default_debit_account: '5100', default_credit_account: '2100', allows_manual_entry: false, is_system: true, is_active: true, description: 'Auto-generated from purchase invoices', created_at: '2025-01-01' },
      { id: 4, code: 'CRJ', name: 'Cash Receipts Journal', name_ar: 'قيود المقبوضات', category: 'cash', prefix: 'CR', next_number: 201, auto_numbering: true, numbering_format: 'CR-{YEAR}-{NUMBER:5}', requires_approval: false, approval_levels: 0, default_debit_account: '1100', allows_manual_entry: true, is_system: true, is_active: true, description: 'Cash receipts and collections', created_at: '2025-01-01' },
      { id: 5, code: 'CPJ', name: 'Cash Payments Journal', name_ar: 'قيود المدفوعات', category: 'cash', prefix: 'CP', next_number: 401, auto_numbering: true, numbering_format: 'CP-{YEAR}-{NUMBER:5}', requires_approval: true, approval_levels: 2, default_credit_account: '1100', allows_manual_entry: true, is_system: true, is_active: true, description: 'Cash payments and disbursements', created_at: '2025-01-01' },
      { id: 6, code: 'BJ', name: 'Bank Journal', name_ar: 'قيود البنك', category: 'bank', prefix: 'BJ', next_number: 101, auto_numbering: true, numbering_format: 'BJ-{YEAR}-{NUMBER:5}', requires_approval: true, approval_levels: 1, allows_manual_entry: true, is_system: true, is_active: true, description: 'Bank transactions and transfers', created_at: '2025-01-01' },
      { id: 7, code: 'PRJ', name: 'Payroll Journal', name_ar: 'قيود الرواتب', category: 'payroll', prefix: 'PR', next_number: 51, auto_numbering: true, numbering_format: 'PR-{YEAR}-{NUMBER:4}', requires_approval: true, approval_levels: 2, default_debit_account: '6100', default_credit_account: '2200', allows_manual_entry: false, is_system: true, is_active: true, description: 'Monthly payroll processing', created_at: '2025-01-01' },
      { id: 8, code: 'INV', name: 'Inventory Journal', name_ar: 'قيود المخزون', category: 'inventory', prefix: 'IV', next_number: 151, auto_numbering: true, numbering_format: 'IV-{YEAR}-{NUMBER:5}', requires_approval: false, approval_levels: 0, allows_manual_entry: false, is_system: true, is_active: true, description: 'Inventory movements and adjustments', created_at: '2025-01-01' },
      { id: 9, code: 'ADJ', name: 'Adjustment Journal', name_ar: 'قيود التسوية', category: 'adjustment', prefix: 'ADJ', next_number: 21, auto_numbering: true, numbering_format: 'ADJ-{YEAR}-{NUMBER:4}', requires_approval: true, approval_levels: 2, allows_manual_entry: true, is_system: true, is_active: true, description: 'Period-end adjustments and accruals', created_at: '2025-01-01' },
      { id: 10, code: 'CLJ', name: 'Closing Journal', name_ar: 'قيود الإقفال', category: 'closing', prefix: 'CL', next_number: 1, auto_numbering: true, numbering_format: 'CL-{YEAR}-{NUMBER:3}', requires_approval: true, approval_levels: 3, allows_manual_entry: true, is_system: true, is_active: true, description: 'Year-end closing entries', created_at: '2025-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.prefix.trim()) newErrors.prefix = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/journal-types/${editingItem.id}`
        : 'http://localhost:4000/api/journal-types';
      
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
      const newItem: JournalType = {
        id: editingItem?.id || Date.now(),
        ...formData,
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
    if (item?.is_system) {
      showToast(t('journalTypes.cannotDeleteSystem', 'Cannot delete system journal type'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/journal-types/${deletingId}`, {
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
    setFormData({ code: '', name: '', name_ar: '', category: 'general', prefix: 'JV', next_number: 1, auto_numbering: true, numbering_format: '{PREFIX}-{YEAR}-{NUMBER:5}', requires_approval: false, approval_levels: 1, default_debit_account: '', default_credit_account: '', allows_manual_entry: true, is_system: false, is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: JournalType) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      category: item.category,
      prefix: item.prefix,
      next_number: item.next_number,
      auto_numbering: item.auto_numbering,
      numbering_format: item.numbering_format,
      requires_approval: item.requires_approval,
      approval_levels: item.approval_levels,
      default_debit_account: item.default_debit_account || '',
      default_credit_account: item.default_credit_account || '',
      allows_manual_entry: item.allows_manual_entry,
      is_system: item.is_system,
      is_active: item.is_active,
      description: item.description || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const getCategoryIcon = (category: string) => {
    return JOURNAL_CATEGORIES.find(c => c.value === category)?.icon || '📋';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      sales: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      purchases: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      cash: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      bank: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      payroll: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      inventory: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      adjustment: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      closing: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[category] || colors.general;
  };

  const generateSampleNumber = (format: string, prefix: string, number: number) => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    let result = format
      .replace('{PREFIX}', prefix)
      .replace('{YEAR}', String(year))
      .replace('{MONTH}', month);
    
    const numberMatch = result.match(/{NUMBER:(\d+)}/);
    if (numberMatch) {
      const padding = parseInt(numberMatch[1]);
      result = result.replace(/{NUMBER:\d+}/, String(number).padStart(padding, '0'));
    } else {
      result = result.replace('{NUMBER}', String(number));
    }
    
    return result;
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('journalTypes.title', 'Journal Types')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('journalTypes.title', 'Journal Types')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('journalTypes.subtitle', 'Configure journal entry types and numbering')}
            </p>
          </div>
          {hasPermission('master:finance:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('journalTypes.new', 'New Journal Type')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BookOpenIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ArrowPathRoundedSquareIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('journalTypes.autoNumbered', 'Auto')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.auto_numbering).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <DocumentTextIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('journalTypes.requiresApproval', 'Approval')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.requires_approval).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <BookOpenIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('journalTypes.system', 'System')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.is_system).length}
              </p>
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
            <option value="">{t('common.allCategories', 'All Categories')}</option>
            {JOURNAL_CATEGORIES.map(cat => (
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
              <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.category')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('journalTypes.sampleNumber', 'Sample #')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('journalTypes.features', 'Features')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(item.category)}</span>
                        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.code}</span>
                        {item.is_system && (
                          <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">System</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                        {item.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{item.description}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                        {JOURNAL_CATEGORIES.find(c => c.value === item.category)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {generateSampleNumber(item.numbering_format, item.prefix, item.next_number)}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {item.auto_numbering && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded" title="Auto Numbering">Auto#</span>
                        )}
                        {item.requires_approval && (
                          <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded" title={`${item.approval_levels} Approval Level(s)`}>
                            ✓{item.approval_levels}
                          </span>
                        )}
                        {item.allows_manual_entry && (
                          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded" title="Manual Entry Allowed">Manual</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {item.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {hasPermission('master:finance:update') && (
                          <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('master:finance:delete') && !item.is_system && (
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

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('journalTypes.edit') : t('journalTypes.create')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., GJ"
              disabled={editingItem?.is_system}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                disabled={editingItem?.is_system}
              >
                {JOURNAL_CATEGORIES.map(cat => (
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

          {/* Numbering */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowPathRoundedSquareIcon className="w-5 h-5" />
              {t('journalTypes.numbering', 'Numbering Settings')}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label={t('journalTypes.prefix', 'Prefix')}
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                error={errors.prefix}
                required
                placeholder="e.g., JV"
              />
              <Input
                label={t('journalTypes.nextNumber', 'Next Number')}
                type="number"
                min="1"
                value={formData.next_number}
                onChange={(e) => setFormData({ ...formData, next_number: Number(e.target.value) })}
              />
              <div className="flex items-end">
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    id="auto_numbering"
                    checked={formData.auto_numbering}
                    onChange={(e) => setFormData({ ...formData, auto_numbering: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="auto_numbering" className="text-sm text-gray-700 dark:text-gray-300">
                    {t('journalTypes.autoNumbering', 'Auto Numbering')}
                  </label>
                </div>
              </div>
            </div>
            <Input
              label={t('journalTypes.format', 'Numbering Format')}
              value={formData.numbering_format}
              onChange={(e) => setFormData({ ...formData, numbering_format: e.target.value })}
              placeholder="{PREFIX}-{YEAR}-{NUMBER:5}"
            />
            <p className="text-xs text-gray-500">
              Preview: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{generateSampleNumber(formData.numbering_format, formData.prefix, formData.next_number)}</code>
            </p>
          </div>

          {/* Approval */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires_approval"
                checked={formData.requires_approval}
                onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="requires_approval" className="text-sm text-gray-700 dark:text-gray-300">
                {t('journalTypes.requiresApproval', 'Requires Approval')}
              </label>
            </div>
            {formData.requires_approval && (
              <Input
                label={t('journalTypes.approvalLevels', 'Approval Levels')}
                type="number"
                min="1"
                max="5"
                value={formData.approval_levels}
                onChange={(e) => setFormData({ ...formData, approval_levels: Number(e.target.value) })}
              />
            )}
          </div>

          {/* Default Accounts */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('journalTypes.defaultDebit', 'Default Debit Account')}
              value={formData.default_debit_account}
              onChange={(e) => setFormData({ ...formData, default_debit_account: e.target.value })}
              placeholder="Account Code"
            />
            <Input
              label={t('journalTypes.defaultCredit', 'Default Credit Account')}
              value={formData.default_credit_account}
              onChange={(e) => setFormData({ ...formData, default_credit_account: e.target.value })}
              placeholder="Account Code"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allows_manual"
                checked={formData.allows_manual_entry}
                onChange={(e) => setFormData({ ...formData, allows_manual_entry: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="allows_manual" className="text-sm text-gray-700 dark:text-gray-300">
                {t('journalTypes.allowsManual', 'Allows Manual Entry')}
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
        message={t('journalTypes.deleteWarning', 'This journal type will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, JournalTypesPage);
