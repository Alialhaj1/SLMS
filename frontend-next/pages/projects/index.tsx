/**
 * Projects Management Dashboard
 * ==============================
 * Comprehensive project management with hierarchy support,
 * cost tracking, and status management.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
// Token retrieved from localStorage directly
import { MenuPermissions } from '../../config/menu.permissions';
import {
  FolderIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  BuildingOfficeIcon,
  TruckIcon,
  HomeModernIcon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
  PresentationChartBarIcon,
  CpuChipIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// =============================================
// TYPES
// =============================================

type ProjectStatus = 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
type ProjectLevel = 'group' | 'master' | 'sub';
type ViewMode = 'table' | 'cards';

interface ProjectType {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  icon?: string;
  color?: string;
}

interface Project {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  description?: string;
  parent_project_id?: number;
  level: number;
  depth?: number;
  path?: string;
  project_level: ProjectLevel;
  project_type_id?: number;
  project_type_code?: string;
  project_type_name?: string;
  project_type_name_ar?: string;
  project_type_icon?: string;
  project_type_color?: string;
  parent_project_code?: string;
  parent_project_name?: string;
  manager_name?: string;
  manager_display_name?: string;
  vendor_id?: number;
  vendor_name?: string;
  vendor_name_ar?: string;
  vendor_code?: string;
  currency_id?: number;
  currency_code?: string;
  lc_number?: string;
  contract_number?: string;
  start_date?: string;
  end_date?: string;
  budget: number;
  budget_materials: number;
  budget_labor: number;
  budget_services: number;
  budget_miscellaneous: number;
  total_expected_amount?: number;
  total_actual_cost?: number;
  total_paid_amount?: number;
  balance_remaining?: number;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress_percent: number;
  children_count: number;
  items_count: number;
  shipments_count: number;
  invoices_count: number;
  expenses_count: number;
  payments_count?: number;
  is_active: boolean;
  is_locked?: boolean;
  closed_at?: string;
  created_at: string;
}

interface ProjectStats {
  total_projects: number;
  total_groups: number;
  total_masters: number;
  total_subs: number;
  total_budget: number;
  total_actual_cost: number;
  total_paid: number;
  budget_utilization_percent: number;
  by_status: { status: string; count: number }[];
  by_type: { type_id: number; type_name: string; type_name_ar?: string; icon?: string; color?: string; count: number; budget: number }[];
  active_count: number;
  completed_count: number;
  locked_count: number;
  projects_near_completion: number;
  projects_overdue: number;
}

interface Filters {
  search: string;
  status: string;
  priority: string;
  project_type_id: string;
  project_level: string;
  is_root_only: boolean;
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

const getStatusConfig = (status: ProjectStatus) => {
  const configs = {
    planned: {
      label: { en: 'Planned', ar: 'مخطط' },
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      dotColor: 'bg-gray-500',
    },
    in_progress: {
      label: { en: 'In Progress', ar: 'قيد التنفيذ' },
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      dotColor: 'bg-blue-500',
    },
    on_hold: {
      label: { en: 'On Hold', ar: 'معلق' },
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      dotColor: 'bg-amber-500',
    },
    completed: {
      label: { en: 'Completed', ar: 'مكتمل' },
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      dotColor: 'bg-green-500',
    },
    cancelled: {
      label: { en: 'Cancelled', ar: 'ملغي' },
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      dotColor: 'bg-red-500',
    },
  };
  return configs[status] || configs.planned;
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

// Project Level Badge Configuration
const getProjectLevelConfig = (level: ProjectLevel) => {
  const configs = {
    group: {
      label: { en: 'Group', ar: 'مجموعة' },
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      icon: '📁',
    },
    master: {
      label: { en: 'Master', ar: 'رئيسي' },
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      icon: '🏢',
    },
    sub: {
      label: { en: 'Sub', ar: 'فرعي' },
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      icon: '📦',
    },
  };
  return configs[level] || configs.sub;
};

// =============================================
// API FUNCTIONS
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
// STAT CARD COMPONENT
// =============================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  loading,
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          )}
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={clsx('p-3 rounded-xl', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

// =============================================
// STATUS BADGE COMPONENT
// =============================================

function StatusBadge({ status, locale }: { status: ProjectStatus; locale: string }) {
  const config = getStatusConfig(status);
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full', config.color)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dotColor)} />
      {locale === 'ar' ? config.label.ar : config.label.en}
    </span>
  );
}

// =============================================
// PROGRESS BAR COMPONENT
// =============================================

function ProgressBar({ percent, size = 'md' }: { percent: number; size?: 'sm' | 'md' }) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const color = clampedPercent >= 80 ? 'bg-green-500' : clampedPercent >= 50 ? 'bg-blue-500' : clampedPercent >= 25 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className={clsx('flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div className={clsx('h-full transition-all duration-300', color)} style={{ width: `${clampedPercent}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-10 text-right">{clampedPercent}%</span>
    </div>
  );
}

// =============================================
// PROJECT LEVEL BADGE COMPONENT
// =============================================

function ProjectLevelBadge({ level, locale }: { level: ProjectLevel; locale: string }) {
  const config = getProjectLevelConfig(level);
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full', config.color)}>
      <span>{config.icon}</span>
      {locale === 'ar' ? config.label.ar : config.label.en}
    </span>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function ProjectsPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const { showToast } = useToast();
  const { hasAnyPermission } = usePermissions();

  // Permissions
  const canView = hasAnyPermission([MenuPermissions.Projects?.View, MenuPermissions.Projects?.Projects?.View, 'projects:view']);
  const canCreate = hasAnyPermission([MenuPermissions.Projects?.Create, MenuPermissions.Projects?.Projects?.Create, 'projects:create']);
  const canEdit = hasAnyPermission([MenuPermissions.Projects?.Edit, MenuPermissions.Projects?.Projects?.Edit, 'projects:edit']);
  const canDelete = hasAnyPermission([MenuPermissions.Projects?.Delete, MenuPermissions.Projects?.Projects?.Delete, 'projects:delete']);

  // State
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 100, totalPages: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    priority: 'all',
    project_type_id: 'all',
    project_level: 'all',
    is_root_only: false,
  });

  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConflict, setDeleteConflict] = useState<{
    childrenCount?: number;
    paymentsCount?: number;
  } | null>(null);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const effectiveLimit = meta.limit;

      const params = new URLSearchParams({
        page: meta.page.toString(),
        limit: effectiveLimit.toString(),
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.project_type_id !== 'all') params.append('project_type_id', filters.project_type_id);
      if (filters.is_root_only) params.append('parent_project_id', 'root');

      const data = await fetchWithAuth(`${API_BASE}/api/projects?${params}`, token);
      setProjects(data.data || []);
      setMeta(data.meta || { total: 0, page: 1, limit: 20, totalPages: 0 });
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      showToast(locale === 'ar' ? 'فشل تحميل المشاريع' : 'Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, meta.page, meta.limit, showToast, locale]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const data = await fetchWithAuth(`${API_BASE}/api/projects/stats`, token);
      setStats(data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch project types
  const fetchProjectTypes = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const data = await fetchWithAuth(`${API_BASE}/api/projects/types`, token);
      setProjectTypes(data.data || []);
    } catch (err) {
      console.error('Failed to fetch project types:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (canView) {
      fetchProjects();
      fetchStats();
      fetchProjectTypes();
    }
  }, [canView]);

  // Refetch when filters or view mode change
  useEffect(() => {
    if (canView) {
      fetchProjects();
    }
  }, [filters, meta.page, viewMode]);

  // Handle delete
  const handleDelete = async (forceUnlink = false) => {
    if (!deleteProject) return;
    try {
      setDeleting(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      
      // Build URL with unlink params if forceUnlink is true
      let url = `${API_BASE}/api/projects/${deleteProject.id}`;
      if (forceUnlink && deleteConflict) {
        const params = new URLSearchParams();
        if (deleteConflict.childrenCount) params.append('unlinkChildren', 'true');
        if (deleteConflict.paymentsCount) params.append('unlinkPayments', 'true');
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Check if it's a conflict error with children or payments
        if (data.childrenCount || data.paymentsCount) {
          setDeleteConflict({
            childrenCount: data.childrenCount,
            paymentsCount: data.paymentsCount
          });
          return;
        }
        throw new Error(data.error || 'Failed to delete');
      }
      
      showToast(locale === 'ar' ? 'تم حذف المشروع بنجاح' : 'Project deleted successfully', 'success');
      setDeleteProject(null);
      setDeleteConflict(null);
      fetchProjects();
      fetchStats();
    } catch (err: any) {
      showToast(err.message || (locale === 'ar' ? 'فشل حذف المشروع' : 'Failed to delete project'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Toggle row expansion
  const toggleExpand = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter projects based on expanded state - show only visible projects in tree
  const visibleProjects = useMemo(() => {
    if (!projects.length) return [];
    
    // Build a map of parent -> children
    const childrenMap = new Map<number | null, Project[]>();
    projects.forEach(p => {
      const parentId = p.parent_project_id ?? null;
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)!.push(p);
    });

    // Recursively collect visible projects
    const result: Project[] = [];
    const collectVisible = (parentId: number | null, level: number) => {
      const children = childrenMap.get(parentId) || [];
      children.forEach(project => {
        result.push(project);
        // Only recurse if this project is expanded (or is root level)
        const hasChildren = childrenMap.has(project.id);
        if (hasChildren && expandedRows.has(project.id)) {
          collectVisible(project.id, level + 1);
        }
      });
    };

    // Start from root projects (no parent)
    collectVisible(null, 0);
    return result;
  }, [projects, expandedRows]);

  // Check if a project has children
  const hasChildren = useCallback((projectId: number) => {
    return projects.some(p => p.parent_project_id === projectId);
  }, [projects]);

  // Access denied
  if (!canView) {
    return (
      <MainLayout>
        <Head>
          <title>{locale === 'ar' ? 'المشاريع - SLMS' : 'Projects - SLMS'}</title>
        </Head>
        <div className="text-center py-12">
          <FolderIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {locale === 'ar' ? 'لا تملك صلاحية عرض المشاريع.' : "You don't have permission to view projects."}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{locale === 'ar' ? 'المشاريع - SLMS' : 'Projects - SLMS'}</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <FolderIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {locale === 'ar' ? 'إدارة المشاريع' : 'Project Management'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {locale === 'ar'
                  ? 'إدارة المشاريع والميزانيات والمهام'
                  : 'Manage projects, budgets, and tasks'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canCreate && (
              <Button onClick={() => router.push('/projects/new')}>
                <PlusIcon className="h-4 w-4" />
                {locale === 'ar' ? 'مشروع جديد' : 'New Project'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title={locale === 'ar' ? 'المجموعات' : 'Groups'}
            value={stats?.total_groups ?? '-'}
            icon={FolderIcon}
            color="bg-purple-500"
            loading={!stats}
            onClick={() => setFilters((f) => ({ ...f, project_level: 'group' }))}
          />
          <StatCard
            title={locale === 'ar' ? 'المشاريع الرئيسية' : 'Master Projects'}
            value={stats?.total_masters ?? '-'}
            icon={BuildingOfficeIcon}
            color="bg-blue-500"
            loading={!stats}
            onClick={() => setFilters((f) => ({ ...f, project_level: 'master' }))}
          />
          <StatCard
            title={locale === 'ar' ? 'المشاريع الفرعية' : 'Sub Projects'}
            value={stats?.total_subs ?? '-'}
            icon={TruckIcon}
            color="bg-green-500"
            loading={!stats}
            onClick={() => setFilters((f) => ({ ...f, project_level: 'sub' }))}
          />
          <StatCard
            title={locale === 'ar' ? 'إجمالي الميزانية' : 'Total Budget'}
            value={stats ? formatCurrency(stats.total_budget, locale) : '-'}
            subtitle={stats ? `${stats.budget_utilization_percent}% ${locale === 'ar' ? 'مستخدم' : 'utilized'}` : undefined}
            icon={RocketLaunchIcon}
            color="bg-emerald-500"
            loading={!stats}
          />
          <StatCard
            title={locale === 'ar' ? 'المدفوع' : 'Total Paid'}
            value={stats ? formatCurrency(stats.total_paid || 0, locale) : '-'}
            icon={ExclamationTriangleIcon}
            color="bg-amber-500"
            loading={!stats}
          />
        </div>

        {/* Filters & View Toggle */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث بالكود أو الاسم...' : 'Search by code or name...'}
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full lg:w-40">
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="planned">{locale === 'ar' ? 'مخطط' : 'Planned'}</option>
                <option value="in_progress">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                <option value="on_hold">{locale === 'ar' ? 'معلق' : 'On Hold'}</option>
                <option value="completed">{locale === 'ar' ? 'مكتمل' : 'Completed'}</option>
                <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="w-full lg:w-48">
              <select
                value={filters.project_type_id}
                onChange={(e) => setFilters((f) => ({ ...f, project_type_id: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
                {projectTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {locale === 'ar' ? type.name_ar || type.name : type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Level Filter */}
            <div className="w-full lg:w-40">
              <select
                value={filters.project_level}
                onChange={(e) => setFilters((f) => ({ ...f, project_level: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">{locale === 'ar' ? 'كل المستويات' : 'All Levels'}</option>
                <option value="group">{locale === 'ar' ? '📁 مجموعة' : '📁 Group'}</option>
                <option value="master">{locale === 'ar' ? '🏢 رئيسي' : '🏢 Master'}</option>
                <option value="sub">{locale === 'ar' ? '📦 فرعي' : '📦 Sub'}</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-600 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'table'
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'cards'
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Root only toggle */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="rootOnly"
              checked={filters.is_root_only}
              onChange={(e) => setFilters((f) => ({ ...f, is_root_only: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="rootOnly" className="text-sm text-slate-600 dark:text-slate-400">
              {locale === 'ar' ? 'عرض المشاريع الرئيسية فقط' : 'Show root projects only'}
            </label>
          </div>
        </div>

        {/* Projects Table */}
        {viewMode === 'table' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      {locale === 'ar' ? 'الكود' : 'Code'}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                      {locale === 'ar' ? 'الاسم' : 'Name'}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">
                      {locale === 'ar' ? 'المستوى' : 'Level'}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 hidden xl:table-cell">
                      {locale === 'ar' ? 'المورد' : 'Vendor'}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                      {locale === 'ar' ? 'الميزانية' : 'Budget'}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                      {locale === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                      {locale === 'ar' ? 'الشحنات' : 'Shipments'}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                      {locale === 'ar' ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={8} className="px-4 py-4">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 animate-pulse rounded w-full" />
                        </td>
                      </tr>
                    ))
                  ) : projects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        <FolderIcon className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                        {locale === 'ar' ? 'لا توجد مشاريع' : 'No projects found'}
                      </td>
                    </tr>
                  ) : (
                    visibleProjects.map((project) => {
                      const TypeIcon = getTypeIcon(project.project_type_code);
                      const projectHasChildren = hasChildren(project.id);
                      return (
                        <tr
                          key={project.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* Indentation for tree levels */}
                              {project.level > 0 && (
                                <span style={{ width: project.level * 20 }} className="inline-block" />
                              )}
                              {/* Expand/Collapse button */}
                              {projectHasChildren ? (
                                <button
                                  onClick={() => toggleExpand(project.id)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                                  title={expandedRows.has(project.id) ? (locale === 'ar' ? 'طي' : 'Collapse') : (locale === 'ar' ? 'توسيع' : 'Expand')}
                                >
                                  {expandedRows.has(project.id) ? (
                                    <ChevronDownIcon className="h-4 w-4 text-indigo-600" />
                                  ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-slate-500" />
                                  )}
                                </button>
                              ) : (
                                <span className="w-6 inline-block" />
                              )}
                              <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                                {project.code}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-5 w-5 text-slate-400" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {locale === 'ar' ? project.name_ar || project.name : project.name}
                                  </p>
                                  {project.is_locked && (
                                    <span title={locale === 'ar' ? 'مقفل' : 'Locked'} className="text-amber-500">🔒</span>
                                  )}
                                </div>
                                {project.lc_number && (
                                  <p className="text-xs text-blue-500">LC: {project.lc_number}</p>
                                )}
                                {project.contract_number && (
                                  <p className="text-xs text-green-500">{locale === 'ar' ? 'عقد:' : 'Contract:'} {project.contract_number}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-center">
                            <ProjectLevelBadge level={project.project_level || 'sub'} locale={locale} />
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            {project.vendor_name ? (
                              <div>
                                <span className="text-slate-600 dark:text-slate-400">
                                  {locale === 'ar' ? project.vendor_name_ar || project.vendor_name : project.vendor_name}
                                </span>
                                {project.currency_code && (
                                  <span className="ml-1 text-xs text-slate-400">({project.currency_code})</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {formatCurrency(project.budget || 0, locale)}
                              </span>
                              {project.total_paid_amount && project.total_paid_amount > 0 && (
                                <p className="text-xs text-green-600">
                                  {locale === 'ar' ? 'مدفوع:' : 'Paid:'} {formatCurrency(project.total_paid_amount, locale)}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={project.status} locale={locale} />
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-center">
                            <div className="flex flex-col items-center gap-1">
                              {project.shipments_count > 0 && (
                                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                  📦 {project.shipments_count}
                                </span>
                              )}
                              {project.payments_count && project.payments_count > 0 && (
                                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full">
                                  💰 {project.payments_count}
                                </span>
                              )}
                              {project.children_count > 0 && (
                                <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">
                                  📂 {project.children_count}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => router.push(`/projects/${project.id}`)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                title={locale === 'ar' ? 'عرض' : 'View'}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => router.push(`/projects/${project.id}/edit`)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title={locale === 'ar' ? 'تعديل' : 'Edit'}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => setDeleteProject(project)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title={locale === 'ar' ? 'حذف' : 'Delete'}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {locale === 'ar'
                    ? `عرض ${(meta.page - 1) * meta.limit + 1} - ${Math.min(meta.page * meta.limit, meta.total)} من ${meta.total}`
                    : `Showing ${(meta.page - 1) * meta.limit + 1} - ${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total}`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => setMeta((m) => ({ ...m, page: m.page - 1 }))}
                  >
                    {locale === 'ar' ? 'السابق' : 'Previous'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))}
                  >
                    {locale === 'ar' ? 'التالي' : 'Next'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cards View */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              ))
            ) : projects.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500">
                <FolderIcon className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                {locale === 'ar' ? 'لا توجد مشاريع' : 'No projects found'}
              </div>
            ) : (
              visibleProjects.map((project) => {
                const TypeIcon = getTypeIcon(project.project_type_code);
                return (
                  <div
                    key={project.id}
                    className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                          <TypeIcon className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {locale === 'ar' ? project.name_ar || project.name : project.name}
                          </p>
                          <p className="text-xs text-slate-500">{project.code}</p>
                        </div>
                      </div>
                      <StatusBadge status={project.status} locale={locale} />
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{locale === 'ar' ? 'الميزانية' : 'Budget'}</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatCurrency(project.budget, locale)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{locale === 'ar' ? 'التكلفة الفعلية' : 'Actual Cost'}</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {formatCurrency(project.total_actual_cost || 0, locale)}
                        </span>
                      </div>
                    </div>

                    <ProgressBar percent={project.progress_percent || 0} />

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs text-slate-400">
                      <span>{formatDate(project.start_date, locale)}</span>
                      <span>→</span>
                      <span>{formatDate(project.end_date, locale)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteProject && !deleteConflict}
          onClose={() => setDeleteProject(null)}
          onConfirm={() => handleDelete(false)}
          title={locale === 'ar' ? 'حذف المشروع' : 'Delete Project'}
          message={
            locale === 'ar'
              ? `هل أنت متأكد من حذف المشروع "${deleteProject?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
              : `Are you sure you want to delete the project "${deleteProject?.name}"? This action cannot be undone.`
          }
          confirmText={locale === 'ar' ? 'حذف' : 'Delete'}
          variant="danger"
          loading={deleting}
        />

        {/* Delete Conflict Dialog - when project has children or payments */}
        <ConfirmDialog
          isOpen={!!deleteProject && !!deleteConflict}
          onClose={() => { setDeleteProject(null); setDeleteConflict(null); }}
          onConfirm={() => handleDelete(true)}
          title={locale === 'ar' ? 'تأكيد الحذف مع إلغاء الربط' : 'Confirm Delete with Unlinking'}
          message={
            locale === 'ar'
              ? `المشروع "${deleteProject?.name}" مرتبط بـ:${deleteConflict?.childrenCount ? `\n• ${deleteConflict.childrenCount} مشروع فرعي` : ''}${deleteConflict?.paymentsCount ? `\n• ${deleteConflict.paymentsCount} دفعة` : ''}\n\nهل تريد إلغاء الربط وحذف المشروع؟`
              : `Project "${deleteProject?.name}" has:${deleteConflict?.childrenCount ? `\n• ${deleteConflict.childrenCount} child project(s)` : ''}${deleteConflict?.paymentsCount ? `\n• ${deleteConflict.paymentsCount} payment(s)` : ''}\n\nDo you want to unlink and delete the project?`
          }
          confirmText={locale === 'ar' ? 'إلغاء الربط والحذف' : 'Unlink & Delete'}
          variant="danger"
          loading={deleting}
        />
      </div>
    </MainLayout>
  );
}
