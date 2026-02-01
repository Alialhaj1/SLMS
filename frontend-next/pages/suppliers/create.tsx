import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../hooks/useTranslation.enhanced';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

const CreateSupplier: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    country: '',
    postal_code: '',
    tax_number: '',
    website: '',
    payment_terms: '30',
    currency: 'USD',
    notes: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = t('validation.required', 'Company name is required');
    }

    if (!formData.contact_person.trim()) {
      newErrors.contact_person = t('validation.required', 'Contact person is required');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.invalidEmail', 'Invalid email format');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('validation.required', 'Phone number is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      const response = await fetch(`${apiUrl}/api/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          payment_terms: parseInt(formData.payment_terms),
        }),
      });

      if (response.ok) {
        showToast(t('suppliers.created', 'Supplier created successfully'), 'success');
        router.push('/suppliers');
      } else {
        throw new Error('Failed to create supplier');
      }
    } catch (error) {
      showToast(t('common.error', 'Failed to create supplier'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const paymentTermsOptions = [
    { value: '0', label: 'Immediate' },
    { value: '15', label: 'Net 15' },
    { value: '30', label: 'Net 30' },
    { value: '45', label: 'Net 45' },
    { value: '60', label: 'Net 60' },
    { value: '90', label: 'Net 90' },
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP'];

  return (
    <MainLayout>
      <Head>
        <title>Create Supplier - SLMS</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('common.back', 'Back')}
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('suppliers.create', 'Create New Supplier')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('suppliers.createSubtitle', 'Add a new supplier to your vendor list')}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />
                  {t('suppliers.companyInfo', 'Company Information')}
                </h2>

                <div className="space-y-4">
                  <Input
                    label={t('suppliers.companyName', 'Company Name')}
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    error={errors.company_name}
                    placeholder="Enter company name"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label={t('suppliers.taxNumber', 'Tax Number / VAT ID')}
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      placeholder="Optional"
                    />

                    <Input
                      label={t('suppliers.website', 'Website')}
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-green-500" />
                  {t('suppliers.contactInfo', 'Contact Information')}
                </h2>

                <div className="space-y-4">
                  <Input
                    label={t('suppliers.contactPerson', 'Contact Person')}
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    error={errors.contact_person}
                    placeholder="Full name"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label={t('suppliers.email', 'Email')}
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      error={errors.email}
                      placeholder="email@example.com"
                    />

                    <Input
                      label={t('suppliers.phone', 'Phone')}
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      error={errors.phone}
                      placeholder="+1 234 567 890"
                      required
                    />
                  </div>

                  <Input
                    label={t('suppliers.mobile', 'Mobile')}
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </Card>

            {/* Address */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5 text-red-500" />
                  {t('suppliers.address', 'Address')}
                </h2>

                <div className="space-y-4">
                  <Input
                    label={t('suppliers.streetAddress', 'Street Address')}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label={t('suppliers.city', 'City')}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />

                    <Input
                      label={t('suppliers.country', 'Country')}
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Country"
                    />

                    <Input
                      label={t('suppliers.postalCode', 'Postal Code')}
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      placeholder="Postal code"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment & Notes */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-purple-500" />
                  {t('suppliers.paymentNotes', 'Payment & Notes')}
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('suppliers.paymentTerms', 'Payment Terms')}
                      </label>
                      <select
                        value={formData.payment_terms}
                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {paymentTermsOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('suppliers.currency', 'Preferred Currency')}
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {currencies.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('suppliers.notes', 'Notes')}
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes about this supplier..."
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t('common.summary', 'Summary')}
                </h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('suppliers.company', 'Company')}:</span>
                    <span className="text-gray-900 dark:text-white font-medium truncate ml-2">
                      {formData.company_name || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('suppliers.contact', 'Contact')}:</span>
                    <span className="text-gray-900 dark:text-white">{formData.contact_person || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('suppliers.location', 'Location')}:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formData.city && formData.country ? `${formData.city}, ${formData.country}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('suppliers.terms', 'Terms')}:</span>
                    <span className="text-gray-900 dark:text-white">
                      {paymentTermsOptions.find(o => o.value === formData.payment_terms)?.label || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                    {t('suppliers.activeSupplier', 'Active Supplier')}
                  </label>
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    loading={loading}
                  >
                    {t('suppliers.createSupplier', 'Create Supplier')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => router.push('/suppliers')}
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </MainLayout>
  );
};

export default withPermission(MenuPermissions.Suppliers.Create, CreateSupplier);
