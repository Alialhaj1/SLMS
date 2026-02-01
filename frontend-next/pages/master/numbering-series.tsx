import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import MasterDataTable, { TableColumn } from '@/components/common/MasterDataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/contexts/LocaleContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useMasterData } from '@/hooks/useMasterData';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const MODULE_LABELS: Record<string, { en: string; ar: string }> = {
  // Core
  companies: { en: 'Companies', ar: 'الشركات' },
  branches: { en: 'Branches', ar: 'الفروع' },
  users: { en: 'Users', ar: 'المستخدمون' },
  roles: { en: 'Roles', ar: 'الأدوار' },
  permissions: { en: 'Permissions', ar: 'الصلاحيات' },

  accounts: { en: 'Accounts', ar: 'الحسابات' },
  account_balances: { en: 'Account Balances', ar: 'أرصدة الحسابات' },
  account_budgets: { en: 'Account Budgets', ar: 'موازنات الحسابات' },
  accounting_periods: { en: 'Accounting Periods', ar: 'الفترات المحاسبية' },
  fiscal_years: { en: 'Financial Years', ar: 'السنوات المالية' },
  general_ledger: { en: 'General Ledger', ar: 'الأستاذ العام' },
  journal_entries: { en: 'Journal Entries', ar: 'قيود اليومية' },
  period_summary: { en: 'Period Summary', ar: 'ملخص الفترة' },
  vouchers: { en: 'Vouchers', ar: 'السندات' },
  bank_accounts: { en: 'Bank Accounts', ar: 'الحسابات البنكية' },
  bank_balances: { en: 'Bank Balances', ar: 'أرصدة البنوك' },
  cheque_books: { en: 'Cheque Books', ar: 'دفاتر الشيكات' },

  // Logistics
  shipments: { en: 'Shipments', ar: 'الشحنات' },
  SHIPMENTS: { en: 'Shipments', ar: 'الشحنات' },
  expenses: { en: 'Expenses', ar: 'المصروفات' },
  warehouses: { en: 'Warehouses', ar: 'المستودعات' },
  carriers: { en: 'Carriers', ar: 'الناقلون' },
  shipment_events: { en: 'Shipment Events', ar: 'أحداث الشحنات' },
  shipment_milestones: { en: 'Shipment Milestones', ar: 'مراحل الشحنات' },
  shipment_stages: { en: 'Shipment Stages', ar: 'مراحل سير الشحنات' },
  shipment_lifecycle_statuses: { en: 'Shipment Statuses', ar: 'حالات الشحنات' },
  shipment_alert_rules: { en: 'Shipment Alert Rules', ar: 'قواعد تنبيهات الشحنات' },
  shipping_methods: { en: 'Shipping Methods', ar: 'طرق الشحن' },
  carrier_quotes: { en: 'Carrier Quotes', ar: 'عروض الناقلين' },
  carrier_evaluations: { en: 'Carrier Evaluations', ar: 'تقييمات الناقلين' },

  // Master data (common)
  customers: { en: 'Customers', ar: 'العملاء' },
  vendors: { en: 'Vendors', ar: 'الموردون' },
  suppliers: { en: 'Suppliers', ar: 'الموردون' },
  customer_groups: { en: 'Customer Groups', ar: 'مجموعات العملاء' },
  customer_balances: { en: 'Customer Balances', ar: 'أرصدة العملاء' },
  vendor_groups: { en: 'Vendor Groups', ar: 'مجموعات الموردين' },
  vendor_balances: { en: 'Vendor Balances', ar: 'أرصدة الموردين' },
  customer_classifications: { en: 'Customer Classifications', ar: 'تصنيفات العملاء' },
  user_companies: { en: 'User Companies', ar: 'شركات المستخدم' },
  items: { en: 'Items', ar: 'الأصناف' },
  item_categories: { en: 'Item Categories', ar: 'تصنيفات الأصناف' },
  item_groups: { en: 'Item Groups', ar: 'مجموعات الأصناف' },
  units: { en: 'Units', ar: 'الوحدات' },
  units_of_measure: { en: 'Units of Measure', ar: 'وحدات القياس' },
  unit_conversions: { en: 'Unit Conversions', ar: 'تحويلات الوحدات' },
  currencies: { en: 'Currencies', ar: 'العملات' },
  exchange_rates: { en: 'Exchange Rates', ar: 'أسعار الصرف' },
  countries: { en: 'Countries', ar: 'الدول' },
  cities: { en: 'Cities', ar: 'المدن' },
  ports: { en: 'Ports', ar: 'الموانئ' },
  customs_offices: { en: 'Customs Offices', ar: 'المكاتب الجمركية' },
  hs_codes: { en: 'HS Codes', ar: 'رموز HS' },
  customs_tariffs: { en: 'Customs Tariffs', ar: 'التعريفات الجمركية' },
  customs_exemptions: { en: 'Customs Exemptions', ar: 'إعفاءات جمركية' },
  payment_terms: { en: 'Payment Terms', ar: 'شروط الدفع' },
  payment_methods: { en: 'Payment Methods', ar: 'طرق الدفع' },
  regions: { en: 'Regions', ar: 'المناطق' },
  time_zones: { en: 'Time Zones', ar: 'المناطق الزمنية' },
  address_types: { en: 'Address Types', ar: 'أنواع العناوين' },
  contact_methods: { en: 'Contact Methods', ar: 'طرق التواصل' },

  cost_centers: { en: 'Cost Centers', ar: 'مراكز التكلفة' },
  profit_centers: { en: 'Profit Centers', ar: 'مراكز الربح' },
  projects: { en: 'Projects', ar: 'المشاريع' },
  employees: { en: 'Employees', ar: 'الموظفون' },
  brands: { en: 'Brands', ar: 'العلامات التجارية' },
  price_lists: { en: 'Price Lists', ar: 'قوائم الأسعار' },
  invoices: { en: 'Invoices', ar: 'الفواتير' },

  // System settings
  numbering_series: { en: 'Numbering Series', ar: 'سلاسل الترقيم' },
  number_series: { en: 'Number Series', ar: 'سلاسل الترقيم' },
  printed_templates: { en: 'Printed Templates', ar: 'القوالب المطبوعة' },
  digital_signatures: { en: 'Digital Signatures', ar: 'التوقيعات الرقمية' },
  system_languages: { en: 'System Languages', ar: 'لغات النظام' },
  system_policies: { en: 'System Policies', ar: 'سياسات النظام' },
  ui_themes: { en: 'UI Themes', ar: 'ثيمات الواجهة' },
  company_languages: { en: 'Company Languages', ar: 'لغات الشركة' },
  backup_settings: { en: 'Backup Settings', ar: 'إعدادات النسخ الاحتياطي' },
  backup_runs: { en: 'Backup Runs', ar: 'عمليات النسخ الاحتياطي' },
  help_requests: { en: 'Help Requests', ar: 'طلبات المساعدة' },
  reference_data: { en: 'Reference Data', ar: 'البيانات المرجعية' },
  audit_logs: { en: 'Audit Logs', ar: 'سجلات التدقيق' },

  // Inventory
  inventory_balances: { en: 'Inventory Balances', ar: 'أرصدة المخزون' },
  inventory_policies: { en: 'Inventory Policies', ar: 'سياسات المخزون' },
  reorder_rules: { en: 'Reorder Rules', ar: 'قواعد إعادة الطلب' },
  batch_numbers: { en: 'Batch Numbers', ar: 'أرقام الدُفعات' },
  serial_numbers: { en: 'Serial Numbers', ar: 'الأرقام التسلسلية' },
  batches: { en: 'Batches', ar: 'الدُفعات' },

  // Taxes
  taxes: { en: 'Taxes', ar: 'الضرائب' },
  tax_rates: { en: 'Tax Rates', ar: 'نسب الضرائب' },
  tax_codes: { en: 'Tax Codes', ar: 'أكواد الضرائب' },
  tax_types: { en: 'Tax Types', ar: 'أنواع الضرائب' },
};

const titleize = (value: string): string => {
  const cleaned = value
    .replace(/[_-]+/g, ' ')
    .trim();

  if (!cleaned) return value;

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getModuleLabels = (moduleKey: string): { en: string; ar: string } => {
  const fromMap = MODULE_LABELS[moduleKey];
  if (fromMap) return fromMap;
  const en = titleize(moduleKey);
  // If we don't know Arabic, show the key as-is (better than wrong translation)
  return { en, ar: moduleKey };
};

interface NumberingSeries {
  id: number;
  module: string;
  prefix?: string;
  suffix?: string;
  current_number: number;
  padding_length: number;
  format?: string;
  notes_en?: string;
  notes_ar?: string;
  is_active: boolean;
  company_id?: number;
  created_at: string;
  updated_at: string;
}

export default function NumberingSeriesPage() {
  const { showToast } = useToast();
  const { locale } = useLocale();
  const { hasPermission } = usePermissions();
  const { 
    data, 
    loading, 
    pagination, 
    fetchList, 
    fetchById, 
    create, 
    update, 
    remove 
  } = useMasterData<NumberingSeries>({ 
    endpoint: '/api/numbering-series',
    pageSize: 20
  });

  // States
  const [filters, setFilters] = useState({ module: '', is_active: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NumberingSeries | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    module: '',
    prefix: '',
    suffix: '',
    current_number: 1,
    padding_length: 5,
    format: '',
    notes_en: '',
    notes_ar: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data on mount
  useEffect(() => {
    const bootstrapAndFetch = async () => {
      try {
        if (hasPermission('numbering_series:create' as any)) {
          await fetch('http://localhost:4000/api/numbering-series/bootstrap', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json',
              'X-Company-Id': localStorage.getItem('activeCompanyId') || '',
            },
          });
        }
      } catch (_e) {
        // silent: bootstrap is best-effort
      } finally {
        fetchList();
      }
    };

    bootstrapAndFetch();
  }, []);

  // Apply filters
  const handleFilter = () => {
    const params: any = {};
    if (filters.module) params.module = filters.module;
    if (filters.is_active) params.is_active = filters.is_active;
    fetchList({ page: 1, filters: params });
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({ module: '', is_active: '' });
    fetchList({ page: 1, filters: {} });
  };

  // Open create modal
  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      module: '',
      prefix: '',
      suffix: '',
      current_number: 1,
      padding_length: 6,
      format: '',
      notes_en: '',
      notes_ar: '',
      is_active: true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleEdit = async (id: number) => {
    const item = await fetchById(id);
    if (item) {
      setEditingItem(item);
      setFormData({
        module: item.module || '',
        prefix: item.prefix || '',
        suffix: item.suffix || '',
        current_number: item.current_number || 1,
        padding_length: item.padding_length || 6,
        format: item.format || '',
        notes_en: item.notes_en || '',
        notes_ar: item.notes_ar || '',
        is_active: item.is_active ?? true,
      });
      setErrors({});
      setIsModalOpen(true);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.module.trim()) {
      newErrors.module = locale === 'ar' ? 'الوحدة مطلوبة' : 'Module is required';
    }

    if (formData.current_number < 1) {
      newErrors.current_number =
        locale === 'ar'
          ? 'يجب أن يكون الرقم الحالي 1 على الأقل'
          : 'Current number must be at least 1';
    }

    if (formData.padding_length < 0 || formData.padding_length > 10) {
      newErrors.padding_length =
        locale === 'ar'
          ? 'طول الحشو يجب أن يكون بين 0 و 10'
          : 'Padding length must be between 0 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    setSubmitting(true);
    try {
      if (editingItem) {
        await update(editingItem.id, formData);
        showToast(
          locale === 'ar' ? 'تم تحديث سلسلة الترقيم بنجاح' : 'Numbering series updated successfully',
          'success'
        );
      } else {
        await create(formData);
        showToast(
          locale === 'ar' ? 'تم إنشاء سلسلة الترقيم بنجاح' : 'Numbering series created successfully',
          'success'
        );
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchList();
    } catch (error: any) {
      showToast(
        error?.message || (locale === 'ar' ? 'فشل حفظ سلسلة الترقيم' : 'Failed to save numbering series'),
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete confirmation
  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  // Delete item
  const handleDelete = async () => {
    if (!deletingId) return;

    setSubmitting(true);
    try {
      await remove(deletingId);
      showToast(
        locale === 'ar' ? 'تم حذف سلسلة الترقيم بنجاح' : 'Numbering series deleted successfully',
        'success'
      );
      setIsDeleteDialogOpen(false);
      setDeletingId(null);
      fetchList();
    } catch (error: any) {
      showToast(
        error?.message || (locale === 'ar' ? 'فشل حذف سلسلة الترقيم' : 'Failed to delete numbering series'),
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Permission checks
  const canCreate = hasPermission('numbering_series:create');
  const canEdit = hasPermission('numbering_series:edit');
  const canDelete = hasPermission('numbering_series:delete');

  // Table columns
  const columns: TableColumn<NumberingSeries>[] = [
    {
      key: 'module',
      label: locale === 'ar' ? 'الوحدة' : 'Module',
      render: (_value, item) => {
        if (!item) return <span className="text-gray-400">-</span>;
        return (
          <span className="font-medium text-gray-900 dark:text-white">
            {item.module}
          </span>
        );
      },
    },
    {
      key: 'module_name',
      label: 'اسم الجدول/القائمة / Table/List',
      render: (_value, item) => {
        if (!item) return <span className="text-gray-400">-</span>;
        const labels = getModuleLabels(item.module);
        return (
          <div className="space-y-1">
            <div className="text-sm text-gray-900 dark:text-white" dir="rtl">
              {labels.ar}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {labels.en}
            </div>
          </div>
        );
      },
    },
    {
      key: 'format',
      label: locale === 'ar' ? 'المعاينة' : 'Format',
      render: (_value, item) => {
        if (!item) return <span className="text-gray-400">-</span>;
        const preview = `${item.prefix || ''}${String(item.current_number || 0).padStart(item.padding_length || 0, '0')}${item.suffix || ''}`;
        return (
          <div className="space-y-1">
            <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
              {preview}
            </span>
            {item.format && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'قالب:' : 'Template:'} {item.format}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'description',
      label: locale === 'ar' ? 'الوصف' : 'Description',
      render: (item) => {
        if (!item) return <span className="text-gray-400">-</span>;
        const description =
          locale === 'ar'
            ? (item.notes_ar || item.notes_en)
            : (item.notes_en || item.notes_ar);
        return (
          <div className="space-y-1">
            {description ? (
              <div
                className="text-sm text-gray-900 dark:text-white"
                dir={locale === 'ar' ? 'rtl' : undefined}
              >
                {description}
              </div>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'current_number',
      label: locale === 'ar' ? 'الرقم الحالي' : 'Current Number',
      render: (item) => {
        if (!item) return <span className="text-gray-400">-</span>;
        return (
          <span className="font-mono text-gray-900 dark:text-white">
            {item.current_number}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      label: locale === 'ar' ? 'الحالة' : 'Status',
      render: (item) => {
        if (!item) return <span className="text-gray-400">-</span>;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.is_active 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {item.is_active ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'غير نشط' : 'Inactive')}
          </span>
        );
      },
    },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'سلاسل الترقيم - SLMS' : 'Numbering Series - SLMS'}</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {locale === 'ar' ? 'سلاسل الترقيم' : 'Numbering Series'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {locale === 'ar'
                ? 'إدارة أنماط الترقيم التلقائي للمستندات'
                : 'Manage automatic numbering patterns for documents'}
            </p>
          </div>
          {canCreate && (
            <Button onClick={handleCreate}>
              {locale === 'ar' ? 'إضافة سلسلة ترقيم' : 'Create Numbering Series'}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label={locale === 'ar' ? 'الوحدة' : 'Module'}
              value={filters.module}
              onChange={(e) => setFilters({ ...filters, module: e.target.value })}
              placeholder={locale === 'ar' ? 'ابحث باسم الوحدة...' : 'Search by module...'}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {locale === 'ar' ? 'الحالة' : 'Status'}
              </label>
              <select
                value={filters.is_active}
                onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
                <option value="true">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="false">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFilter} variant="secondary">
              {locale === 'ar' ? 'تطبيق' : 'Apply Filters'}
            </Button>
            <Button onClick={handleResetFilters} variant="secondary">
              {locale === 'ar' ? 'إعادة ضبط' : 'Reset'}
            </Button>
          </div>
        </div>

        {/* Table */}
        <MasterDataTable
          columns={columns}
          data={data}
          loading={loading}
          pagination={
            pagination
              ? {
                  currentPage: pagination.currentPage,
                  totalPages: pagination.totalPages,
                  pageSize: pagination.pageSize,
                  totalItems: pagination.totalItems,
                  onPageChange: (page) => {
                    const filterParams: any = {};
                    if (filters.module) filterParams.module = filters.module;
                    if (filters.is_active) filterParams.is_active = filters.is_active;
                    fetchList({ page, filters: filterParams });
                  },
                }
              : undefined
          }
          onEdit={canEdit ? handleEdit : undefined}
          onDelete={canDelete ? handleDeleteClick : undefined}
          canEdit={canEdit}
          canDelete={canDelete}
        />

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem
            ? (locale === 'ar' ? 'تعديل سلسلة ترقيم' : 'Edit Numbering Series')
            : (locale === 'ar' ? 'إنشاء سلسلة ترقيم' : 'Create Numbering Series')}
          size="lg"
        >
          <div className="space-y-4">
            <Input
              label={locale === 'ar' ? 'الوحدة' : 'Module'}
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              error={errors.module}
              required
              placeholder={locale === 'ar' ? 'مثال: فواتير، شحنات، مصروفات' : 'e.g., invoice, shipment, expense'}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === 'ar' ? 'بادئة' : 'Prefix'}
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                placeholder={locale === 'ar' ? 'مثال: INV-, SHP-' : 'e.g., INV-, SHP-'}
              />
              <Input
                label={locale === 'ar' ? 'لاحقة' : 'Suffix'}
                value={formData.suffix}
                onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                placeholder={locale === 'ar' ? 'مثال: -2024' : 'e.g., -2024'}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === 'ar' ? 'الرقم الحالي' : 'Current Number'}
                type="number"
                value={formData.current_number}
                onChange={(e) => setFormData({ ...formData, current_number: parseInt(e.target.value) || 1 })}
                error={errors.current_number}
                required
                min={1}
              />
              <Input
                label={locale === 'ar' ? 'طول الحشو' : 'Padding Length'}
                type="number"
                value={formData.padding_length}
                onChange={(e) => setFormData({ ...formData, padding_length: parseInt(e.target.value) || 0 })}
                error={errors.padding_length}
                required
                min={0}
                max={10}
                helperText={locale === 'ar' ? 'عدد الخانات (0-10)' : 'Number of digits (0-10)'}
              />
            </div>

            <Input
              label={locale === 'ar' ? 'قالب التنسيق' : 'Format Template'}
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value })}
              placeholder={locale === 'ar' ? 'مثال: {PREFIX}{YYYY}{MM}{NUMBER}{SUFFIX}' : 'e.g., {PREFIX}{YYYY}{MM}{NUMBER}{SUFFIX}'}
              helperText={locale === 'ar' ? 'نمط تنسيق مخصص (اختياري)' : 'Optional custom format pattern'}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === 'ar' ? 'ملاحظات (إنجليزي)' : 'Notes (English)'}
                value={formData.notes_en}
                onChange={(e) => setFormData({ ...formData, notes_en: e.target.value })}
                placeholder={locale === 'ar' ? 'ملاحظات باللغة الإنجليزية' : 'Notes in English'}
              />
              <Input
                label={locale === 'ar' ? 'ملاحظات (عربي)' : 'Notes (Arabic)'}
                value={formData.notes_ar}
                onChange={(e) => setFormData({ ...formData, notes_ar: e.target.value })}
                placeholder="ملاحظات بالعربية"
                dir="rtl"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
                {locale === 'ar' ? 'نشط' : 'Active'}
              </label>
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {locale === 'ar' ? 'معاينة:' : 'Preview:'}
              </div>
              <div className="font-mono text-lg text-blue-600 dark:text-blue-400">
                {formData.prefix}{String(formData.current_number).padStart(formData.padding_length, '0')}{formData.suffix}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSubmit}
                loading={submitting}
              >
                {editingItem ? (locale === 'ar' ? 'تحديث' : 'Update') : (locale === 'ar' ? 'إنشاء' : 'Create')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title={locale === 'ar' ? 'حذف سلسلة ترقيم' : 'Delete Numbering Series'}
          message={
            locale === 'ar'
              ? 'هل أنت متأكد من حذف سلسلة الترقيم؟ لا يمكن التراجع عن هذا الإجراء.'
              : 'Are you sure you want to delete this numbering series? This action cannot be undone.'
          }
          confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
          variant="danger"
          loading={submitting}
        />
      </div>
    </MainLayout>
  );
}
