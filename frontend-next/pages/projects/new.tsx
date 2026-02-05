/**
 * Create Project Page - Wizard Style
 * ====================================
 * Professional form with step-by-step wizard:
 * 1. Select project level → shows relevant parent options
 * 2. Auto-generates code based on parent hierarchy
 * 3. Super admin can edit code
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';
import {
  FolderIcon,
  ArrowLeftIcon,
  CheckIcon,
  FolderOpenIcon,
  CubeIcon,
  DocumentIcon,
  PencilIcon,
  LockClosedIcon,
  SparklesIcon,
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
  vendor_id?: number;
  vendor_name?: string;
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
  is_active: boolean;
}

const initialFormData: FormData = {
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
  status: 'active',
  priority: 'medium',
  is_active: true,
};

// =============================================
// API
// =============================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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
    throw new Error(error.error?.message || error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// =============================================
// LEVEL CARD COMPONENT
// =============================================

interface LevelCardProps {
  level: 'group' | 'master' | 'sub';
  selected: boolean;
  onClick: () => void;
  locale: string;
  disabled?: boolean;
}

function LevelCard({ level, selected, onClick, locale, disabled }: LevelCardProps) {
  const config = {
    group: {
      icon: FolderOpenIcon,
      title: locale === 'ar' ? 'مجموعة' : 'Group',
      subtitle: locale === 'ar' ? 'المستوى الأول - للتجميع المحاسبي' : 'Level 1 - Accounting grouping',
      description: locale === 'ar' 
        ? 'تستخدم لتجميع المشاريع الرئيسية تحت فئة واحدة. لا تحمل تكاليف مباشرة.' 
        : 'Used to group master projects under one category. Does not carry direct costs.',
    },
    master: {
      icon: CubeIcon,
      title: locale === 'ar' ? 'رئيسي' : 'Master',
      subtitle: locale === 'ar' ? 'المستوى الثاني - يرتبط بالمورد' : 'Level 2 - Linked to vendor',
      description: locale === 'ar'
        ? 'المشروع الرئيسي يرتبط بمورد واحد. جميع المشاريع الفرعية ترث المورد تلقائياً.'
        : 'Master project is linked to one vendor. All sub-projects inherit the vendor automatically.',
    },
    sub: {
      icon: DocumentIcon,
      title: locale === 'ar' ? 'فرعي' : 'Sub',
      subtitle: locale === 'ar' ? 'المستوى الثالث - يحمل التكاليف' : 'Level 3 - Carries costs',
      description: locale === 'ar'
        ? 'المشروع الفرعي يحمل التكاليف الفعلية والمصاريف. يرتبط بمشروع رئيسي.'
        : 'Sub-project carries actual costs and expenses. Linked to a master project.',
    },
  };

  const { icon: Icon, title, subtitle, description } = config[level];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'relative p-4 rounded-xl border-2 transition-all text-left w-full',
        selected
          ? level === 'group'
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-500'
            : level === 'master'
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500'
            : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-500'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {selected && (
        <div className={clsx(
          'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center',
          level === 'group' ? 'bg-indigo-500' : level === 'master' ? 'bg-emerald-500' : 'bg-amber-500',
        )}>
          <CheckIcon className="h-4 w-4 text-white" />
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className={clsx(
          'p-2 rounded-lg',
          level === 'group' ? 'bg-indigo-100 dark:bg-indigo-900/30' : level === 'master' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30',
        )}>
          <Icon className={clsx(
            'h-6 w-6',
            level === 'group' ? 'text-indigo-600 dark:text-indigo-400' : level === 'master' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
          )} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 dark:text-white">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">{description}</p>
        </div>
      </div>
    </button>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function NewProjectPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canCreate = hasAnyPermission(['projects:create']);
  const isSuperAdmin = hasAnyPermission(['super_admin']) || hasAnyPermission(['projects:manage_hierarchy']);
  const canEditCode = isSuperAdmin;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [codeEditing, setCodeEditing] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Reference data
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Filtered projects based on level
  const filteredParentProjects = useMemo(() => {
    if (formData.project_level === 'group') return [];
    if (formData.project_level === 'master') {
      return projects.filter((p) => p.project_level === 'group');
    }
    if (formData.project_level === 'sub') {
      return projects.filter((p) => p.project_level === 'master');
    }
    return [];
  }, [projects, formData.project_level]);

  // Selected parent project
  const selectedParent = useMemo(() => {
    if (!formData.parent_project_id) return null;
    return projects.find((p) => p.id === parseInt(formData.parent_project_id));
  }, [projects, formData.parent_project_id]);

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const [typesRes, projectsRes, costCentersRes, usersRes, vendorsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/projects/types`, token).catch(() => ({ data: [] })),
        fetchWithAuth(`${API_BASE}/api/projects?limit=500`, token),
        fetchWithAuth(`${API_BASE}/api/cost-centers`, token).catch(() => ({ data: [] })),
        fetchWithAuth(`${API_BASE}/api/users`, token).catch(() => ({ data: [] })),
        fetchWithAuth(`${API_BASE}/api/vendors`, token).catch(() => ({ data: [] })),
      ]);

      setProjectTypes(typesRes.data || []);
      setProjects(projectsRes.data || []);
      setCostCenters(costCentersRes.data || []);
      setUsers(usersRes.data || []);
      setVendors(vendorsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch reference data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canCreate) {
      fetchReferenceData();
    }
  }, [canCreate, fetchReferenceData]);

  // Generate code - called directly with parameters to avoid stale closure issues
  const generateCode = async (level: string, parentId: string | null) => {
    if (codeEditing) return; // Don't override if user is editing
    
    try {
      setGeneratingCode(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      
      let url = `${API_BASE}/api/projects/next-code?project_level=${level}`;
      if (parentId) {
        url += `&parent_id=${parentId}`;
      }
      
      console.log('Generating code with URL:', url);
      const res = await fetchWithAuth(url, token);
      console.log('Generated code response:', res);
      if (res.data?.code) {
        setFormData((prev) => ({ ...prev, code: res.data.code }));
      }
    } catch (err) {
      console.error('Failed to generate code:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  // Auto-generate code when parent changes (for master/sub) or level changes (for group)
  useEffect(() => {
    console.log('=== CODE GENERATION EFFECT ===');
    console.log('Level:', formData.project_level);
    console.log('Parent ID:', formData.parent_project_id);
    console.log('Code Editing:', codeEditing);
    
    if (formData.project_level === 'group' && !codeEditing) {
      console.log('Calling generateCode for GROUP');
      generateCode('group', null);
    } else if (formData.parent_project_id && !codeEditing) {
      console.log('Calling generateCode for', formData.project_level, 'with parent', formData.parent_project_id);
      generateCode(formData.project_level, formData.parent_project_id);
    } else {
      console.log('NOT calling generateCode - conditions not met');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.project_level, formData.parent_project_id, codeEditing]);

  // Handle level change
  const handleLevelChange = (level: 'group' | 'master' | 'sub') => {
    setFormData((prev) => ({
      ...prev,
      project_level: level,
      parent_project_id: '',
      vendor_id: '',
      code: '', // Reset code for regeneration
    }));
    setCodeEditing(false);
  };

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

  // Handle parent change
  const handleParentChange = (parentId: string) => {
    setFormData((prev) => ({
      ...prev,
      parent_project_id: parentId,
      code: '', // Reset code for regeneration
    }));
    setCodeEditing(false);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Code is only required if user is manually editing it
    if (codeEditing && !formData.code.trim()) {
      newErrors.code = locale === 'ar' ? 'الكود مطلوب' : 'Code is required';
    } else if (formData.code.length > 50) {
      newErrors.code = locale === 'ar' ? 'الكود طويل جداً' : 'Code is too long';
    }

    if (!formData.name.trim()) {
      newErrors.name = locale === 'ar' ? 'الاسم مطلوب' : 'Name is required';
    }

    // Hierarchy validation
    if (formData.project_level !== 'group' && !formData.parent_project_id) {
      newErrors.parent_project_id = locale === 'ar' 
        ? 'يجب اختيار المشروع الأب' 
        : 'Parent project is required';
    }

    // Vendor required for master level
    if (formData.project_level === 'master' && !formData.vendor_id) {
      newErrors.vendor_id = locale === 'ar' 
        ? 'يجب اختيار المورد للمشروع الرئيسي' 
        : 'Vendor is required for master projects';
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        newErrors.end_date = locale === 'ar' ? 'تاريخ الانتهاء يجب أن يكون بعد البداية' : 'End date must be after start date';
      }
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

      // Only include code if user manually edited it (super_admin)
      // Otherwise, let the backend auto-generate it
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
        is_active: formData.is_active,
      };

      // Only send code if user explicitly edited it (super_admin manual override)
      console.log('codeEditing:', codeEditing, 'formData.code:', formData.code);
      if (codeEditing && formData.code.trim()) {
        payload.code = formData.code.trim();
        console.log('User manually set code:', payload.code);
      } else {
        console.log('Code will be auto-generated by backend');
      }

      console.log('Submitting project with payload:', JSON.stringify(payload, null, 2));

      await fetchWithAuth(`${API_BASE}/api/projects`, token, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast(locale === 'ar' ? 'تم إنشاء المشروع بنجاح' : 'Project created successfully', 'success');
      router.push('/projects');
    } catch (err: any) {
      console.error('Failed to create project:', err);
      showToast(err.message || (locale === 'ar' ? 'فشل إنشاء المشروع' : 'Failed to create project'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total budget from breakdown
  const totalBudgetBreakdown = 
    (parseFloat(formData.budget_materials) || 0) +
    (parseFloat(formData.budget_labor) || 0) +
    (parseFloat(formData.budget_services) || 0) +
    (parseFloat(formData.budget_miscellaneous) || 0);

  // Access denied
  if (!canCreate) {
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
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية إنشاء المشاريع.' : "You don't have permission to create projects."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'مشروع جديد - SLMS' : 'New Project - SLMS'}</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-2">
            <ArrowLeftIcon className="h-4 w-4" />
            {locale === 'ar' ? 'العودة للمشاريع' : 'Back to Projects'}
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <FolderIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'مشروع جديد' : 'New Project'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar' ? 'حدد نوع المشروع ثم أدخل البيانات المطلوبة' : 'Select project type then enter required data'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Step 1: Project Level Selection */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                1
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {locale === 'ar' ? 'اختر مستوى المشروع' : 'Select Project Level'}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LevelCard
                level="group"
                selected={formData.project_level === 'group'}
                onClick={() => handleLevelChange('group')}
                locale={locale}
              />
              <LevelCard
                level="master"
                selected={formData.project_level === 'master'}
                onClick={() => handleLevelChange('master')}
                locale={locale}
              />
              <LevelCard
                level="sub"
                selected={formData.project_level === 'sub'}
                onClick={() => handleLevelChange('sub')}
                locale={locale}
              />
            </div>
          </div>

          {/* Step 2: Parent Selection (for master/sub) */}
          {formData.project_level !== 'group' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  2
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {formData.project_level === 'master' 
                    ? (locale === 'ar' ? 'اختر المجموعة الأب' : 'Select Parent Group')
                    : (locale === 'ar' ? 'اختر المشروع الرئيسي' : 'Select Master Project')
                  }
                </h3>
              </div>
              
              {filteredParentProjects.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <FolderIcon className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                  <p className="text-slate-600 dark:text-slate-300">
                    {formData.project_level === 'master'
                      ? (locale === 'ar' ? 'لا توجد مجموعات. أنشئ مجموعة أولاً.' : 'No groups found. Create a group first.')
                      : (locale === 'ar' ? 'لا توجد مشاريع رئيسية. أنشئ مشروعاً رئيسياً أولاً.' : 'No master projects found. Create a master project first.')
                    }
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    onClick={() => handleLevelChange(formData.project_level === 'master' ? 'group' : 'master')}
                  >
                    {formData.project_level === 'master'
                      ? (locale === 'ar' ? 'إنشاء مجموعة' : 'Create Group')
                      : (locale === 'ar' ? 'إنشاء مشروع رئيسي' : 'Create Master Project')
                    }
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredParentProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => handleParentChange(project.id.toString())}
                      className={clsx(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        formData.parent_project_id === project.id.toString()
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400">{project.code}</div>
                      <div className="font-medium text-slate-900 dark:text-white truncate">
                        {locale === 'ar' ? project.name_ar || project.name : project.name}
                      </div>
                      {project.vendor_name && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          🏢 {project.vendor_name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {errors.parent_project_id && (
                <p className="text-red-500 text-sm mt-2">{errors.parent_project_id}</p>
              )}
            </div>
          )}

          {/* Step 3: Vendor Selection (for master only) */}
          {formData.project_level === 'master' && formData.parent_project_id && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  3
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {locale === 'ar' ? 'اختر المورد / المقاول' : 'Select Vendor / Contractor'}
                </h3>
              </div>
              <SearchableSelect
                label=""
                options={vendors.map((v) => ({
                  value: v.id,
                  label: v.name,
                  labelAr: v.name_ar,
                  code: v.code,
                  searchText: `${v.code} ${v.name} ${v.name_ar || ''}`,
                }))}
                value={formData.vendor_id}
                onChange={(val) => setFormData((prev) => ({ ...prev, vendor_id: val }))}
                placeholder={locale === 'ar' ? 'ابحث عن المورد...' : 'Search for vendor...'}
                searchPlaceholder={locale === 'ar' ? 'ابحث بالاسم أو الكود...' : 'Search by name or code...'}
                locale={locale}
                name="vendor_id"
              />
              {errors.vendor_id && (
                <p className="text-red-500 text-sm mt-2">{errors.vendor_id}</p>
              )}
            </div>
          )}

          {/* Sub project vendor info */}
          {formData.project_level === 'sub' && formData.parent_project_id && selectedParent?.vendor_name && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
              <div className="flex items-center gap-2">
                <CheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300">
                  {locale === 'ar' ? 'المورد الموروث:' : 'Inherited Vendor:'} <strong>{selectedParent.vendor_name}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Project Details - show after required selections */}
          {(formData.project_level === 'group' || 
            (formData.project_level === 'master' && formData.parent_project_id && formData.vendor_id) ||
            (formData.project_level === 'sub' && formData.parent_project_id)) && (
            <>
              {/* Code & Basic Info */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                  {locale === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
                </h3>
                
                {/* Auto-generated Code */}
                <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4 text-indigo-500" />
                      {locale === 'ar' ? 'كود المشروع (تلقائي)' : 'Project Code (Auto)'}
                    </label>
                    {canEditCode && (
                      <button
                        type="button"
                        onClick={() => setCodeEditing(!codeEditing)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {codeEditing ? <LockClosedIcon className="h-3 w-3" /> : <PencilIcon className="h-3 w-3" />}
                        {codeEditing 
                          ? (locale === 'ar' ? 'قفل التعديل' : 'Lock Editing')
                          : (locale === 'ar' ? 'تعديل يدوي' : 'Edit Manually')
                        }
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={(e) => {
                        if (codeEditing) {
                          setFormData((prev) => ({ ...prev, code: e.target.value }));
                        }
                      }}
                      disabled={!codeEditing || generatingCode}
                      className={clsx(
                        'flex-1 px-4 py-3 font-mono text-lg border rounded-lg',
                        codeEditing
                          ? 'bg-white dark:bg-slate-700 border-indigo-300 dark:border-indigo-600 text-slate-900 dark:text-white'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                      )}
                      placeholder={generatingCode ? '...' : 'PRJ-001'}
                    />
                    {!codeEditing && (
                      <button
                        type="button"
                        onClick={() => generateCode(formData.project_level, formData.parent_project_id || null)}
                        disabled={generatingCode}
                        className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors"
                        title={locale === 'ar' ? 'إعادة التوليد' : 'Regenerate'}
                      >
                        <SparklesIcon className={clsx('h-5 w-5 text-indigo-600', generatingCode && 'animate-spin')} />
                      </button>
                    )}
                  </div>
                  {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
                  {!canEditCode && (
                    <p className="text-xs text-slate-500 mt-1">
                      {locale === 'ar' ? 'تعديل الكود يتطلب صلاحية المسؤول' : 'Code editing requires admin permission'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div />
                  <Input
                    label={locale === 'ar' ? 'الاسم (إنجليزي) *' : 'Name (English) *'}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Project Name"
                    error={errors.name}
                  />
                  <Input
                    label={locale === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'}
                    name="name_ar"
                    value={formData.name_ar}
                    onChange={handleChange}
                    placeholder="اسم المشروع"
                    dir="rtl"
                  />
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {locale === 'ar' ? 'الوصف' : 'Description'}
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      placeholder={locale === 'ar' ? 'وصف المشروع...' : 'Project description...'}
                    />
                  </div>
                </div>
              </div>

              {/* Contract Details - for master/sub */}
              {formData.project_level !== 'group' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                    {locale === 'ar' ? 'بيانات العقد' : 'Contract Details'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label={locale === 'ar' ? 'رقم الاعتماد المستندي' : 'LC Number'}
                      name="lc_number"
                      value={formData.lc_number}
                      onChange={handleChange}
                      placeholder="LC-2026-001"
                    />
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

              {/* Manager & Cost Center */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                  {locale === 'ar' ? 'الإدارة والتعيين' : 'Management & Assignment'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {locale === 'ar' ? 'مدير المشروع' : 'Project Manager'}
                    </label>
                    <select
                      name="manager_id"
                      value={formData.manager_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">{locale === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name || `${u.first_name} ${u.last_name}`}
                        </option>
                      ))}
                    </select>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                      <option value="planned">{locale === 'ar' ? 'مخطط' : 'Planned'}</option>
                      <option value="in_progress">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                      <option value="on_hold">{locale === 'ar' ? 'معلق' : 'On Hold'}</option>
                      <option value="completed">{locale === 'ar' ? 'مكتمل' : 'Completed'}</option>
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
                </div>
              </div>

              {/* Budget - only for sub projects */}
              {formData.project_level === 'sub' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                    {locale === 'ar' ? 'الميزانية' : 'Budget'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Input
                      label={locale === 'ar' ? 'الإجمالي' : 'Total'}
                      name="budget"
                      type="number"
                      value={formData.budget}
                      onChange={handleChange}
                      error={errors.budget}
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
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/projects')}
                  disabled={submitting}
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" loading={submitting}>
                  <CheckIcon className="h-4 w-4" />
                  {locale === 'ar' ? 'إنشاء المشروع' : 'Create Project'}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </MainLayout>
  );
}
