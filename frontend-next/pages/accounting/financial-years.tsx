import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../lib/apiClient';
import { withPermission } from '../../utils/withPermission';
import { PlusIcon, PencilIcon, TrashIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface FinancialYear {
  id: number;
  year_name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed' | 'locked' | string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

function FinancialYearsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialYear | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'delete' | 'close'>('delete');
  const [targetId, setTargetId] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const [formData, setFormData] = useState({
    year_name: '',
    start_date: '',
    end_date: '',
    is_default: false,
  });

  const canView = hasPermission('finance:financial_year:view');
  const canCreate = hasPermission('finance:financial_year:create');
  const canUpdate = hasPermission('finance:financial_year:update');
  const canClose = hasPermission('finance:financial_year:close');

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const result = await apiClient.get<{ success: boolean; data: FinancialYear[] }>('/api/financial-years', { cache: 'no-store' });
      setItems(result.data || []);
    } catch (e: any) {
      showToast(e?.message || t('common.failedToLoad', 'Failed to load'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ year_name: '', start_date: '', end_date: '', is_default: false });
    setErrors({});
  };

  const openEdit = (item: FinancialYear) => {
    setEditingItem(item);
    setFormData({
      year_name: item.year_name,
      start_date: item.start_date?.slice(0, 10),
      end_date: item.end_date?.slice(0, 10),
      is_default: item.is_default,
    });
    setErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const next: Record<string, string> = {};
    if (!formData.year_name.trim()) next.year_name = t('validation.required');
    if (!formData.start_date) next.start_date = t('validation.required');
    if (!formData.end_date) next.end_date = t('validation.required');
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      next.end_date = t('financialYears.validation.dateOrder', 'End date must be after start date');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const payload = {
        year_name: formData.year_name.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_default: Boolean(formData.is_default),
      };

      if (editingItem) {
        await apiClient.put(`/api/financial-years/${editingItem.id}`, payload);
      } else {
        await apiClient.post('/api/financial-years', payload);
      }

      showToast(t('common.success'), 'success');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failedToSave', 'Failed to save'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDefault = async (id: number) => {
    try {
      await apiClient.post(`/api/financial-years/${id}/set-default`, {});
      showToast(t('common.success'), 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failedToSave', 'Failed to save'), 'error');
    }
  };

  const closeYear = async (id: number) => {
    setIsConfirming(true);
    try {
      await apiClient.post(`/api/financial-years/${id}/close`, {});
      showToast(t('financialYears.closed', 'Financial year closed'), 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failedToSave', 'Failed to save'), 'error');
    } finally {
      setIsConfirming(false);
      setConfirmOpen(false);
      setTargetId(null);
    }
  };

  const deleteYear = async (id: number) => {
    setIsConfirming(true);
    try {
      await apiClient.delete(`/api/financial-years/${id}`);
      showToast(t('common.deleted'), 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failedToDelete', 'Failed to delete'), 'error');
    } finally {
      setIsConfirming(false);
      setConfirmOpen(false);
      setTargetId(null);
    }
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('financialYears.title', 'Financial Years')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('financialYears.title', 'Financial Years')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('financialYears.subtitle', 'Create, set default, and close financial years')}</p>
          </div>
          {canCreate && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('financialYears.new', 'New Financial Year')}
            </Button>
          )}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('financialYears.listTitle', 'Years')}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('financialYears.name', 'Name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('financialYears.start', 'Start')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('financialYears.end', 'End')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('financialYears.status', 'Status')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">{t('common.loading', 'Loading...')}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">{t('financialYears.empty', 'No financial years found')}</td>
                </tr>
              ) : (
                items.map((item) => {
                  const isClosed = item.status === 'closed';
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {item.is_default && <CheckCircleIcon className="w-4 h-4 text-green-600" />}
                          <span>{item.year_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.start_date?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.end_date?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={
                            isClosed
                              ? 'inline-flex px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                              : 'inline-flex px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }
                        >
                          {isClosed ? t('financialYears.closedStatus', 'Closed') : t('financialYears.openStatus', 'Open')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {canUpdate && !item.is_default && !isClosed && (
                            <Button size="sm" variant="secondary" onClick={() => setDefault(item.id)}>
                              {t('financialYears.setDefault', 'Set Default')}
                            </Button>
                          )}
                          {canUpdate && (
                            <Button size="sm" variant="secondary" onClick={() => openEdit(item)} disabled={isClosed} title={isClosed ? t('financialYears.cannotEditClosed', 'Closed year cannot be edited') : undefined}>
                              <PencilIcon className="w-4 h-4" />
                            </Button>
                          )}
                          {canClose && !isClosed && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setConfirmMode('close');
                                setTargetId(item.id);
                                setConfirmOpen(true);
                              }}
                            >
                              <LockClosedIcon className="w-4 h-4" />
                            </Button>
                          )}
                          {canUpdate && !isClosed && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setConfirmMode('delete');
                                setTargetId(item.id);
                                setConfirmOpen(true);
                              }}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingItem ? t('financialYears.edit', 'Edit Financial Year') : t('financialYears.create', 'Create Financial Year')}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={t('financialYears.name', 'Name')}
            value={formData.year_name}
            onChange={(e) => setFormData({ ...formData, year_name: e.target.value })}
            error={errors.year_name}
            required
            disabled={editingItem?.status === 'closed'}
          />
          <Input
            label={t('financialYears.start', 'Start')}
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            error={errors.start_date}
            required
            disabled={editingItem?.status === 'closed'}
          />
          <Input
            label={t('financialYears.end', 'End')}
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            error={errors.end_date}
            required
            disabled={editingItem?.status === 'closed'}
          />

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">{t('financialYears.isDefault', 'Set as default')}</label>
            <input
              type="checkbox"
              checked={formData.is_default}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              disabled={editingItem?.status === 'closed'}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {t('common.save', 'Save')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (!targetId) return;
          return confirmMode === 'close' ? closeYear(targetId) : deleteYear(targetId);
        }}
        title={
          confirmMode === 'close'
            ? t('financialYears.closeTitle', 'Close Financial Year')
            : t('financialYears.deleteTitle', 'Delete Financial Year')
        }
        message={
          confirmMode === 'close'
            ? t('financialYears.closeWarning', 'Closing the financial year cannot be undone.')
            : t('financialYears.deleteWarning', 'This action cannot be undone.')
        }
        confirmText={confirmMode === 'close' ? t('financialYears.close', 'Close') : t('common.delete', 'Delete')}
        variant={confirmMode === 'close' ? 'primary' : 'danger'}
        loading={isConfirming}
      />
    </MainLayout>
  );
}

export default withPermission('finance:financial_year:view', FinancialYearsPage);
