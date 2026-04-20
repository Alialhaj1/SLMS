import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  MapPinIcon, PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
  GlobeAltIcon, BuildingOffice2Icon, ShieldCheckIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function apiFetch(path: string, opts?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface TaxZone {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  zone_type: string;
  default_rate: number | null;
  subject_to_zatca: boolean;
  description: string;
  description_ar: string;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  domestic: number;
  economic_zones: number;
  free_zones: number;
  zatca_subject: number;
  avg_rate: number;
}

const ZONE_TYPES = [
  { value: 'domestic', en: 'Domestic', ar: 'محلي', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'economic_zone', en: 'Economic Zone', ar: 'منطقة اقتصادية', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'free_zone', en: 'Free Zone', ar: 'منطقة حرة', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'customs_zone', en: 'Customs Zone', ar: 'منطقة جمركية', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'international', en: 'International', ar: 'دولي', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
];

export default function MasterTaxZonesPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [zones, setZones] = useState<TaxZone[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TaxZone | null>(null);
  const [form, setForm] = useState({ code: '', name_en: '', name_ar: '', zone_type: 'domestic', default_rate: '', subject_to_zatca: false, description: '', description_ar: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('zone_type', filterType);
      const [zonesRes, statsRes] = await Promise.all([
        apiFetch(`/api/master/tax-zones?${params}`),
        apiFetch('/api/master/tax-zones/stats'),
      ]);
      setZones(zonesRes.data || []);
      setStats(statsRes.data || null);
    } catch {
      showToast(isAr ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, isAr, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name_en: '', name_ar: '', zone_type: 'domestic', default_rate: '', subject_to_zatca: false, description: '', description_ar: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (z: TaxZone) => {
    setEditing(z);
    setForm({
      code: z.code, name_en: z.name_en, name_ar: z.name_ar, zone_type: z.zone_type,
      default_rate: z.default_rate != null ? String(z.default_rate) : '',
      subject_to_zatca: z.subject_to_zatca, description: z.description || '', description_ar: z.description_ar || '', is_active: z.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name_en.trim()) {
      showToast(isAr ? 'الكود والاسم مطلوبان' : 'Code and name required', 'error');
      return;
    }
    setSaving(true);
    try {
      const body = { ...form, default_rate: form.default_rate ? parseFloat(form.default_rate) : null };
      if (editing) {
        await apiFetch(`/api/master/tax-zones/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast(isAr ? 'تم التحديث' : 'Updated', 'success');
      } else {
        await apiFetch('/api/master/tax-zones', { method: 'POST', body: JSON.stringify(body) });
        showToast(isAr ? 'تم الإنشاء' : 'Created', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await apiFetch(`/api/master/tax-zones/${deletingId}`, { method: 'DELETE' });
      showToast(isAr ? 'تم الحذف' : 'Deleted', 'success');
      setDeletingId(null);
      fetchData();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    }
  };

  const getZoneColor = (type: string) => ZONE_TYPES.find(z => z.value === type)?.color || 'bg-gray-100 text-gray-700';
  const getZoneLabel = (type: string) => {
    const zt = ZONE_TYPES.find(z => z.value === type);
    return zt ? (isAr ? zt.ar : zt.en) : type;
  };

  return (
    <MainLayout>
      <Head><title>{isAr ? 'المناطق الضريبية' : 'Tax Zones'} - SLMS</title></Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MapPinIcon className="h-7 w-7 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isAr ? 'المناطق الضريبية' : 'Tax Zones'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isAr ? 'إدارة المناطق الضريبية ومعدلاتها' : 'Manage tax zones and default rates'}</p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {isAr ? 'إضافة منطقة' : 'Add Zone'}
          </Button>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: isAr ? 'الإجمالي' : 'Total', value: stats.total, icon: ChartBarIcon, color: 'text-gray-600' },
              { label: isAr ? 'نشط' : 'Active', value: stats.active, icon: ChartBarIcon, color: 'text-emerald-600' },
              { label: isAr ? 'محلي' : 'Domestic', value: stats.domestic, icon: BuildingOffice2Icon, color: 'text-blue-600' },
              { label: isAr ? 'اقتصادية' : 'Economic', value: stats.economic_zones, icon: GlobeAltIcon, color: 'text-purple-600' },
              { label: isAr ? 'حرة' : 'Free Zone', value: stats.free_zones, icon: GlobeAltIcon, color: 'text-emerald-600' },
              { label: isAr ? 'خاضع ZATCA' : 'ZATCA', value: stats.zatca_subject, icon: ShieldCheckIcon, color: 'text-amber-600' },
              { label: isAr ? 'غير نشط' : 'Inactive', value: stats.inactive, icon: ChartBarIcon, color: 'text-red-600' },
              { label: isAr ? 'متوسط المعدل' : 'Avg Rate', value: `${(stats.avg_rate || 0).toFixed(1)}%`, icon: ChartBarIcon, color: 'text-indigo-600' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</div>
                <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder={isAr ? 'بحث...' : 'Search...'}
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
            {ZONE_TYPES.map(zt => <option key={zt.value} value={zt.value}>{isAr ? zt.ar : zt.en}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-500">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</div>
          ) : zones.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <MapPinIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{isAr ? 'لا توجد مناطق ضريبية' : 'No tax zones found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {[isAr ? 'الكود' : 'Code', isAr ? 'الاسم' : 'Name', isAr ? 'النوع' : 'Type', isAr ? 'المعدل' : 'Rate', 'ZATCA', isAr ? 'الحالة' : 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {zones.map(z => (
                    <tr key={z.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-white">{z.code}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{isAr ? z.name_ar || z.name_en : z.name_en}</div>
                        <div className="text-xs text-gray-500">{isAr ? z.name_en : z.name_ar}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getZoneColor(z.zone_type)}`}>{getZoneLabel(z.zone_type)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {z.default_rate != null ? `${z.default_rate}%` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {z.subject_to_zatca ? (
                          <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${z.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-200 text-gray-600'}`}>
                          {z.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(z)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                            <PencilIcon className="h-4 w-4 text-gray-500" />
                          </button>
                          <button onClick={() => setDeletingId(z.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                            <TrashIcon className="h-4 w-4 text-red-500" />
                          </button>
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
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? (isAr ? 'تعديل منطقة ضريبية' : 'Edit Tax Zone') : (isAr ? 'إضافة منطقة ضريبية' : 'Add Tax Zone')} size="md">
        <div className="space-y-4">
          <Input label={isAr ? 'الكود' : 'Code'} value={form.code}
            onChange={(e: any) => setForm({ ...form, code: e.target.value })} disabled={!!editing} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={isAr ? 'الاسم (EN)' : 'Name (EN)'} value={form.name_en}
              onChange={(e: any) => setForm({ ...form, name_en: e.target.value })} />
            <Input label={isAr ? 'الاسم (AR)' : 'Name (AR)'} value={form.name_ar}
              onChange={(e: any) => setForm({ ...form, name_ar: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'نوع المنطقة' : 'Zone Type'}</label>
              <select value={form.zone_type} onChange={e => setForm({ ...form, zone_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {ZONE_TYPES.map(zt => <option key={zt.value} value={zt.value}>{isAr ? zt.ar : zt.en}</option>)}
              </select>
            </div>
            <Input label={isAr ? 'المعدل الافتراضي %' : 'Default Rate %'} type="number" value={form.default_rate}
              onChange={(e: any) => setForm({ ...form, default_rate: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={isAr ? 'الوصف (EN)' : 'Description (EN)'} value={form.description}
              onChange={(e: any) => setForm({ ...form, description: e.target.value })} />
            <Input label={isAr ? 'الوصف (AR)' : 'Description (AR)'} value={form.description_ar}
              onChange={(e: any) => setForm({ ...form, description_ar: e.target.value })} />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.subject_to_zatca} onChange={e => setForm({ ...form, subject_to_zatca: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{isAr ? 'خاضع لـ ZATCA' : 'Subject to ZATCA'}</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{isAr ? 'نشط' : 'Active'}</span>
            </label>
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSave} loading={saving}>{isAr ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete}
        title={isAr ? 'حذف المنطقة' : 'Delete Zone'}
        message={isAr ? 'هل أنت متأكد من حذف هذه المنطقة ؟' : 'Are you sure you want to delete this zone?'}
        confirmText={isAr ? 'حذف' : 'Delete'} cancelText={isAr ? 'إلغاء' : 'Cancel'} variant="danger" />
    </MainLayout>
  );
}
