/**
 * Edit Project Page
 * ==================
 * Form for editing an existing project.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../../../components/layout/MainLayout';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import SearchableSelect from '../../../../components/ui/SearchableSelect';
import { useToast } from '../../../../contexts/ToastContext';
import { useTranslation } from '../../../../hooks/useTranslation';
import { usePermissions } from '../../../../hooks/usePermissions';
import clsx from 'clsx';
// Token retrieved from localStorage directly
import {
  FolderIcon,
  ArrowLeftIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

// =============================================
// TYPES
// =============================================

interface ProjectType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface Project {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  level: number;
  project_level?: 'group' | 'master' | 'sub';
}

interface CostCenter {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email: string;
}

interface Vendor {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
}

interface FormData {
  code: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  project_level: 'group' | 'master' | 'sub';
  parent_project_id: string;
  project_type_id: string;
  manager_id: string;
  manager_name: string;
  vendor_id: string;
  cost_center_id: string;
  lc_number: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  budget: string;
  budget_materials: string;
  budget_labor: string;
  budget_services: string;
  budget_miscellaneous: string;
  status: string;
  priority: string;
  progress_percent: string;
  is_active: boolean;
  is_locked: boolean;
}

// =============================================
// API
// =============================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function EditProjectPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canEdit = hasAnyPermission(['projects:edit']);
  const isSuperAdmin = hasAnyPermission(['super_admin']) || hasAnyPermission(['projects:manage_hierarchy']);
  const canEditCode = isSuperAdmin;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    project_level: 'sub',
    parent_project_id: '',
    project_type_id: '',
    manager_id: '',
    manager_name: '',
    vendor_id: '',
    cost_center_id: '',
    lc_number: '',
    contract_number: '',
    start_date: '',
    end_date: '',
    budget: '0',
    budget_materials: '0',
    budget_labor: '0',
    budget_services: '0',
    budget_miscellaneous: '0',
    status: 'planned',
    priority: 'medium',
    progress_percent: '0',
    is_active: true,
    is_locked: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reference data
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Fetch project and reference data
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const [projectRes, typesRes, projectsRes, costCentersRes, usersRes, vendorsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/projects/${id}`, token),
        fetchWithAuth(`${API_BASE}/api/projects/types`, token),
        fetchWithAuth(`${API_BASE}/api/projects?limit=100`, token),
        fetchWithAuth(`${API_BASE}/api/cost-centers`, token).catch(() => ({ data: [] })),
        fetchWithAuth(`${API_BASE}/api/users`, token).catch(() => ({ data: [] })),
        fetchWithAuth(`${API_BASE}/api/vendors`, token).catch(() => ({ data: [] })),
      ]);

      const project = projectRes.data;
      setFormData({
        code: project.code || '',
        name: project.name || '',
        name_ar: project.name_ar || '',
        description: project.description || '',
        description_ar: project.description_ar || '',
        project_level: project.project_level || 'sub',
        parent_project_id: project.parent_project_id?.toString() || '',
        project_type_id: project.project_type_id?.toString() || '',
        manager_id: project.manager_id?.toString() || '',
        manager_name: project.manager_name || '',
        vendor_id: project.vendor_id?.toString() || '',
        cost_center_id: project.cost_center_id?.toString() || '',
        lc_number: project.lc_number || '',
        contract_number: project.contract_number || '',
        start_date: project.start_date?.split('T')[0] || '',
        end_date: project.end_date?.split('T')[0] || '',
        budget: project.budget?.toString() || '0',
        budget_materials: project.budget_materials?.toString() || '0',
        budget_labor: project.budget_labor?.toString() || '0',
        budget_services: project.budget_services?.toString() || '0',
        budget_miscellaneous: project.budget_miscellaneous?.toString() || '0',
        status: project.status || 'planned',
        priority: project.priority || 'medium',
        progress_percent: project.progress_percent?.toString() || '0',
        is_active: project.is_active ?? true,
        is_locked: project.is_locked ?? false,
      });

      setProjectTypes(typesRes.data || []);
      setProjects((projectsRes.data || []).filter((p: Project) => p.id !== Number(id)));
      setCostCenters(costCentersRes.data || []);
      setUsers(usersRes.data || []);
      setVendors(vendorsRes.data || []);
    } catch (err: any) {
      console.error('Failed to fetch project:', err);
      showToast(locale === 'ar' ? 'فشل تحميل المشروع' : 'Failed to load project', 'error');
      router.push('/projects');
    } finally {
      setLoading(false);
    }
  }, [id, showToast, locale, router]);

  useEffect(() => {
    if (canEdit) {
      fetchData();
    }
  }, [canEdit, fetchData]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = locale === 'ar' ? 'الاسم مطلوب' : 'Name is required';
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        newErrors.end_date = locale === 'ar' ? 'تاريخ الانتهاء يجب أن يكون بعد البداية' : 'End date must be after start date';
      }
    }

    const progress = parseInt(formData.progress_percent) || 0;
    if (progress < 0 || progress > 100) {
      newErrors.progress_percent = locale === 'ar' ? 'النسبة يجب أن تكون بين 0 و 100' : 'Progress must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const payload: any = {
        name: formData.name.trim(),
        name_ar: formData.name_ar.trim() || null,
        description: formData.description.trim() || null,
        description_ar: formData.description_ar.trim() || null,
        project_level: formData.project_level,
        parent_project_id: formData.parent_project_id ? parseInt(formData.parent_project_id) : null,
        project_type_id: formData.project_type_id ? parseInt(formData.project_type_id) : null,
        manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
        manager_name: formData.manager_name.trim() || null,
        vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : null,
        cost_center_id: formData.cost_center_id ? parseInt(formData.cost_center_id) : null,
        lc_number: formData.lc_number.trim() || null,
        contract_number: formData.contract_number.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: parseFloat(formData.budget) || 0,
        budget_materials: parseFloat(formData.budget_materials) || 0,
        budget_labor: parseFloat(formData.budget_labor) || 0,
        budget_services: parseFloat(formData.budget_services) || 0,
        budget_miscellaneous: parseFloat(formData.budget_miscellaneous) || 0,
        status: formData.status,
        priority: formData.priority,
        progress_percent: parseInt(formData.progress_percent) || 0,
        is_active: formData.is_active,
      };

      // Only super admin can change code
      if (canEditCode) {
        payload.code = formData.code.trim();
      }

      await fetchWithAuth(`${API_BASE}/api/projects/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      showToast(locale === 'ar' ? 'تم تحديث المشروع بنجاح' : 'Project updated successfully', 'success');
      router.push(`/projects/${id}`);
    } catch (err: any) {
      console.error('Failed to update project:', err);
      showToast(err.message || (locale === 'ar' ? 'فشل تحديث المشروع' : 'Failed to update project'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Access denied
  if (!canEdit) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'غير مصرح' : 'Access Denied'}</title>
        </Head>
        <div className="text-center py-12">
          <FolderIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h2>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'تحميل...' : 'Loading...'}</title>
        </Head>
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'تعديل المشروع - SLMS' : 'Edit Project - SLMS'}</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href={`/projects/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-2">
            <ArrowLeftIcon className="h-4 w-4" />
            {locale === 'ar' ? 'العودة للمشروع' : 'Back to Project'}
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <FolderIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'تعديل المشروع' : 'Edit Project'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formData.code}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              {locale === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'ar' ? 'الكود' : 'Code'}
                  {canEditCode && <span className="text-xs text-green-600 ml-2">(قابل للتعديل)</span>}
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  disabled={!canEditCode}
                  className={clsx(
                    'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white',
                    canEditCode 
                      ? 'bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  )}
                />
                {!canEditCode && (
                  <p className="text-xs text-slate-500 mt-1">
                    {locale === 'ar' ? 'تعديل الكود يتطلب صلاحية super_admin' : 'Editing code requires super_admin permission'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'ar' ? 'نوع المشروع' : 'Project Type'}
                </label>
                <select
                  name="project_type_id"
                  value={formData.project_type_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                  {projectTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {locale === 'ar' ? type.name_ar || type.name : type.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label={locale === 'ar' ? 'الاسم (إنجليزي) *' : 'Name (English) *'}
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
              />
              <Input
                label={locale === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
                name="name_ar"
                value={formData.name_ar}
                onChange={handleChange}
                dir="rtl"
              />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Hierarchy */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              {locale === 'ar' ? 'التبعية والتصنيف' : 'Hierarchy & Classification'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Level */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'ar' ? 'مستوى المشروع *' : 'Project Level *'}
                </label>
                <select
                  name="project_level"
                  value={formData.project_level}
                  onChange={(e) => {
                    const level = e.target.value as 'group' | 'master' | 'sub';
                    setFormData((prev) => ({
                      ...prev,
                      project_level: level,
                      parent_project_id: level === 'group' ? '' : prev.parent_project_id,
                      vendor_id: level === 'group' ? '' : prev.vendor_id,
                    }));
                  }}
                  disabled={formData.is_locked && !isSuperAdmin}
                  className={clsx(
                    'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500',
                    formData.is_locked && !isSuperAdmin && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <option value="group">{locale === 'ar' ? '📁 مجموعة (Level 1)' : '📁 Group (Level 1)'}</option>
                  <option value="master">{locale === 'ar' ? '📦 رئيسي (Level 2)' : '📦 Master (Level 2)'}</option>
                  <option value="sub">{locale === 'ar' ? '📄 فرعي (Level 3)' : '📄 Sub (Level 3)'}</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {formData.project_level === 'group' && (locale === 'ar' ? 'المجموعة: للتجميع المحاسبي فقط' : 'Group: For accounting grouping only')}
                  {formData.project_level === 'master' && (locale === 'ar' ? 'رئيسي: يجب تحديد المورد' : 'Master: Must assign vendor')}
                  {formData.project_level === 'sub' && (locale === 'ar' ? 'فرعي: يحمل التكاليف الفعلية' : 'Sub: Carries actual costs')}
                </p>
              </div>
              {/* Parent Project */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'ar' ? 'المشروع الأب' : 'Parent Project'}
                  {formData.project_level !== 'group' && ' *'}
                </label>
                <select
                  name="parent_project_id"
                  value={formData.parent_project_id}
                  onChange={handleChange}
                  disabled={formData.project_level === 'group' || (formData.is_locked && !isSuperAdmin)}
                  className={clsx(
                    'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500',
                    (formData.project_level === 'group' || (formData.is_locked && !isSuperAdmin)) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <option value="">
                    {formData.project_level === 'group' 
                      ? (locale === 'ar' ? '-- لا يوجد (مشروع رئيسي) --' : '-- None (Root Project) --')
                      : (locale === 'ar' ? '-- اختر المشروع الأب --' : '-- Select Parent --')}
                  </option>
                  {projects
                    .filter((p) => {
                      if (formData.project_level === 'master') return p.project_level === 'group';
                      if (formData.project_level === 'sub') return p.project_level === 'master';
                      return false;
                    })
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {locale === 'ar' ? p.name_ar || p.name : p.name}
                      </option>
                    ))}
                </select>
                {errors.parent_project_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.parent_project_id}</p>
                )}
              </div>
            </div>
          </div>

          {/* Vendor & Contract - only for master/sub */}
          {formData.project_level !== 'group' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                {locale === 'ar' ? 'المورد والعقد' : 'Vendor & Contract'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vendor - only for master level */}
                {formData.project_level === 'master' && (
                  <div className="md:col-span-2">
                    <SearchableSelect
                      label={locale === 'ar' ? 'المورد / المقاول *' : 'Vendor / Contractor *'}
                      options={vendors.map((v) => ({
                        value: v.id,
                        label: v.name,
                        labelAr: v.name_ar,
                        code: v.code,
                        searchText: `${v.code} ${v.name} ${v.name_ar || ''}`,
                      }))}
                      value={formData.vendor_id}
                      onChange={(val) => setFormData((prev) => ({ ...prev, vendor_id: val }))}
                      placeholder={locale === 'ar' ? '-- اختر المورد --' : '-- Select Vendor --'}
                      searchPlaceholder={locale === 'ar' ? 'ابحث بالاسم أو الكود...' : 'Search by name or code...'}
                      locale={locale}
                      name="vendor_id"
                    />
                    {errors.vendor_id && (
                      <p className="text-red-500 text-xs mt-1">{errors.vendor_id}</p>
                    )}
                  </div>
                )}
                {/* Sub projects inherit vendor from master - show info */}
                {formData.project_level === 'sub' && (
                  <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      ℹ️ {locale === 'ar' 
                        ? 'المشاريع الفرعية ترث المورد من المشروع الرئيسي تلقائياً' 
                        : 'Sub projects automatically inherit vendor from master project'}
                    </p>
                  </div>
                )}
                {/* LC Number */}
                <Input
                  label={locale === 'ar' ? 'رقم الاعتماد المستندي' : 'LC Number'}
                  name="lc_number"
                  value={formData.lc_number}
                  onChange={handleChange}
                  placeholder="LC-2026-001"
                />
                {/* Contract Number */}
                <Input
                  label={locale === 'ar' ? 'رقم العقد' : 'Contract Number'}
                  name="contract_number"
                  value={formData.contract_number}
                  onChange={handleChange}
                  placeholder="CON-2026-001"
                />
              </div>
            </div>
          )}

          {/* Management */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              {locale === 'ar' ? 'الإدارة والتعيين' : 'Management & Assignment'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'ar' ? 'مدير المشروع (من النظام)' : 'Project Manager (System User)'}
                </label>
                <select
                  name="manager_id"
                  value={formData.manager_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{locale === 'ar' ? '-- اختر من المستخدمين --' : '-- Select from Users --'}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || `${u.first_name} ${u.last_name}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'ar' ? 'اسم المدير (كتابة يدوية)' : 'Manager Name (Manual Entry)'}
                </label>
                <input
                  type="text"
                  name="manager_name"
                  value={formData.manager_name}
                  onChange={handleChange}
                  placeholder={locale === 'ar' ? 'أدخل اسم المدير إذا لم يكن في القائمة' : 'Enter manager name if not in list'}
                  disabled={!!formData.manager_id}
                  className={clsx(
                    'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500',
                    formData.manager_id && 'opacity-50 cursor-not-allowed'
                  )}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {locale === 'ar' ? 'يُستخدم إذا لم يتم اختيار مدير من القائمة أعلاه' : 'Used when no manager is selected from the list above'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'ar' ? 'مركز التكلفة' : 'Cost Center'}
                </label>
                <select
                  name="cost_center_id"
                  value={formData.cost_center_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {locale === 'ar' ? cc.name_ar || cc.name : cc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dates & Status */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              {locale === 'ar' ? 'التواريخ والحالة' : 'Dates & Status'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Input
                label={locale === 'ar' ? 'تاريخ البداية' : 'Start Date'}
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
              />
              <Input
                label={locale === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                error={errors.end_date}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'ar' ? 'الحالة' : 'Status'}
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="planned">{locale === 'ar' ? 'مخطط' : 'Planned'}</option>
                  <option value="in_progress">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                  <option value="on_hold">{locale === 'ar' ? 'معلق' : 'On Hold'}</option>
                  <option value="completed">{locale === 'ar' ? 'مكتمل' : 'Completed'}</option>
                  <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {locale === 'ar' ? 'الأولوية' : 'Priority'}
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">{locale === 'ar' ? 'منخفض' : 'Low'}</option>
                  <option value="medium">{locale === 'ar' ? 'متوسط' : 'Medium'}</option>
                  <option value="high">{locale === 'ar' ? 'عالي' : 'High'}</option>
                  <option value="critical">{locale === 'ar' ? 'حرج' : 'Critical'}</option>
                </select>
              </div>
              <Input
                label={locale === 'ar' ? 'نسبة الإنجاز %' : 'Progress %'}
                name="progress_percent"
                type="number"
                value={formData.progress_percent}
                onChange={handleChange}
                error={errors.progress_percent}
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              {locale === 'ar' ? 'الميزانية' : 'Budget'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Input
                label={locale === 'ar' ? 'الميزانية الإجمالية' : 'Total Budget'}
                name="budget"
                type="number"
                value={formData.budget}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
              <Input
                label={locale === 'ar' ? 'المواد' : 'Materials'}
                name="budget_materials"
                type="number"
                value={formData.budget_materials}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
              <Input
                label={locale === 'ar' ? 'العمالة' : 'Labor'}
                name="budget_labor"
                type="number"
                value={formData.budget_labor}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
              <Input
                label={locale === 'ar' ? 'الخدمات' : 'Services'}
                name="budget_services"
                type="number"
                value={formData.budget_services}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
              <Input
                label={locale === 'ar' ? 'متنوعة' : 'Misc'}
                name="budget_miscellaneous"
                type="number"
                value={formData.budget_miscellaneous}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Active */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {locale === 'ar' ? 'المشروع نشط' : 'Project is active'}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/projects/${id}`)}
              disabled={submitting}
            >
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" loading={submitting}>
              <CheckIcon className="h-4 w-4" />
              {locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
