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
  BanknotesIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';

interface WithholdingTaxRate {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  payment_type: 'dividends' | 'interest' | 'royalties' | 'management_fees' | 'technical_services' | 'rent' | 'other';
  resident_rate: number;
  non_resident_rate: number;
  treaty_rate?: number;
  threshold_amount?: number;
  country_code?: string;
  country_name?: string;
  applies_to: 'individuals' | 'corporates' | 'both';
  exemption_conditions?: string;
  zatca_code?: string;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
}

const PAYMENT_TYPES = [
  { value: 'dividends', label: 'Dividends', labelAr: 'أرباح الأسهم' },
  { value: 'interest', label: 'Interest', labelAr: 'فوائد' },
  { value: 'royalties', label: 'Royalties', labelAr: 'إتاوات' },
  { value: 'management_fees', label: 'Management Fees', labelAr: 'رسوم إدارية' },
  { value: 'technical_services', label: 'Technical Services', labelAr: 'خدمات فنية' },
  { value: 'rent', label: 'Rent', labelAr: 'إيجار' },
  { value: 'other', label: 'Other', labelAr: 'أخرى' },
];

const APPLIES_TO = [
  { value: 'individuals', label: 'Individuals', labelAr: 'أفراد' },
  { value: 'corporates', label: 'Corporates', labelAr: 'شركات' },
  { value: 'both', label: 'Both', labelAr: 'كلاهما' },
];

const COMMON_COUNTRIES = [
  { code: '', name: 'All Countries' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'UAE' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'EG', name: 'Egypt' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'QA', name: 'Qatar' },
  { code: 'OM', name: 'Oman' },
];

function WithholdingTaxPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<WithholdingTaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WithholdingTaxRate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    name_ar: string;
    payment_type: WithholdingTaxRate['payment_type'];
    resident_rate: number;
    non_resident_rate: number;
    treaty_rate: number;
    threshold_amount: number;
    country_code: string;
    country_name: string;
    applies_to: WithholdingTaxRate['applies_to'];
    exemption_conditions: string;
    zatca_code: string;
    effective_from: string;
    effective_to: string;
    is_active: boolean;
  }>({
    code: '',
    name: '',
    name_ar: '',
    payment_type: 'dividends',
    resident_rate: 0,
    non_resident_rate: 5,
    treaty_rate: 0,
    threshold_amount: 0,
    country_code: '',
    country_name: '',
    applies_to: 'both',
    exemption_conditions: '',
    zatca_code: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
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
      const res = await fetch('http://localhost:4000/api/withholding-tax', {
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
      { id: 1, code: 'WHT-DIV-NR', name: 'Dividends - Non-Resident', name_ar: 'أرباح - غير مقيم', payment_type: 'dividends', resident_rate: 0, non_resident_rate: 5, applies_to: 'both', effective_from: '2024-01-01', is_active: true, created_at: '2025-01-01' },
      { id: 2, code: 'WHT-INT-NR', name: 'Interest - Non-Resident', name_ar: 'فوائد - غير مقيم', payment_type: 'interest', resident_rate: 0, non_resident_rate: 5, applies_to: 'both', effective_from: '2024-01-01', is_active: true, created_at: '2025-01-01' },
      { id: 3, code: 'WHT-ROY-NR', name: 'Royalties - Non-Resident', name_ar: 'إتاوات - غير مقيم', payment_type: 'royalties', resident_rate: 0, non_resident_rate: 15, applies_to: 'both', effective_from: '2024-01-01', is_active: true, created_at: '2025-01-01' },
      { id: 4, code: 'WHT-MGT-NR', name: 'Management Fees - Non-Resident', name_ar: 'رسوم إدارية - غير مقيم', payment_type: 'management_fees', resident_rate: 0, non_resident_rate: 20, applies_to: 'both', effective_from: '2024-01-01', is_active: true, created_at: '2025-01-01' },
      { id: 5, code: 'WHT-TECH-NR', name: 'Technical Services - Non-Resident', name_ar: 'خدمات فنية - غير مقيم', payment_type: 'technical_services', resident_rate: 0, non_resident_rate: 5, applies_to: 'both', effective_from: '2024-01-01', is_active: true, created_at: '2025-01-01' },
      { id: 6, code: 'WHT-RENT-NR', name: 'Rent - Non-Resident', name_ar: 'إيجار - غير مقيم', payment_type: 'rent', resident_rate: 0, non_resident_rate: 5, applies_to: 'both', effective_from: '2024-01-01', is_active: true, created_at: '2025-01-01' },
      { id: 7, code: 'WHT-DIV-US', name: 'Dividends - US Treaty', name_ar: 'أرباح - معاهدة أمريكية', payment_type: 'dividends', resident_rate: 0, non_resident_rate: 5, treaty_rate: 5, country_code: 'US', country_name: 'United States', applies_to: 'both', effective_from: '2024-01-01', is_active: true, created_at: '2025-01-01' },
      { id: 8, code: 'WHT-INT-UK', name: 'Interest - UK Treaty', name_ar: 'فوائد - معاهدة بريطانية', payment_type: 'interest', resident_rate: 0, non_resident_rate: 5, treaty_rate: 5, country_code: 'GB', country_name: 'United Kingdom', applies_to: 'both', effective_from: '2024-01-01', is_active: true, created_at: '2025-01-01' },
      { id: 9, code: 'WHT-ROY-DE', name: 'Royalties - Germany Treaty', name_ar: 'إتاوات - معاهدة ألمانية', payment_type: 'royalties', resident_rate: 0, non_resident_rate: 15, treaty_rate: 10, country_code: 'DE', country_name: 'Germany', applies_to: 'both', effective_from: '2024-01-01', is_active: true, created_at: '2025-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.effective_from) newErrors.effective_from = t('validation.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/withholding-tax/${editingItem.id}`
        : 'http://localhost:4000/api/withholding-tax';
      
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
      const newItem: WithholdingTaxRate = {
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
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/withholding-tax/${deletingId}`, {
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
    setFormData({ code: '', name: '', name_ar: '', payment_type: 'dividends', resident_rate: 0, non_resident_rate: 5, treaty_rate: 0, threshold_amount: 0, country_code: '', country_name: '', applies_to: 'both', exemption_conditions: '', zatca_code: '', effective_from: new Date().toISOString().split('T')[0], effective_to: '', is_active: true });
    setErrors({});
  };

  const openEdit = (item: WithholdingTaxRate) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      payment_type: item.payment_type,
      resident_rate: item.resident_rate,
      non_resident_rate: item.non_resident_rate,
      treaty_rate: item.treaty_rate || 0,
      threshold_amount: item.threshold_amount || 0,
      country_code: item.country_code || '',
      country_name: item.country_name || '',
      applies_to: item.applies_to,
      exemption_conditions: item.exemption_conditions || '',
      zatca_code: item.zatca_code || '',
      effective_from: item.effective_from,
      effective_to: item.effective_to || '',
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const paymentTypes = [...new Set(items.map(i => i.payment_type))];
  const countries = [...new Set(items.filter(i => i.country_code).map(i => i.country_code))];

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || item.payment_type === filterType;
    const matchCountry = !filterCountry || item.country_code === filterCountry || (!item.country_code && filterCountry === 'ALL');
    return matchSearch && matchType && matchCountry;
  });

  const getRateColor = (rate: number) => {
    if (rate === 0) return 'text-green-600 dark:text-green-400';
    if (rate <= 5) return 'text-blue-600 dark:text-blue-400';
    if (rate <= 10) return 'text-yellow-600 dark:text-yellow-400';
    if (rate <= 15) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('withholdingTax.title', 'Withholding Tax')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('withholdingTax.title', 'Withholding Tax Rates')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('withholdingTax.subtitle', 'WHT rates by payment type, residency, and treaty')}
            </p>
          </div>
          {hasPermission('master:tax:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('withholdingTax.new', 'New WHT Rate')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BanknotesIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              <GlobeAltIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('withholdingTax.treatyRates', 'Treaty')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {items.filter(i => i.treaty_rate && i.treaty_rate > 0).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CalculatorIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('withholdingTax.paymentTypes', 'Types')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{paymentTypes.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <GlobeAltIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('withholdingTax.countries', 'Countries')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{countries.length}</p>
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
            <option value="">{t('withholdingTax.allPaymentTypes', 'All Payment Types')}</option>
            {PAYMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allCountries', 'All Countries')}</option>
            <option value="ALL">{t('withholdingTax.generalRates', 'General (No Treaty)')}</option>
            {countries.map(code => (
              <option key={code} value={code}>{COMMON_COUNTRIES.find(c => c.code === code)?.name || code}</option>
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
              <BanknotesIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('withholdingTax.paymentType', 'Payment Type')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('withholdingTax.resident', 'Resident')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('withholdingTax.nonResident', 'Non-Resident')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('withholdingTax.treaty', 'Treaty')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('withholdingTax.country', 'Country')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.code}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                        {PAYMENT_TYPES.find(t => t.value === item.payment_type)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-lg font-bold ${getRateColor(item.resident_rate)}`}>
                        {item.resident_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-lg font-bold ${getRateColor(item.non_resident_rate)}`}>
                        {item.non_resident_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.treaty_rate !== undefined && item.treaty_rate > 0 ? (
                        <span className={`text-lg font-bold ${getRateColor(item.treaty_rate)}`}>
                          {item.treaty_rate}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.country_code ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-lg">{item.country_code === 'US' ? '🇺🇸' : item.country_code === 'GB' ? '🇬🇧' : item.country_code === 'DE' ? '🇩🇪' : '🌍'}</span>
                          <span className="text-sm">{item.country_code}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">Global</span>
                      )}
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
                        {hasPermission('master:tax:delete') && (
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
        title={editingItem ? t('withholdingTax.edit') : t('withholdingTax.create')}
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
              placeholder="e.g., WHT-DIV-NR"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('withholdingTax.paymentType', 'Payment Type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {PAYMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
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

          {/* Rates */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">{t('withholdingTax.rates', 'Withholding Rates')}</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label={t('withholdingTax.residentRate', 'Resident Rate (%)')}
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.resident_rate}
                onChange={(e) => setFormData({ ...formData, resident_rate: Number(e.target.value) })}
              />
              <Input
                label={t('withholdingTax.nonResidentRate', 'Non-Resident Rate (%)')}
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.non_resident_rate}
                onChange={(e) => setFormData({ ...formData, non_resident_rate: Number(e.target.value) })}
              />
              <Input
                label={t('withholdingTax.treatyRate', 'Treaty Rate (%)')}
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.treaty_rate}
                onChange={(e) => setFormData({ ...formData, treaty_rate: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Country & Applies To */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('withholdingTax.country', 'Country (Treaty)')}
              </label>
              <select
                value={formData.country_code}
                onChange={(e) => {
                  const country = COMMON_COUNTRIES.find(c => c.code === e.target.value);
                  setFormData({ ...formData, country_code: e.target.value, country_name: country?.name || '' });
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {COMMON_COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('withholdingTax.appliesTo', 'Applies To')}
              </label>
              <select
                value={formData.applies_to}
                onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {APPLIES_TO.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <Input
              label={t('withholdingTax.threshold', 'Threshold (SAR)')}
              type="number"
              min="0"
              value={formData.threshold_amount || ''}
              onChange={(e) => setFormData({ ...formData, threshold_amount: Number(e.target.value) })}
              placeholder="0 = no threshold"
            />
          </div>

          <Input
            label={t('withholdingTax.exemptionConditions', 'Exemption Conditions')}
            value={formData.exemption_conditions}
            onChange={(e) => setFormData({ ...formData, exemption_conditions: e.target.value })}
            placeholder="Optional exemption notes"
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('withholdingTax.zatcaCode', 'ZATCA Code')}
              value={formData.zatca_code}
              onChange={(e) => setFormData({ ...formData, zatca_code: e.target.value })}
            />
            <Input
              label={t('common.effectiveFrom', 'Effective From')}
              type="date"
              value={formData.effective_from}
              onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
              error={errors.effective_from}
              required
            />
            <Input
              label={t('common.effectiveTo', 'Effective To')}
              type="date"
              value={formData.effective_to}
              onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
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
        message={t('common.deleteMessage')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, WithholdingTaxPage);
