import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Card from '../../components/ui/Card';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../lib/apiClient';
import { withPermission } from '../../utils/withPermission';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function BaseCurrencyPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseCurrencyLocked, setBaseCurrencyLocked] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Currency | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    decimal_places: 2,
    is_base_currency: false,
    is_active: true,
  });

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await apiClient.get<{ success: boolean; data: Currency[]; meta?: { baseCurrencyLocked?: boolean } }>(
        '/api/settings/currencies',
        { cache: 'no-store' }
      );
      setItems(result.data || []);
      setBaseCurrencyLocked(Boolean(result.meta?.baseCurrencyLocked));
    } catch (e: any) {
      showToast(e?.message || t('common.failedToLoad', 'Failed to load'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', symbol: '', decimal_places: 2, is_base_currency: false, is_active: true });
    setErrors({});
  };

  const openEdit = (item: Currency) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      symbol: item.symbol || '',
      decimal_places: item.decimal_places,
      is_base_currency: item.is_base_currency,
      is_active: item.is_active,
    });
    setErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const next: Record<string, string> = {};
    const trimmedCode = formData.code.trim().toUpperCase();

    if (!trimmedCode) next.code = t('validation.required');
    if (trimmedCode && trimmedCode.length !== 3) next.code = t('settings.baseCurrency.codeLength', 'Currency code must be 3 letters');

    if (!next.code && trimmedCode) {
      const duplicate = items.some((c) => {
        if (editingItem && c.id === editingItem.id) return false;
        return String(c.code).toUpperCase() === trimmedCode;
      });
      if (duplicate) {
        next.code = t('settings.baseCurrency.codeExists', 'Currency code already exists');
      }
    }

    if (!formData.name.trim()) next.name = t('validation.required');
    if (formData.decimal_places < 0 || formData.decimal_places > 6) next.decimal_places = t('settings.baseCurrency.invalidDecimals', 'Decimal places must be between 0 and 6');

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        symbol: formData.symbol.trim() || null,
        decimal_places: Number(formData.decimal_places),
        is_base_currency: Boolean(formData.is_base_currency),
        is_active: Boolean(formData.is_active),
      };

      if (editingItem) {
        await apiClient.put(`/api/settings/currencies/${editingItem.id}`, payload);
      } else {
        await apiClient.post('/api/settings/currencies', payload);
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

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/settings/currencies/${deletingId}`);
      showToast(t('common.deleted'), 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failedToDelete', 'Failed to delete'), 'error');
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const setAsBase = async (id: number) => {
    try {
      await apiClient.post(`/api/settings/currencies/${id}/set-base`, {});
      showToast(t('settings.baseCurrency.setBaseSuccess', 'Base currency updated'), 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.message || t('common.failedToSave', 'Failed to save'), 'error');
    }
  };

  const canCreate = hasPermission('settings:currency:create');
  const canUpdate = hasPermission('settings:currency:update');
  const canDelete = hasPermission('settings:currency:delete');

  return (
    <MainLayout>
      <Head>
        <title>{t('settings.baseCurrency.title', 'Base Currency')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.baseCurrency.title', 'Base Currency')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('settings.baseCurrency.subtitle', 'Manage company currencies and set a single base currency')}</p>
          </div>
          {canCreate && (
            <Button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              {t('settings.baseCurrency.new', 'New Currency')}
            </Button>
          )}
        </div>
      </div>

      {baseCurrencyLocked && (
        <Card className="p-4 mb-6 border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <LockClosedIcon className="w-5 h-5 text-amber-700 dark:text-amber-300 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">{t('settings.baseCurrency.lockedTitle', 'Base currency is locked')}</p>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                {t('settings.baseCurrency.lockedMessage', 'You cannot change the base currency after transactions exist.')}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('settings.baseCurrency.listTitle', 'Currencies')}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.baseCurrency.code', 'Code')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.baseCurrency.name', 'Name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.baseCurrency.symbol', 'Symbol')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.baseCurrency.decimals', 'Decimals')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('settings.baseCurrency.status', 'Status')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    {t('common.loading', 'Loading...')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    {t('settings.baseCurrency.empty', 'No currencies found')}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {item.is_base_currency && <CheckCircleIcon className="w-4 h-4 text-green-600" />}
                        <span>{item.code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.symbol || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{item.decimal_places}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          item.is_active
                            ? 'inline-flex px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'inline-flex px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }
                      >
                        {item.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && !item.is_base_currency && !baseCurrencyLocked && (
                          <Button variant="secondary" size="sm" onClick={() => setAsBase(item.id)}>
                            {t('settings.baseCurrency.setAsBase', 'Set as Base')}
                          </Button>
                        )}
                        {canUpdate && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEdit(item)}
                            disabled={baseCurrencyLocked && item.is_base_currency}
                            title={baseCurrencyLocked && item.is_base_currency ? t('settings.baseCurrency.lockedTitle', 'Base currency is locked') : undefined}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setDeletingId(item.id);
                              setConfirmOpen(true);
                            }}
                            disabled={baseCurrencyLocked && item.is_base_currency}
                            title={baseCurrencyLocked && item.is_base_currency ? t('settings.baseCurrency.lockedTitle', 'Base currency is locked') : undefined}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
        title={editingItem ? t('settings.baseCurrency.edit', 'Edit Currency') : t('settings.baseCurrency.create', 'Create Currency')}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label={t('settings.baseCurrency.code', 'Code')}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            error={errors.code}
            required
            disabled={baseCurrencyLocked && Boolean(editingItem?.is_base_currency)}
            placeholder="USD"
          />
          <Input
            label={t('settings.baseCurrency.name', 'Name')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
            disabled={baseCurrencyLocked && Boolean(editingItem?.is_base_currency)}
          />
          <Input
            label={t('settings.baseCurrency.symbol', 'Symbol')}
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            disabled={baseCurrencyLocked && Boolean(editingItem?.is_base_currency)}
          />
          <Input
            label={t('settings.baseCurrency.decimals', 'Decimals')}
            type="number"
            value={String(formData.decimal_places)}
            onChange={(e) => setFormData({ ...formData, decimal_places: Number(e.target.value) })}
            error={errors.decimal_places}
            disabled={baseCurrencyLocked && Boolean(editingItem?.is_base_currency)}
          />

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">{t('settings.baseCurrency.isBase', 'Is Base Currency')}</label>
            <input
              type="checkbox"
              checked={formData.is_base_currency}
              onChange={(e) => setFormData({ ...formData, is_base_currency: e.target.checked })}
              disabled={baseCurrencyLocked || (editingItem?.is_base_currency && baseCurrencyLocked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">{t('common.active', 'Active')}</label>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              disabled={baseCurrencyLocked && Boolean(editingItem?.is_base_currency)}
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
        onConfirm={handleDelete}
        title={t('settings.baseCurrency.deleteTitle', 'Delete Currency')}
        message={t('settings.baseCurrency.deleteWarning', 'This action cannot be undone.')}
        confirmText={t('common.delete', 'Delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission('settings:currency:view', BaseCurrencyPage);
