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
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalculatorIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

type TaxType = 'vat' | 'withholding' | 'sales' | 'custom' | 'zatca';

interface Tax {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  tax_type: TaxType;
  rate: number;
  account_id?: number;
  account_code?: string;
  account_name?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  tax_type: TaxType;
  rate: number;
  account_id: number | '';
  description: string;
  is_active: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  name_ar: '',
  tax_type: 'vat',
  rate: 0,
  account_id: '',
  description: '',
  is_active: true,
};

function TaxesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState<Tax | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTaxes();
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/accounting/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const fetchTaxes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/master/taxes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setTaxes(result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast('Failed to load taxes', 'error');
      }
    } catch (error) {
      showToast('Failed to load taxes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Tax code is required';
    if (!formData.name.trim()) errors.name = 'Tax name is required';
    if (formData.rate < 0 || formData.rate > 100) errors.rate = 'Rate must be between 0 and 100';
    if (!formData.account_id) errors.account_id = 'Tax account is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (tax?: Tax) => {
    if (tax) {
      setEditingTax(tax);
      setFormData({
        code: tax.code,
        name: tax.name,
        name_ar: tax.name_ar || '',
        tax_type: tax.tax_type,
        rate: tax.rate,
        account_id: tax.account_id || '',
        description: tax.description || '',
        is_active: tax.is_active,
      });
    } else {
      setEditingTax(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTax(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingTax
        ? `http://localhost:4000/api/master/taxes/${editingTax.id}`
        : 'http://localhost:4000/api/master/taxes';
      const res = await fetch(url, {
        method: editingTax ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showToast(editingTax ? 'Tax updated successfully' : 'Tax created successfully', 'success');
        handleCloseModal();
        fetchTaxes();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to save tax', 'error');
      }
    } catch (error) {
      showToast('Failed to save tax', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (tax: Tax) => {
    setTaxToDelete(tax);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taxToDelete) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/master/taxes/${taxToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Tax deleted successfully', 'success');
        fetchTaxes();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to delete tax', 'error');
      }
    } catch (error) {
      showToast('Failed to delete tax', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setTaxToDelete(null);
    }
  };

  const getTaxTypeLabel = (type: TaxType) => {
    const labels = {
      vat: 'VAT',
      withholding: 'Withholding Tax',
      sales: 'Sales Tax',
      custom: 'Custom Tax',
      zatca: 'ZATCA Tax',
    };
    return labels[type];
  };

  const getTaxTypeBadge = (type: TaxType) => {
    const colors = {
      vat: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      withholding: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      sales: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      custom: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      zatca: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[type];
  };

  const filteredTaxes = taxes.filter((tax) => {
    const matchesSearch =
      tax.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tax.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = !showActiveOnly || tax.is_active;
    return matchesSearch && matchesActive;
  });

  if (!hasPermission('master:taxes:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <CalculatorIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view taxes.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Tax Management - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Tax Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage tax rates and types
            </p>
          </div>
          {hasPermission('master:taxes:create') && (
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Tax
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
                  placeholder="Search by name or code..."
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
                Active only
              </label>
            </div>
          </div>
        </div>
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading taxes...</p>
            </div>
          ) : filteredTaxes.length === 0 ? (
            <div className="text-center py-12">
              <CalculatorIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No taxes found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating a new tax'}
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
                      Tax Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rate (%)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Account
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
                  {filteredTaxes.map((tax) => (
                    <tr key={tax.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {tax.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {tax.name}
                          </div>
                          {tax.name_ar && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{tax.name_ar}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTaxTypeBadge(tax.tax_type)}`}>
                          {getTaxTypeLabel(tax.tax_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {tax.rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tax.account_name ? (
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {tax.account_code} - {tax.account_name}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tax.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {tax.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission('master:taxes:edit') && (
                            <button
                              onClick={() => handleOpenModal(tax)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                          )}
                          {hasPermission('master:taxes:delete') && (
                            <button
                              onClick={() => handleDeleteClick(tax)}
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
        title={editingTax ? 'Edit Tax' : 'Create Tax'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tax Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={formErrors.code}
              disabled={!!editingTax}
              helperText="e.g., VAT15, WHT5"
            />
            <Input
              label="Tax Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
            />
          </div>
          <Input
            label="Tax Name (Arabic)"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tax_type}
                onChange={(e) => setFormData({ ...formData, tax_type: e.target.value as TaxType })}
                className="input w-full"
              >
                <option value="vat">VAT</option>
                <option value="withholding">Withholding Tax</option>
                <option value="sales">Sales Tax</option>
                <option value="zatca">ZATCA Tax</option>
                <option value="custom">Custom Tax</option>
              </select>
            </div>
            <Input
              label="Rate (%)"
              required
              type="number"
              step="0.01"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
              error={formErrors.rate}
              helperText="0 to 100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tax Account <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: Number(e.target.value) })}
              className="input w-full"
            >
              <option value="">Select account</option>
              {accounts
                .filter((acc) => !acc.is_header)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
            </select>
            {formErrors.account_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.account_id}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The account where tax amounts will be posted
            </p>
          </div>
          <Input
            label="Description"
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
              Active
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {editingTax ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTaxToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Tax"
        message={`Are you sure you want to delete "${taxToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.Taxes.View, TaxesPage);
