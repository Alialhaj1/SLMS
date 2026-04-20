/**
 * Create Expense Request Page - إنشاء طلب مصروف
 * ======================================================
 * Form to create a new expense request
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layout/MainLayout';
import { useAuth } from '../../../../hooks/useAuth';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useToast } from '../../../../contexts/ToastContext';
import { useTranslation } from '../../../../hooks/useTranslation';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface LookupItem {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  symbol?: string;
}

interface FormItem {
  item_description: string;
  item_description_ar: string;
  quantity: string;
  unit_price: string;
  notes: string;
}

export default function CreateExpenseRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();

  const isArabic = locale === 'ar';
  const canCreate = hasPermission('expense_requests:create');

  // Lookup data
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [shipments, setShipments] = useState<LookupItem[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<LookupItem[]>([]);
  const [vendors, setVendors] = useState<LookupItem[]>([]);
  const [currencies, setCurrencies] = useState<LookupItem[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Form state
  const [projectId, setProjectId] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  const [expenseTypeId, setExpenseTypeId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [blNumber, setBlNumber] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<FormItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load lookup data
  useEffect(() => {
    const loadLookups = async () => {
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      
      try {
        const [projectsRes, expenseTypesRes, vendorsRes, currenciesRes] = await Promise.all([
          fetch('/api/projects?limit=200', { headers }),
          fetch('/api/expense-types?is_active=true', { headers }),
          fetch('/api/master/vendors?limit=200&is_active=true', { headers }),
          fetch('/api/finance/currencies?is_active=true', { headers }),
        ]);

        if (projectsRes.ok) {
          const d = await projectsRes.json();
          setProjects((d.data || d).map((p: any) => ({ id: p.id, name: p.name, name_ar: p.name_ar, code: p.code })));
        }
        if (expenseTypesRes.ok) {
          const d = await expenseTypesRes.json();
          setExpenseTypes((d.data || d).map((e: any) => ({ id: e.id, name: e.name, name_ar: e.name_ar, code: e.code })));
        }
        if (vendorsRes.ok) {
          const d = await vendorsRes.json();
          setVendors((d.data || d).map((v: any) => ({ id: v.id, name: v.name, name_ar: v.name_ar, code: v.code })));
        }
        if (currenciesRes.ok) {
          const d = await currenciesRes.json();
          setCurrencies((d.data || d).map((c: any) => ({ id: c.id, name: c.name_en || c.name, code: c.code, symbol: c.symbol })));
        }
      } catch (err) {
        console.error('Error loading lookups:', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    loadLookups();
  }, []);

  // Load shipments when project changes
  useEffect(() => {
    if (!projectId) {
      setShipments([]);
      setShipmentId('');
      return;
    }

    const loadShipments = async () => {
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      
      try {
        const res = await fetch(`/api/logistics-shipments?project_id=${projectId}&limit=200`, { headers });
        if (res.ok) {
          const d = await res.json();
          setShipments((d.data || d).map((s: any) => ({ id: s.id, name: s.shipment_number, code: s.shipment_number })));
        }
      } catch (err) {
        console.error('Error loading shipments:', err);
      }
    };

    loadShipments();
  }, [projectId]);

  const addItem = () => {
    setItems([...items, { item_description: '', item_description_ar: '', quantity: '1', unit_price: '0', notes: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof FormItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !shipmentId || !expenseTypeId || !vendorId || !currencyId) {
      showToast({ type: 'error', message: isArabic ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields' });
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      showToast({ type: 'error', message: isArabic ? 'يرجى إدخال المبلغ' : 'Please enter a valid amount' });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const body: any = {
        project_id: parseInt(projectId),
        shipment_id: parseInt(shipmentId),
        expense_type_id: parseInt(expenseTypeId),
        vendor_id: parseInt(vendorId),
        currency_id: parseInt(currencyId),
        total_amount: parseFloat(totalAmount),
        bl_number: blNumber || undefined,
        container_number: containerNumber || undefined,
        notes: notes || undefined,
      };

      if (items.length > 0) {
        body.items = items.map(item => ({
          item_description: item.item_description,
          item_description_ar: item.item_description_ar,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          notes: item.notes || undefined,
        }));
      }

      const res = await fetch('/api/expense-requests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create expense request');
      }

      showToast({ type: 'success', message: isArabic ? 'تم إنشاء طلب المصروف بنجاح' : 'Expense request created successfully' });
      router.push(`/requests/expense/${data.id}`);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <MainLayout>
        <Head><title>{isArabic ? 'غير مصرح' : 'Access Denied'} - SLMS</title></Head>
        <div className="p-6 text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isArabic ? 'غير مصرح' : 'Access Denied'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isArabic ? 'ليس لديك صلاحيات لإنشاء طلبات المصاريف' : 'You do not have permission to create expense requests'}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'طلب مصروف جديد' : 'New Expense Request'} - SLMS</title>
      </Head>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="secondary" onClick={() => router.push('/requests')}>
            <ArrowLeftIcon className="w-5 h-5" />
            {isArabic ? 'رجوع' : 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isArabic ? 'طلب مصروف جديد' : 'New Expense Request'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isArabic ? 'املأ البيانات لإنشاء طلب مصروف جديد' : 'Fill in details to create a new expense request'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Main Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isArabic ? 'البيانات الأساسية' : 'Basic Information'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'المشروع' : 'Project'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{isArabic ? 'اختر المشروع' : 'Select Project'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `${p.code} - ` : ''}{isArabic ? p.name_ar || p.name : p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shipment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'الشحنة' : 'Shipment'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={shipmentId}
                  onChange={e => setShipmentId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!projectId}
                >
                  <option value="">{!projectId ? (isArabic ? 'اختر المشروع أولاً' : 'Select project first') : (isArabic ? 'اختر الشحنة' : 'Select Shipment')}</option>
                  {shipments.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expense Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'نوع المصروف' : 'Expense Type'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={expenseTypeId}
                  onChange={e => setExpenseTypeId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{isArabic ? 'اختر نوع المصروف' : 'Select Expense Type'}</option>
                  {expenseTypes.map(et => (
                    <option key={et.id} value={et.id}>
                      {isArabic ? et.name_ar || et.name : et.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'المورد' : 'Vendor'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={vendorId}
                  onChange={e => setVendorId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{isArabic ? 'اختر المورد' : 'Select Vendor'}</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {isArabic ? v.name_ar || v.name : v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'العملة' : 'Currency'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={currencyId}
                  onChange={e => setCurrencyId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{isArabic ? 'اختر العملة' : 'Select Currency'}</option>
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code}{c.symbol ? ` (${c.symbol})` : ''} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'المبلغ الإجمالي' : 'Total Amount'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>

          {/* Shipping Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isArabic ? 'بيانات الشحن' : 'Shipping Details'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'رقم بوليصة الشحن' : 'BL Number'}
                </label>
                <input
                  type="text"
                  value={blNumber}
                  onChange={e => setBlNumber(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isArabic ? 'رقم بوليصة الشحن' : 'Bill of Lading Number'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {isArabic ? 'رقم الحاوية' : 'Container Number'}
                </label>
                <input
                  type="text"
                  value={containerNumber}
                  onChange={e => setContainerNumber(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isArabic ? 'رقم الحاوية' : 'Container Number'}
                />
              </div>
            </div>
          </div>

          {/* Items Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isArabic ? 'البنود' : 'Items'}
              </h2>
              <Button type="button" variant="secondary" onClick={addItem}>
                <PlusIcon className="w-4 h-4" />
                {isArabic ? 'إضافة بند' : 'Add Item'}
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {isArabic ? 'لا توجد بنود. يمكنك إضافة بنود اختيارية.' : 'No items. You can add optional line items.'}
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isArabic ? `بند ${index + 1}` : `Item ${index + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={item.item_description}
                          onChange={e => updateItem(index, 'item_description', e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={isArabic ? 'الوصف' : 'Description'}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={isArabic ? 'الكمية' : 'Qty'}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={e => updateItem(index, 'unit_price', e.target.value)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={isArabic ? 'سعر الوحدة' : 'Unit Price'}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {isArabic ? 'ملاحظات' : 'Notes'}
            </h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder={isArabic ? 'ملاحظات إضافية...' : 'Additional notes...'}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => router.push('/requests')}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" loading={submitting} disabled={submitting || loadingLookups}>
              <PlusIcon className="w-5 h-5" />
              {submitting
                ? (isArabic ? 'جار الإنشاء...' : 'Creating...')
                : (isArabic ? 'إنشاء طلب المصروف' : 'Create Expense Request')
              }
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
