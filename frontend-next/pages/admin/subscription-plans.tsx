/**
 * ============================================================================
 * SUBSCRIPTION PLANS - Premium Plan Management
 * ============================================================================
 * Plan cards with pricing, limits, features, subscriber counts,
 * edit modal, create modal, and toggle active/inactive.
 *
 * @module pages/admin/subscription-plans
 * @version 2.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/hooks/useToast';
import { useCurrencies } from '@/hooks/useReferenceData';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  CreditCardIcon,
  UsersIcon,
  BuildingOffice2Icon,
  CircleStackIcon,
  CubeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

/* ── Types ── */
interface Plan {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  monthly_price: number;
  annual_price: number;
  currency: string;
  max_users: number;
  max_companies: number;
  max_storage_gb?: number;
  features: Record<string, any>;
  tenant_count: number;
  is_active: boolean;
  description?: string;
}

interface PlanFormData {
  name: string;
  name_ar: string;
  code: string;
  monthly_price: number;
  annual_price: number;
  currency: string;
  max_users: number;
  max_companies: number;
  max_storage_gb: number;
  description: string;
  is_active: boolean;
}

/* ── Constants ── */
const PLAN_THEMES: Record<string, { icon: string; color: string; borderColor: string; bgColor: string; textColor: string }> = {
  Free: { icon: '🆓', color: '#6B7280', borderColor: 'border-gray-300 dark:border-slate-600', bgColor: 'bg-gray-50 dark:bg-gray-900/20', textColor: 'text-gray-600' },
  Starter: { icon: '⚡', color: '#3B82F6', borderColor: 'border-blue-400 dark:border-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-600' },
  Basic: { icon: '⚡', color: '#3B82F6', borderColor: 'border-blue-400 dark:border-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-600' },
  Pro: { icon: '🚀', color: '#8B5CF6', borderColor: 'border-purple-400 dark:border-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20', textColor: 'text-purple-600' },
  Professional: { icon: '🚀', color: '#8B5CF6', borderColor: 'border-purple-400 dark:border-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20', textColor: 'text-purple-600' },
  Enterprise: { icon: '🏢', color: '#F59E0B', borderColor: 'border-amber-400 dark:border-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-600' },
};

const defaultTheme = { icon: '📦', color: '#6B7280', borderColor: 'border-gray-300 dark:border-slate-600', bgColor: 'bg-gray-50 dark:bg-gray-900/20', textColor: 'text-gray-600' };

function getTheme(name: string) { return PLAN_THEMES[name] || defaultTheme; }

function getFeatureList(features: any): string[] {
  if (!features || typeof features !== 'object') return [];
  const list: string[] = [];
  if (features.modules) {
    Object.entries(features.modules).forEach(([key, val]) => {
      if (val) list.push(key.replace(/_/g, ' '));
    });
  }
  if (features.support?.level) list.push(`${features.support.level} support`);
  if (features.security?.two_factor) list.push('Two-factor auth');
  if (features.security?.sso) list.push('SSO');
  if (features.integrations) {
    Object.entries(features.integrations).forEach(([key, val]) => {
      if (val) list.push(key.replace(/_/g, ' '));
    });
  }
  return list;
}

const emptyForm: PlanFormData = {
  name: '', name_ar: '', code: '', monthly_price: 0, annual_price: 0,
  currency: 'SAR', max_users: 5, max_companies: 1, max_storage_gb: 5, description: '', is_active: true,
};

/* ── Main Page ── */
export default function SubscriptionPlansPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const { showToast } = useToast();
  const { currencies: currencyList } = useCurrencies();
  const isRTL = locale === 'ar';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { setLoading(false); return; }
      const res = await fetch('/api/subscription-plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPlans(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
    } catch {
      showToast('error', isRTL ? 'فشل في تحميل الخطط' : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleToggle = async (plan: Plan) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/subscription-plans/${plan.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', isRTL ? 'تم تحديث الخطة' : 'Plan updated');
      fetchPlans();
    } catch {
      showToast('error', isRTL ? 'فشل في التحديث' : 'Failed to update');
    }
  };

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      name_ar: plan.name_ar || '',
      code: plan.code || '',
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      currency: plan.currency || 'SAR',
      max_users: plan.max_users,
      max_companies: plan.max_companies,
      max_storage_gb: plan.max_storage_gb || 10,
      description: plan.description || '',
      is_active: plan.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', isRTL ? 'اسم الخطة مطلوب' : 'Plan name is required');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const method = editingPlan ? 'PUT' : 'POST';
      const url = editingPlan ? `/api/subscription-plans/${editingPlan.id}` : '/api/subscription-plans';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', editingPlan
        ? (isRTL ? 'تم تحديث الخطة بنجاح' : 'Plan updated successfully')
        : (isRTL ? 'تم إنشاء الخطة بنجاح' : 'Plan created successfully'));
      setShowModal(false);
      fetchPlans();
    } catch {
      showToast('error', isRTL ? 'فشل في الحفظ' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.tenant_count > 0) {
      showToast('error', isRTL ? 'لا يمكن حذف خطة لها مشتركون' : 'Cannot delete a plan with subscribers');
      setConfirmDelete(null);
      return;
    }
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/subscription-plans/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      showToast('success', isRTL ? 'تم حذف الخطة' : 'Plan deleted');
      setConfirmDelete(null);
      fetchPlans();
    } catch {
      showToast('error', isRTL ? 'فشل في الحذف' : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const totalSubscribers = plans.reduce((s, p) => s + (p.tenant_count || 0), 0);

  return (
    <MainLayout>
      <Head>
        <title>{isRTL ? 'خطط الاشتراك' : 'Subscription Plans'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {isRTL ? '💎 خطط الاشتراك' : '💎 Subscription Plans'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isRTL ? `${plans.length} خطط — ${totalSubscribers} مشترك إجمالي` : `${plans.length} plans — ${totalSubscribers} total subscribers`}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            {isRTL ? 'خطة جديدة' : 'Create Plan'}
          </button>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
                <div className="h-12 w-12 bg-gray-200 dark:bg-slate-600 rounded-full mb-4" />
                <div className="h-5 bg-gray-200 dark:bg-slate-600 rounded w-24 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-16 mb-6" />
                <div className="h-8 bg-gray-200 dark:bg-slate-600 rounded w-28 mb-6" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : plans.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <CreditCardIcon className="h-14 w-14 mx-auto text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                {isRTL ? 'لا توجد خطط بعد' : 'No plans configured'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {isRTL ? 'أنشئ أول خطة اشتراك للبدء' : 'Create your first plan to get started'}
              </p>
            </div>
          ) : (
            plans.map((plan) => {
              const theme = getTheme(plan.name);
              const features = getFeatureList(plan.features);
              return (
                <div
                  key={plan.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border-2 ${theme.borderColor} p-6 flex flex-col transition-all duration-200 hover:shadow-xl hover:-translate-y-1`}
                  style={{ borderTopWidth: '4px', borderTopColor: theme.color }}
                >
                  {/* Icon & Toggle */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${theme.bgColor}`}>
                      {theme.icon}
                    </div>
                    <button
                      onClick={() => handleToggle(plan)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${plan.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                      title={plan.is_active ? (isRTL ? 'مفعّلة' : 'Active') : (isRTL ? 'معطّلة' : 'Inactive')}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${plan.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Name */}
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-0.5">{plan.name}</h3>
                  {plan.name_ar && <p className="text-xs text-gray-400 mb-4">{plan.name_ar}</p>}

                  {/* Price */}
                  <div className="mb-5">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{plan.monthly_price}</span>
                    <span className="text-sm text-gray-400 ml-1">{plan.currency || 'SAR'}/{isRTL ? 'شهر' : 'mo'}</span>
                    {plan.annual_price > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {isRTL ? 'سنوي:' : 'Annual:'} {plan.annual_price} {plan.currency || 'SAR'}
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <UsersIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {isRTL ? 'الحد الأقصى:' : 'Max:'} <strong>{plan.max_users}</strong> {isRTL ? 'مستخدم' : 'users'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BuildingOffice2Icon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {isRTL ? 'الحد الأقصى:' : 'Max:'} <strong>{plan.max_companies}</strong> {isRTL ? 'شركة' : 'companies'}
                      </span>
                    </div>
                    {plan.max_storage_gb && (
                      <div className="flex items-center gap-2 text-sm">
                        <CircleStackIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">
                          <strong>{plan.max_storage_gb}</strong> GB {isRTL ? 'تخزين' : 'storage'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Subscriber count */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {plan.tenant_count} {isRTL ? 'مشترك' : 'subscribers'}
                  </div>

                  {/* Features */}
                  {features.length > 0 && (
                    <div className="space-y-1.5 flex-1 mb-5">
                      {features.slice(0, 6).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <CheckIcon className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="capitalize">{f}</span>
                        </div>
                      ))}
                      {features.length > 6 && (
                        <p className="text-xs text-gray-400 mt-1">+{features.length - 6} {isRTL ? 'المزيد' : 'more'}</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100 dark:border-slate-700">
                    <button
                      onClick={() => openEdit(plan)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      {isRTL ? 'تعديل' : 'Edit'}
                    </button>
                    <button
                      onClick={() => plan.tenant_count > 0 ? showToast('error', isRTL ? 'لا يمكن حذف خطة لها مشتركون' : 'Cannot delete plan with subscribers') : setConfirmDelete(plan)}
                      disabled={plan.tenant_count > 0}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${
                        plan.tenant_count > 0
                          ? 'text-gray-400 dark:text-gray-600 border-gray-200 dark:border-slate-700 cursor-not-allowed opacity-50'
                          : 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                      title={plan.tenant_count > 0 ? (isRTL ? 'لا يمكن حذف خطة لها مشتركون' : 'Cannot delete plan with subscribers') : ''}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingPlan ? (isRTL ? '✏️ تعديل الخطة' : '✏️ Edit Plan') : (isRTL ? '➕ خطة جديدة' : '➕ New Plan')}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isRTL ? 'حدد تفاصيل الخطة والحدود' : 'Set plan details and limits'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Professional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}
                  </label>
                  <input
                    value={form.name_ar}
                    onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثال: احترافية"
                    dir="rtl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  {isRTL ? 'الكود' : 'Code'}
                </label>
                <input
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="PRO"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {isRTL ? 'السعر الشهري' : 'Monthly Price'}
                  </label>
                  <input
                    type="number" min="0"
                    value={form.monthly_price}
                    onChange={e => setForm(p => ({ ...p, monthly_price: +e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {isRTL ? 'السعر السنوي' : 'Annual Price'}
                  </label>
                  <input
                    type="number" min="0"
                    value={form.annual_price}
                    onChange={e => setForm(p => ({ ...p, annual_price: +e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {isRTL ? 'العملة' : 'Currency'}
                  </label>
                  <select
                    value={form.currency}
                    onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {currencyList.map(c => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {isRTL ? 'الحد الأقصى مستخدمين' : 'Max Users'}
                  </label>
                  <input
                    type="number" min="1"
                    value={form.max_users}
                    onChange={e => setForm(p => ({ ...p, max_users: +e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {isRTL ? 'الحد الأقصى شركات' : 'Max Companies'}
                  </label>
                  <input
                    type="number" min="1"
                    value={form.max_companies}
                    onChange={e => setForm(p => ({ ...p, max_companies: +e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {isRTL ? 'التخزين (GB)' : 'Storage (GB)'}
                  </label>
                  <input
                    type="number" min="1"
                    value={form.max_storage_gb}
                    onChange={e => setForm(p => ({ ...p, max_storage_gb: +e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  {isRTL ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {form.is_active ? (isRTL ? 'مفعّلة' : 'Active') : (isRTL ? 'معطّلة' : 'Inactive')}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {editingPlan ? (isRTL ? 'حفظ التعديلات' : 'Save Changes') : (isRTL ? 'إنشاء الخطة' : 'Create Plan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {isRTL ? 'حذف الخطة' : 'Delete Plan'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {isRTL ? `هل أنت متأكد من حذف "${confirmDelete.name}"؟` : `Are you sure you want to delete "${confirmDelete.name}"?`}
              </p>
              {confirmDelete.tenant_count > 0 && (
                <p className="text-sm text-red-600 font-medium mb-2">
                  ⚠ {isRTL ? `يوجد ${confirmDelete.tenant_count} مشترك في هذه الخطة` : `${confirmDelete.tenant_count} subscriber(s) on this plan`}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {isRTL ? 'هذا الإجراء لا يمكن التراجع عنه' : 'This action cannot be undone'}
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmDelete.tenant_count > 0}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {deleting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isRTL ? 'حذف نهائي' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
