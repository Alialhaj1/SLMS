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
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';

interface VoucherType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  voucher_class: 'payment' | 'receipt' | 'journal' | 'contra';
  transaction_type: 'cash' | 'bank' | 'both';
  prefix: string;
  next_number: number;
  auto_numbering: boolean;
  numbering_format: string;
  journal_type_id?: number;
  journal_type_code?: string;
  requires_approval: boolean;
  approval_amount_threshold?: number;
  requires_attachment: boolean;
  default_account_code?: string;
  affects_cash_book: boolean;
  affects_bank_book: boolean;
  print_template?: string;
  is_system: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
}

const VOUCHER_CLASSES = [
  { value: 'payment', label: 'Payment Voucher', labelAr: 'سند صرف', icon: '💸', color: 'red' },
  { value: 'receipt', label: 'Receipt Voucher', labelAr: 'سند قبض', icon: '💰', color: 'green' },
  { value: 'journal', label: 'Journal Voucher', labelAr: 'سند قيد', icon: '📋', color: 'blue' },
  { value: 'contra', label: 'Contra Voucher', labelAr: 'سند مقاصة', icon: '🔄', color: 'purple' },
];

const TRANSACTION_TYPES = [
  { value: 'cash', label: 'Cash', labelAr: 'نقدي' },
  { value: 'bank', label: 'Bank', labelAr: 'بنكي' },
  { value: 'both', label: 'Cash & Bank', labelAr: 'نقدي وبنكي' },
];

function VoucherTypesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<VoucherType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<VoucherType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    name_ar: string;
    voucher_class: VoucherType['voucher_class'];
    transaction_type: VoucherType['transaction_type'];
    prefix: string;
    next_number: number;
    auto_numbering: boolean;
    numbering_format: string;
    journal_type_code: string;
    requires_approval: boolean;
    approval_amount_threshold: number;
    requires_attachment: boolean;
    default_account_code: string;
    affects_cash_book: boolean;
    affects_bank_book: boolean;
    print_template: string;
    is_system: boolean;
    description: string;
    is_active: boolean;
  }>({
    code: '',
    name: '',
    name_ar: '',
    voucher_class: 'payment',
    transaction_type: 'cash',
    prefix: 'PV',
    next_number: 1,
    auto_numbering: true,
    numbering_format: '{PREFIX}-{YEAR}-{NUMBER:5}',
    journal_type_code: '',
    requires_approval: false,
    approval_amount_threshold: 0,
    requires_attachment: false,
    default_account_code: '',
    affects_cash_book: true,
    affects_bank_book: false,
    print_template: 'default',
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
      const res = await fetch('http://localhost:4000/api/voucher-types', {
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
      { id: 1, code: 'CPV', name: 'Cash Payment Voucher', name_ar: 'سند صرف نقدي', voucher_class: 'payment', transaction_type: 'cash', prefix: 'CPV', next_number: 1001, auto_numbering: true, numbering_format: 'CPV-{YEAR}-{NUMBER:5}', journal_type_code: 'CPJ', requires_approval: true, approval_amount_threshold: 5000, requires_attachment: true, default_account_code: '1100', affects_cash_book: true, affects_bank_book: false, print_template: 'cash_payment', is_system: true, is_active: true, description: 'Cash payments and petty cash expenses', created_at: '2025-01-01' },
      { id: 2, code: 'BPV', name: 'Bank Payment Voucher', name_ar: 'سند صرف بنكي', voucher_class: 'payment', transaction_type: 'bank', prefix: 'BPV', next_number: 501, auto_numbering: true, numbering_format: 'BPV-{YEAR}-{NUMBER:5}', journal_type_code: 'BJ', requires_approval: true, approval_amount_threshold: 10000, requires_attachment: true, default_account_code: '1110', affects_cash_book: false, affects_bank_book: true, print_template: 'bank_payment', is_system: true, is_active: true, description: 'Bank transfers and cheque payments', created_at: '2025-01-01' },
      { id: 3, code: 'CRV', name: 'Cash Receipt Voucher', name_ar: 'سند قبض نقدي', voucher_class: 'receipt', transaction_type: 'cash', prefix: 'CRV', next_number: 801, auto_numbering: true, numbering_format: 'CRV-{YEAR}-{NUMBER:5}', journal_type_code: 'CRJ', requires_approval: false, requires_attachment: false, default_account_code: '1100', affects_cash_book: true, affects_bank_book: false, print_template: 'cash_receipt', is_system: true, is_active: true, description: 'Cash collections and receipts', created_at: '2025-01-01' },
      { id: 4, code: 'BRV', name: 'Bank Receipt Voucher', name_ar: 'سند قبض بنكي', voucher_class: 'receipt', transaction_type: 'bank', prefix: 'BRV', next_number: 401, auto_numbering: true, numbering_format: 'BRV-{YEAR}-{NUMBER:5}', journal_type_code: 'BJ', requires_approval: false, requires_attachment: true, default_account_code: '1110', affects_cash_book: false, affects_bank_book: true, print_template: 'bank_receipt', is_system: true, is_active: true, description: 'Bank deposits and transfers received', created_at: '2025-01-01' },
      { id: 5, code: 'JV', name: 'Journal Voucher', name_ar: 'سند قيد', voucher_class: 'journal', transaction_type: 'both', prefix: 'JV', next_number: 2001, auto_numbering: true, numbering_format: 'JV-{YEAR}-{NUMBER:5}', journal_type_code: 'GJ', requires_approval: true, approval_amount_threshold: 50000, requires_attachment: false, affects_cash_book: false, affects_bank_book: false, print_template: 'journal_voucher', is_system: true, is_active: true, description: 'General journal entries and adjustments', created_at: '2025-01-01' },
      { id: 6, code: 'CV', name: 'Contra Voucher', name_ar: 'سند مقاصة', voucher_class: 'contra', transaction_type: 'both', prefix: 'CV', next_number: 101, auto_numbering: true, numbering_format: 'CV-{YEAR}-{NUMBER:4}', journal_type_code: 'BJ', requires_approval: true, approval_amount_threshold: 0, requires_attachment: true, affects_cash_book: true, affects_bank_book: true, print_template: 'contra_voucher', is_system: true, is_active: true, description: 'Cash to bank and bank to cash transfers', created_at: '2025-01-01' },
      { id: 7, code: 'PCV', name: 'Petty Cash Voucher', name_ar: 'سند مصروفات نثرية', voucher_class: 'payment', transaction_type: 'cash', prefix: 'PCV', next_number: 3001, auto_numbering: true, numbering_format: 'PCV-{YEAR}-{NUMBER:5}', journal_type_code: 'CPJ', requires_approval: false, approval_amount_threshold: 500, requires_attachment: true, default_account_code: '1105', affects_cash_book: true, affects_bank_book: false, print_template: 'petty_cash', is_system: false, is_active: true, description: 'Small cash expenses', created_at: '2025-01-01' },
      { id: 8, code: 'ADV', name: 'Advance Voucher', name_ar: 'سند سلفة', voucher_class: 'payment', transaction_type: 'both', prefix: 'ADV', next_number: 51, auto_numbering: true, numbering_format: 'ADV-{YEAR}-{NUMBER:4}', journal_type_code: 'CPJ', requires_approval: true, approval_amount_threshold: 1000, requires_attachment: false, default_account_code: '1150', affects_cash_book: true, affects_bank_book: true, print_template: 'advance', is_system: false, is_active: true, description: 'Employee and vendor advances', created_at: '2025-01-01' },
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
        ? `http://localhost:4000/api/voucher-types/${editingItem.id}`
        : 'http://localhost:4000/api/voucher-types';
      
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
      const newItem: VoucherType = {
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
      showToast(t('voucherTypes.cannotDeleteSystem', 'Cannot delete system voucher type'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/voucher-types/${deletingId}`, {
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
    setFormData({ code: '', name: '', name_ar: '', voucher_class: 'payment', transaction_type: 'cash', prefix: 'PV', next_number: 1, auto_numbering: true, numbering_format: '{PREFIX}-{YEAR}-{NUMBER:5}', journal_type_code: '', requires_approval: false, approval_amount_threshold: 0, requires_attachment: false, default_account_code: '', affects_cash_book: true, affects_bank_book: false, print_template: 'default', is_system: false, is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: VoucherType) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      voucher_class: item.voucher_class,
      transaction_type: item.transaction_type,
      prefix: item.prefix,
      next_number: item.next_number,
      auto_numbering: item.auto_numbering,
      numbering_format: item.numbering_format,
      journal_type_code: item.journal_type_code || '',
      requires_approval: item.requires_approval,
      approval_amount_threshold: item.approval_amount_threshold || 0,
      requires_attachment: item.requires_attachment,
      default_account_code: item.default_account_code || '',
      affects_cash_book: item.affects_cash_book,
      affects_bank_book: item.affects_bank_book,
      print_template: item.print_template || 'default',
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
    const matchClass = !filterClass || item.voucher_class === filterClass;
    const matchType = !filterType || item.transaction_type === filterType;
    return matchSearch && matchClass && matchType;
  });

  const getClassInfo = (voucherClass: string) => {
    return VOUCHER_CLASSES.find(c => c.value === voucherClass);
  };

  const getClassColor = (voucherClass: string) => {
    const colors: Record<string, string> = {
      payment: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      receipt: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      journal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      contra: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return colors[voucherClass] || colors.journal;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      bank: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      both: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[type] || colors.both;
  };

  const generateSampleNumber = (format: string, prefix: string, number: number) => {
    const year = new Date().getFullYear();
    let result = format
      .replace('{PREFIX}', prefix)
      .replace('{YEAR}', String(year));
    
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
        <title>{t('voucherTypes.title', 'Voucher Types')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('voucherTypes.title', 'Voucher Types')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('voucherTypes.subtitle', 'Configure payment, receipt, and journal vouchers')}
            </p>
          </div>
          {hasPermission('master:finance:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('voucherTypes.new', 'New Voucher Type')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {VOUCHER_CLASSES.map((vc) => {
          const count = items.filter(i => i.voucher_class === vc.value).length;
          return (
            <Card key={vc.value} className="p-4 cursor-pointer hover:shadow-md transition" onClick={() => setFilterClass(filterClass === vc.value ? '' : vc.value)}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${vc.value === 'payment' ? 'bg-red-100 dark:bg-red-900/30' : vc.value === 'receipt' ? 'bg-green-100 dark:bg-green-900/30' : vc.value === 'journal' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                  {vc.value === 'payment' ? <ArrowUpTrayIcon className="w-6 h-6 text-red-600 dark:text-red-400" /> : vc.value === 'receipt' ? <ArrowDownTrayIcon className="w-6 h-6 text-green-600 dark:text-green-400" /> : <DocumentDuplicateIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{vc.label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{count}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
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
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('voucherTypes.allClasses', 'All Classes')}</option>
            {VOUCHER_CLASSES.map(vc => (
              <option key={vc.value} value={vc.value}>{vc.icon} {vc.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('voucherTypes.allTypes', 'All Types')}</option>
            {TRANSACTION_TYPES.map(tt => (
              <option key={tt.value} value={tt.value}>{tt.label}</option>
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
              <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('voucherTypes.class', 'Class')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('voucherTypes.transType', 'Type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('voucherTypes.sampleNumber', 'Sample #')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('voucherTypes.features', 'Features')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const classInfo = getClassInfo(item.voucher_class);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{classInfo?.icon}</span>
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
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getClassColor(item.voucher_class)}`}>
                          {classInfo?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.transaction_type)}`}>
                          {TRANSACTION_TYPES.find(t => t.value === item.transaction_type)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {generateSampleNumber(item.numbering_format, item.prefix, item.next_number)}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {item.requires_approval && (
                            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded" title={`Approval > ${item.approval_amount_threshold}`}>
                              ✓{item.approval_amount_threshold && `>${item.approval_amount_threshold.toLocaleString()}`}
                            </span>
                          )}
                          {item.requires_attachment && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded" title="Attachment Required">📎</span>
                          )}
                          {item.affects_cash_book && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded" title="Affects Cash Book">💵</span>
                          )}
                          {item.affects_bank_book && (
                            <span className="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded" title="Affects Bank Book">🏦</span>
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
        title={editingItem ? t('voucherTypes.edit') : t('voucherTypes.create')}
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
              placeholder="e.g., CPV"
              disabled={editingItem?.is_system}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('voucherTypes.class', 'Voucher Class')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.voucher_class}
                onChange={(e) => setFormData({ ...formData, voucher_class: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                disabled={editingItem?.is_system}
              >
                {VOUCHER_CLASSES.map(vc => (
                  <option key={vc.value} value={vc.value}>{vc.icon} {vc.label}</option>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('voucherTypes.transType', 'Transaction Type')}
              </label>
              <select
                value={formData.transaction_type}
                onChange={(e) => {
                  const type = e.target.value as 'cash' | 'bank' | 'both';
                  setFormData({
                    ...formData,
                    transaction_type: type,
                    affects_cash_book: type === 'cash' || type === 'both',
                    affects_bank_book: type === 'bank' || type === 'both',
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {TRANSACTION_TYPES.map(tt => (
                  <option key={tt.value} value={tt.value}>{tt.label}</option>
                ))}
              </select>
            </div>
            <Input
              label={t('voucherTypes.journalType', 'Journal Type Code')}
              value={formData.journal_type_code}
              onChange={(e) => setFormData({ ...formData, journal_type_code: e.target.value.toUpperCase() })}
              placeholder="e.g., GJ, CRJ"
            />
          </div>

          {/* Numbering */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BanknotesIcon className="w-5 h-5" />
              {t('voucherTypes.numbering', 'Numbering Settings')}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label={t('voucherTypes.prefix', 'Prefix')}
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                error={errors.prefix}
                required
                placeholder="e.g., PV"
              />
              <Input
                label={t('voucherTypes.nextNumber', 'Next Number')}
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
                    {t('voucherTypes.autoNumbering', 'Auto #')}
                  </label>
                </div>
              </div>
            </div>
            <Input
              label={t('voucherTypes.format', 'Numbering Format')}
              value={formData.numbering_format}
              onChange={(e) => setFormData({ ...formData, numbering_format: e.target.value })}
              placeholder="{PREFIX}-{YEAR}-{NUMBER:5}"
            />
            <p className="text-xs text-gray-500">
              Preview: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{generateSampleNumber(formData.numbering_format, formData.prefix, formData.next_number)}</code>
            </p>
          </div>

          {/* Approval & Attachments */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_approval"
                  checked={formData.requires_approval}
                  onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="requires_approval" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('voucherTypes.requiresApproval', 'Requires Approval')}
                </label>
              </div>
              {formData.requires_approval && (
                <Input
                  label={t('voucherTypes.approvalThreshold', 'Approval Threshold')}
                  type="number"
                  min="0"
                  value={formData.approval_amount_threshold}
                  onChange={(e) => setFormData({ ...formData, approval_amount_threshold: Number(e.target.value) })}
                />
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_attachment"
                  checked={formData.requires_attachment}
                  onChange={(e) => setFormData({ ...formData, requires_attachment: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="requires_attachment" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('voucherTypes.requiresAttachment', 'Requires Attachment')}
                </label>
              </div>
            </div>
          </div>

          {/* Default Account & Print Template */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('voucherTypes.defaultAccount', 'Default Account Code')}
              value={formData.default_account_code}
              onChange={(e) => setFormData({ ...formData, default_account_code: e.target.value })}
              placeholder="Account Code"
            />
            <Input
              label={t('voucherTypes.printTemplate', 'Print Template')}
              value={formData.print_template}
              onChange={(e) => setFormData({ ...formData, print_template: e.target.value })}
              placeholder="default"
            />
          </div>

          {/* Affects books */}
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="affects_cash"
                checked={formData.affects_cash_book}
                onChange={(e) => setFormData({ ...formData, affects_cash_book: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="affects_cash" className="text-sm text-gray-700 dark:text-gray-300">
                💵 {t('voucherTypes.affectsCash', 'Affects Cash Book')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="affects_bank"
                checked={formData.affects_bank_book}
                onChange={(e) => setFormData({ ...formData, affects_bank_book: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="affects_bank" className="text-sm text-gray-700 dark:text-gray-300">
                🏦 {t('voucherTypes.affectsBank', 'Affects Bank Book')}
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
        message={t('voucherTypes.deleteWarning', 'This voucher type will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, VoucherTypesPage);
