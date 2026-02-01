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
import { companyStore } from '../../lib/companyStore';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface CostCenter {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  parent_id?: number | null;
  parent_code?: string | null;
  parent_name?: string | null;
  parent_name_ar?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  description: string;
  parent_id: number | '';
  is_active: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  name_ar: '',
  description: '',
  parent_id: '',
  is_active: true,
};

function CostCentersPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const getApiErrorMessage = async (res: Response, fallback: string) => {
    try {
      const text = await res.text();
      if (!text) return fallback;

      try {
        const parsed: unknown = JSON.parse(text);
        if (typeof parsed === 'string' && parsed.trim()) return parsed;
        if (parsed && typeof parsed === 'object') {
          const maybeError = (parsed as any).error;
          if (typeof maybeError === 'string' && maybeError.trim()) return maybeError;
          if (maybeError && typeof maybeError === 'object') {
            const msg = (maybeError as any).message;
            if (typeof msg === 'string' && msg.trim()) return msg;
          }
          const maybeMessage = (parsed as any).message;
          if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
        }
      } catch {
        // Not JSON; fall through.
      }

      const trimmed = text.trim();
      if (trimmed.startsWith('<')) return fallback;
      return trimmed || fallback;
    } catch {
      return fallback;
    }
  };

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [costCenterToDelete, setCostCenterToDelete] = useState<CostCenter | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showToast(t('common.failedToLoad', 'Failed to load'), 'error');
        return;
      }

      const companyId = companyStore.getActiveCompanyId();
      if (!companyId) {
        showToast(t('common.selectCompany', 'Please select a company'), 'error');
        return;
      }

      const res = await fetch('http://localhost:4000/api/master/cost-centers', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });
      if (res.ok) {
        const result = await res.json();
        setCostCenters(result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        showToast(t('common.error', 'An error occurred'), 'error');
      } else {
        const message = await getApiErrorMessage(res, t('costCenters.messages.loadFailed', 'Failed to load cost centers'));
        showToast(message, 'error');
      }
    } catch (error) {
      showToast(t('costCenters.messages.loadFailed', 'Failed to load cost centers'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = t('costCenters.validation.codeRequired', 'Cost center code is required');
    if (!formData.name.trim()) errors.name = t('costCenters.validation.nameRequired', 'Cost center name is required');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (costCenter?: CostCenter) => {
    if (costCenter) {
      setEditingCostCenter(costCenter);
      setFormData({
        code: costCenter.code,
        name: costCenter.name,
        name_ar: costCenter.name_ar || '',
        description: costCenter.description || '',
        parent_id: costCenter.parent_id || '',
        is_active: costCenter.is_active,
      });
    } else {
      setEditingCostCenter(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCostCenter(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      showToast(t('costCenters.messages.loginRequired', 'Please log in again'), 'error');
      return;
    }

    const companyId = companyStore.getActiveCompanyId();
    if (!companyId) {
      showToast(t('common.selectCompany', 'Please select a company'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingCostCenter
        ? `http://localhost:4000/api/master/cost-centers/${editingCostCenter.id}`
        : 'http://localhost:4000/api/master/cost-centers';
      const res = await fetch(url, {
        method: editingCostCenter ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
        body: JSON.stringify({
          ...formData,
          parent_id: formData.parent_id === '' ? null : formData.parent_id,
        }),
      });
      if (res.ok) {
        showToast(
          editingCostCenter
            ? t('costCenters.messages.updateSuccess', 'Cost center updated successfully')
            : t('costCenters.messages.createSuccess', 'Cost center created successfully'),
          'success'
        );
        handleCloseModal();
        fetchCostCenters();
      } else {
        const message = await getApiErrorMessage(res, t('costCenters.messages.saveFailed', 'Failed to save cost center'));
        showToast(message, 'error');
      }
    } catch (error) {
      showToast(t('costCenters.messages.saveFailed', 'Failed to save cost center'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (costCenter: CostCenter) => {
    setCostCenterToDelete(costCenter);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!costCenterToDelete) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      showToast(t('costCenters.messages.loginRequired', 'Please log in again'), 'error');
      return;
    }

    const companyId = companyStore.getActiveCompanyId();
    if (!companyId) {
      showToast(t('common.selectCompany', 'Please select a company'), 'error');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:4000/api/master/cost-centers/${costCenterToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId),
        },
      });
      if (res.ok) {
        showToast(t('costCenters.messages.deleteSuccess', 'Cost center deleted successfully'), 'success');
        fetchCostCenters();
      } else {
        const message = await getApiErrorMessage(res, t('costCenters.messages.deleteFailed', 'Failed to delete cost center'));
        showToast(message, 'error');
      }
    } catch (error) {
      showToast(t('costCenters.messages.deleteFailed', 'Failed to delete cost center'), 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setCostCenterToDelete(null);
    }
  };

  const filteredCostCenters = costCenters.filter((cc) => {
    const matchesSearch =
      cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cc.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = !showActiveOnly || cc.is_active;
    return matchesSearch && matchesActive;
  });

  if (!hasPermission('master:cost_centers:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <ChartBarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view cost centers.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{t('costCenters.pageTitle', 'Cost Centers - SLMS')}</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('costCenters.title', 'Cost Centers')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('costCenters.subtitle', 'Manage cost centers (main and sub)')}</p>
          </div>
          {hasPermission('master:cost_centers:create') && (
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="w-5 h-5 mr-2" />
              {t('costCenters.actions.add', 'Add Cost Center')}
            </Button>
          )}
        </div>
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('costCenters.searchPlaceholder', 'Search by name or code...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activeOnly"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="activeOnly" className="text-sm text-gray-700 dark:text-gray-300">
                {t('common.active', 'Active')} {t('costCenters.activeOnlySuffix', 'only')}
              </label>
            </div>
          </div>
        </div>
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">{t('costCenters.loading', 'Loading cost centers...')}</p>
            </div>
          ) : filteredCostCenters.length === 0 ? (
            <div className="text-center py-12">
              <ChartBarIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('costCenters.empty.title', 'No cost centers found')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm
                  ? t('costCenters.empty.searchHint', 'Try adjusting your search criteria')
                  : t('costCenters.empty.ctaHint', 'Get started by creating a new cost center')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cost Center
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('costCenters.fields.parent', 'Parent')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCostCenters.map((cc) => (
                    <tr key={cc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {cc.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {cc.name}
                          </div>
                          {cc.name_ar && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{cc.name_ar}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {cc.parent_code ? `${cc.parent_code} - ${cc.parent_name || ''}`.trim() : '—'}
                        </span>
                        {cc.parent_name_ar && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{cc.parent_name_ar}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {cc.description || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            cc.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {cc.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission('master:cost_centers:edit') && (
                            <button
                              onClick={() => handleOpenModal(cc)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                          )}
                          {hasPermission('master:cost_centers:delete') && (
                            <button
                              onClick={() => handleDeleteClick(cc)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <TrashIcon className="w-5 h-5" />
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
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={
          editingCostCenter
            ? t('costCenters.modal.editTitle', 'Edit Cost Center')
            : t('costCenters.modal.createTitle', 'Create Cost Center')
        }
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('costCenters.fields.code', 'Cost Center Code')}
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={formErrors.code}
              disabled={!!editingCostCenter}
            />
            <Input
              label={t('costCenters.fields.name', 'Cost Center Name')}
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
            />
          </div>
          <Input
            label={t('costCenters.fields.nameAr', 'Cost Center Name (Arabic)')}
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('costCenters.fields.parent', 'Parent')}
            </label>
            <select
              value={formData.parent_id}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({ ...formData, parent_id: value === '' ? '' : Number(value) });
              }}
              className="input w-full"
            >
              <option value="">{t('common.none', 'None')}</option>
              {costCenters
                .filter((cc) => cc.is_active)
                .filter((cc) => !editingCostCenter || cc.id !== editingCostCenter.id)
                .map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </option>
                ))}
            </select>
          </div>
          <Input
            label={t('common.description', 'Description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                {t('common.active', 'Active')}
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
              {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
              {editingCostCenter ? t('common.save', 'Save') : t('common.create', 'Create')}
          </Button>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCostCenterToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t('costCenters.delete.title', 'Delete Cost Center')}
        message={t('costCenters.delete.message', 'This action cannot be undone.')}
        confirmText={t('common.delete', 'Delete')}
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.CostCenters.View, CostCentersPage);
