import { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { useCompany } from '../../hooks/useCompany';
import apiClient from '../../lib/apiClient';
import { useLocale } from '../../contexts/LocaleContext';
// 📦 Shared Types - Single Source of Truth
import type { Country as SharedCountry, HarvestSchedule as SharedHarvestSchedule } from '@/shared/types';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// Extending shared types with API-specific fields
interface Country extends SharedCountry {
  name_en?: string;  // API may return name_en instead of name
}

interface HarvestSchedule extends SharedHarvestSchedule {
  description?: string;
  country_name?: string;
  country_name_ar?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  description: string;
  season: string;
  start_month: number | '';
  end_month: number | '';
  harvest_duration_days: number | '';
  region: string;
  country_id: number | '';
  notes: string;
  is_active: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  name_ar: '',
  description: '',
  season: '',
  start_month: '',
  end_month: '',
  harvest_duration_days: '',
  region: '',
  country_id: '',
  notes: '',
  is_active: true,
};

const SEASONS = [
  { value: 'spring', labelEn: 'Spring', labelAr: 'الربيع' },
  { value: 'summer', labelEn: 'Summer', labelAr: 'الصيف' },
  { value: 'fall', labelEn: 'Fall/Autumn', labelAr: 'الخريف' },
  { value: 'winter', labelEn: 'Winter', labelAr: 'الشتاء' },
  { value: 'year_round', labelEn: 'Year Round', labelAr: 'طوال العام' },
];

const MONTHS = [
  { value: 1, labelEn: 'January', labelAr: 'يناير' },
  { value: 2, labelEn: 'February', labelAr: 'فبراير' },
  { value: 3, labelEn: 'March', labelAr: 'مارس' },
  { value: 4, labelEn: 'April', labelAr: 'أبريل' },
  { value: 5, labelEn: 'May', labelAr: 'مايو' },
  { value: 6, labelEn: 'June', labelAr: 'يونيو' },
  { value: 7, labelEn: 'July', labelAr: 'يوليو' },
  { value: 8, labelEn: 'August', labelAr: 'أغسطس' },
  { value: 9, labelEn: 'September', labelAr: 'سبتمبر' },
  { value: 10, labelEn: 'October', labelAr: 'أكتوبر' },
  { value: 11, labelEn: 'November', labelAr: 'نوفمبر' },
  { value: 12, labelEn: 'December', labelAr: 'ديسمبر' },
];

function HarvestSchedulesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { activeCompanyId, loading: companyLoading } = useCompany();

  const [schedules, setSchedules] = useState<HarvestSchedule[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<HarvestSchedule | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<HarvestSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission('master:harvest_schedules:create');
  const canEdit = hasPermission('master:harvest_schedules:edit');
  const canDelete = hasPermission('master:harvest_schedules:delete');

  useEffect(() => {
    if (!companyLoading && activeCompanyId) {
      fetchSchedules();
      fetchCountries();
    }
  }, [companyLoading, activeCompanyId, showActiveOnly]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showActiveOnly) params.append('is_active', 'true');
      const res = await apiClient.get(`/api/master/harvest-schedules?${params.toString()}`);
      if (res.success) {
        setSchedules(res.data || []);
      } else {
        showToast(t('common.fetchError') || 'Failed to fetch harvest schedules', 'error');
      }
    } catch (error) {
      console.error('Error fetching harvest schedules:', error);
      showToast(t('common.fetchError') || 'Failed to fetch harvest schedules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await apiClient.get('/api/master/countries');
      if (res.success) {
        setCountries(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = t('common.fieldRequired') || 'Code is required';
    if (!formData.name.trim()) errors.name = t('common.fieldRequired') || 'Name is required';
    if (formData.start_month && formData.end_month && formData.end_month < formData.start_month) {
      errors.end_month = t('common.validation.endMonthAfterStart') || 'End month must be after start month';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setFormData(initialFormData);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (schedule: HarvestSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      code: schedule.code,
      name: schedule.name,
      name_ar: schedule.name_ar || '',
      description: schedule.description || '',
      season: schedule.season || '',
      start_month: schedule.start_month || '',
      end_month: schedule.end_month || '',
      harvest_duration_days: schedule.harvest_duration_days || '',
      region: schedule.region || '',
      country_id: schedule.country_id || '',
      notes: schedule.notes || '',
      is_active: schedule.is_active,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        start_month: formData.start_month || null,
        end_month: formData.end_month || null,
        harvest_duration_days: formData.harvest_duration_days || null,
        country_id: formData.country_id || null,
      };

      if (editingSchedule) {
        const res = await apiClient.put(`/api/master/harvest-schedules/${editingSchedule.id}`, payload);
        if (res.success) {
          showToast(t('common.updateSuccess') || 'Harvest schedule updated', 'success');
          setModalOpen(false);
          fetchSchedules();
        } else {
          showToast(res.error?.message || t('common.updateError') || 'Failed to update', 'error');
        }
      } else {
        const res = await apiClient.post('/api/master/harvest-schedules', payload);
        if (res.success) {
          showToast(t('common.createSuccess') || 'Harvest schedule created', 'success');
          setModalOpen(false);
          fetchSchedules();
        } else {
          showToast(res.error?.message || t('common.createError') || 'Failed to create', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving harvest schedule:', error);
      showToast(t('common.saveError') || 'Failed to save harvest schedule', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (schedule: HarvestSchedule) => {
    setScheduleToDelete(schedule);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return;
    setDeleting(true);
    try {
      const res = await apiClient.delete(`/api/master/harvest-schedules/${scheduleToDelete.id}`);
      if (res.success) {
        showToast(t('common.deleteSuccess') || 'Harvest schedule deleted', 'success');
        setDeleteConfirmOpen(false);
        setScheduleToDelete(null);
        fetchSchedules();
      } else {
        showToast(res.error?.message || t('common.deleteError') || 'Failed to delete', 'error');
      }
    } catch (error) {
      console.error('Error deleting harvest schedule:', error);
      showToast(t('common.deleteError') || 'Failed to delete harvest schedule', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.code.toLowerCase().includes(term) ||
      s.name.toLowerCase().includes(term) ||
      (s.name_ar && s.name_ar.includes(term)) ||
      (s.region && s.region.toLowerCase().includes(term))
    );
  });

  const getSeasonLabel = (season?: string) => {
    if (!season) return '-';
    const found = SEASONS.find((s) => s.value === season);
    if (!found) return season;
    return locale === 'ar' ? found.labelAr : found.labelEn;
  };

  const getMonthLabel = (month?: number) => {
    if (!month) return '-';
    const found = MONTHS.find((m) => m.value === month);
    if (!found) return String(month);
    return locale === 'ar' ? found.labelAr : found.labelEn;
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('harvestSchedules.title') || 'Harvest Schedules'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('harvestSchedules.title') || 'Harvest Schedules'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('harvestSchedules.pageDescription') || 'Manage harvest schedules for agricultural items'}
              </p>
            </div>
          </div>
          {canCreate && (
            <Button variant="primary" onClick={handleOpenCreate}>
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('harvestSchedules.addNew') || 'Add New'}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('harvestSchedules.searchPlaceholder') || 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              {t('harvestSchedules.activeOnly') || 'Active only'}
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">{t('harvestSchedules.loading') || 'Loading...'}</p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {t('common.noRecordsFound') || 'No records found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('harvestSchedules.code') || 'Code'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('harvestSchedules.name') || 'Name'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('harvestSchedules.season') || 'Season'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('harvestSchedules.harvestPeriod') || 'Harvest Period'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('harvestSchedules.region') || 'Region'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.status') || 'Status'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.actions') || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSchedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {schedule.code}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {locale === 'ar' && schedule.name_ar ? schedule.name_ar : schedule.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {getSeasonLabel(schedule.season)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {schedule.start_month && schedule.end_month
                          ? `${getMonthLabel(schedule.start_month)} - ${getMonthLabel(schedule.end_month)}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {schedule.region || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            schedule.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {schedule.is_active ? t('harvestSchedules.active') || 'Active' : t('harvestSchedules.inactive') || 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(schedule)}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title={t('harvestSchedules.edit') || 'Edit'}
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteClick(schedule)}
                              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              title={t('harvestSchedules.delete') || 'Delete'}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSchedule ? t('harvestSchedules.edit') + ' ' + t('harvestSchedules.title') : t('harvestSchedules.addHarvestSchedule')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('harvestSchedules.code') || 'Code'}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
              required
              disabled={!!editingSchedule}
            />
            <Input
              label={t('harvestSchedules.name') || 'Name'}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('harvestSchedules.nameArabic') || 'Name (Arabic)'}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              dir="rtl"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('harvestSchedules.season') || 'Season'}
              </label>
              <select
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">{t('harvestSchedules.selectSeason') || 'Select Season'}</option>
                {SEASONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {locale === 'ar' ? s.labelAr : s.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('harvestSchedules.startMonth') || 'Start Month'}
              </label>
              <select
                value={formData.start_month}
                onChange={(e) =>
                  setFormData({ ...formData, start_month: e.target.value ? parseInt(e.target.value) : '' })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">{t('harvestSchedules.selectMonth') || 'Select Month'}</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {locale === 'ar' ? m.labelAr : m.labelEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('harvestSchedules.endMonth') || 'End Month'}
              </label>
              <select
                value={formData.end_month}
                onChange={(e) =>
                  setFormData({ ...formData, end_month: e.target.value ? parseInt(e.target.value) : '' })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">{t('harvestSchedules.selectMonth') || 'Select Month'}</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {locale === 'ar' ? m.labelAr : m.labelEn}
                  </option>
                ))}
              </select>
              {formErrors.end_month && (
                <p className="mt-1 text-sm text-red-600">{formErrors.end_month}</p>
              )}
            </div>
            <Input
              label={t('harvestSchedules.harvestDuration') || 'Harvest Duration (days)'}
              type="number"
              value={formData.harvest_duration_days}
              onChange={(e) =>
                setFormData({ ...formData, harvest_duration_days: e.target.value ? parseInt(e.target.value) : '' })
              }
              min={1}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('harvestSchedules.region') || 'Region'}
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('harvestSchedules.country') || 'Country'}
              </label>
              <select
                value={formData.country_id}
                onChange={(e) =>
                  setFormData({ ...formData, country_id: e.target.value ? parseInt(e.target.value) : '' })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">{t('harvestSchedules.selectCountry') || 'Select Country'}</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === 'ar' && c.name_ar ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('harvestSchedules.description') || 'Description'}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('harvestSchedules.notes') || 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            {t('harvestSchedules.active') || 'Active'}
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('harvestSchedules.cancel') || 'Cancel'}
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              {editingSchedule ? t('common.update') || 'Update' : t('harvestSchedules.create') || 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setScheduleToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t('harvestSchedules.deleteConfirmTitle') || 'Confirm Delete'}
        message={t('harvestSchedules.deleteConfirmMessage') || 'Are you sure you want to delete this harvest schedule?'}
        confirmText={t('harvestSchedules.delete') || 'Delete'}
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.HarvestSchedules?.View || 'harvest_schedules:view', HarvestSchedulesPage);
