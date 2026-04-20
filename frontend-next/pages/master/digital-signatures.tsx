/**
 * ✍️ Digital Signatures Management — إدارة التوقيعات الرقمية
 * ============================================================
 * Professional signature registry — links signatures to company users.
 * Supports image upload, bilingual metadata, and delegation roles.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useLocale } from '../../contexts/LocaleContext';
import apiClient from '../../lib/apiClient';
import {
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  UserCircleIcon,
  PhotoIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

interface UserOption {
  id: number;
  full_name: string;
  email: string;
  roles?: string[];
}

interface DigitalSignature {
  id: number;
  company_id: number;
  user_id: number | null;
  user_name?: string;
  user_email?: string;
  signature_name_en: string;
  signature_name_ar: string;
  signature_title_en?: string;
  signature_title_ar?: string;
  department?: string;
  signature_image_url?: string;
  signature_type: 'manual' | 'digital_certificate' | 'biometric';
  certificate_issuer?: string;
  certificate_serial?: string;
  certificate_issued_date?: string;
  certificate_expiry_date?: string;
  signature_authority?: string;
  requires_2fa: boolean;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  user_id: '' as string | number,
  signature_name_en: '',
  signature_name_ar: '',
  signature_title_en: '',
  signature_title_ar: '',
  department: '',
  signature_image_url: '',
  signature_type: 'manual' as 'manual' | 'digital_certificate' | 'biometric',
  certificate_issuer: '',
  certificate_serial: '',
  certificate_issued_date: '',
  certificate_expiry_date: '',
  signature_authority: '',
  requires_2fa: false,
  is_default: false,
  is_active: true,
};

export default function DigitalSignaturesPage() {
  const { showToast } = useToast();
  const { can } = usePermissions();
  const { locale } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAr = locale === 'ar';

  const [signatures, setSignatures] = useState<DigitalSignature[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [previewImage, setPreviewImage] = useState<string>('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Fetch ──────────────────────────────────────────────
  const fetchSignatures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/digital-signatures?limit=100');
      setSignatures(res.data?.data || res.data || []);
    } catch {
      showToast({ type: 'error', message: isAr ? 'فشل تحميل التوقيعات' : 'Failed to load signatures' });
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/users?limit=200');
      setUsers(res.data?.data || res.data?.users || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchSignatures(); fetchUsers(); }, [fetchSignatures, fetchUsers]);

  // ── Image upload ───────────────────────────────────────
  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewImage(dataUrl);
      setForm(f => ({ ...f, signature_image_url: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // ── Auto-fill from user ────────────────────────────────
  const handleUserChange = (userId: string) => {
    const user = users.find(u => u.id === Number(userId));
    if (user && !editingId) {
      setForm(f => ({
        ...f,
        user_id: userId,
        signature_name_en: f.signature_name_en || user.full_name,
        signature_name_ar: f.signature_name_ar || user.full_name,
        signature_title_en: f.signature_title_en || user.job_title || '',
        signature_title_ar: f.signature_title_ar || user.job_title || '',
        signature_authority: f.signature_authority || user.full_name,
      }));
    } else {
      setForm(f => ({ ...f, user_id: userId }));
    }
  };

  // ── Modal open ─────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setPreviewImage('');
    setModalOpen(true);
  };

  const openEdit = (sig: DigitalSignature) => {
    setEditingId(sig.id);
    setForm({
      user_id: sig.user_id ?? '',
      signature_name_en: sig.signature_name_en,
      signature_name_ar: sig.signature_name_ar,
      signature_title_en: sig.signature_title_en || '',
      signature_title_ar: sig.signature_title_ar || '',
      department: sig.department || '',
      signature_image_url: sig.signature_image_url || '',
      signature_type: sig.signature_type,
      certificate_issuer: sig.certificate_issuer || '',
      certificate_serial: sig.certificate_serial || '',
      certificate_issued_date: sig.certificate_issued_date?.split('T')[0] || '',
      certificate_expiry_date: sig.certificate_expiry_date?.split('T')[0] || '',
      signature_authority: sig.signature_authority || '',
      requires_2fa: sig.requires_2fa,
      is_default: sig.is_default,
      is_active: sig.is_active,
    });
    setPreviewImage(sig.signature_image_url || '');
    setModalOpen(true);
  };

  // ── Save ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.signature_name_en.trim()) {
      showToast({ type: 'error', message: isAr ? 'الاسم بالإنجليزية مطلوب' : 'English name is required' });
      return;
    }
    if (!form.signature_name_ar.trim()) {
      showToast({ type: 'error', message: isAr ? 'الاسم بالعربية مطلوب' : 'Arabic name is required' });
      return;
    }
    const payload: any = { ...form };
    if (form.user_id !== '' && form.user_id !== null && form.user_id !== undefined) {
      payload.user_id = Number(form.user_id);
    } else {
      payload.user_id = null;
    }
    // Clean empty optional strings to avoid validation issues
    ['signature_image_url', 'certificate_issuer', 'certificate_serial',
     'certificate_issued_date', 'certificate_expiry_date', 'signature_authority',
     'department', 'signature_title_en', 'signature_title_ar'].forEach(key => {
      if (payload[key] === '') delete payload[key];
    });
    try {
      setSaving(true);
      if (editingId) {
        await apiClient.put(`/api/digital-signatures/${editingId}`, payload);
        showToast({ type: 'success', message: isAr ? 'تم تحديث التوقيع' : 'Signature updated' });
      } else {
        await apiClient.post('/api/digital-signatures', payload);
        showToast({ type: 'success', message: isAr ? 'تم إنشاء التوقيع' : 'Signature created' });
      }
      setModalOpen(false);
      fetchSignatures();
    } catch (err: any) {
      showToast({ type: 'error', message: err?.response?.data?.message || (isAr ? 'فشلت العملية' : 'Operation failed') });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/api/digital-signatures/${deletingId}`);
      showToast({ type: 'success', message: isAr ? 'تم حذف التوقيع' : 'Signature deleted' });
      fetchSignatures();
    } catch {
      showToast({ type: 'error', message: isAr ? 'فشل الحذف' : 'Delete failed' });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  // ── Toggle default ─────────────────────────────────────
  const handleToggleDefault = async (sig: DigitalSignature) => {
    try {
      await apiClient.put(`/api/digital-signatures/${sig.id}`, { is_default: !sig.is_default });
      fetchSignatures();
    } catch {
      showToast({ type: 'error', message: isAr ? 'فشل التحديث' : 'Update failed' });
    }
  };

  // ── Filter ─────────────────────────────────────────────
  const filtered = signatures.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.signature_name_en?.toLowerCase().includes(q) ||
      s.signature_name_ar?.toLowerCase().includes(q) ||
      s.user_name?.toLowerCase().includes(q) ||
      s.signature_authority?.toLowerCase().includes(q)
    );
  });

  const typeInfo = (t: string) => {
    const map: Record<string, { ar: string; en: string; cls: string }> = {
      manual:              { ar: 'يدوي/صورة',    en: 'Image/Manual',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      digital_certificate: { ar: 'شهادة رقمية',  en: 'Certificate',   cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
      biometric:           { ar: 'بيومتري',       en: 'Biometric',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    };
    return map[t] || { ar: t, en: t, cls: 'bg-gray-100 text-gray-600' };
  };

  return (
    <MainLayout>
      <Head>
        <title>{isAr ? 'التوقيعات الرقمية — SLMS' : 'Digital Signatures — SLMS'}</title>
      </Head>

      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/25">
              <PencilSquareIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isAr ? 'التوقيعات الرقمية' : 'Digital Signatures'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isAr
                  ? 'إدارة توقيعات المستخدمين ومستويات التفويض والاعتماد'
                  : 'Manage user signatures, authority levels, and delegations'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={fetchSignatures} disabled={loading}>
              <ArrowPathIcon className={clsx('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            {can('digital_signatures:create') && (
              <Button onClick={openAdd}>
                <PlusIcon className="h-4 w-4 mr-1" />
                {isAr ? 'إضافة توقيع' : 'Add Signature'}
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: isAr ? 'الإجمالي' : 'Total', value: signatures.length, bgCls: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800', txtCls: 'text-indigo-700 dark:text-indigo-400' },
            { label: isAr ? 'نشط' : 'Active', value: signatures.filter(s => s.is_active).length, bgCls: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800', txtCls: 'text-green-700 dark:text-green-400' },
            { label: isAr ? 'مرتبط بمستخدم' : 'Linked to Users', value: signatures.filter(s => s.user_id).length, bgCls: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800', txtCls: 'text-blue-700 dark:text-blue-400' },
            { label: isAr ? 'شهادات' : 'Certificates', value: signatures.filter(s => s.signature_type === 'digital_certificate').length, bgCls: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800', txtCls: 'text-purple-700 dark:text-purple-400' },
          ].map(kpi => (
            <div key={kpi.label} className={`${kpi.bgCls} rounded-xl p-4 border`}>
              <p className={`text-3xl font-bold ${kpi.txtCls}`}>{kpi.value}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث...' : 'Search...'}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <ArrowPathIcon className="h-10 w-10 text-gray-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center">
            <ShieldCheckIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">
              {isAr ? 'لا توجد توقيعات' : 'No Signatures Found'}
            </h3>
            {can('digital_signatures:create') && (
              <Button onClick={openAdd} className="mt-4">
                <PlusIcon className="h-4 w-4 mr-1" />
                {isAr ? 'إضافة أول توقيع' : 'Add First Signature'}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(sig => {
              const ti = typeInfo(sig.signature_type);
              const certExpiry = sig.certificate_expiry_date ? new Date(sig.certificate_expiry_date) : null;
              const isExpired = certExpiry && certExpiry < new Date();
              return (
                <div
                  key={sig.id}
                  className={clsx(
                    'relative bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg',
                    sig.is_default
                      ? 'border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-300 dark:ring-indigo-700'
                      : 'border-gray-200 dark:border-gray-700',
                    !sig.is_active && 'opacity-60'
                  )}
                >
                  {/* Default ribbon */}
                  {sig.is_default && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                        {isAr ? 'افتراضي' : 'DEFAULT'}
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4 flex gap-4">
                    {/* Signature preview box */}
                    <div className="flex-shrink-0 w-24 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                      {sig.signature_image_url ? (
                        <img
                          src={sig.signature_image_url}
                          alt={sig.signature_name_en}
                          className="max-w-full max-h-full object-contain p-1"
                        />
                      ) : (
                        <PencilSquareIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                        {isAr ? sig.signature_name_ar : sig.signature_name_en}
                      </h3>
                      {(sig.signature_title_en || sig.signature_title_ar) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {isAr ? sig.signature_title_ar : sig.signature_title_en}
                        </p>
                      )}
                      {sig.user_name && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <UserCircleIcon className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 truncate">{sig.user_name}</span>
                        </div>
                      )}
                      {sig.department && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sig.department}</p>
                      )}
                    </div>
                  </div>

                  {/* Badge row */}
                  <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${ti.cls}`}>
                      {isAr ? ti.ar : ti.en}
                    </span>
                    {sig.is_active
                      ? <span className="px-2 py-0.5 rounded-full text-[11px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{isAr ? 'نشط' : 'Active'}</span>
                      : <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-500 dark:bg-gray-700">{isAr ? 'معطل' : 'Inactive'}</span>
                    }
                    {isExpired && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        {isAr ? 'منتهية' : 'Expired'}
                      </span>
                    )}
                    {sig.requires_2fa && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">2FA</span>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2.5 flex items-center justify-between bg-gray-50/50 dark:bg-gray-700/20">
                    <button
                      onClick={() => handleToggleDefault(sig)}
                      className={clsx(
                        'flex items-center gap-1 text-xs font-medium transition-colors',
                        sig.is_default ? 'text-amber-600 hover:text-amber-700' : 'text-gray-400 hover:text-amber-500'
                      )}
                    >
                      {sig.is_default
                        ? <StarSolidIcon className="h-3.5 w-3.5 text-amber-500" />
                        : <StarIcon className="h-3.5 w-3.5" />
                      }
                      {sig.is_default ? (isAr ? 'افتراضي' : 'Default') : (isAr ? 'تعيين افتراضي' : 'Set Default')}
                    </button>
                    <div className="flex gap-1">
                      {can('digital_signatures:edit') && (
                        <button
                          onClick={() => openEdit(sig)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      )}
                      {can('digital_signatures:delete') && (
                        <button
                          onClick={() => { setDeletingId(sig.id); setConfirmOpen(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId
          ? (isAr ? 'تعديل التوقيع' : 'Edit Signature')
          : (isAr ? 'إضافة توقيع جديد' : 'Add New Signature')}
        size="xl"
      >
        <div className="space-y-5">

          {/* User link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <UserCircleIcon className="h-4 w-4 inline mr-1 text-indigo-500" />
              {isAr ? 'ربط بمستخدم' : 'Link to User'}
              <span className="text-xs text-gray-400 ms-2">{isAr ? 'اختياري' : 'optional'}</span>
            </label>
            <select
              value={String(form.user_id)}
              onChange={e => handleUserChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="">{isAr ? '— بدون ربط مستخدم —' : '— No user linked —'}</option>
              {users.map(u => (
                <option key={u.id} value={String(u.id)}>
                  {u.full_name} | {u.email}{u.roles?.length ? ` — ${u.roles.slice(0, 2).join(', ')}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={isAr ? 'الاسم بالعربية *' : 'Arabic Name *'}
              value={form.signature_name_ar}
              onChange={e => setForm(f => ({ ...f, signature_name_ar: e.target.value }))}
              dir="rtl"
              required
            />
            <Input
              label={isAr ? 'الاسم بالإنجليزية *' : 'English Name *'}
              value={form.signature_name_en}
              onChange={e => setForm(f => ({ ...f, signature_name_en: e.target.value }))}
              required
            />
          </div>

          {/* Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={isAr ? 'المسمى الوظيفي (عربي)' : 'Title (Arabic)'}
              value={form.signature_title_ar}
              onChange={e => setForm(f => ({ ...f, signature_title_ar: e.target.value }))}
              dir="rtl"
            />
            <Input
              label={isAr ? 'المسمى الوظيفي (إنجليزي)' : 'Title (English)'}
              value={form.signature_title_en}
              onChange={e => setForm(f => ({ ...f, signature_title_en: e.target.value }))}
            />
          </div>

          {/* Department + Authority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={isAr ? 'القسم / الإدارة' : 'Department'}
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            />
            <Input
              label={isAr ? 'جهة التفويض / الصلاحية' : 'Signing Authority'}
              value={form.signature_authority}
              onChange={e => setForm(f => ({ ...f, signature_authority: e.target.value }))}
            />
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isAr ? 'نوع التوقيع' : 'Signature Type'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'manual',              ar: 'يدوي / صورة',    en: 'Image / Manual',  Icon: PencilSquareIcon },
                { value: 'digital_certificate', ar: 'شهادة رقمية',    en: 'Digital Cert.',   Icon: ShieldCheckIcon },
                { value: 'biometric',           ar: 'بيومتري',         en: 'Biometric',       Icon: UserCircleIcon },
              ].map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, signature_type: t.value as any }))}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-medium transition-all',
                    form.signature_type === t.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300'
                  )}
                >
                  <t.Icon className="h-5 w-5" />
                  {isAr ? t.ar : t.en}
                </button>
              ))}
            </div>
          </div>

          {/* Image upload */}
          {form.signature_type !== 'digital_certificate' && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {isAr ? 'صورة التوقيع / الختم' : 'Signature / Stamp Image'}
              </label>
              <div className="flex items-start gap-4">
                <div
                  className={clsx(
                    'flex-shrink-0 w-32 h-20 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-colors',
                    (previewImage || form.signature_image_url)
                      ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-400'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {(previewImage || form.signature_image_url) ? (
                    <img
                      src={previewImage || form.signature_image_url}
                      alt="preview"
                      className="max-w-full max-h-full object-contain p-1"
                    />
                  ) : (
                    <div className="text-center">
                      <PhotoIcon className="h-7 w-7 text-gray-300 dark:text-gray-600 mx-auto" />
                      <p className="text-[10px] text-gray-400 mt-1">{isAr ? 'اضغط للرفع' : 'Click to upload'}</p>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/svg+xml,image/gif"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
                  />
                  <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <PhotoIcon className="h-4 w-4 mr-1.5" />
                    {isAr ? 'رفع صورة' : 'Upload Image'}
                  </Button>
                  <p className="text-xs text-gray-400">PNG, JPG, SVG — {isAr ? 'مقاس مثالي 400×120' : 'Best 400×120 px'}</p>
                  {(previewImage || form.signature_image_url) && !form.signature_image_url.startsWith('data:') && (
                    <Input
                      label={isAr ? 'رابط الصورة' : 'Image URL'}
                      value={form.signature_image_url}
                      onChange={e => { setForm(f => ({ ...f, signature_image_url: e.target.value })); setPreviewImage(e.target.value); }}
                      placeholder="https://..."
                    />
                  )}
                  {(previewImage || form.signature_image_url) && (
                    <button
                      type="button"
                      onClick={() => { setPreviewImage(''); setForm(f => ({ ...f, signature_image_url: '' })); }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      {isAr ? '× حذف الصورة' : '× Remove image'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Certificate fields */}
          {form.signature_type === 'digital_certificate' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-purple-50/60 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
              <Input
                label={isAr ? 'جهة الإصدار' : 'Certificate Issuer'}
                value={form.certificate_issuer}
                onChange={e => setForm(f => ({ ...f, certificate_issuer: e.target.value }))}
              />
              <Input
                label={isAr ? 'الرقم التسلسلي' : 'Serial Number'}
                value={form.certificate_serial}
                onChange={e => setForm(f => ({ ...f, certificate_serial: e.target.value }))}
              />
              <Input
                label={isAr ? 'تاريخ الإصدار' : 'Issue Date'}
                type="date"
                value={form.certificate_issued_date}
                onChange={e => setForm(f => ({ ...f, certificate_issued_date: e.target.value }))}
              />
              <Input
                label={isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}
                type="date"
                value={form.certificate_expiry_date}
                onChange={e => setForm(f => ({ ...f, certificate_expiry_date: e.target.value }))}
              />
            </div>
          )}

          {/* Flags */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{isAr ? 'نشط' : 'Active'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_default}
                onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{isAr ? 'افتراضي للشركة' : 'Company Default'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requires_2fa}
                onChange={e => setForm(f => ({ ...f, requires_2fa: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{isAr ? 'يتطلب تحقق مزدوج' : 'Requires 2FA'}</span>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingId ? (isAr ? 'حفظ التغييرات' : 'Save Changes') : (isAr ? 'إنشاء التوقيع' : 'Create Signature')}
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { if (!deleting) { setConfirmOpen(false); setDeletingId(null); } }}
        onConfirm={handleDeleteConfirm}
        title={isAr ? 'حذف التوقيع' : 'Delete Signature'}
        message={isAr ? 'سيتم حذف هذا التوقيع نهائياً. هذا الإجراء لا يمكن التراجع عنه.' : 'This signature will be permanently deleted. This action cannot be undone.'}
        confirmText={isAr ? 'حذف' : 'Delete'}
        cancelText={isAr ? 'إلغاء' : 'Cancel'}
        variant="danger"
        loading={deleting}
      />
    </MainLayout>
  );
}
