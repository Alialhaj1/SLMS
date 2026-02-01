import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useLocale } from '../../contexts/LocaleContext';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface DeclarationItem {
  id?: number;
  line_number: number;
  item_id?: number | null;
  item_code?: string | null;
  item_description: string;
  item_description_ar?: string | null;
  hs_code: string;
  hs_code_description?: string | null;
  origin_country_id?: number | null;
  origin_country_name?: string | null;
  quantity: number;
  unit_id?: number | null;
  unit_code?: string | null;
  unit_name?: string | null;
  gross_weight?: number;
  net_weight?: number;
  packages?: number;
  unit_price: number;
  fob_value?: number;
  freight_value?: number;
  insurance_value?: number;
  cif_value?: number;
  duty_rate?: number;
  duty_amount?: number;
  vat_rate?: number;
  vat_amount?: number;
  other_fees?: number;
  total_fees?: number;
  exemption_id?: number | null;
  exemption_rate?: number;
  inspection_required?: boolean;
  inspection_result?: string | null;
  inspection_notes?: string | null;
  notes?: string | null;
}

interface Props {
  declarationId: number;
  companyId: number;
  canEdit: boolean;
}

const itemFormSchema = z.object({
  line_number: z.coerce.number().int().positive({ message: 'Line number must be positive' }),
  item_description: z.string().min(1, 'Description is required').max(500),
  item_description_ar: z.string().max(500).optional().or(z.literal('')),
  hs_code: z.string().min(1, 'HS code is required').max(20),
  hs_code_description: z.string().max(500).optional().or(z.literal('')),
  origin_country_id: z.preprocess((v) => (v === '' || v === null ? null : Number(v)), z.number().int().positive().nullable()),
  quantity: z.coerce.number().positive({ message: 'Quantity must be positive' }),
  unit_id: z.preprocess((v) => (v === '' || v === null ? null : Number(v)), z.number().int().positive().nullable()),
  gross_weight: z.preprocess((v) => (v === '' || v === null ? 0 : Number(v)), z.number().nonnegative()),
  net_weight: z.preprocess((v) => (v === '' || v === null ? 0 : Number(v)), z.number().nonnegative()),
  packages: z.preprocess((v) => (v === '' || v === null ? 0 : Number(v)), z.number().int().nonnegative()),
  unit_price: z.coerce.number().nonnegative({ message: 'Unit price must be non-negative' }),
  fob_value: z.preprocess((v) => (v === '' || v === null ? 0 : Number(v)), z.number().nonnegative()),
  freight_value: z.preprocess((v) => (v === '' || v === null ? 0 : Number(v)), z.number().nonnegative()),
  insurance_value: z.preprocess((v) => (v === '' || v === null ? 0 : Number(v)), z.number().nonnegative()),
  duty_rate: z.preprocess((v) => (v === '' || v === null ? 0 : Number(v)), z.number().nonnegative()),
  vat_rate: z.preprocess((v) => (v === '' || v === null ? 0 : Number(v)), z.number().nonnegative()),
  other_fees: z.preprocess((v) => (v === '' || v === null ? 0 : Number(v)), z.number().nonnegative()),
  inspection_required: z.boolean().optional().default(false),
  notes: z.string().optional().or(z.literal('')),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DeclarationItemsTab({ declarationId, companyId, canEdit }: Props) {
  const { showToast } = useToast();
  const { locale } = useLocale();

  const [items, setItems] = useState<DeclarationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const [countries, setCountries] = useState<{ id: number; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: number; code: string; name: string }[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema) as any,
  });

  const watchQuantity = watch('quantity');
  const watchUnitPrice = watch('unit_price');
  const watchFobValue = watch('fob_value');
  const watchFreightValue = watch('freight_value');
  const watchInsuranceValue = watch('insurance_value');
  const watchDutyRate = watch('duty_rate');
  const watchVatRate = watch('vat_rate');
  const watchOtherFees = watch('other_fees');

  // Auto-calculate CIF
  useEffect(() => {
    const fob = Number(watchFobValue) || 0;
    const freight = Number(watchFreightValue) || 0;
    const insurance = Number(watchInsuranceValue) || 0;
    const cif = fob + freight + insurance;
    setValue('fob_value', fob);
    setValue('freight_value', freight);
    setValue('insurance_value', insurance);
  }, [watchFobValue, watchFreightValue, watchInsuranceValue, setValue]);

  const calculatedCif = useMemo(() => {
    const fob = Number(watchFobValue) || 0;
    const freight = Number(watchFreightValue) || 0;
    const insurance = Number(watchInsuranceValue) || 0;
    return fob + freight + insurance;
  }, [watchFobValue, watchFreightValue, watchInsuranceValue]);

  const calculatedDutyAmount = useMemo(() => {
    const cif = calculatedCif;
    const rate = Number(watchDutyRate) || 0;
    return (cif * rate) / 100;
  }, [calculatedCif, watchDutyRate]);

  const calculatedVatAmount = useMemo(() => {
    const cif = calculatedCif;
    const duty = calculatedDutyAmount;
    const rate = Number(watchVatRate) || 0;
    return ((cif + duty) * rate) / 100;
  }, [calculatedCif, calculatedDutyAmount, watchVatRate]);

  const calculatedTotalFees = useMemo(() => {
    const duty = calculatedDutyAmount;
    const vat = calculatedVatAmount;
    const other = Number(watchOtherFees) || 0;
    return duty + vat + other;
  }, [calculatedDutyAmount, calculatedVatAmount, watchOtherFees]);

  useEffect(() => {
    loadItems();
    loadCountries();
    loadUnits();
  }, [declarationId, companyId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getApiBaseUrl()}/api/customs-declarations/${declarationId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Id': String(companyId),
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) {
        showToast('Failed to load items', 'error');
        return;
      }

      const json = await res.json();
      const itemsData = json?.data?.items || [];
      setItems(itemsData);
    } catch (e) {
      showToast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/master/countries`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Id': String(companyId),
          ...getAuthHeaders(),
        },
      });

      if (res.ok) {
        const json = await res.json();
        setCountries(json?.data || []);
      }
    } catch (e) {
      // silent
    }
  };

  const loadUnits = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/master/units`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Id': String(companyId),
          ...getAuthHeaders(),
        },
      });

      if (res.ok) {
        const json = await res.json();
        setUnits(json?.data || []);
      }
    } catch (e) {
      // silent
    }
  };

  const handleAddNew = () => {
    const maxLine = items.length > 0 ? Math.max(...items.map(i => i.line_number)) : 0;
    reset({
      line_number: maxLine + 1,
      item_description: '',
      item_description_ar: '',
      hs_code: '',
      hs_code_description: '',
      quantity: 1,
      unit_price: 0,
      fob_value: 0,
      freight_value: 0,
      insurance_value: 0,
      gross_weight: 0,
      net_weight: 0,
      packages: 0,
      duty_rate: 0,
      vat_rate: 0,
      other_fees: 0,
      inspection_required: false,
      notes: '',
    });
    setEditingIndex(null);
    setModalOpen(true);
  };

  const handleEdit = (index: number) => {
    const item = items[index];
    reset({
      line_number: item.line_number,
      item_description: item.item_description,
      item_description_ar: item.item_description_ar || '',
      hs_code: item.hs_code,
      hs_code_description: item.hs_code_description || '',
      origin_country_id: item.origin_country_id || ('' as any),
      quantity: item.quantity,
      unit_id: item.unit_id || ('' as any),
      gross_weight: item.gross_weight || 0,
      net_weight: item.net_weight || 0,
      packages: item.packages || 0,
      unit_price: item.unit_price,
      fob_value: item.fob_value || 0,
      freight_value: item.freight_value || 0,
      insurance_value: item.insurance_value || 0,
      duty_rate: item.duty_rate || 0,
      vat_rate: item.vat_rate || 0,
      other_fees: item.other_fees || 0,
      inspection_required: item.inspection_required || false,
      notes: item.notes || '',
    });
    setEditingIndex(index);
    setModalOpen(true);
  };

  const handleDelete = (index: number) => {
    setDeleteIndex(index);
  };

  const confirmDelete = async () => {
    if (deleteIndex === null) return;

    const newItems = items.filter((_, i) => i !== deleteIndex);
    await saveItems(newItems);
    setDeleteIndex(null);
  };

  const onSubmit = async (values: ItemFormValues) => {
    const newItem: DeclarationItem = {
      line_number: values.line_number,
      item_description: values.item_description,
      item_description_ar: values.item_description_ar || null,
      hs_code: values.hs_code,
      hs_code_description: values.hs_code_description || null,
      origin_country_id: values.origin_country_id || null,
      quantity: values.quantity,
      unit_id: values.unit_id || null,
      gross_weight: values.gross_weight || 0,
      net_weight: values.net_weight || 0,
      packages: values.packages || 0,
      unit_price: values.unit_price,
      fob_value: values.fob_value || 0,
      freight_value: values.freight_value || 0,
      insurance_value: values.insurance_value || 0,
      cif_value: calculatedCif,
      duty_rate: values.duty_rate || 0,
      duty_amount: calculatedDutyAmount,
      vat_rate: values.vat_rate || 0,
      vat_amount: calculatedVatAmount,
      other_fees: values.other_fees || 0,
      total_fees: calculatedTotalFees,
      inspection_required: values.inspection_required || false,
      notes: values.notes || null,
    };

    let updatedItems: DeclarationItem[];
    if (editingIndex !== null) {
      updatedItems = [...items];
      updatedItems[editingIndex] = newItem;
    } else {
      updatedItems = [...items, newItem];
    }

    await saveItems(updatedItems);
    setModalOpen(false);
  };

  const saveItems = async (itemsToSave: DeclarationItem[]) => {
    try {
      setSaving(true);
      const res = await fetch(`${getApiBaseUrl()}/api/customs-declarations/${declarationId}/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Id': String(companyId),
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ items: itemsToSave }),
      });

      if (!res.ok) {
        showToast('Failed to save items', 'error');
        return;
      }

      const json = await res.json();
      setItems(json?.data || []);
      showToast('Items saved successfully', 'success');
    } catch (e) {
      showToast('Failed to save items', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.totalCif += item.cif_value || 0;
        acc.totalDuty += item.duty_amount || 0;
        acc.totalVat += item.vat_amount || 0;
        acc.totalFees += item.total_fees || 0;
        acc.totalGrossWeight += item.gross_weight || 0;
        acc.totalNetWeight += item.net_weight || 0;
        acc.totalPackages += item.packages || 0;
        return acc;
      },
      {
        totalCif: 0,
        totalDuty: 0,
        totalVat: 0,
        totalFees: 0,
        totalGrossWeight: 0,
        totalNetWeight: 0,
        totalPackages: 0,
      }
    );
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleAddNew} disabled={saving}>
            <PlusIcon className="w-4 h-4 mr-2" />
            {locale === 'ar' ? 'إضافة صنف' : 'Add Item'}
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <p className="text-slate-600 dark:text-slate-400">
            {locale === 'ar' ? 'لا توجد أصناف. انقر "إضافة صنف" للبدء.' : 'No items added. Click "Add Item" to start.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'السطر' : 'Line'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'الوصف' : 'Description'}
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'كود HS' : 'HS Code'}
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'الكمية' : 'Quantity'}
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'FOB' : 'FOB'}
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'CIF' : 'CIF'}
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {locale === 'ar' ? 'الرسوم' : 'Fees'}
                  </th>
                  {canEdit && (
                    <th className="px-3 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {locale === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {item.line_number}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-900 dark:text-slate-100">
                      <div className="max-w-xs truncate" title={item.item_description}>
                        {item.item_description}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {item.hs_code}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-slate-900 dark:text-slate-100">
                      {item.quantity.toLocaleString()} {item.unit_code || ''}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-slate-900 dark:text-slate-100">
                      {(item.fob_value || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-slate-900 dark:text-slate-100">
                      {(item.cif_value || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right text-slate-900 dark:text-slate-100">
                      {(item.total_fees || 0).toFixed(2)}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(index)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-900/80">
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 text-right">
                    {locale === 'ar' ? 'الإجمالي:' : 'Total:'}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-right text-slate-900 dark:text-slate-100">
                    {totals.totalCif.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-right text-slate-900 dark:text-slate-100">
                    {totals.totalCif.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-right text-slate-900 dark:text-slate-100">
                    {totals.totalFees.toFixed(2)}
                  </td>
                  {canEdit && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/40">
            <div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{locale === 'ar' ? 'إجمالي CIF' : 'Total CIF'}</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{totals.totalCif.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{locale === 'ar' ? 'إجمالي الرسوم الجمركية' : 'Total Customs Duty'}</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{totals.totalDuty.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{locale === 'ar' ? 'إجمالي ضريبة القيمة المضافة' : 'Total VAT'}</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{totals.totalVat.toFixed(2)}</div>
            </div>
          </div>
        </>
      )}

      {/* Item Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingIndex !== null ? (locale === 'ar' ? 'تعديل صنف' : 'Edit Item') : (locale === 'ar' ? 'إضافة صنف' : 'Add Item')}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={locale === 'ar' ? 'رقم السطر' : 'Line Number'} type="number" required error={errors.line_number?.message} {...register('line_number')} />
            <Input label={locale === 'ar' ? 'كود HS' : 'HS Code'} required error={errors.hs_code?.message} {...register('hs_code')} />
          </div>

          <Input label={locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'} required error={errors.item_description?.message} {...register('item_description')} />
          <Input label={locale === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'} error={errors.item_description_ar?.message} {...register('item_description_ar')} />
          <Input label={locale === 'ar' ? 'وصف كود HS' : 'HS Code Description'} error={errors.hs_code_description?.message} {...register('hs_code_description')} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {locale === 'ar' ? 'بلد المنشأ' : 'Origin Country'}
              </label>
              <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" {...register('origin_country_id')}>
                <option value="">{locale === 'ar' ? 'اختر...' : 'Select...'}</option>
                {countries.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Input label={locale === 'ar' ? 'الكمية' : 'Quantity'} type="number" step="0.01" required error={errors.quantity?.message} {...register('quantity')} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                {locale === 'ar' ? 'الوحدة' : 'Unit'}
              </label>
              <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" {...register('unit_id')}>
                <option value="">{locale === 'ar' ? 'اختر...' : 'Select...'}</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.code} - {u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label={locale === 'ar' ? 'الوزن الإجمالي (كجم)' : 'Gross Weight (kg)'} type="number" step="0.01" error={errors.gross_weight?.message} {...register('gross_weight')} />
            <Input label={locale === 'ar' ? 'الوزن الصافي (كجم)' : 'Net Weight (kg)'} type="number" step="0.01" error={errors.net_weight?.message} {...register('net_weight')} />
            <Input label={locale === 'ar' ? 'عدد الطرود' : 'Packages'} type="number" error={errors.packages?.message} {...register('packages')} />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              {locale === 'ar' ? 'القيم المالية' : 'Financial Values'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={locale === 'ar' ? 'سعر الوحدة' : 'Unit Price'} type="number" step="0.01" required error={errors.unit_price?.message} {...register('unit_price')} />
              <Input label="FOB Value" type="number" step="0.01" error={errors.fob_value?.message} {...register('fob_value')} />
              <Input label={locale === 'ar' ? 'قيمة الشحن' : 'Freight Value'} type="number" step="0.01" error={errors.freight_value?.message} {...register('freight_value')} />
              <Input label={locale === 'ar' ? 'قيمة التأمين' : 'Insurance Value'} type="number" step="0.01" error={errors.insurance_value?.message} {...register('insurance_value')} />
            </div>
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">{locale === 'ar' ? 'قيمة CIF المحسوبة:' : 'Calculated CIF:'}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{calculatedCif.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              {locale === 'ar' ? 'الرسوم والضرائب' : 'Duties & Taxes'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label={locale === 'ar' ? 'نسبة الرسوم الجمركية (%)' : 'Duty Rate (%)'} type="number" step="0.01" error={errors.duty_rate?.message} {...register('duty_rate')} />
              <Input label={locale === 'ar' ? 'نسبة ضريبة القيمة المضافة (%)' : 'VAT Rate (%)'} type="number" step="0.01" error={errors.vat_rate?.message} {...register('vat_rate')} />
              <Input label={locale === 'ar' ? 'رسوم أخرى' : 'Other Fees'} type="number" step="0.01" error={errors.other_fees?.message} {...register('other_fees')} />
            </div>
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">{locale === 'ar' ? 'الرسوم الجمركية:' : 'Customs Duty:'}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{calculatedDutyAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">{locale === 'ar' ? 'ضريبة القيمة المضافة:' : 'VAT:'}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{calculatedVatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-green-200 dark:border-green-900/40 pt-2">
                <span className="text-slate-900 dark:text-slate-100">{locale === 'ar' ? 'إجمالي الرسوم:' : 'Total Fees:'}</span>
                <span className="text-green-600 dark:text-green-400">{calculatedTotalFees.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" {...register('inspection_required')} />
              <span className="text-sm text-slate-700 dark:text-slate-300">{locale === 'ar' ? 'يتطلب فحص' : 'Inspection required'}</span>
            </label>
          </div>

          <Input label={locale === 'ar' ? 'ملاحظات' : 'Notes'} error={errors.notes?.message} {...register('notes')} />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" loading={saving}>
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {deleteIndex !== null && (
        <Modal
          isOpen={true}
          onClose={() => !saving && setDeleteIndex(null)}
          title={locale === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {locale === 'ar' ? 'هل أنت متأكد من حذف هذا الصنف؟' : 'Are you sure you want to delete this item?'}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteIndex(null)} disabled={saving}>
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button variant="danger" onClick={confirmDelete} loading={saving}>
                {locale === 'ar' ? 'حذف' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
