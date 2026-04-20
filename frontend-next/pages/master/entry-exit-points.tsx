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
  ArrowsRightLeftIcon, ChartBarIcon,
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

interface EntryExitPoint {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  point_type: string;
  direction: string;
  country_id: number | null;
  country_name_en?: string;
  country_name_ar?: string;
  city: string;
  customs_office_id: number | null;
  latitude: number | null;
  longitude: number | null;
  operating_hours: string;
  operating_status: string;
  description: string;
  description_ar: string;
  is_active: boolean;
}

interface Stats {
  total: number;
  active: number;
  sea_points: number;
  air_points: number;
  land_points: number;
  open_points: number;
  closed_points: number;
}

const POINT_TYPES = [
  { value: 'sea', en: 'Sea Port', ar: 'ميناء بحري', icon: '🚢', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'air', en: 'Airport', ar: 'مطار', icon: '✈️', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { value: 'land', en: 'Land Border', ar: 'منفذ بري', icon: '🚛', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'rail', en: 'Railway', ar: 'سكة حديد', icon: '🚂', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
];

const DIRECTIONS = [
  { value: 'entry', en: 'Entry', ar: 'دخول' },
  { value: 'exit', en: 'Exit', ar: 'خروج' },
  { value: 'both', en: 'Both', ar: 'دخول وخروج' },
];

const STATUSES = [
  { value: 'open', en: 'Open', ar: 'مفتوح', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'closed', en: 'Closed', ar: 'مغلق', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'restricted', en: 'Restricted', ar: 'مقيد', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
];

export default function MasterEntryExitPointsPage() {
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const isAr = locale === 'ar';

  const [points, setPoints] = useState<EntryExitPoint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDirection, setFilterDirection] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EntryExitPoint | null>(null);
  const [form, setForm] = useState({
    code: '', name_en: '', name_ar: '', point_type: 'sea', direction: 'both',
    country_id: '', city: '', customs_office_id: '', latitude: '', longitude: '',
    operating_hours: '', operating_status: 'open', description: '', description_ar: '', is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('point_type', filterType);
      if (filterDirection) params.set('direction', filterDirection);
      if (filterStatus) params.set('operating_status', filterStatus);
      const [ptsRes, statsRes] = await Promise.all([
        apiFetch(`/api/master/entry-exit-points?${params}`),
        apiFetch('/api/master/entry-exit-points/stats'),
      ]);
      setPoints(ptsRes.data || []);
      setStats(statsRes.data || null);
    } catch {
      showToast(isAr ? 'فشل تحميل البيانات' : 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterDirection, filterStatus, isAr, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name_en: '', name_ar: '', point_type: 'sea', direction: 'both', country_id: '', city: '', customs_office_id: '', latitude: '', longitude: '', operating_hours: '', operating_status: 'open', description: '', description_ar: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (p: EntryExitPoint) => {
    setEditing(p);
    setForm({
      code: p.code, name_en: p.name_en, name_ar: p.name_ar, point_type: p.point_type, direction: p.direction,
      country_id: p.country_id ? String(p.country_id) : '', city: p.city || '',
      customs_office_id: p.customs_office_id ? String(p.customs_office_id) : '',
      latitude: p.latitude != null ? String(p.latitude) : '', longitude: p.longitude != null ? String(p.longitude) : '',
      operating_hours: p.operating_hours || '', operating_status: p.operating_status || 'open',
      description: p.description || '', description_ar: p.description_ar || '', is_active: p.is_active,
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
      const body = {
        ...form,
        country_id: form.country_id ? parseInt(form.country_id) : null,
        customs_office_id: form.customs_office_id ? parseInt(form.customs_office_id) : null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };
      if (editing) {
        await apiFetch(`/api/master/entry-exit-points/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast(isAr ? 'تم التحديث' : 'Updated', 'success');
      } else {
        await apiFetch('/api/master/entry-exit-points', { method: 'POST', body: JSON.stringify(body) });
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
      await apiFetch(`/api/master/entry-exit-points/${deletingId}`, { method: 'DELETE' });
      showToast(isAr ? 'تم الحذف' : 'Deleted', 'success');
      setDeletingId(null);
      fetchData();
    } catch (e: any) {
      showToast(e.message || 'Error', 'error');
    }
  };

  const getTypeInfo = (type: string) => POINT_TYPES.find(t => t.value === type);
  const getDirLabel = (dir: string) => { const d = DIRECTIONS.find(x => x.value === dir); return d ? (isAr ? d.ar : d.en) : dir; };
  const getStatusInfo = (s: string) => STATUSES.find(x => x.value === s);

  return (
    <MainLayout>
      <Head><title>{isAr ? 'نقاط الدخول والخروج' : 'Entry/Exit Points'} - SLMS</title></Head>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <ArrowsRightLeftIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isAr ? 'نقاط الدخول والخروج' : 'Entry / Exit Points'}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isAr ? 'الموانئ والمطارات والمنافذ البرية' : 'Ports, airports, and land border crossings'}</p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {isAr ? 'إضافة نقطة' : 'Add Point'}
          </Button>
        </div>

        {/* KPI */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: isAr ? 'الإجمالي' : 'Total', value: stats.total, color: 'text-gray-700' },
              { label: isAr ? 'نشط' : 'Active', value: stats.active, color: 'text-emerald-600' },
              { label: '🚢 ' + (isAr ? 'بحري' : 'Sea'), value: stats.sea_points, color: 'text-blue-600' },
              { label: '✈️ ' + (isAr ? 'جوي' : 'Air'), value: stats.air_points, color: 'text-sky-600' },
              { label: '🚛 ' + (isAr ? 'بري' : 'Land'), value: stats.land_points, color: 'text-amber-600' },
              { label: isAr ? 'مفتوح' : 'Open', value: stats.open_points, color: 'text-emerald-600' },
              { label: isAr ? 'مغلق' : 'Closed', value: stats.closed_points, color: 'text-red-600' },
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
            <input type="text" placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
            {POINT_TYPES.map(pt => <option key={pt.value} value={pt.value}>{isAr ? pt.ar : pt.en}</option>)}
          </select>
          <select value={filterDirection} onChange={e => setFilterDirection(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="">{isAr ? 'جميع الاتجاهات' : 'All Directions'}</option>
            {DIRECTIONS.map(d => <option key={d.value} value={d.value}>{isAr ? d.ar : d.en}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{isAr ? s.ar : s.en}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-500">{isAr ? 'جارٍ التحميل...' : 'Loading...'}</div>
          ) : points.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <MapPinIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{isAr ? 'لا توجد نقاط' : 'No points found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    {[isAr ? 'الكود' : 'Code', isAr ? 'الاسم' : 'Name', isAr ? 'النوع' : 'Type', isAr ? 'الاتجاه' : 'Direction', isAr ? 'المدينة' : 'City', isAr ? 'حالة التشغيل' : 'Status', isAr ? 'الحالة' : 'Active', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {points.map(p => {
                    const typeInfo = getTypeInfo(p.point_type);
                    const statusInfo = getStatusInfo(p.operating_status);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-white">{p.code}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{isAr ? p.name_ar || p.name_en : p.name_en}</div>
                          <div className="text-xs text-gray-500">{isAr ? p.name_en : p.name_ar}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo?.color || ''}`}>
                            {typeInfo?.icon} {isAr ? typeInfo?.ar : typeInfo?.en}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{getDirLabel(p.direction)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{p.city || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo?.color || ''}`}>
                            {isAr ? statusInfo?.ar : statusInfo?.en}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-200 text-gray-600'}`}>
                            {p.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                              <PencilIcon className="h-4 w-4 text-gray-500" />
                            </button>
                            <button onClick={() => setDeletingId(p.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? (isAr ? 'تعديل نقطة' : 'Edit Point') : (isAr ? 'إضافة نقطة' : 'Add Point')} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input label={isAr ? 'الكود' : 'Code'} value={form.code}
              onChange={(e: any) => setForm({ ...form, code: e.target.value })} disabled={!!editing} />
            <Input label={isAr ? 'الاسم (EN)' : 'Name (EN)'} value={form.name_en}
              onChange={(e: any) => setForm({ ...form, name_en: e.target.value })} />
            <Input label={isAr ? 'الاسم (AR)' : 'Name (AR)'} value={form.name_ar}
              onChange={(e: any) => setForm({ ...form, name_ar: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'نوع النقطة' : 'Point Type'}</label>
              <select value={form.point_type} onChange={e => setForm({ ...form, point_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {POINT_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.icon} {isAr ? pt.ar : pt.en}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'الاتجاه' : 'Direction'}</label>
              <select value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {DIRECTIONS.map(d => <option key={d.value} value={d.value}>{isAr ? d.ar : d.en}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{isAr ? 'حالة التشغيل' : 'Operating Status'}</label>
              <select value={form.operating_status} onChange={e => setForm({ ...form, operating_status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{isAr ? s.ar : s.en}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={isAr ? 'المدينة' : 'City'} value={form.city}
              onChange={(e: any) => setForm({ ...form, city: e.target.value })} />
            <Input label={isAr ? 'ساعات العمل' : 'Operating Hours'} value={form.operating_hours}
              onChange={(e: any) => setForm({ ...form, operating_hours: e.target.value })} placeholder="e.g. 24/7 or 06:00-22:00" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={isAr ? 'خط العرض' : 'Latitude'} type="number" value={form.latitude}
              onChange={(e: any) => setForm({ ...form, latitude: e.target.value })} />
            <Input label={isAr ? 'خط الطول' : 'Longitude'} type="number" value={form.longitude}
              onChange={(e: any) => setForm({ ...form, longitude: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={isAr ? 'الوصف (EN)' : 'Description (EN)'} value={form.description}
              onChange={(e: any) => setForm({ ...form, description: e.target.value })} />
            <Input label={isAr ? 'الوصف (AR)' : 'Description (AR)'} value={form.description_ar}
              onChange={(e: any) => setForm({ ...form, description_ar: e.target.value })} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{isAr ? 'نشط' : 'Active'}</span>
          </label>
          <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleSave} loading={saving}>{isAr ? 'حفظ' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={handleDelete}
        title={isAr ? 'حذف النقطة' : 'Delete Point'}
        message={isAr ? 'هل أنت متأكد من حذف هذه النقطة؟' : 'Delete this entry/exit point?'}
        confirmText={isAr ? 'حذف' : 'Delete'} cancelText={isAr ? 'إلغاء' : 'Cancel'} variant="danger" />
    </MainLayout>
  );
}
