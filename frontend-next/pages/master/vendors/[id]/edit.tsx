/**
 * Vendor Edit Page - تعديل المورد
 * Professional vendor editing form with all fields and validation
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layout/MainLayout';
import { withAnyPermission } from '../../../../utils/withPermission';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Modal from '../../../../components/ui/Modal';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import ImageUpload from '../../../../components/ui/ImageUpload';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useTranslation } from '../../../../hooks/useTranslation';
import { useLocale } from '../../../../contexts/LocaleContext';
import { useToast } from '../../../../contexts/ToastContext';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  BanknotesIcon,
  CreditCardIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingLibraryIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

// ========================================
// INTERFACES
// ========================================

interface VendorFormData {
  code: string;
  name: string;
  name_ar: string;
  email: string;
  phone: string;
  mobile: string;
  tax_number: string;
  commercial_register: string;
  country_id: number | null;
  city_id: number | null;
  address: string;
  postal_code: string;
  credit_limit: number;
  opening_balance: number;
  type_id: number | null;
  category_id: number | null;
  classification_id: number | null;
  status_id: number | null;
  currency_id: number | null;
  default_payment_term_id: number | null;
  is_local: boolean;
  is_active: boolean;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  contact_position: string;
  website: string;
  notes: string;
  // Bank info (legacy single)
  bank_id: number | null;
  bank_account_name: string;
  bank_account_number: string;
  bank_iban: string;
  bank_swift: string;
  // GL Account
  payable_account_id: number | null;
  // Logo & Cover
  vendor_logo_url: string;
  vendor_cover_url: string;
  // Performance
  lead_time_days: number;
  min_order_amount: number;
}

interface ReferenceData {
  types: any[];
  categories: any[];
  classifications: any[];
  statuses: any[];
  currencies: any[];
  countries: any[];
  cities: any[];
  paymentTerms: any[];
  banks: any[];
  glAccounts: any[];
}

// ========================================
// MAIN COMPONENT
// ========================================

function VendorEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState('basic');

  const [referenceData, setReferenceData] = useState<ReferenceData>({
    types: [],
    categories: [],
    classifications: [],
    statuses: [],
    currencies: [],
    countries: [],
    cities: [],
    paymentTerms: [],
    banks: [],
    glAccounts: [],
  });

  const initialFormData: VendorFormData = {
    code: '',
    name: '',
    name_ar: '',
    email: '',
    phone: '',
    mobile: '',
    tax_number: '',
    commercial_register: '',
    country_id: null,
    city_id: null,
    address: '',
    postal_code: '',
    credit_limit: 0,
    opening_balance: 0,
    type_id: null,
    category_id: null,
    classification_id: null,
    status_id: null,
    currency_id: null,
    default_payment_term_id: null,
    is_local: true,
    is_active: true,
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    contact_position: '',
    website: '',
    notes: '',
    bank_id: null,
    bank_account_name: '',
    bank_account_number: '',
    bank_iban: '',
    bank_swift: '',
    payable_account_id: null,
    vendor_logo_url: '',
    vendor_cover_url: '',
    lead_time_days: 0,
    min_order_amount: 0,
  };

  const [formData, setFormData] = useState<VendorFormData>(initialFormData);
  const [originalData, setOriginalData] = useState<VendorFormData>(initialFormData);

  // Sections for navigation
  const sections = [
    { id: 'basic', label: isArabic ? 'البيانات الأساسية' : 'Basic Info', icon: BuildingOfficeIcon },
    { id: 'contact', label: isArabic ? 'معلومات الاتصال' : 'Contact', icon: PhoneIcon },
    { id: 'address', label: isArabic ? 'العنوان' : 'Address', icon: MapPinIcon },
    { id: 'financial', label: isArabic ? 'البيانات المالية' : 'Financial', icon: CreditCardIcon },
    { id: 'bank', label: isArabic ? 'البنك' : 'Bank', icon: BuildingLibraryIcon },
    { id: 'other', label: isArabic ? 'أخرى' : 'Other', icon: DocumentTextIcon },
  ];

  // Fetch vendor data
  const fetchVendor = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const vendor = data.data;
        const vendorFormData: VendorFormData = {
          code: vendor.code || '',
          name: vendor.name || '',
          name_ar: vendor.name_ar || '',
          email: vendor.email || '',
          phone: vendor.phone || '',
          mobile: vendor.mobile || '',
          tax_number: vendor.tax_number || '',
          commercial_register: vendor.commercial_register || '',
          country_id: vendor.country_id || null,
          city_id: vendor.city_id || null,
          address: vendor.address || '',
          postal_code: vendor.postal_code || '',
          credit_limit: vendor.credit_limit || 0,
          opening_balance: vendor.opening_balance || 0,
          type_id: vendor.type_id || null,
          category_id: vendor.category_id || null,
          classification_id: vendor.classification_id || null,
          status_id: vendor.status_id || null,
          currency_id: vendor.currency_id || null,
          default_payment_term_id: vendor.default_payment_term_id || vendor.payment_terms_id || null,
          is_local: vendor.is_local !== false,
          is_active: vendor.is_active !== false,
          contact_person: vendor.contact_person || vendor.primary_contact_name || '',
          contact_email: vendor.contact_email || '',
          contact_phone: vendor.contact_phone || '',
          contact_position: vendor.contact_position || '',
          website: vendor.website || '',
          notes: vendor.notes || '',
          bank_id: vendor.bank_id || null,
          bank_account_name: vendor.bank_account_name || '',
          bank_account_number: vendor.bank_account_number || '',
          bank_iban: vendor.bank_iban || '',
          bank_swift: vendor.bank_swift || '',
          payable_account_id: vendor.payable_account_id || null,
          vendor_logo_url: vendor.vendor_logo_url || '',
          vendor_cover_url: vendor.vendor_cover_url || '',
          lead_time_days: vendor.lead_time_days || 0,
          min_order_amount: vendor.min_order_amount || 0,
        };
        setFormData(vendorFormData);
        setOriginalData(vendorFormData);
      } else {
        showToast(isArabic ? 'فشل تحميل بيانات المورد' : 'Failed to load vendor', 'error');
        router.push('/master/vendors');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isArabic, router, showToast]);

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [typesRes, catRes, classRes, statusRes, currRes, countryRes, payTermRes, bankRes] = await Promise.all([
        fetch('http://localhost:4000/api/procurement/vendors/vendor-types', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/procurement/vendors/vendor-categories', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/procurement/vendors/classifications', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/procurement/vendors/vendor-statuses', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/master/currencies', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/master/countries', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/procurement/vendors/payment-terms', { headers }).catch(() => null),
        fetch('http://localhost:4000/api/master/banks', { headers }).catch(() => null),
      ]);

      setReferenceData({
        ...referenceData,
        types: typesRes?.ok ? (await typesRes.json()).data || [] : [],
        categories: catRes?.ok ? (await catRes.json()).data || [] : [],
        classifications: classRes?.ok ? (await classRes.json()).data || [] : [],
        statuses: statusRes?.ok ? (await statusRes.json()).data || [] : [],
        currencies: currRes?.ok ? (await currRes.json()).data || [] : [],
        countries: countryRes?.ok ? (await countryRes.json()).data || [] : [],
        paymentTerms: payTermRes?.ok ? (await payTermRes.json()).data || [] : [],
        banks: bankRes?.ok ? (await bankRes.json()).data || [] : [],
      });
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  }, []);

  useEffect(() => {
    fetchVendor();
    fetchReferenceData();
  }, [fetchVendor, fetchReferenceData]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [formData, originalData]);

  // Helper function to get full image URL
  const getImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) return `http://localhost:4000${url}`;
    return url;
  };

  // Form update handler
  const updateField = (field: keyof VendorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) newErrors.code = isArabic ? 'كود المورد مطلوب' : 'Vendor code is required';
    if (!formData.name.trim()) newErrors.name = isArabic ? 'اسم المورد مطلوب' : 'Vendor name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = isArabic ? 'صيغة البريد غير صحيحة' : 'Invalid email format';
    }
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = isArabic ? 'صيغة البريد غير صحيحة' : 'Invalid email format';
    }
    if (formData.credit_limit < 0) newErrors.credit_limit = isArabic ? 'حد الائتمان يجب أن يكون موجب' : 'Credit limit must be positive';

    setErrors(newErrors);
    
    // Navigate to section with first error
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      if (['code', 'name', 'name_ar', 'type_id', 'category_id', 'classification_id', 'status_id'].includes(firstErrorField)) {
        setActiveSection('basic');
      } else if (['email', 'phone', 'mobile', 'contact_person', 'contact_email', 'contact_phone'].includes(firstErrorField)) {
        setActiveSection('contact');
      } else if (['country_id', 'city_id', 'address', 'postal_code'].includes(firstErrorField)) {
        setActiveSection('address');
      } else if (['currency_id', 'credit_limit', 'opening_balance', 'default_payment_term_id'].includes(firstErrorField)) {
        setActiveSection('financial');
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  // Save handler
  const handleSave = async () => {
    if (!validateForm()) {
      showToast(isArabic ? 'يرجى تصحيح الأخطاء' : 'Please fix the errors', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(isArabic ? 'تم الحفظ بنجاح' : 'Saved successfully', 'success');
        setOriginalData(formData);
        setHasChanges(false);
        router.push(`/master/vendors/${id}`);
      } else {
        const data = await res.json();
        showToast(data.error?.message || (isArabic ? 'فشل الحفظ' : 'Failed to save'), 'error');
      }
    } catch (error) {
      showToast(isArabic ? 'حدث خطأ' : 'An error occurred', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Cancel handler with unsaved changes check
  const handleCancel = () => {
    if (hasChanges) {
      setPendingNavigation(`/master/vendors/${id}`);
      setShowUnsavedChangesDialog(true);
    } else {
      router.push(`/master/vendors/${id}`);
    }
  };

  // Render select component
  const renderSelect = (
    label: string,
    field: keyof VendorFormData,
    options: any[],
    required = false
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={String(formData[field] ?? '')}
        onChange={(e) => updateField(field, e.target.value ? Number(e.target.value) : null)}
        className={`input w-full ${errors[field] ? 'border-red-500' : ''}`}
      >
        <option value="">{isArabic ? 'اختر...' : 'Select...'}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {isArabic && opt.name_ar ? opt.name_ar : opt.name}
          </option>
        ))}
      </select>
      {errors[field] && <p className="text-sm text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{formData.name} - {isArabic ? 'تعديل المورد' : 'Edit Vendor'} | SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isArabic ? 'تعديل المورد' : 'Edit Vendor'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {formData.code} - {isArabic && formData.name_ar ? formData.name_ar : formData.name}
              </p>
            </div>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleCancel}>
              <XMarkIcon className="w-4 h-4 mr-1" />
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!hasChanges}>
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Unsaved changes indicator */}
        {hasChanges && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">
              {isArabic ? 'يوجد تغييرات غير محفوظة' : 'You have unsaved changes'}
            </span>
          </div>
        )}

        {/* Section Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Form Sections */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          
          {/* Basic Info */}
          {activeSection === 'basic' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BuildingOfficeIcon className="w-5 h-5 text-blue-500" />
                {isArabic ? 'البيانات الأساسية' : 'Basic Information'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label={isArabic ? 'كود المورد' : 'Vendor Code'}
                  value={formData.code}
                  onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                  required
                  disabled
                  error={errors.code}
                />
                <Input
                  label={isArabic ? 'الاسم (إنجليزي)' : 'Name (English)'}
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                  error={errors.name}
                />
                <Input
                  label={isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'}
                  value={formData.name_ar}
                  onChange={(e) => updateField('name_ar', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderSelect(isArabic ? 'النوع' : 'Type', 'type_id', referenceData.types)}
                {renderSelect(isArabic ? 'الفئة' : 'Category', 'category_id', referenceData.categories)}
                {renderSelect(isArabic ? 'التصنيف' : 'Classification', 'classification_id', referenceData.classifications)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderSelect(isArabic ? 'الحالة' : 'Status', 'status_id', referenceData.statuses, true)}
                <Input
                  label={isArabic ? 'الرقم الضريبي' : 'Tax Number'}
                  value={formData.tax_number}
                  onChange={(e) => updateField('tax_number', e.target.value)}
                />
                <Input
                  label={isArabic ? 'السجل التجاري' : 'Commercial Register'}
                  value={formData.commercial_register}
                  onChange={(e) => updateField('commercial_register', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_local}
                      onChange={(e) => updateField('is_local', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {isArabic ? 'مورد محلي' : 'Local Vendor'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => updateField('is_active', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {isArabic ? 'نشط' : 'Active'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          {activeSection === 'contact' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <PhoneIcon className="w-5 h-5 text-green-500" />
                {isArabic ? 'معلومات الاتصال' : 'Contact Information'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label={isArabic ? 'الهاتف' : 'Phone'}
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
                <Input
                  label={isArabic ? 'الجوال' : 'Mobile'}
                  value={formData.mobile}
                  onChange={(e) => updateField('mobile', e.target.value)}
                />
                <Input
                  label={isArabic ? 'البريد الإلكتروني' : 'Email'}
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  error={errors.email}
                />
              </div>

              <Input
                label={isArabic ? 'الموقع الإلكتروني' : 'Website'}
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://..."
              />

              <hr className="border-gray-200 dark:border-gray-700" />

              <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                {isArabic ? 'جهة الاتصال الرئيسية' : 'Primary Contact Person'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={isArabic ? 'اسم جهة الاتصال' : 'Contact Name'}
                  value={formData.contact_person}
                  onChange={(e) => updateField('contact_person', e.target.value)}
                />
                <Input
                  label={isArabic ? 'المنصب' : 'Position'}
                  value={formData.contact_position}
                  onChange={(e) => updateField('contact_position', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={isArabic ? 'بريد جهة الاتصال' : 'Contact Email'}
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                  error={errors.contact_email}
                />
                <Input
                  label={isArabic ? 'هاتف جهة الاتصال' : 'Contact Phone'}
                  value={formData.contact_phone}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Address */}
          {activeSection === 'address' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-red-500" />
                {isArabic ? 'العنوان' : 'Address'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderSelect(isArabic ? 'الدولة' : 'Country', 'country_id', referenceData.countries)}
                {renderSelect(isArabic ? 'المدينة' : 'City', 'city_id', referenceData.cities)}
              </div>

              <Input
                label={isArabic ? 'العنوان' : 'Address'}
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
              />

              <Input
                label={isArabic ? 'الرمز البريدي' : 'Postal Code'}
                value={formData.postal_code}
                onChange={(e) => updateField('postal_code', e.target.value)}
              />
            </div>
          )}

          {/* Financial */}
          {activeSection === 'financial' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5 text-blue-500" />
                {isArabic ? 'البيانات المالية' : 'Financial Information'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderSelect(isArabic ? 'العملة' : 'Currency', 'currency_id', referenceData.currencies, true)}
                <Input
                  label={isArabic ? 'حد الائتمان' : 'Credit Limit'}
                  type="number"
                  value={formData.credit_limit}
                  onChange={(e) => updateField('credit_limit', Number(e.target.value))}
                  error={errors.credit_limit}
                />
                <Input
                  label={isArabic ? 'الرصيد الافتتاحي' : 'Opening Balance'}
                  type="number"
                  value={formData.opening_balance}
                  onChange={(e) => updateField('opening_balance', Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderSelect(isArabic ? 'شروط الدفع الافتراضية' : 'Default Payment Terms', 'default_payment_term_id', referenceData.paymentTerms)}
              </div>
            </div>
          )}

          {/* Bank */}
          {activeSection === 'bank' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BuildingLibraryIcon className="w-5 h-5 text-purple-500" />
                {isArabic ? 'الحساب البنكي' : 'Bank Account'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderSelect(isArabic ? 'البنك' : 'Bank', 'bank_id', referenceData.banks)}
                <Input
                  label={isArabic ? 'اسم الحساب' : 'Account Name'}
                  value={formData.bank_account_name}
                  onChange={(e) => updateField('bank_account_name', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={isArabic ? 'رقم الحساب' : 'Account Number'}
                  value={formData.bank_account_number}
                  onChange={(e) => updateField('bank_account_number', e.target.value)}
                />
                <Input
                  label="IBAN"
                  value={formData.bank_iban}
                  onChange={(e) => updateField('bank_iban', e.target.value)}
                />
              </div>

              <Input
                label="SWIFT Code"
                value={formData.bank_swift}
                onChange={(e) => updateField('bank_swift', e.target.value)}
              />
            </div>
          )}

          {/* Other */}
          {activeSection === 'other' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-gray-500" />
                {isArabic ? 'معلومات إضافية' : 'Additional Information'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={isArabic ? 'مدة التوريد (أيام)' : 'Lead Time (Days)'}
                  type="number"
                  value={formData.lead_time_days}
                  onChange={(e) => updateField('lead_time_days', Number(e.target.value))}
                />
                <Input
                  label={isArabic ? 'الحد الأدنى للطلب' : 'Min Order Amount'}
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => updateField('min_order_amount', Number(e.target.value))}
                />
              </div>

              {/* Vendor Images Section */}
              <div className="space-y-6">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <PhotoIcon className="w-5 h-5" />
                  {isArabic ? 'صور المورد' : 'Vendor Images'}
                </h4>

                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {isArabic ? 'صورة الغلاف' : 'Cover Image'}
                  </label>
                  <ImageUpload
                    type="cover"
                    currentImage={formData.vendor_cover_url ? getImageUrl(formData.vendor_cover_url) : null}
                    onImageSelect={async (base64) => {
                      const token = localStorage.getItem('accessToken');
                      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/cover/upload`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ image: base64 }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        updateField('vendor_cover_url', data.data.vendor_cover_url);
                        showToast(isArabic ? 'تم رفع صورة الغلاف بنجاح' : 'Cover image uploaded successfully', 'success');
                      } else {
                        throw new Error(isArabic ? 'فشل رفع صورة الغلاف' : 'Failed to upload cover image');
                      }
                    }}
                    onImageRemove={async () => {
                      const token = localStorage.getItem('accessToken');
                      const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/cover`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (res.ok) {
                        updateField('vendor_cover_url', '');
                        showToast(isArabic ? 'تم حذف صورة الغلاف' : 'Cover image deleted', 'success');
                      } else {
                        throw new Error(isArabic ? 'فشل حذف صورة الغلاف' : 'Failed to delete cover image');
                      }
                    }}
                    canEdit={hasPermission('vendors:cover:upload')}
                  />
                </div>

                {/* Logo Image */}
                <div className="flex items-start gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {isArabic ? 'شعار المورد' : 'Vendor Logo'}
                    </label>
                    <ImageUpload
                      type="profile"
                      currentImage={formData.vendor_logo_url ? getImageUrl(formData.vendor_logo_url) : null}
                      onImageSelect={async (base64) => {
                        const token = localStorage.getItem('accessToken');
                        const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/logo/upload`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ image: base64 }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          updateField('vendor_logo_url', data.data.vendor_logo_url);
                          showToast(isArabic ? 'تم رفع الشعار بنجاح' : 'Logo uploaded successfully', 'success');
                        } else {
                          throw new Error(isArabic ? 'فشل رفع الشعار' : 'Failed to upload logo');
                        }
                      }}
                      onImageRemove={async () => {
                        const token = localStorage.getItem('accessToken');
                        const res = await fetch(`http://localhost:4000/api/procurement/vendors/${id}/logo`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) {
                          updateField('vendor_logo_url', '');
                          showToast(isArabic ? 'تم حذف الشعار' : 'Logo deleted', 'success');
                        } else {
                          throw new Error(isArabic ? 'فشل حذف الشعار' : 'Failed to delete logo');
                        }
                      }}
                      canEdit={hasPermission('vendors:logo:upload')}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      label={isArabic ? 'أو أدخل رابط الشعار' : 'Or enter Logo URL'}
                      value={formData.vendor_logo_url}
                      onChange={(e) => updateField('vendor_logo_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={4}
                  className="input w-full"
                  placeholder={isArabic ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Save Bar */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-4 -mx-4 px-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={handleCancel}>
            {isArabic ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!hasChanges}>
            {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <ConfirmDialog
        isOpen={showUnsavedChangesDialog}
        onClose={() => setShowUnsavedChangesDialog(false)}
        onConfirm={() => {
          setShowUnsavedChangesDialog(false);
          if (pendingNavigation) {
            router.push(pendingNavigation);
          }
        }}
        title={isArabic ? 'تغييرات غير محفوظة' : 'Unsaved Changes'}
        message={isArabic ? 'لديك تغييرات غير محفوظة. هل تريد المغادرة بدون حفظ؟' : 'You have unsaved changes. Are you sure you want to leave without saving?'}
        confirmText={isArabic ? 'مغادرة' : 'Leave'}
        variant="danger"
      />
    </MainLayout>
  );
}

export default withAnyPermission(['vendors:edit', 'vendors:manage'], VendorEditPage);
