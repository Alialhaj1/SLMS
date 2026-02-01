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
import apiClient from '../../lib/apiClient';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingLibraryIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface BankAccount {
  id: number;
  code: string;
  bank_name: string;
  bank_name_ar?: string;
  branch_name: string;
  branch_code?: string;
  account_number: string;
  iban?: string;
  swift_code?: string;
  account_type: 'current' | 'savings' | 'fixed_deposit' | 'overdraft' | 'loan';
  currency_code: string;
  gl_account_code: string;
  opening_balance: number;
  current_balance: number;
  overdraft_limit?: number;
  bank_address?: string;
  bank_phone?: string;
  bank_email?: string;
  contact_person?: string;
  is_default: boolean;
  is_reconciled: boolean;
  last_reconciled_date?: string;
  last_reconciled_balance?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

type BankAccountFormData = {
  code: string;
  bank_name: string;
  bank_name_ar: string;
  branch_name: string;
  branch_code: string;
  account_number: string;
  iban: string;
  swift_code: string;
  account_type: BankAccount['account_type'];
  currency_code: string;
  gl_account_code: string;
  opening_balance: number;
  overdraft_limit: number;
  bank_address: string;
  bank_phone: string;
  bank_email: string;
  contact_person: string;
  is_default: boolean;
  is_active: boolean;
  notes: string;
};

const ACCOUNT_TYPES = [
  { value: 'current', label: 'Current Account', labelAr: 'حساب جاري', icon: '💳' },
  { value: 'savings', label: 'Savings Account', labelAr: 'حساب توفير', icon: '💰' },
  { value: 'fixed_deposit', label: 'Fixed Deposit', labelAr: 'وديعة ثابتة', icon: '🔒' },
  { value: 'overdraft', label: 'Overdraft Account', labelAr: 'حساب مكشوف', icon: '📈' },
  { value: 'loan', label: 'Loan Account', labelAr: 'حساب قرض', icon: '🏦' },
];

const CURRENCIES = [
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

function BankAccountsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BankAccount | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<BankAccountFormData>({
    code: '',
    bank_name: '',
    bank_name_ar: '',
    branch_name: '',
    branch_code: '',
    account_number: '',
    iban: '',
    swift_code: '',
    account_type: 'current',
    currency_code: 'SAR',
    gl_account_code: '',
    opening_balance: 0,
    overdraft_limit: 0,
    bank_address: '',
    bank_phone: '',
    bank_email: '',
    contact_person: '',
    is_default: false,
    is_active: true,
    notes: '',
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
      const result: any = await apiClient.get('/api/bank-accounts');
      const rows: BankAccount[] = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.data?.data)
            ? result.data.data
            : [];
      setItems(rows);
    } catch (e: any) {
      setItems([]);
      showToast(t('common.failedToLoad', 'Failed to load'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.bank_name.trim()) newErrors.bank_name = t('validation.required');
    if (!formData.account_number.trim()) newErrors.account_number = t('validation.required');
    if (!formData.gl_account_code.trim()) newErrors.gl_account_code = t('validation.required');
    if (formData.iban && formData.iban.length < 15) newErrors.iban = t('bankAccounts.invalidIban', 'Invalid IBAN');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        bank_name: formData.bank_name,
        bank_name_ar: formData.bank_name_ar || undefined,
        swift_code: formData.swift_code || undefined,
        branch_code: formData.branch_code || undefined,
        branch_name: formData.branch_name || undefined,
        account_number: formData.account_number,
        iban: formData.iban || undefined,
        account_type: formData.account_type,
        currency_code: formData.currency_code,
        gl_account_code: formData.gl_account_code,
        opening_balance: formData.opening_balance,
        is_default: formData.is_default,
        is_active: formData.is_active,
      };

      if (editingItem) {
        await apiClient.put(`/api/bank-accounts/${editingItem.id}`, payload);
      } else {
        await apiClient.post('/api/bank-accounts', payload);
      }

      showToast(t('common.success'), 'success');
      await fetchData();
      setShowModal(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const item = items.find(i => i.id === deletingId);
    if (item?.is_default) {
      showToast(t('bankAccounts.cannotDeleteDefault', 'Cannot delete default account'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/bank-accounts/${deletingId}`);
      showToast(t('common.deleted'), 'success');
      await fetchData();
    } catch {
      showToast(t('common.failedToDelete', 'Failed to delete'), 'error');
    }
    setIsDeleting(false);
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', bank_name: '', bank_name_ar: '', branch_name: '', branch_code: '', account_number: '', iban: '', swift_code: '', account_type: 'current', currency_code: 'SAR', gl_account_code: '', opening_balance: 0, overdraft_limit: 0, bank_address: '', bank_phone: '', bank_email: '', contact_person: '', is_default: false, is_active: true, notes: '' });
    setErrors({});
  };

  const openEdit = (item: BankAccount) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      bank_name: item.bank_name,
      bank_name_ar: item.bank_name_ar || '',
      branch_name: item.branch_name,
      branch_code: item.branch_code || '',
      account_number: item.account_number,
      iban: item.iban || '',
      swift_code: item.swift_code || '',
      account_type: item.account_type,
      currency_code: item.currency_code,
      gl_account_code: item.gl_account_code,
      opening_balance: item.opening_balance,
      overdraft_limit: item.overdraft_limit || 0,
      bank_address: item.bank_address || '',
      bank_phone: item.bank_phone || '',
      bank_email: item.bank_email || '',
      contact_person: item.contact_person || '',
      is_default: item.is_default,
      is_active: item.is_active,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.account_number.includes(searchTerm);
    const matchType = !filterType || item.account_type === filterType;
    const matchCurrency = !filterCurrency || item.currency_code === filterCurrency;
    return matchSearch && matchType && matchCurrency;
  });

  const totalBalance = items.reduce((sum, a) => sum + a.current_balance, 0);
  const reconciledCount = items.filter(a => a.is_reconciled).length;
  const pendingReconciliation = items.filter(a => !a.is_reconciled && a.is_active).length;

  const getTypeInfo = (type: string) => {
    return ACCOUNT_TYPES.find(t => t.value === type);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      current: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      savings: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      fixed_deposit: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      overdraft: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      loan: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[type] || colors.current;
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    const formatted = new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    return `${amount < 0 ? '-' : ''}${currency?.symbol || currencyCode} ${formatted}`;
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('bankAccounts.title', 'Bank Accounts')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('bankAccounts.title', 'Bank Accounts')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('bankAccounts.subtitle', 'Manage company bank accounts and reconciliation')}
            </p>
          </div>
          {hasPermission(MenuPermissions.Finance.BankAccounts.Create) && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('bankAccounts.new', 'New Bank Account')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BuildingLibraryIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              <BanknotesIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('bankAccounts.totalBalance', 'Total Balance')}</p>
              <p className={`text-lg font-bold ${totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(totalBalance, 'SAR')}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CheckBadgeIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('bankAccounts.reconciled', 'Reconciled')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{reconciledCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <ArrowPathIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('bankAccounts.pending', 'Pending')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{pendingReconciliation}</p>
            </div>
          </div>
        </Card>
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('bankAccounts.allTypes', 'All Types')}</option>
            {ACCOUNT_TYPES.map(at => (
              <option key={at.value} value={at.value}>{at.icon} {at.label}</option>
            ))}
          </select>
          <select
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('bankAccounts.allCurrencies', 'All Currencies')}</option>
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length}
          </div>
        </div>
      </Card>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="p-8 text-center">
          <BuildingLibraryIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const typeInfo = getTypeInfo(item.account_type);
            return (
              <Card key={item.id} className={`p-4 border-l-4 ${item.is_default ? 'border-l-blue-500' : item.current_balance < 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{typeInfo?.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-gray-600 dark:text-gray-400">{item.code}</span>
                        {item.is_default && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Default</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.bank_name}</h3>
                      {item.bank_name_ar && <p className="text-sm text-gray-500 dark:text-gray-400">{item.bank_name_ar}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasPermission(MenuPermissions.Finance.BankAccounts.Edit) && (
                      <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission(MenuPermissions.Finance.BankAccounts.Delete) && !item.is_default && (
                      <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{t('bankAccounts.branch', 'Branch')}</span>
                    <span className="text-gray-900 dark:text-white">{item.branch_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">{t('bankAccounts.accountNo', 'Account #')}</span>
                    <span className="font-mono text-gray-900 dark:text-white">{item.account_number}</span>
                  </div>
                  {item.iban && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">IBAN</span>
                      <span className="font-mono text-xs text-gray-900 dark:text-white">{item.iban.slice(0, 10)}...</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(item.account_type)}`}>
                      {typeInfo?.label}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                      {item.currency_code}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{t('bankAccounts.currentBalance', 'Balance')}</span>
                    <span className={`text-lg font-bold ${item.current_balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(item.current_balance, item.currency_code)}
                    </span>
                  </div>
                  {item.account_type === 'overdraft' && item.overdraft_limit && (
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span className="text-gray-500 dark:text-gray-400">{t('bankAccounts.overdraftLimit', 'Limit')}</span>
                      <span className="text-gray-600 dark:text-gray-400">{formatCurrency(item.overdraft_limit, item.currency_code)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {item.is_reconciled ? (
                      <CheckBadgeIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className={`text-xs ${item.is_reconciled ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                      {item.is_reconciled ? t('bankAccounts.reconciled', 'Reconciled') : t('bankAccounts.notReconciled', 'Not Reconciled')}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {item.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('bankAccounts.edit') : t('bankAccounts.create')}
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
              placeholder="e.g., BA001"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('bankAccounts.accountType', 'Account Type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {ACCOUNT_TYPES.map(at => (
                  <option key={at.value} value={at.value}>{at.icon} {at.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('bankAccounts.bankName', 'Bank Name')}
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              error={errors.bank_name}
              required
            />
            <Input
              label={t('bankAccounts.bankNameAr', 'Bank Name (Arabic)')}
              value={formData.bank_name_ar}
              onChange={(e) => setFormData({ ...formData, bank_name_ar: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('bankAccounts.branchName', 'Branch Name')}
              value={formData.branch_name}
              onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
            />
            <Input
              label={t('bankAccounts.branchCode', 'Branch Code')}
              value={formData.branch_code}
              onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BuildingLibraryIcon className="w-5 h-5" />
              {t('bankAccounts.accountDetails', 'Account Details')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('bankAccounts.accountNumber', 'Account Number')}
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                error={errors.account_number}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('bankAccounts.currency', 'Currency')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.currency_code}
                  onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="IBAN"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                error={errors.iban}
                placeholder="SA..."
              />
              <Input
                label="SWIFT/BIC"
                value={formData.swift_code}
                onChange={(e) => setFormData({ ...formData, swift_code: e.target.value.toUpperCase() })}
                placeholder="e.g., RJHISARI"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('bankAccounts.glAccount', 'GL Account Code')}
              value={formData.gl_account_code}
              onChange={(e) => setFormData({ ...formData, gl_account_code: e.target.value })}
              error={errors.gl_account_code}
              required
              placeholder="e.g., 1110-001"
            />
            <Input
              label={t('bankAccounts.openingBalance', 'Opening Balance')}
              type="number"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: Number(e.target.value) })}
            />
          </div>

          {formData.account_type === 'overdraft' && (
            <Input
              label={t('bankAccounts.overdraftLimit', 'Overdraft Limit')}
              type="number"
              min="0"
              value={formData.overdraft_limit}
              onChange={(e) => setFormData({ ...formData, overdraft_limit: Number(e.target.value) })}
            />
          )}

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('bankAccounts.contactPerson', 'Contact Person')}
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            />
            <Input
              label={t('bankAccounts.bankPhone', 'Bank Phone')}
              value={formData.bank_phone}
              onChange={(e) => setFormData({ ...formData, bank_phone: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_default" className="text-sm text-gray-700 dark:text-gray-300">
                {t('bankAccounts.setDefault', 'Set as Default')}
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
            label={t('common.notes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
        message={t('bankAccounts.deleteWarning', 'This bank account will be permanently deleted. Any transactions linked to this account will need to be reassigned.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Finance.BankAccounts.View, BankAccountsPage);
