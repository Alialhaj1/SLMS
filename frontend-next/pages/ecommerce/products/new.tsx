import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainLayout from '../../../components/layout/MainLayout';
import PageHeader from '../../../components/layout/PageHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useLocale } from '../../../contexts/LocaleContext';
import { useToast } from '../../../hooks/useToast';
import apiClient from '../../../lib/apiClient';
import {
  CubeIcon,
  ArrowLeftIcon,
  PhotoIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface Category {
  id: number;
  name: string;
  name_ar: string;
}

interface UOM {
  id: number;
  name: string;
  name_ar: string;
  symbol: string;
}

const initialForm = {
  code: '',
  name: '',
  name_ar: '',
  description: '',
  description_ar: '',
  sku: '',
  barcode: '',
  category_id: '' as string | number,
  base_uom_id: '' as string | number,
  base_selling_price: '',
  standard_cost: '',
  is_active: true,
  is_featured: false,
  is_sellable: true,
  is_purchasable: true,
  is_stockable: true,
  track_inventory: true,
  image_url: '',
  weight: '',
  min_stock_level: '',
  max_stock_level: '',
  tags: '',
};

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UOM[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const fetchLookups = useCallback(async () => {
    try {
      const [catRes, unitRes] = await Promise.all([
        apiClient.get<any>('/api/item-categories?limit=200'),
        apiClient.get<any>('/api/units?limit=200'),
      ]);
      setCategories(catRes?.data || []);
      setUnits(unitRes?.data || []);
    } catch (e) {
      console.error('Failed to load lookups', e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) {
      showToast('error', isAr ? 'كود المنتج مطلوب' : 'Product code is required');
      return;
    }
    if (!form.name.trim()) {
      showToast('error', isAr ? 'اسم المنتج مطلوب' : 'Product name is required');
      return;
    }
    if (!form.base_uom_id) {
      showToast('error', isAr ? 'وحدة القياس مطلوبة' : 'Unit of measure is required');
      return;
    }

    try {
      setSaving(true);
      const body: any = {
        code: form.code.trim(),
        name: form.name.trim(),
        name_ar: form.name_ar.trim() || undefined,
        name_en: form.name.trim(),
        description: form.description.trim() || undefined,
        description_ar: form.description_ar.trim() || undefined,
        sku: form.sku.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        base_uom_id: Number(form.base_uom_id),
        base_selling_price: form.base_selling_price ? Number(form.base_selling_price) : 0,
        standard_cost: form.standard_cost ? Number(form.standard_cost) : undefined,
        is_active: form.is_active,
        is_featured: form.is_featured,
        is_sellable: form.is_sellable,
        is_purchasable: form.is_purchasable,
        is_stockable: form.is_stockable,
        track_inventory: form.track_inventory,
        image_url: form.image_url.trim() || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        min_stock_level: form.min_stock_level ? Number(form.min_stock_level) : undefined,
        max_stock_level: form.max_stock_level ? Number(form.max_stock_level) : undefined,
        tags: form.tags.trim() || undefined,
      };

      await apiClient.request('/api/master/items', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      showToast('success', isAr ? 'تم إنشاء المنتج بنجاح' : 'Product created successfully');
      router.push('/ecommerce/products');
    } catch (error: any) {
      const msg = error?.message || (isAr ? 'فشل إنشاء المنتج' : 'Failed to create product');
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, labelAr, field, type = 'text', required = false, placeholder = '', placeholderAr = '' }: {
    label: string; labelAr: string; field: string; type?: string; required?: boolean; placeholder?: string; placeholderAr?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {isAr ? labelAr : label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </label>
      <input
        type={type}
        value={(form as any)[field] ?? ''}
        onChange={e => handleChange(field, e.target.value)}
        placeholder={isAr ? (placeholderAr || placeholder) : placeholder}
        dir={field.endsWith('_ar') ? 'rtl' : undefined}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
    </div>
  );

  const TextAreaField = ({ label, labelAr, field, placeholder = '', placeholderAr = '' }: {
    label: string; labelAr: string; field: string; placeholder?: string; placeholderAr?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {isAr ? labelAr : label}
      </label>
      <textarea
        value={(form as any)[field] ?? ''}
        onChange={e => handleChange(field, e.target.value)}
        placeholder={isAr ? (placeholderAr || placeholder) : placeholder}
        dir={field.endsWith('_ar') ? 'rtl' : undefined}
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
    </div>
  );

  const SelectField = ({ label, labelAr, field, options, required = false }: {
    label: string; labelAr: string; field: string; options: { value: string | number; label: string }[]; required?: boolean;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {isAr ? labelAr : label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </label>
      <select
        value={(form as any)[field] ?? ''}
        onChange={e => handleChange(field, e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
        <option value="">{isAr ? '— اختر —' : '— Select —'}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  const ToggleField = ({ label, labelAr, field }: {
    label: string; labelAr: string; field: string;
  }) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => handleChange(field, !(form as any)[field])}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          (form as any)[field] ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          (form as any)[field] ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{isAr ? labelAr : label}</span>
    </label>
  );

  return (
    <MainLayout>
      <Head>
        <title>{isAr ? 'منتج جديد — SLMS' : 'New Product — SLMS'}</title>
      </Head>

      <PageHeader
        title="New Product"
        title_ar="منتج جديد"
        description="Create a new product for your store"
        description_ar="إنشاء منتج جديد لمتجرك"
        icon={CubeIcon}
        breadcrumbs={[
          { label: isAr ? 'المتجر' : 'E-Commerce', href: '/ecommerce/products' },
          { label: isAr ? 'المنتجات' : 'Products', href: '/ecommerce/products' },
          { label: isAr ? 'منتج جديد' : 'New Product' },
        ]}
        actions={[
          {
            id: 'back',
            label: isAr ? 'رجوع' : 'Back',
            icon: ArrowLeftIcon,
            variant: 'secondary' as const,
            onClick: () => router.push('/ecommerce/products'),
          },
        ]}
      />

      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        {/* Basic Information */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            {isAr ? 'المعلومات الأساسية' : 'Basic Information'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="Product Code" labelAr="كود المنتج" field="code" required placeholder="e.g. PROD-001" />
            <InputField label="SKU" labelAr="SKU" field="sku" placeholder="e.g. SKU-001" />
            <InputField label="Name (English)" labelAr="الاسم (إنجليزي)" field="name" required placeholder="Product name" />
            <InputField label="Name (Arabic)" labelAr="الاسم (عربي)" field="name_ar" placeholder="اسم المنتج" placeholderAr="اسم المنتج" />
            <InputField label="Barcode" labelAr="الباركود" field="barcode" placeholder="e.g. 6281000000001" />
            <SelectField
              label="Category"
              labelAr="الفئة"
              field="category_id"
              options={categories.map(c => ({ value: c.id, label: isAr ? (c.name_ar || c.name) : c.name }))}
            />
            <SelectField
              label="Unit of Measure"
              labelAr="وحدة القياس"
              field="base_uom_id"
              required
              options={units.map(u => ({ value: u.id, label: isAr ? (u.name_ar || u.name) : (u.name + (u.symbol ? ` (${u.symbol})` : '')) }))}
            />
          </div>
        </div>

        {/* Description */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            {isAr ? 'الوصف' : 'Description'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextAreaField label="Description (English)" labelAr="الوصف (إنجليزي)" field="description" placeholder="Detailed product description" />
            <TextAreaField label="Description (Arabic)" labelAr="الوصف (عربي)" field="description_ar" placeholder="وصف تفصيلي للمنتج" placeholderAr="وصف تفصيلي للمنتج" />
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            {isAr ? 'التسعير' : 'Pricing'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="Selling Price" labelAr="سعر البيع" field="base_selling_price" type="number" placeholder="0.00" />
            <InputField label="Compare-at Price" labelAr="السعر قبل الخصم" field="standard_cost" type="number" placeholder="0.00" />
          </div>
          {form.standard_cost && form.base_selling_price && Number(form.standard_cost) > Number(form.base_selling_price) && (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
              {isAr
                ? `خصم ${Math.round((1 - Number(form.base_selling_price) / Number(form.standard_cost)) * 100)}%`
                : `${Math.round((1 - Number(form.base_selling_price) / Number(form.standard_cost)) * 100)}% discount`}
            </p>
          )}
        </div>

        {/* Inventory */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            {isAr ? 'المخزون' : 'Inventory'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InputField label="Weight" labelAr="الوزن" field="weight" type="number" placeholder="0" />
            <InputField label="Min Stock Level" labelAr="الحد الأدنى للمخزون" field="min_stock_level" type="number" placeholder="0" />
            <InputField label="Max Stock Level" labelAr="الحد الأقصى للمخزون" field="max_stock_level" type="number" placeholder="0" />
          </div>
        </div>

        {/* Media */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            {isAr ? 'الصور' : 'Media'}
          </h2>
          <InputField label="Image URL" labelAr="رابط الصورة" field="image_url" placeholder="https://example.com/image.jpg" />
          {form.image_url && (
            <div className="mt-3">
              <img
                src={form.image_url}
                alt="Preview"
                className="h-32 w-32 rounded-lg border object-cover dark:border-gray-600"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            {isAr ? 'الوسوم' : 'Tags'}
          </h2>
          <InputField label="Tags" labelAr="الوسوم" field="tags" placeholder="tag1, tag2, tag3" />
        </div>

        {/* Toggles */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            {isAr ? 'الإعدادات' : 'Settings'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ToggleField label="Active" labelAr="نشط" field="is_active" />
            <ToggleField label="Featured" labelAr="مميز" field="is_featured" />
            <ToggleField label="Sellable" labelAr="قابل للبيع" field="is_sellable" />
            <ToggleField label="Purchasable" labelAr="قابل للشراء" field="is_purchasable" />
            <ToggleField label="Stockable" labelAr="قابل للتخزين" field="is_stockable" />
            <ToggleField label="Track Inventory" labelAr="تتبع المخزون" field="track_inventory" />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/ecommerce/products')}
            className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !form.code.trim() || !form.name.trim() || !form.base_uom_id}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckIcon className="h-4 w-4" />
            {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'إنشاء المنتج' : 'Create Product')}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
