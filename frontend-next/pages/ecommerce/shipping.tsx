import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import PageHeader from '../../components/layout/PageHeader';
import EnhancedTable from '../../components/ui/EnhancedTable';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../lib/apiClient';
import {
  TruckIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  GlobeAltIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface ShippingZone {
  id: number;
  name: string;
  name_ar: string;
  countries: string[];
  regions: string[];
  is_active: boolean;
  is_default: boolean;
  rates: ShippingRate[];
  created_at: string;
}

interface ShippingRate {
  id: number;
  name: string;
  name_ar: string;
  type: 'flat' | 'weight_based' | 'price_based' | 'free';
  price: number;
  min_weight: number | null;
  max_weight: number | null;
  min_order_amount: number | null;
  estimated_days_min: number;
  estimated_days_max: number;
}

export default function ShippingPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    countries: '',
    is_active: true,
    rates: [{ name: '', name_ar: '', type: 'flat' as 'flat' | 'weight_based' | 'price_based' | 'free', price: 0, estimated_days_min: 3, estimated_days_max: 7 }],
  });

  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.request<any>('/api/ecommerce/shipping-zones');
      setZones(res?.data || []);
    } catch {
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('error', isAr ? 'يرجى إدخال اسم المنطقة' : 'Please enter zone name');
      return;
    }
    try {
      setSaving(true);
      const body = {
        ...formData,
        countries: formData.countries.split(',').map(c => c.trim()).filter(Boolean),
      };
      if (editingZone) {
        await apiClient.request(`/api/ecommerce/shipping-zones/${editingZone.id}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast('success', isAr ? 'تم تحديث المنطقة' : 'Zone updated');
      } else {
        await apiClient.request('/api/ecommerce/shipping-zones', { method: 'POST', body: JSON.stringify(body) });
        showToast('success', isAr ? 'تم إنشاء المنطقة' : 'Zone created');
      }
      setShowCreateModal(false);
      setEditingZone(null);
      fetchZones();
    } catch {
      showToast('error', isAr ? 'فشلت العملية' : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await apiClient.request(`/api/ecommerce/shipping-zones/${deleteId}`, { method: 'DELETE' });
      showToast('success', isAr ? 'تم حذف المنطقة' : 'Zone deleted');
      setDeleteId(null);
      fetchZones();
    } catch {
      showToast('error', isAr ? 'فشل حذف المنطقة' : 'Failed to delete zone');
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (zone: ShippingZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      name_ar: zone.name_ar,
      countries: zone.countries.join(', '),
      is_active: zone.is_active,
      rates: zone.rates.length > 0 ? zone.rates.map(r => ({
        name: r.name,
        name_ar: r.name_ar,
        type: r.type,
        price: r.price,
        estimated_days_min: r.estimated_days_min,
        estimated_days_max: r.estimated_days_max,
      })) : [{ name: '', name_ar: '', type: 'flat' as const, price: 0, estimated_days_min: 3, estimated_days_max: 7 }],
    });
    setShowCreateModal(true);
  };

  const openCreate = () => {
    setEditingZone(null);
    setFormData({ name: '', name_ar: '', countries: '', is_active: true, rates: [{ name: '', name_ar: '', type: 'flat' as const, price: 0, estimated_days_min: 3, estimated_days_max: 7 }] });
    setShowCreateModal(true);
  };

  const addRate = () => {
    setFormData(prev => ({
      ...prev,
      rates: [...prev.rates, { name: '', name_ar: '', type: 'flat' as const, price: 0, estimated_days_min: 3, estimated_days_max: 7 }],
    }));
  };

  const removeRate = (idx: number) => {
    setFormData(prev => ({ ...prev, rates: prev.rates.filter((_, i) => i !== idx) }));
  };

  const updateRate = (idx: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      rates: prev.rates.map((r, i) => i === idx ? { ...r, [field]: value } : r),
    }));
  };

  const rateTypeLabels: Record<string, { en: string; ar: string; color: string }> = {
    flat: { en: 'Flat Rate', ar: 'سعر ثابت', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
    weight_based: { en: 'By Weight', ar: 'حسب الوزن', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' },
    price_based: { en: 'By Price', ar: 'حسب السعر', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' },
    free: { en: 'Free', ar: 'مجاني', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
  };

  return (
    <MainLayout>
      <Head><title>{isAr ? 'مناطق الشحن' : 'Shipping Zones'} - SLMS</title></Head>
      <div className="space-y-6 p-1">
        <PageHeader
          title="Shipping Zones"
          title_ar="مناطق الشحن"
          description="Configure shipping zones, rates, and delivery options"
          description_ar="تهيئة مناطق الشحن والأسعار وخيارات التوصيل"
          icon={TruckIcon}
          breadcrumbs={[
            { label: 'E-Commerce', label_ar: 'المتجر الإلكتروني', href: '/ecommerce/settings' },
            { label: 'Shipping', label_ar: 'الشحن' },
          ]}
          actions={[
            {
              id: 'add',
              label: 'Add Zone',
              label_ar: 'إضافة منطقة',
              icon: PlusIcon,
              onClick: openCreate,
              variant: 'primary',
            },
          ]}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800">
            <div className="absolute inset-0 bg-blue-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{isAr ? 'مناطق الشحن' : 'Shipping Zones'}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{zones.length}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 p-3 shadow-lg">
                <GlobeAltIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800">
            <div className="absolute inset-0 bg-emerald-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{isAr ? 'نشطة' : 'Active Zones'}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{zones.filter(z => z.is_active).length}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3 shadow-lg">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800">
            <div className="absolute inset-0 bg-purple-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{isAr ? 'طرق الشحن' : 'Shipping Methods'}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{zones.reduce((s, z) => s + z.rates.length, 0)}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-3 shadow-lg">
                <TruckIcon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Zone Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 py-20 dark:border-gray-600 dark:bg-gray-800/50">
            <GlobeAltIcon className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">{isAr ? 'لا توجد مناطق شحن' : 'No Shipping Zones'}</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">{isAr ? 'أنشئ أول منطقة شحن لبدء التوصيل' : 'Create your first shipping zone to start delivering'}</p>
            <button onClick={openCreate} className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-medium text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
              <span className="flex items-center gap-2"><PlusIcon className="h-4 w-4" /> {isAr ? 'إضافة منطقة' : 'Add Zone'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {zones.map(zone => (
              <div key={zone.id} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isAr ? zone.name_ar : zone.name}</h3>
                      {zone.is_default && (
                        <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{isAr ? 'افتراضي' : 'Default'}</span>
                      )}
                      {zone.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{isAr ? 'نشط' : 'Active'}</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-400">{isAr ? 'معطل' : 'Inactive'}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPinIcon className="h-4 w-4" />
                      {zone.countries.length > 0 ? zone.countries.slice(0, 3).join(', ') + (zone.countries.length > 3 ? ` +${zone.countries.length - 3}` : '') : (isAr ? 'جميع الدول' : 'All countries')}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => openEdit(zone)} className="rounded-lg p-2 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all dark:hover:bg-indigo-900/20">
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteId(zone.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all dark:hover:bg-red-900/20">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Rates */}
                <div className="space-y-2">
                  {zone.rates.map((rate, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/30">
                      <div className="flex items-center gap-3">
                        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${rateTypeLabels[rate.type]?.color || ''}`}>
                          {isAr ? rateTypeLabels[rate.type]?.ar : rateTypeLabels[rate.type]?.en}
                        </span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{isAr ? rate.name_ar : rate.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {rate.type === 'free' ? (isAr ? 'مجاني' : 'Free') : `${rate.price} SAR`}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <ClockIcon className="h-3.5 w-3.5" />
                          {rate.estimated_days_min}-{rate.estimated_days_max} {isAr ? 'أيام' : 'days'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {zone.rates.length === 0 && (
                    <p className="py-3 text-center text-sm text-gray-400">{isAr ? 'لا توجد طرق شحن' : 'No shipping rates'}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 animate-in zoom-in-95 duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {editingZone ? (isAr ? 'تعديل منطقة الشحن' : 'Edit Shipping Zone') : (isAr ? 'إنشاء منطقة شحن' : 'Create Shipping Zone')}
              </h3>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'الاسم (EN)' : 'Name (EN)'}</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'الاسم (AR)' : 'Name (AR)'}</label>
                    <input type="text" dir="rtl" value={formData.name_ar} onChange={(e) => setFormData(p => ({ ...p, name_ar: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{isAr ? 'الدول (مفصولة بفاصلة)' : 'Countries (comma-separated)'}</label>
                  <input type="text" value={formData.countries} onChange={(e) => setFormData(p => ({ ...p, countries: e.target.value }))} placeholder="SA, AE, KW, BH" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>

                {/* Shipping Rates */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{isAr ? 'طرق الشحن' : 'Shipping Methods'}</label>
                    <button onClick={addRate} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-all dark:bg-indigo-900/20 dark:text-indigo-400">
                      + {isAr ? 'إضافة' : 'Add Rate'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.rates.map((rate, idx) => (
                      <div key={idx} className="relative rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-700/30">
                        {formData.rates.length > 1 && (
                          <button onClick={() => removeRate(idx)} className="absolute top-2 right-2 rounded-lg p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <input type="text" value={rate.name} onChange={(e) => updateRate(idx, 'name', e.target.value)} placeholder={isAr ? 'اسم الطريقة' : 'Method name'} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                          <select value={rate.type} onChange={(e) => updateRate(idx, 'type', e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                            <option value="flat">{isAr ? 'سعر ثابت' : 'Flat Rate'}</option>
                            <option value="weight_based">{isAr ? 'حسب الوزن' : 'By Weight'}</option>
                            <option value="price_based">{isAr ? 'حسب السعر' : 'By Price'}</option>
                            <option value="free">{isAr ? 'مجاني' : 'Free'}</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {rate.type !== 'free' && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">{isAr ? 'السعر (SAR)' : 'Price (SAR)'}</label>
                              <input type="number" value={rate.price} onChange={(e) => updateRate(idx, 'price', Number(e.target.value))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">{isAr ? 'أيام (من)' : 'Min Days'}</label>
                            <input type="number" value={rate.estimated_days_min} onChange={(e) => updateRate(idx, 'estimated_days_min', Number(e.target.value))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">{isAr ? 'أيام (إلى)' : 'Max Days'}</label>
                            <input type="number" value={rate.estimated_days_max} onChange={(e) => updateRate(idx, 'estimated_days_max', Number(e.target.value))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => { setShowCreateModal(false); setEditingZone(null); }} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button onClick={handleSave} disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50">
                  {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin mx-4" /> : (editingZone ? (isAr ? 'تحديث' : 'Update') : (isAr ? 'إنشاء' : 'Create'))}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 animate-in zoom-in-95 duration-300">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isAr ? 'حذف منطقة الشحن' : 'Delete Shipping Zone'}</h3>
              <p className="mt-2 text-sm text-gray-500">{isAr ? 'هل أنت متأكد؟ سيتم حذف جميع طرق الشحن المرتبطة.' : 'Are you sure? All associated shipping rates will be deleted.'}</p>
              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => setDeleteId(null)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/25">
                  {deleting ? <ArrowPathIcon className="h-4 w-4 animate-spin mx-4" /> : (isAr ? 'حذف' : 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
