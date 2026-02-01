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
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  LockOpenIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface FiscalPeriod {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  fiscal_year: number;
  period_type: 'month' | 'quarter' | 'half_year' | 'year';
  period_number: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed' | 'locked' | 'adjustment';
  is_adjustment_period: boolean;
  is_year_end: boolean;
  previous_period_id?: number;
  closed_by?: string;
  closed_at?: string;
  notes?: string;
  created_at: string;
}

const PERIOD_TYPES = [
  { value: 'month', label: 'Monthly', labelAr: 'شهري' },
  { value: 'quarter', label: 'Quarterly', labelAr: 'ربع سنوي' },
  { value: 'half_year', label: 'Semi-Annual', labelAr: 'نصف سنوي' },
  { value: 'year', label: 'Annual', labelAr: 'سنوي' },
];

const STATUS_CONFIGS = {
  open: { label: 'Open', labelAr: 'مفتوح', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: LockOpenIcon },
  closed: { label: 'Closed', labelAr: 'مغلق', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: LockClosedIcon },
  locked: { label: 'Locked', labelAr: 'مقفل', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: LockClosedIcon },
  adjustment: { label: 'Adjustment', labelAr: 'تسوية', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircleIcon },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function FiscalPeriodsPage() {
  const { hasPermission } = usePermissions();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FiscalPeriod | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear() + 1);

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    name_ar: string;
    fiscal_year: number;
    period_type: FiscalPeriod['period_type'];
    period_number: number;
    start_date: string;
    end_date: string;
    status: FiscalPeriod['status'];
    is_adjustment_period: boolean;
    is_year_end: boolean;
    notes: string;
  }>({
    code: '',
    name: '',
    name_ar: '',
    fiscal_year: new Date().getFullYear(),
    period_type: 'month',
    period_number: 1,
    start_date: '',
    end_date: '',
    status: 'open',
    is_adjustment_period: false,
    is_year_end: false,
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
      const data = await apiClient.get<any>('/api/fiscal-periods');
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch {
      setItems([]);
      showToast(t('common.failed', 'Failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.start_date) newErrors.start_date = t('validation.required');
    if (!formData.end_date) newErrors.end_date = t('validation.required');
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = t('validation.endDateAfterStart');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const url = editingItem 
        ? `http://localhost:4000/api/fiscal-periods/${editingItem.id}`
        : 'http://localhost:4000/api/fiscal-periods';
      await apiClient.request(url.replace('http://localhost:4000', ''), {
        method: editingItem ? 'PUT' : 'POST',
        body: JSON.stringify(formData),
      });

      showToast(t('common.success'), 'success');
      fetchData();
      setShowModal(false);
      resetForm();
    } catch (e: any) {
      showToast(e?.message || t('common.failed', 'Failed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/fiscal-periods/${deletingId}`);
      showToast(t('common.deleted'), 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failed', 'Failed'), 'error');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const handleClosePeriod = async (id: number) => {
    try {
      const found = items.find(i => i.id === id);
      if (!found) return;
      await apiClient.put(`/api/fiscal-periods/${id}`, {
        name: found.name,
        start_date: found.start_date,
        end_date: found.end_date,
        status: 'closed',
        notes: found.notes ?? null,
      });
      showToast(t('fiscalPeriods.periodClosed', 'Period closed successfully'), 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failed', 'Failed'), 'error');
    }
  };

  const handleReopenPeriod = async (id: number) => {
    try {
      const found = items.find(i => i.id === id);
      if (!found) return;
      await apiClient.put(`/api/fiscal-periods/${id}`, {
        name: found.name,
        start_date: found.start_date,
        end_date: found.end_date,
        status: 'open',
        notes: found.notes ?? null,
      });
      showToast(t('fiscalPeriods.periodReopened', 'Period reopened successfully'), 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failed', 'Failed'), 'error');
    }
  };

  const handleGeneratePeriods = async () => {
    try {
      await apiClient.post('/api/fiscal-periods/generate', { year: generateYear });
      setShowGenerateModal(false);
      showToast(t('fiscalPeriods.periodsGenerated', '12 periods generated successfully'), 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failed', 'Failed'), 'error');
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', name_ar: '', fiscal_year: new Date().getFullYear(), period_type: 'month', period_number: 1, start_date: '', end_date: '', status: 'open', is_adjustment_period: false, is_year_end: false, notes: '' });
    setErrors({});
  };

  const openEdit = (item: FiscalPeriod) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      fiscal_year: item.fiscal_year,
      period_type: item.period_type,
      period_number: item.period_number,
      start_date: item.start_date,
      end_date: item.end_date,
      status: item.status,
      is_adjustment_period: item.is_adjustment_period,
      is_year_end: item.is_year_end,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const years = [...new Set(items.map(i => i.fiscal_year))].sort((a, b) => b - a);
  
  const filteredItems = items.filter(item => {
    const matchYear = item.fiscal_year === filterYear;
    const matchStatus = !filterStatus || item.status === filterStatus;
    return matchYear && matchStatus;
  }).sort((a, b) => a.period_number - b.period_number);

  const getStatusConfig = (status: string) => STATUS_CONFIGS[status as keyof typeof STATUS_CONFIGS] || STATUS_CONFIGS.open;

  const canManagePeriods = hasPermission(MenuPermissions.Accounting.Periods.Manage) || hasPermission(MenuPermissions.Finance.Periods.Manage);

  return (
    <MainLayout>
      <Head>
        <title>{t('fiscalPeriods.title', 'Fiscal Periods')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('fiscalPeriods.title', 'Fiscal Periods')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('fiscalPeriods.subtitle', 'Manage accounting periods and year-end closing')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowGenerateModal(true)} className="flex items-center gap-2">
              <CalendarDaysIcon className="w-5 h-5" />
              {t('fiscalPeriods.generate', 'Generate Year')}
            </Button>
            {canManagePeriods && (
              <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                {t('fiscalPeriods.new', 'New Period')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <LockOpenIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('fiscalPeriods.openPeriods', 'Open')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {filteredItems.filter(i => i.status === 'open').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <LockClosedIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('fiscalPeriods.closedPeriods', 'Closed')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {filteredItems.filter(i => i.status === 'closed').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <LockClosedIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('fiscalPeriods.lockedPeriods', 'Locked')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {filteredItems.filter(i => i.status === 'locked').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('fiscalPeriods.fiscalYear', 'Fiscal Year')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{filterYear}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {years.length > 0 ? years.map(year => (
              <option key={year} value={year}>{year}</option>
            )) : (
              <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            )}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('common.allStatuses', 'All Statuses')}</option>
            <option value="open">{t('fiscalPeriods.open', 'Open')}</option>
            <option value="closed">{t('fiscalPeriods.closed', 'Closed')}</option>
            <option value="locked">{t('fiscalPeriods.locked', 'Locked')}</option>
            <option value="adjustment">{t('fiscalPeriods.adjustment', 'Adjustment')}</option>
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length} {t('fiscalPeriods.periods', 'periods')}
          </div>
        </div>
      </Card>

      {/* Timeline View */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
              <Button variant="secondary" onClick={() => setShowGenerateModal(true)} className="mt-4">
                {t('fiscalPeriods.generatePeriods', 'Generate Periods for This Year')}
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('fiscalPeriods.period', 'Period')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('fiscalPeriods.dateRange', 'Date Range')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.type')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const statusConfig = getStatusConfig(item.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.code}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                          {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                          <div className="flex gap-1 mt-1">
                            {item.is_year_end && (
                                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                                  {t('fiscalPeriods.yearEnd', locale === 'ar' ? 'نهاية السنة' : 'Year End')}
                                </span>
                            )}
                            {item.is_adjustment_period && (
                                <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                                  {t('fiscalPeriods.adjustment', locale === 'ar' ? 'تسوية' : 'Adjustment')}
                                </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{item.start_date}</span>
                          <span className="mx-2 text-gray-400">→</span>
                          <span className="text-gray-600 dark:text-gray-400">{item.end_date}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded">
                          {(() => {
                            const pt = PERIOD_TYPES.find(x => x.value === item.period_type);
                            return locale === 'ar' ? (pt?.labelAr ?? pt?.label) : (pt?.label ?? item.period_type);
                          })()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {locale === 'ar' ? statusConfig.labelAr : statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {item.status === 'open' && canManagePeriods && (
                            <button 
                              onClick={() => handleClosePeriod(item.id)} 
                              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded dark:hover:bg-yellow-900/20"
                              title={t('fiscalPeriods.closePeriod', 'Close Period')}
                            >
                              <LockClosedIcon className="w-4 h-4" />
                            </button>
                          )}
                          {item.status === 'closed' && canManagePeriods && (
                            <button 
                              onClick={() => handleReopenPeriod(item.id)} 
                              className="p-1 text-green-600 hover:bg-green-50 rounded dark:hover:bg-green-900/20"
                              title={t('fiscalPeriods.reopenPeriod', 'Reopen Period')}
                            >
                              <LockOpenIcon className="w-4 h-4" />
                            </button>
                          )}
                          {canManagePeriods && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {canManagePeriods && item.status !== 'locked' && (
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

      {/* Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('fiscalPeriods.edit') : t('fiscalPeriods.create')}
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
              placeholder="e.g., FP-2025-01"
            />
            <Input
              label={t('fiscalPeriods.fiscalYear', 'Fiscal Year')}
              type="number"
              value={formData.fiscal_year}
              onChange={(e) => setFormData({ ...formData, fiscal_year: Number(e.target.value) })}
            />
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('fiscalPeriods.periodType', 'Period Type')}
              </label>
              <select
                value={formData.period_type}
                onChange={(e) => setFormData({ ...formData, period_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {PERIOD_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{locale === 'ar' ? type.labelAr : type.label}</option>
                ))}
              </select>
            </div>
            <Input
              label={t('fiscalPeriods.periodNumber', 'Period #')}
              type="number"
              min="1"
              max="13"
              value={formData.period_number}
              onChange={(e) => setFormData({ ...formData, period_number: Number(e.target.value) })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="open">{t('fiscalPeriods.open', locale === 'ar' ? 'مفتوح' : 'Open')}</option>
                <option value="closed">{t('fiscalPeriods.closed', locale === 'ar' ? 'مغلق' : 'Closed')}</option>
                <option value="locked">{t('fiscalPeriods.locked', locale === 'ar' ? 'مقفل' : 'Locked')}</option>
                <option value="adjustment">{t('fiscalPeriods.adjustment', locale === 'ar' ? 'تسوية' : 'Adjustment')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('fiscalPeriods.startDate', 'Start Date')}
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              error={errors.start_date}
              required
            />
            <Input
              label={t('fiscalPeriods.endDate', 'End Date')}
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              error={errors.end_date}
              required
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_year_end"
                checked={formData.is_year_end}
                onChange={(e) => setFormData({ ...formData, is_year_end: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_year_end" className="text-sm text-gray-700 dark:text-gray-300">
                {t('fiscalPeriods.yearEnd', 'Year End Period')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_adjustment"
                checked={formData.is_adjustment_period}
                onChange={(e) => setFormData({ ...formData, is_adjustment_period: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="is_adjustment" className="text-sm text-gray-700 dark:text-gray-300">
                {t('fiscalPeriods.adjustmentPeriod', 'Adjustment Period')}
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

      {/* Generate Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title={t('fiscalPeriods.generatePeriods', 'Generate Fiscal Periods')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {t('fiscalPeriods.generateDescription', 'This will create 12 monthly periods for the selected fiscal year.')}
          </p>
          <Input
            label={t('fiscalPeriods.fiscalYear', 'Fiscal Year')}
            type="number"
            value={generateYear}
            onChange={(e) => setGenerateYear(Number(e.target.value))}
          />
          <div className="flex gap-3 pt-4">
            <Button onClick={handleGeneratePeriods} className="flex-1">{t('fiscalPeriods.generate', 'Generate')}</Button>
            <Button variant="secondary" onClick={() => setShowGenerateModal(false)} className="flex-1">{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('fiscalPeriods.deleteWarning', 'Deleting a period may affect financial reports.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Accounting.Periods.View, FiscalPeriodsPage);
