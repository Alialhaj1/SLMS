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
import apiClient from '../../lib/apiClient';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Customer {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  tax_number?: string;
  country?: string;
  city?: string;
  address?: string;
  credit_limit?: number;
  payment_terms?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  email: string;
  phone: string;
  mobile: string;
  tax_number: string;
  country: string;
  city: string;
  address: string;
  credit_limit: number;
  payment_terms: number;
  is_active: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  name_ar: '',
  email: '',
  phone: '',
  mobile: '',
  tax_number: '',
  country: '',
  city: '',
  address: '',
  credit_limit: 0,
  payment_terms: 30,
  is_active: true,
};

function CustomersPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const result = await apiClient.get<{ success: boolean; data: Customer[]; total: number }>(
        '/api/master/customers'
      );
      setCustomers(result.data || []);
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast(error?.message || 'Failed to load customers', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Customer code is required';
    if (!formData.name.trim()) errors.name = 'Customer name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (formData.credit_limit < 0) errors.credit_limit = 'Credit limit must be positive';
    if (formData.payment_terms < 0) errors.payment_terms = 'Payment terms must be positive';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        code: customer.code,
        name: customer.name,
        name_ar: customer.name_ar || '',
        email: customer.email || '',
        phone: customer.phone || '',
        mobile: customer.mobile || '',
        tax_number: customer.tax_number || '',
        country: customer.country || '',
        city: customer.city || '',
        address: customer.address || '',
        credit_limit: customer.credit_limit || 0,
        payment_terms: customer.payment_terms || 30,
        is_active: customer.is_active,
      });
    } else {
      setEditingCustomer(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCustomer(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      if (editingCustomer) {
        await apiClient.put(`/api/master/customers/${editingCustomer.id}`, formData);
      } else {
        await apiClient.post('/api/master/customers', formData);
      }

      showToast(editingCustomer ? 'Customer updated successfully' : 'Customer created successfully', 'success');
      handleCloseModal();
      fetchCustomers();
    } catch (error) {
      showToast(error?.message || 'Failed to save customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/master/customers/${customerToDelete.id}`);
      showToast('Customer deleted successfully', 'success');
      fetchCustomers();
    } catch (error) {
      showToast(error?.message || 'Failed to delete customer', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    }
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = !showActiveOnly || customer.is_active;
    return matchesSearch && matchesActive;
  });

  if (!hasPermission('master:customers:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <UsersIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view customers.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Customers Management - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Customers</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage customer information and credit limits
            </p>
          </div>
          {hasPermission('master:customers:create') && (
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Customer
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
                  placeholder="Search by name, code, email, or phone..."
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
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No customers found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating a new customer'}
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
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Credit Limit
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
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {customer.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {customer.name}
                          </div>
                          {customer.name_ar && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{customer.name_ar}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{customer.email || '—'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{customer.phone || customer.mobile || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{customer.city || '—'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{customer.country || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {customer.credit_limit ? customer.credit_limit.toLocaleString() : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            customer.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission('master:customers:edit') && (
                            <button
                              onClick={() => handleOpenModal(customer)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                          )}
                          {hasPermission('master:customers:delete') && (
                            <button
                              onClick={() => handleDeleteClick(customer)}
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
        title={editingCustomer ? 'Edit Customer' : 'Create Customer'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Customer Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={formErrors.code}
              disabled={!!editingCustomer}
            />
            <Input
              label="Tax Number"
              value={formData.tax_number}
              onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
            />
            <Input
              label="Customer Name (Arabic)"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Mobile"
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Credit Limit"
              type="number"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
              error={formErrors.credit_limit}
              helperText="Maximum credit allowed"
            />
            <Input
              label="Payment Terms (Days)"
              type="number"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: Number(e.target.value) })}
              error={formErrors.payment_terms}
              helperText="Default payment terms in days"
            />
          </div>
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
            {editingCustomer ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer"
        message={`Are you sure you want to delete "${customerToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.Customers.View, CustomersPage);
