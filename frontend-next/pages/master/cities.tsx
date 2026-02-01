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
  BuildingLibraryIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Country {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface City {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  country_id: number;
  country_code?: string;
  country_name?: string;
  is_port: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  country_id: number | '';
  is_port: boolean;
  is_active: boolean;
}

const initialFormData: FormData = {
  code: '',
  name: '',
  name_ar: '',
  country_id: '',
  is_port: false,
  is_active: true,
};

function CitiesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [cities, setCities] = useState<City[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<City | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCities();
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const res = await fetch('http://localhost:4000/api/master/countries', {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });
      if (res.ok) {
        const result = await res.json();
        setCountries(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load countries:', error);
    }
  };

  const fetchCities = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const res = await fetch('http://localhost:4000/api/master/cities', {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });
      if (res.ok) {
        const result = await res.json();
        setCities(result.data || []);
      } else if (res.status === 401 || res.status === 403) {
        showToast('Access denied', 'error');
      } else {
        showToast('Failed to load cities', 'error');
      }
    } catch (error) {
      showToast('Failed to load cities', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'City code is required';
    if (!formData.name.trim()) errors.name = 'City name is required';
    if (!formData.country_id) errors.country_id = 'Country is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (city?: City) => {
    if (city) {
      setEditingCity(city);
      setFormData({
        code: city.code,
        name: city.name,
        name_ar: city.name_ar || '',
        country_id: city.country_id,
        is_port: city.is_port,
        is_active: city.is_active,
      });
    } else {
      setEditingCity(null);
      setFormData(initialFormData);
    }
    setFormErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCity(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingCity
        ? `http://localhost:4000/api/master/cities/${editingCity.id}`
        : 'http://localhost:4000/api/master/cities';
      const companyId = companyStore.getActiveCompanyId();
      const res = await fetch(url, {
        method: editingCity ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showToast(editingCity ? 'City updated successfully' : 'City created successfully', 'success');
        handleCloseModal();
        fetchCities();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to save city', 'error');
      }
    } catch (error) {
      showToast('Failed to save city', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (city: City) => {
    setCityToDelete(city);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cityToDelete) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId();
      const res = await fetch(`http://localhost:4000/api/master/cities/${cityToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(companyId ? { 'X-Company-Id': String(companyId) } : {}),
        },
      });
      if (res.ok) {
        showToast('City deleted successfully', 'success');
        fetchCities();
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to delete city', 'error');
      }
    } catch (error) {
      showToast('Failed to delete city', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setCityToDelete(null);
    }
  };

  const filteredCities = cities.filter((city) => {
    const matchesSearch =
      city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      city.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (city.country_name && city.country_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesActive = !showActiveOnly || city.is_active;
    return matchesSearch && matchesActive;
  });

  if (!hasPermission('master:cities:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <BuildingLibraryIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You don't have permission to view cities.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Cities Management - SLMS</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Cities</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage cities and ports
            </p>
          </div>
          {hasPermission('master:cities:create') && (
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Add City
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
                  placeholder="Search by city name, code or country..."
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
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading cities...</p>
            </div>
          ) : filteredCities.length === 0 ? (
            <div className="text-center py-12">
              <BuildingLibraryIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No cities found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating a new city'}
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
                      City Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
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
                  {filteredCities.map((city) => (
                    <tr key={city.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {city.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {city.name}
                          </div>
                          {city.name_ar && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{city.name_ar}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {city.country_name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {city.is_port ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            Port City
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">City</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            city.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {city.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission('master:cities:edit') && (
                            <button
                              onClick={() => handleOpenModal(city)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Edit"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                          )}
                          {hasPermission('master:cities:delete') && (
                            <button
                              onClick={() => handleDeleteClick(city)}
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
        title={editingCity ? 'Edit City' : 'Create City'}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={formErrors.code}
              disabled={!!editingCity}
            />
            <Input
              label="City Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
            />
          </div>
          <Input
            label="City Name (Arabic)"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.country_id}
              onChange={(e) => setFormData({ ...formData, country_id: Number(e.target.value) })}
              className="input w-full"
            >
              <option value="">Select a country</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
            {formErrors.country_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.country_id}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_port"
              checked={formData.is_port}
              onChange={(e) => setFormData({ ...formData, is_port: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="is_port" className="text-sm text-gray-700 dark:text-gray-300">
              Port City
            </label>
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
            {editingCity ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCityToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete City"
        message={`Are you sure you want to delete "${cityToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.MasterData.Cities.View, CitiesPage);
