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
  ClockIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface ContractType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  category: 'permanent' | 'temporary' | 'probation' | 'part_time' | 'contract' | 'internship' | 'seasonal';
  duration_months?: number;
  is_renewable: boolean;
  max_renewals?: number;
  probation_days: number;
  notice_period_days: number;
  working_hours_per_week: number;
  annual_leave_days: number;
  sick_leave_days: number;
  includes_benefits: boolean;
  includes_insurance: boolean;
  includes_housing: boolean;
  includes_transport: boolean;
  end_of_service_eligible: boolean;
  overtime_eligible: boolean;
  employee_count: number;
  is_default: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
}

const CONTRACT_CATEGORIES = [
  { value: 'permanent', label: 'Permanent', labelAr: 'دائم', icon: '📋', color: 'green' },
  { value: 'temporary', label: 'Temporary', labelAr: 'مؤقت', icon: '⏰', color: 'yellow' },
  { value: 'probation', label: 'Probation', labelAr: 'فترة تجربة', icon: '🔍', color: 'orange' },
  { value: 'part_time', label: 'Part-Time', labelAr: 'دوام جزئي', icon: '⌚', color: 'blue' },
  { value: 'contract', label: 'Fixed-Term', labelAr: 'محدد المدة', icon: '📄', color: 'purple' },
  { value: 'internship', label: 'Internship', labelAr: 'تدريب', icon: '🎓', color: 'indigo' },
  { value: 'seasonal', label: 'Seasonal', labelAr: 'موسمي', icon: '🌤️', color: 'gray' },
];

function ContractTypesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  type ContractTypeFormData = {
    code: string;
    name: string;
    name_ar: string;
    category: ContractType['category'];
    duration_months: number;
    is_renewable: boolean;
    max_renewals: number;
    probation_days: number;
    notice_period_days: number;
    working_hours_per_week: number;
    annual_leave_days: number;
    sick_leave_days: number;
    includes_benefits: boolean;
    includes_insurance: boolean;
    includes_housing: boolean;
    includes_transport: boolean;
    end_of_service_eligible: boolean;
    overtime_eligible: boolean;
    is_default: boolean;
    is_active: boolean;
    description: string;
  };

  const [items, setItems] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContractType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<ContractTypeFormData>({
    code: '',
    name: '',
    name_ar: '',
    category: 'permanent',
    duration_months: 0,
    is_renewable: true,
    max_renewals: 0,
    probation_days: 90,
    notice_period_days: 30,
    working_hours_per_week: 48,
    annual_leave_days: 21,
    sick_leave_days: 30,
    includes_benefits: true,
    includes_insurance: true,
    includes_housing: false,
    includes_transport: false,
    end_of_service_eligible: true,
    overtime_eligible: true,
    is_default: false,
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
      const res = await fetch('http://localhost:4000/api/contract-types', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.data || []);
      } else {
        showToast(t('common.fetchError', 'Failed to load data'), 'error');
      }
    } catch {
      showToast(t('common.fetchError', 'Failed to load data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (formData.working_hours_per_week < 1 || formData.working_hours_per_week > 60) newErrors.working_hours_per_week = t('contractTypes.invalidHours', 'Must be 1-60');
    if (formData.annual_leave_days < 0) newErrors.annual_leave_days = t('validation.positive');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/contract-types/${editingItem.id}`
        : 'http://localhost:4000/api/contract-types';
      
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
      showToast(t('common.saveError', 'Failed to save'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const item = items.find(i => i.id === deletingId);
    if (item && item.employee_count > 0) {
      showToast(t('contractTypes.cannotDeleteWithEmployees', 'Cannot delete contract type with active contracts'), 'error');
      setConfirmOpen(false);
      return;
    }
    if (item?.is_default) {
      showToast(t('contractTypes.cannotDeleteDefault', 'Cannot delete default contract type'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/contract-types/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setItems(items.filter(i => i.id !== deletingId));
      showToast(t('common.deleted'), 'success');
    } catch {
      showToast(t('common.deleteError', 'Failed to delete'), 'error');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', category: 'permanent', duration_months: 0, is_renewable: true, max_renewals: 0, probation_days: 90, notice_period_days: 30, working_hours_per_week: 48, annual_leave_days: 21, sick_leave_days: 30, includes_benefits: true, includes_insurance: true, includes_housing: false, includes_transport: false, end_of_service_eligible: true, overtime_eligible: true, is_default: false, is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: ContractType) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      category: item.category,
      duration_months: item.duration_months || 0,
      is_renewable: item.is_renewable,
      max_renewals: item.max_renewals || 0,
      probation_days: item.probation_days,
      notice_period_days: item.notice_period_days,
      working_hours_per_week: item.working_hours_per_week,
      annual_leave_days: item.annual_leave_days,
      sick_leave_days: item.sick_leave_days,
      includes_benefits: item.includes_benefits,
      includes_insurance: item.includes_insurance,
      includes_housing: item.includes_housing,
      includes_transport: item.includes_transport,
      end_of_service_eligible: item.end_of_service_eligible,
      overtime_eligible: item.overtime_eligible,
      is_default: item.is_default,
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

  const toSafeNumber = (value: unknown) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const totalEmployees = items.reduce((sum, c) => sum + toSafeNumber((c as any).employee_count), 0);
  const permanentCount = items
    .filter(c => c.category === 'permanent')
    .reduce((sum, c) => sum + toSafeNumber((c as any).employee_count), 0);

  const getCategoryInfo = (category: string) => {
    return CONTRACT_CATEGORIES.find(c => c.value === category);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      permanent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      temporary: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      probation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      part_time: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      contract: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      internship: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      seasonal: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[category] || colors.permanent;
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('contractTypes.title', 'Contract Types')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('contractTypes.title', 'Contract Types')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('contractTypes.subtitle', 'Define employment contract templates and benefits')}
            </p>
          </div>
          {hasPermission('master:hr:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('contractTypes.new', 'New Contract Type')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('contractTypes.types', 'Types')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <UserGroupIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('contractTypes.employees', 'Employees')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalEmployees}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <ClockIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('contractTypes.permanent', 'Permanent')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{permanentCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <CalendarDaysIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('contractTypes.fixedTerm', 'Fixed-Term')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalEmployees - permanentCount}</p>
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
            <option value="">{t('contractTypes.allCategories', 'All Categories')}</option>
            {CONTRACT_CATEGORIES.map(cat => (
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('contractTypes.contract', 'Contract')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('contractTypes.category', 'Category')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('contractTypes.duration', 'Duration')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('contractTypes.workingHours', 'Hours/Week')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('contractTypes.leave', 'Leave Days')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('contractTypes.benefits', 'Benefits')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('contractTypes.employees', 'Employees')}</th>
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
                              {item.is_default && (
                                <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Default</span>
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
                        {item.duration_months ? (
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {item.duration_months} {t('common.months')}
                            {item.is_renewable && (
                              <span className="text-xs text-gray-400 ml-1">🔄</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-sm text-green-600 dark:text-green-400">{t('contractTypes.unlimited', 'Unlimited')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.working_hours_per_week}h
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm">
                          <span className="text-green-600 dark:text-green-400">{item.annual_leave_days}</span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-red-600 dark:text-red-400">{item.sick_leave_days}</span>
                        </div>
                        <p className="text-xs text-gray-400">Annual / Sick</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {item.includes_insurance && <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded" title="Insurance">🏥</span>}
                          {item.includes_housing && <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded" title="Housing">🏠</span>}
                          {item.includes_transport && <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded" title="Transport">🚗</span>}
                          {item.end_of_service_eligible && <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded" title="End of Service">💼</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.employee_count}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('master:hr:update') && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('master:hr:delete') && item.employee_count === 0 && !item.is_default && (
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
        title={editingItem ? t('contractTypes.edit') : t('contractTypes.create')}
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
              placeholder="e.g., PERM"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('contractTypes.category', 'Category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {CONTRACT_CATEGORIES.map(cat => (
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
              label={t('contractTypes.duration', 'Duration (Months)')}
              type="number"
              min="0"
              value={formData.duration_months}
              onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
              placeholder="0 = unlimited"
            />
            <Input
              label={t('contractTypes.probation', 'Probation (Days)')}
              type="number"
              min="0"
              value={formData.probation_days}
              onChange={(e) => setFormData({ ...formData, probation_days: Number(e.target.value) })}
            />
            <Input
              label={t('contractTypes.notice', 'Notice (Days)')}
              type="number"
              min="0"
              value={formData.notice_period_days}
              onChange={(e) => setFormData({ ...formData, notice_period_days: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('contractTypes.workingHours', 'Hours/Week')}
              type="number"
              min="1"
              max="60"
              value={formData.working_hours_per_week}
              onChange={(e) => setFormData({ ...formData, working_hours_per_week: Number(e.target.value) })}
              error={errors.working_hours_per_week}
            />
            <Input
              label={t('contractTypes.annualLeave', 'Annual Leave')}
              type="number"
              min="0"
              value={formData.annual_leave_days}
              onChange={(e) => setFormData({ ...formData, annual_leave_days: Number(e.target.value) })}
              error={errors.annual_leave_days}
            />
            <Input
              label={t('contractTypes.sickLeave', 'Sick Leave')}
              type="number"
              min="0"
              value={formData.sick_leave_days}
              onChange={(e) => setFormData({ ...formData, sick_leave_days: Number(e.target.value) })}
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('contractTypes.benefits', 'Benefits & Eligibility')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'includes_insurance', label: '🏥 Insurance', field: 'includes_insurance' },
                { key: 'includes_housing', label: '🏠 Housing', field: 'includes_housing' },
                { key: 'includes_transport', label: '🚗 Transport', field: 'includes_transport' },
                { key: 'includes_benefits', label: '🎁 Benefits', field: 'includes_benefits' },
                { key: 'end_of_service_eligible', label: '💼 End of Service', field: 'end_of_service_eligible' },
                { key: 'overtime_eligible', label: '⏰ Overtime', field: 'overtime_eligible' },
              ].map(benefit => (
                <div key={benefit.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={benefit.key}
                    checked={formData[benefit.field as keyof typeof formData] as boolean}
                    onChange={(e) => setFormData({ ...formData, [benefit.field]: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor={benefit.key} className="text-sm text-gray-700 dark:text-gray-300">
                    {benefit.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_renewable"
                checked={formData.is_renewable}
                onChange={(e) => setFormData({ ...formData, is_renewable: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_renewable" className="text-sm text-gray-700 dark:text-gray-300">
                {t('contractTypes.renewable', 'Renewable')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_default" className="text-sm text-gray-700 dark:text-gray-300">
                {t('contractTypes.default', 'Default')}
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
        message={t('contractTypes.deleteWarning', 'This contract type will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, ContractTypesPage);
