/**
 * Project Detail Page
 * ====================
 * Comprehensive view of a single project with all related data.
 */

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../../../components/layout/MainLayout';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useToast } from '../../../contexts/ToastContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { usePermissions } from '../../../hooks/usePermissions';
// Token retrieved from localStorage directly
import {
  FolderIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  DocumentTextIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
  PresentationChartBarIcon,
  CpuChipIcon,
  CubeTransparentIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// =============================================
// TYPES
// =============================================

type ProjectStatus = 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
type ItemType = 'task' | 'milestone' | 'deliverable' | 'phase';
type ItemStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

interface ProjectItem {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  item_type: ItemType;
  status: ItemStatus;
  assigned_to_name?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  estimated_cost: number;
  actual_cost: number;
  progress_percent: number;
  priority: ProjectPriority;
}

interface CostSummary {
  category: string;
  budgeted: number;
  actual: number;
}

interface ProjectLink {
  id: number;
  link_type: string;
  linked_entity_id: number;
  linked_entity_code?: string;
  amount?: number;
  created_at: string;
}

interface ProjectDetail {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  parent_project_id?: number;
  parent_project_code?: string;
  parent_project_name?: string;
  level: number;
  project_type_code?: string;
  project_type_name?: string;
  project_type_name_ar?: string;
  manager_name?: string;
  cost_center_name?: string;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  budget: number;
  budget_materials: number;
  budget_labor: number;
  budget_services: number;
  budget_miscellaneous: number;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  children: { id: number; code: string; name: string; name_ar?: string; budget: number; status: ProjectStatus; progress_percent: number }[];
  items: ProjectItem[];
  cost_summary: CostSummary[];
  links: ProjectLink[];
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

const getStatusConfig = (status: ProjectStatus) => {
  const configs = {
    planned: { label: { en: 'Planned', ar: 'مخطط' }, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', dotColor: 'bg-gray-500' },
    in_progress: { label: { en: 'In Progress', ar: 'قيد التنفيذ' }, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', dotColor: 'bg-blue-500' },
    on_hold: { label: { en: 'On Hold', ar: 'معلق' }, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', dotColor: 'bg-amber-500' },
    completed: { label: { en: 'Completed', ar: 'مكتمل' }, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', dotColor: 'bg-green-500' },
    cancelled: { label: { en: 'Cancelled', ar: 'ملغي' }, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', dotColor: 'bg-red-500' },
  };
  return configs[status] || configs.planned;
};

const getItemStatusConfig = (status: ItemStatus) => {
  const configs = {
    not_started: { label: { en: 'Not Started', ar: 'لم يبدأ' }, color: 'text-gray-500', icon: ClockIcon },
    in_progress: { label: { en: 'In Progress', ar: 'قيد التنفيذ' }, color: 'text-blue-500', icon: RocketLaunchIcon },
    completed: { label: { en: 'Completed', ar: 'مكتمل' }, color: 'text-green-500', icon: CheckCircleIcon },
    cancelled: { label: { en: 'Cancelled', ar: 'ملغي' }, color: 'text-red-500', icon: ExclamationCircleIcon },
  };
  return configs[status] || configs.not_started;
};

const getTypeIcon = (typeCode?: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    construction: BuildingOfficeIcon,
    procurement: TruckIcon,
    real_estate: HomeModernIcon,
    new_branch: RocketLaunchIcon,
    internal_dev: WrenchScrewdriverIcon,
    research_marketing: PresentationChartBarIcon,
    it_infrastructure: CpuChipIcon,
    other: CubeTransparentIcon,
  };
  return icons[typeCode || 'other'] || FolderIcon;
};

const formatCurrency = (amount: number, locale: string) => {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr?: string, locale?: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

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
// PROGRESS BAR COMPONENT
// =============================================

function ProgressBar({ percent, size = 'md' }: { percent: number; size?: 'sm' | 'md' | 'lg' }) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const color = clampedPercent >= 80 ? 'bg-green-500' : clampedPercent >= 50 ? 'bg-blue-500' : clampedPercent >= 25 ? 'bg-amber-500' : 'bg-red-500';
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };
  return (
    <div className="flex items-center gap-3">
      <div className={clsx('flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden', heights[size])}>
        <div className={clsx('h-full transition-all duration-500', color)} style={{ width: `${clampedPercent}%` }} />
      </div>
      <span className={clsx('font-semibold text-slate-700 dark:text-slate-300', size === 'lg' ? 'text-lg' : 'text-sm')}>{clampedPercent}%</span>
    </div>
  );
}

// =============================================
// TAB COMPONENT
// =============================================

function Tabs({ tabs, activeTab, onTabChange }: { tabs: { id: string; label: string; icon?: React.ComponentType<{ className?: string }> }[]; activeTab: string; onTabChange: (id: string) => void }) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            )}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  const canEdit = hasAnyPermission(['projects:edit']);
  const canDelete = hasAnyPermission(['projects:delete']);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch project
  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const data = await fetchWithAuth(`${API_BASE}/api/projects/${id}`, token);
      setProject(data.data);
    } catch (err: any) {
      console.error('Failed to fetch project:', err);
      showToast(locale === 'ar' ? 'فشل تحميل المشروع' : 'Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast, locale]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Handle delete
  const handleDelete = async () => {
    if (!project) return;
    try {
      setDeleting(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      await fetchWithAuth(`${API_BASE}/api/projects/${project.id}`, token, { method: 'DELETE' });
      showToast(locale === 'ar' ? 'تم حذف المشروع بنجاح' : 'Project deleted successfully', 'success');
      router.push('/projects');
    } catch (err: any) {
      showToast(err.message || (locale === 'ar' ? 'فشل حذف المشروع' : 'Failed to delete project'), 'error');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  // Calculate totals
  const totalBudget = project ? project.budget_materials + project.budget_labor + project.budget_services + project.budget_miscellaneous : 0;
  const totalActualCost = project?.cost_summary?.reduce((sum, c) => sum + Number(c.actual || 0), 0) || 0;

  if (loading) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'تحميل...' : 'Loading...'}</title>
        </Head>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'غير موجود' : 'Not Found'}</title>
        </Head>
        <div className="text-center py-12">
          <FolderIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {locale === 'ar' ? 'المشروع غير موجود' : 'Project not found'}
          </h2>
          <Link href="/projects" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
            ← {locale === 'ar' ? 'العودة للمشاريع' : 'Back to Projects'}
          </Link>
        </div>
      </MainLayout>
    );
  }

  const TypeIcon = getTypeIcon(project.project_type_code);
  const statusConfig = getStatusConfig(project.status);

  const tabs = [
    { id: 'overview', label: locale === 'ar' ? 'نظرة عامة' : 'Overview', icon: ChartBarIcon },
    { id: 'items', label: locale === 'ar' ? 'المهام' : 'Tasks', icon: ClipboardDocumentListIcon },
    { id: 'budget', label: locale === 'ar' ? 'الميزانية' : 'Budget', icon: CurrencyDollarIcon },
    { id: 'links', label: locale === 'ar' ? 'الروابط' : 'Links', icon: DocumentTextIcon },
  ];

  return (
    <MainLayout>
      <Head>
        <title>{project.code} - {locale === 'ar' ? 'المشاريع' : 'Projects'} - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 mb-2">
              <ArrowLeftIcon className="h-4 w-4" />
              {locale === 'ar' ? 'العودة للمشاريع' : 'Back to Projects'}
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <TypeIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {locale === 'ar' ? project.name_ar || project.name : project.name}
                  </h1>
                  <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full', statusConfig.color)}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', statusConfig.dotColor)} />
                    {locale === 'ar' ? statusConfig.label.ar : statusConfig.label.en}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {project.code} • {locale === 'ar' ? project.project_type_name_ar || project.project_type_name : project.project_type_name}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => router.push(`/projects/${project.id}/edit`)}>
                <PencilIcon className="h-4 w-4" />
                {locale === 'ar' ? 'تعديل' : 'Edit'}
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <TrashIcon className="h-4 w-4" />
                {locale === 'ar' ? 'حذف' : 'Delete'}
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {locale === 'ar' ? 'نسبة الإنجاز' : 'Progress'}
            </h3>
            <span className="text-2xl font-bold text-indigo-600">{project.progress_percent || 0}%</span>
          </div>
          <ProgressBar percent={project.progress_percent || 0} size="lg" />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                    {locale === 'ar' ? 'تفاصيل المشروع' : 'Project Details'}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{locale === 'ar' ? 'مدير المشروع' : 'Project Manager'}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{project.manager_name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{locale === 'ar' ? 'مركز التكلفة' : 'Cost Center'}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{project.cost_center_name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{locale === 'ar' ? 'تاريخ البداية' : 'Start Date'}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatDate(project.start_date, locale)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{locale === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{formatDate(project.end_date, locale)}</span>
                    </div>
                    {project.parent_project_name && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">{locale === 'ar' ? 'المشروع الأب' : 'Parent Project'}</span>
                        <Link href={`/projects/${project.parent_project_id}`} className="font-medium text-indigo-600 hover:text-indigo-800">
                          {project.parent_project_name}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                    {locale === 'ar' ? 'الوصف' : 'Description'}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {locale === 'ar' ? project.description_ar || project.description : project.description || '-'}
                  </p>
                </div>

                {/* Children Projects */}
                {project.children && project.children.length > 0 && (
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
                      {locale === 'ar' ? 'المشاريع الفرعية' : 'Sub-Projects'} ({project.children.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {project.children.map((child) => (
                        <Link
                          key={child.id}
                          href={`/projects/${child.id}`}
                          className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <p className="font-medium text-slate-900 dark:text-white">{locale === 'ar' ? child.name_ar || child.name : child.name}</p>
                          <p className="text-xs text-slate-500">{child.code}</p>
                          <div className="mt-2">
                            <ProgressBar percent={child.progress_percent || 0} size="sm" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'items' && (
              <div>
                {project.items && project.items.length > 0 ? (
                  <div className="space-y-3">
                    {project.items.map((item) => {
                      const itemStatusConfig = getItemStatusConfig(item.status);
                      const StatusIcon = itemStatusConfig.icon;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <StatusIcon className={clsx('h-5 w-5', itemStatusConfig.color)} />
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{locale === 'ar' ? item.name_ar || item.name : item.name}</p>
                              <p className="text-xs text-slate-500">{item.code} • {item.item_type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {item.assigned_to_name && (
                              <div className="flex items-center gap-1 text-sm text-slate-500">
                                <UserIcon className="h-4 w-4" />
                                {item.assigned_to_name}
                              </div>
                            )}
                            <div className="w-24">
                              <ProgressBar percent={item.progress_percent || 0} size="sm" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                    {locale === 'ar' ? 'لا توجد مهام' : 'No tasks found'}
                  </div>
                )}
              </div>
            )}

            {/* Budget Tab */}
            {activeTab === 'budget' && (
              <div className="space-y-6">
                {/* Budget Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">{locale === 'ar' ? 'المواد' : 'Materials'}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(project.budget_materials, locale)}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">{locale === 'ar' ? 'العمالة' : 'Labor'}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(project.budget_labor, locale)}</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-sm text-amber-600 dark:text-amber-400">{locale === 'ar' ? 'الخدمات' : 'Services'}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(project.budget_services, locale)}</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-purple-600 dark:text-purple-400">{locale === 'ar' ? 'متنوعة' : 'Miscellaneous'}</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(project.budget_miscellaneous, locale)}</p>
                  </div>
                </div>

                {/* Cost Summary */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'المخطط' : 'Budgeted'}</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'الفعلي' : 'Actual'}</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">{locale === 'ar' ? 'الفرق' : 'Variance'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.cost_summary && project.cost_summary.length > 0 ? (
                        project.cost_summary.map((cs, idx) => {
                          const variance = Number(cs.budgeted || 0) - Number(cs.actual || 0);
                          return (
                            <tr key={idx} className="border-b border-slate-100 dark:border-slate-700">
                              <td className="px-4 py-3 text-slate-900 dark:text-white capitalize">{cs.category}</td>
                              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(Number(cs.budgeted || 0), locale)}</td>
                              <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(Number(cs.actual || 0), locale)}</td>
                              <td className={clsx('px-4 py-3 text-right font-medium', variance >= 0 ? 'text-green-600' : 'text-red-600')}>
                                {formatCurrency(variance, locale)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                            {locale === 'ar' ? 'لا توجد تكاليف مسجلة' : 'No costs recorded'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold bg-slate-50 dark:bg-slate-700/50">
                        <td className="px-4 py-3 text-slate-900 dark:text-white">{locale === 'ar' ? 'الإجمالي' : 'Total'}</td>
                        <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{formatCurrency(totalBudget, locale)}</td>
                        <td className="px-4 py-3 text-right text-slate-900 dark:text-white">{formatCurrency(totalActualCost, locale)}</td>
                        <td className={clsx('px-4 py-3 text-right', totalBudget - totalActualCost >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(totalBudget - totalActualCost, locale)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Links Tab */}
            {activeTab === 'links' && (
              <div>
                {project.links && project.links.length > 0 ? (
                  <div className="space-y-3">
                    {project.links.map((link) => {
                      const linkIcons: Record<string, React.ComponentType<{ className?: string }>> = {
                        shipment: TruckIcon,
                        purchase_invoice: DocumentTextIcon,
                        sales_invoice: DocumentTextIcon,
                        expense: BanknotesIcon,
                        payment: CurrencyDollarIcon,
                      };
                      const LinkIcon = linkIcons[link.link_type] || DocumentTextIcon;
                      return (
                        <div key={link.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <LinkIcon className="h-5 w-5 text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white capitalize">{link.link_type.replace('_', ' ')}</p>
                              <p className="text-xs text-slate-500">{link.linked_entity_code || `#${link.linked_entity_id}`}</p>
                            </div>
                          </div>
                          {link.amount && (
                            <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(link.amount, locale)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                    {locale === 'ar' ? 'لا توجد روابط' : 'No links found'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delete Dialog */}
        <ConfirmDialog
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
          title={locale === 'ar' ? 'حذف المشروع' : 'Delete Project'}
          message={
            locale === 'ar'
              ? `هل أنت متأكد من حذف المشروع "${project.name}"؟`
              : `Are you sure you want to delete "${project.name}"?`
          }
          confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
          variant="danger"
          loading={deleting}
        />
      </div>
    </MainLayout>
  );
}
