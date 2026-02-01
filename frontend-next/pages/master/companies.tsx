import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';

interface Country {
  id: number;
  name: string;
  code: string;
}

interface City {
  id: number;
  name: string;
  code: string;
  country_id: number;
}

interface Company {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  industry?: string;
  tax_id?: string;
  registration_number?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  country_id?: number;
  city_id?: number;
  country_name?: string;
  city_name?: string;
  logo?: string;
  status: 'active' | 'inactive';
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

interface CompanyFormData {
  name: string;
  name_ar?: string;
  code: string;
  industry?: string;
  tax_id?: string;
  registration_number?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  country_id?: number;
  city_id?: number;
  status: 'active' | 'inactive';
}

export default function CompaniesPage() {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { locale } = useLocale();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    code: '',
    status: 'active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch companies
  useEffect(() => {
    fetchCompanies();
    fetchCountries();
    fetchCities();
  }, []);

  // Filter cities when country changes
  useEffect(() => {
    if (formData.country_id) {
      setFilteredCities(cities.filter(c => c.country_id === formData.country_id));
    } else {
      setFilteredCities([]);
    }
  }, [formData.country_id, cities]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/master/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.data || []);
      } else if (response.status === 401) {
        showToast(t('messages.unauthorized'), 'error');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      showToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/master/countries?is_active=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCountries(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/master/cities?is_active=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCities(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = t('master.companies.validation.required');
    }
    if (!formData.code?.trim()) {
      newErrors.code = t('master.companies.validation.required');
    } else if (formData.code.length < 3 || formData.code.length > 20) {
      newErrors.code = t('master.companies.validation.codeLength');
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code = t('master.companies.validation.codeFormat');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('master.companies.validation.invalidEmail');
    }

    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website);
      } catch {
        newErrors.website = t('master.companies.validation.invalidUrl');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:4000/api/master/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          is_active: formData.status === 'active',
        }),
      });

      if (response.ok) {
        showToast(t('master.companies.messages.created'), 'success');
        setIsCreateModalOpen(false);
        resetForm();
        fetchCompanies();
      } else if (response.status === 403) {
        showToast(t('messages.permissionDenied'), 'error');
      } else if (response.status === 409) {
        showToast(t('master.companies.validation.duplicateCode'), 'error');
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error creating company:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  const handleEdit = async () => {
    if (!editingId || !validateForm()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/master/companies/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          is_active: formData.status === 'active',
        }),
      });

      if (response.ok) {
        showToast(t('master.companies.messages.updated'), 'success');
        setIsCreateModalOpen(false);
        setEditingId(null);
        resetForm();
        fetchCompanies();
      } else if (response.status === 403) {
        showToast(t('messages.permissionDenied'), 'error');
      } else if (response.status === 409) {
        showToast(t('master.companies.validation.duplicateCode'), 'error');
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error updating company:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/master/companies/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setCompanies(companies.filter((c) => c.id !== deleteId));
        showToast(t('master.companies.messages.deleted'), 'success');
        setDeleteId(null);
      } else if (response.status === 403) {
        showToast(t('messages.permissionDenied'), 'error');
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  const handleEditClick = (company: Company) => {
    setFormData({
      name: company.name,
      name_ar: company.name_ar,
      code: company.code,
      industry: company.industry,
      tax_id: company.tax_id,
      registration_number: company.registration_number,
      website: company.website,
      email: company.email,
      phone: company.phone,
      address: company.address,
      country_id: company.country_id,
      city_id: company.city_id,
      status: company.is_active ? 'active' : 'inactive',
    });
    setEditingId(company.id);
    setCurrentLogo(company.logo || null);
    setErrors({});
  };

  const handleCountryChange = (countryId: number | undefined) => {
    setFormData({
      ...formData,
      country_id: countryId,
      city_id: undefined, // Reset city when country changes
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, companyId: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      showToast(t('master.companies.validation.invalidLogoType'), 'error');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast(t('master.companies.validation.logoTooLarge'), 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const token = localStorage.getItem('accessToken');
      const formDataUpload = new FormData();
      formDataUpload.append('logo', file);

      const response = await fetch(`http://localhost:4000/api/master/companies/${companyId}/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentLogo(data.logo);
        showToast(t('master.companies.messages.logoUploaded'), 'success');
        fetchCompanies();
      } else if (response.status === 403) {
        showToast(t('messages.permissionDenied'), 'error');
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      showToast(t('messages.error'), 'error');
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleLogoRemove = async (companyId: number) => {
    setUploadingLogo(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/master/companies/${companyId}/logo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setCurrentLogo(null);
        showToast(t('master.companies.messages.logoRemoved'), 'success');
        fetchCompanies();
      } else if (response.status === 403) {
        showToast(t('messages.permissionDenied'), 'error');
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error removing logo:', error);
      showToast(t('messages.error'), 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', name_ar: '', code: '', status: 'active' });
    setErrors({});
    setCurrentLogo(null);
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: Company) => React.ReactNode;
  }> = [
    {
      key: 'logo',
      label: t('master.companies.columns.logo'),
      render: (value: string | null, row: Company) => (
        value ? (
          <img
            src={`http://localhost:4000${value}`}
            alt={row.name}
            className="w-10 h-10 object-contain rounded"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )
      ),
    },
    {
      key: 'name',
      label: t('master.companies.columns.name'),
      sortable: true,
    },
    {
      key: 'code',
      label: t('master.companies.columns.code'),
      sortable: true,
    },
    {
      key: 'country_name',
      label: t('master.companies.columns.country'),
      sortable: true,
    },
    {
      key: 'city_name',
      label: t('master.companies.columns.city'),
      sortable: true,
    },
    {
      key: 'email',
      label: t('master.companies.columns.email'),
    },
    {
      key: 'is_active',
      label: t('master.companies.columns.status'),
      render: (value: boolean) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            value
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {value ? t('common.active') : t('common.inactive')}
        </span>
      ),
    },
  ];

  if (!hasPermission('companies:view')) {
    return (
      <MainLayout>
        <div className="p-6 text-center text-red-600">
          {t('messages.accessDenied')}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{t('master.companies.title')} - SLMS</title>
      </Head>

      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t('master.companies.title')}</h1>
          {hasPermission('companies:create') && (
            <Button
              onClick={() => {
                setEditingId(null);
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {t('master.companies.buttons.create')}
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">{t('common.loading')}</div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {t('common.noData')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700 border-b dark:border-slate-600">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => (
                    <tr
                      key={company.id}
                      className="border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="px-6 py-4 text-sm text-gray-900 dark:text-white"
                        >
                          {col.render
                            ? col.render((company as any)[col.key], company)
                            : (company as any)[col.key] || '-'}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        {hasPermission('companies:edit') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              handleEditClick(company);
                              setIsCreateModalOpen(true);
                            }}
                          >
                            {t('common.edit')}
                          </Button>
                        )}
                        {hasPermission('companies:delete') && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteId(company.id)}
                          >
                            {t('common.delete')}
                          </Button>
                        )}
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
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingId(null);
            resetForm();
          }}
          title={
            editingId
              ? t('master.companies.buttons.edit')
              : t('master.companies.buttons.create')
          }
          size="lg"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            {/* Row 1: Name EN & Name AR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {locale === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'} *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={errors.name}
                  className="w-full"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {locale === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
                </label>
                <Input
                  value={formData.name_ar || ''}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Row 2: Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('master.companies.fields.code')} *
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  error={errors.code}
                  placeholder="ABC-001"
                  className="w-full"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Row 2: Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('master.companies.fields.email')}
                </label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  error={errors.email}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('master.companies.fields.phone')}
                </label>
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Row 3: Tax ID & Registration Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('master.companies.fields.tax_id')}
                </label>
                <Input
                  value={formData.tax_id || ''}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('master.companies.fields.registrationNumber')}
                </label>
                <Input
                  value={formData.registration_number || ''}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Row 4: Country & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('master.companies.fields.country')}
                </label>
                <select
                  value={formData.country_id || ''}
                  onChange={(e) => handleCountryChange(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('common.select')}</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('master.companies.fields.city')}
                </label>
                <select
                  value={formData.city_id || ''}
                  onChange={(e) => setFormData({ ...formData, city_id: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!formData.country_id}
                >
                  <option value="">{t('common.select')}</option>
                  {filteredCities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {!formData.country_id && (
                  <p className="text-xs text-gray-500 mt-1">{t('master.companies.hints.selectCountryFirst')}</p>
                )}
              </div>
            </div>

            {/* Row 5: Address */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('master.companies.fields.address')}
              </label>
              <textarea
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Row 6: Website & Industry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('master.companies.fields.website')}
                </label>
                <Input
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  error={errors.website}
                  placeholder="https://example.com"
                  className="w-full"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('master.companies.fields.industry')}
                </label>
                <Input
                  value={formData.industry || ''}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Row 7: Status */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('master.companies.fields.status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">{t('common.active')}</option>
                <option value="inactive">{t('common.inactive')}</option>
              </select>
            </div>

            {/* Logo Upload (only show when editing) */}
            {editingId && (
              <div className="border-t dark:border-slate-600 pt-4">
                <label className="block text-sm font-medium mb-2">
                  {t('master.companies.fields.logo')}
                </label>
                <div className="flex items-center gap-4">
                  {/* Logo Preview */}
                  <div className="w-20 h-20 border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-slate-700">
                    {currentLogo ? (
                      <img
                        src={`http://localhost:4000${currentLogo}`}
                        alt="Company logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                  </div>

                  {/* Upload/Remove Buttons */}
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={(e) => handleLogoUpload(e, editingId)}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? t('common.uploading') : t('master.companies.buttons.uploadLogo')}
                    </Button>
                    {currentLogo && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleLogoRemove(editingId)}
                        disabled={uploadingLogo}
                      >
                        {t('master.companies.buttons.removeLogo')}
                      </Button>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('master.companies.hints.logoFormat')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-600">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingId(null);
                  resetForm();
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={editingId ? handleEdit : handleCreate}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {editingId ? t('common.update') : t('common.create')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title={t('common.confirmDelete')}
        message={t('master.companies.messages.deleteConfirm')}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        variant="danger"
      />
    </MainLayout>
  );
}
