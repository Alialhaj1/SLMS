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
import { useLocale } from '../../contexts/LocaleContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface Company {
  id: number;
  code: string;
  name: string;
}

interface Branch {
  id: number;
  company_id: number;
  company_name: string;
  code: string;
  name: string;
  name_ar?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  is_active: boolean;
  is_headquarters: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  company_id: number | '';
  code: string;
  name: string;
  name_ar: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  manager_name: string;
  is_active: boolean;
  is_headquarters: boolean;
}

const initialFormData: FormData = {
  company_id: '',
  code: '',
  name: '',
  name_ar: '',
  country: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  manager_name: '',
  is_active: true,
  is_headquarters: false,
};

function BranchesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale, dir } = useLocale();
  const { t } = useTranslation();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<number | ''>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCompanies();
    fetchBranches();
  }, []);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setCompanies(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/branches', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setBranches(result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast('Failed to load branches', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      showToast('Failed to load branches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.company_id) errors.company_id = 'Company is required';
    if (!formData.code.trim()) errors.code = 'Branch code is required';
    if (!formData.name.trim()) errors.name = 'Branch name is required';

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        company_id: branch.company_id,
        code: branch.code,
        name: branch.name,
        name_ar: branch.name_ar || '',
        country: branch.country || '',
        city: branch.city || '',
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
        manager_name: branch.manager_name || '',
        is_active: branch.is_active,
        is_headquarters: branch.is_headquarters,
      });
    } else {
      setEditingBranch(null);
      setFormData({ ...initialFormData, company_id: companyFilter || '' });
    }
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingBranch(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingBranch
        ? `http://localhost:4000/api/branches/${editingBranch.id}`
        : 'http://localhost:4000/api/branches';

      const res = await fetch(url, {
        method: editingBranch ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(editingBranch ? 'Branch updated successfully' : 'Branch created successfully', 'success');
        handleCloseModal();
        fetchBranches();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to save branch', 'error');
      }
    } catch (error) {
      console.error('Failed to save branch:', error);
      showToast('Failed to save branch', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (branch: Branch) => {
    setBranchToDelete(branch);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!branchToDelete) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/branches/${branchToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast('Branch deleted successfully', 'success');
        fetchBranches();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to delete branch', 'error');
      }
    } catch (error) {
      console.error('Failed to delete branch:', error);
      showToast('Failed to delete branch', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setBranchToDelete(null);
    }
  };

  // Filter branches
  const filteredBranches = branches.filter((branch) => {
    const matchesSearch =
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.company_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCompany = !companyFilter || branch.company_id === companyFilter;
    const matchesActive = !showActiveOnly || branch.is_active;

    return matchesSearch && matchesCompany && matchesActive;
  });

  // Permission check
  if (!hasPermission('branches:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <BuildingStorefrontIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view branches.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Branches Management - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Branches</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage company branches and locations
            </p>
          </div>
          {hasPermission('branches:create') && (
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Branch
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, code, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value ? Number(e.target.value) : '')}
                className="input w-full"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
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

        {/* Branches table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading branches...</p>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-12">
              <BuildingStorefrontIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No branches found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm || companyFilter ? 'Try adjusting your search criteria' : 'Get started by creating a new branch'}
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
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Manager
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
                  {filteredBranches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {branch.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {branch.name}
                            </div>
                            {branch.name_ar && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{branch.name_ar}</div>
                            )}
                          </div>
                          {branch.is_headquarters && (
                            <StarSolidIcon className="w-5 h-5 text-yellow-500" title="Headquarters" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{branch.company_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{branch.city || '—'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{branch.country || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{branch.email || '—'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{branch.phone || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{branch.manager_name || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            branch.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {branch.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission('branches:edit') && (
                            <button
                              onClick={() => handleOpenModal(branch)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                          )}
                          {hasPermission('branches:delete') && (
                            <button
                              onClick={() => handleDeleteClick(branch)}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingBranch ? 'Edit Branch' : 'Create Branch'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Company Selection */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Company <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.company_id}
              onChange={(e) => setFormData({ ...formData, company_id: Number(e.target.value) })}
              className="input"
              disabled={!!editingBranch}
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {formErrors.company_id && (
              <p className="text-sm text-red-600 dark:text-red-400">{formErrors.company_id}</p>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Branch Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              error={formErrors.code}
              disabled={!!editingBranch}
            />
            <Input
              label="Branch Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
            />
          </div>

          <Input
            label="Branch Name (Arabic)"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          />

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
            />
          </div>

          <Input
            label="Manager Name"
            value={formData.manager_name}
            onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
          />

          {/* Checkboxes */}
          <div className="space-y-2">
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_headquarters"
                checked={formData.is_headquarters}
                onChange={(e) => setFormData({ ...formData, is_headquarters: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="is_headquarters" className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <StarIcon className="w-4 h-4" />
                Headquarters
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {editingBranch ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setBranchToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Branch"
        message={`Are you sure you want to delete "${branchToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.System.Branches.View, BranchesPage);
