import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import MainLayout from '../../components/layout/MainLayout';
import { withPermission } from '../../utils/withPermission';
import { MenuPermissions } from '../../config/menu.permissions';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Card from '../../components/ui/Card';
import { usePermissions } from '../../hooks/usePermissions';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

interface JobTitle {
  id: number;
  code: string;
  title: string;
  title_ar?: string;
  department_id?: number;
  department_name?: string;
  category: 'executive' | 'management' | 'professional' | 'technical' | 'administrative' | 'operational';
  grade_level: number;
  min_salary: number;
  max_salary: number;
  currency_code: string;
  headcount: number;
  filled_positions: number;
  vacant_positions: number;
  reports_to_id?: number;
  reports_to_title?: string;
  qualifications?: string;
  responsibilities?: string;
  is_active: boolean;
  created_at: string;
}

const JOB_CATEGORIES = [
  { value: 'executive', label: 'Executive', labelAr: 'تنفيذي', icon: '👔', color: 'purple' },
  { value: 'management', label: 'Management', labelAr: 'إداري', icon: '📊', color: 'blue' },
  { value: 'professional', label: 'Professional', labelAr: 'مهني', icon: '💼', color: 'green' },
  { value: 'technical', label: 'Technical', labelAr: 'تقني', icon: '⚙️', color: 'orange' },
  { value: 'administrative', label: 'Administrative', labelAr: 'إداري', icon: '📝', color: 'gray' },
  { value: 'operational', label: 'Operational', labelAr: 'تشغيلي', icon: '🔧', color: 'yellow' },
];

function JobTitlesPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<JobTitle[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<JobTitle | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    code: string;
    title: string;
    title_ar: string;
    department_id: number;
    category: JobTitle['category'];
    grade_level: number;
    min_salary: number;
    max_salary: number;
    currency_code: string;
    headcount: number;
    reports_to_id: number;
    qualifications: string;
    responsibilities: string;
    is_active: boolean;
  }>({
    code: '',
    title: '',
    title_ar: '',
    department_id: 0,
    category: 'professional',
    grade_level: 1,
    min_salary: 0,
    max_salary: 0,
    currency_code: 'SAR',
    headcount: 1,
    reports_to_id: 0,
    qualifications: '',
    responsibilities: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:4000/api/job-titles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.data || []);
      } else {
        loadMockData();
      }
    } catch {
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    const mockDepts = [
      { id: 1, name: 'Executive Office' },
      { id: 2, name: 'Finance & Accounting' },
      { id: 3, name: 'Human Resources' },
      { id: 4, name: 'Operations' },
      { id: 5, name: 'Sales & Marketing' },
      { id: 6, name: 'Information Technology' },
    ];
    setDepartments(mockDepts);

    setItems([
      { id: 1, code: 'CEO', title: 'Chief Executive Officer', title_ar: 'الرئيس التنفيذي', department_id: 1, department_name: 'Executive Office', category: 'executive', grade_level: 10, min_salary: 80000, max_salary: 150000, currency_code: 'SAR', headcount: 1, filled_positions: 1, vacant_positions: 0, is_active: true, qualifications: 'MBA or equivalent, 15+ years experience', responsibilities: 'Overall company leadership and strategy', created_at: '2024-01-01' },
      { id: 2, code: 'CFO', title: 'Chief Financial Officer', title_ar: 'المدير المالي', department_id: 2, department_name: 'Finance & Accounting', category: 'executive', grade_level: 9, min_salary: 60000, max_salary: 100000, currency_code: 'SAR', headcount: 1, filled_positions: 1, vacant_positions: 0, reports_to_id: 1, reports_to_title: 'CEO', is_active: true, created_at: '2024-01-01' },
      { id: 3, code: 'HR-MGR', title: 'HR Manager', title_ar: 'مدير الموارد البشرية', department_id: 3, department_name: 'Human Resources', category: 'management', grade_level: 7, min_salary: 25000, max_salary: 40000, currency_code: 'SAR', headcount: 1, filled_positions: 1, vacant_positions: 0, reports_to_id: 1, reports_to_title: 'CEO', is_active: true, created_at: '2024-01-01' },
      { id: 4, code: 'FIN-ACC', title: 'Senior Accountant', title_ar: 'محاسب أول', department_id: 2, department_name: 'Finance & Accounting', category: 'professional', grade_level: 5, min_salary: 12000, max_salary: 18000, currency_code: 'SAR', headcount: 3, filled_positions: 2, vacant_positions: 1, reports_to_id: 2, reports_to_title: 'CFO', is_active: true, created_at: '2024-01-01' },
      { id: 5, code: 'IT-DEV', title: 'Software Developer', title_ar: 'مطور برمجيات', department_id: 6, department_name: 'Information Technology', category: 'technical', grade_level: 5, min_salary: 15000, max_salary: 25000, currency_code: 'SAR', headcount: 5, filled_positions: 4, vacant_positions: 1, is_active: true, qualifications: 'BS in Computer Science, 3+ years experience', created_at: '2024-01-01' },
      { id: 6, code: 'OPS-SUP', title: 'Operations Supervisor', title_ar: 'مشرف عمليات', department_id: 4, department_name: 'Operations', category: 'management', grade_level: 5, min_salary: 10000, max_salary: 15000, currency_code: 'SAR', headcount: 3, filled_positions: 3, vacant_positions: 0, is_active: true, created_at: '2024-01-01' },
      { id: 7, code: 'WH-WRK', title: 'Warehouse Worker', title_ar: 'عامل مستودع', department_id: 4, department_name: 'Operations', category: 'operational', grade_level: 2, min_salary: 4000, max_salary: 6000, currency_code: 'SAR', headcount: 20, filled_positions: 18, vacant_positions: 2, is_active: true, created_at: '2024-01-01' },
      { id: 8, code: 'SALES-REP', title: 'Sales Representative', title_ar: 'مندوب مبيعات', department_id: 5, department_name: 'Sales & Marketing', category: 'professional', grade_level: 4, min_salary: 8000, max_salary: 12000, currency_code: 'SAR', headcount: 10, filled_positions: 8, vacant_positions: 2, is_active: true, created_at: '2024-01-01' },
      { id: 9, code: 'HR-REC', title: 'HR Recruiter', title_ar: 'مسؤول توظيف', department_id: 3, department_name: 'Human Resources', category: 'professional', grade_level: 4, min_salary: 8000, max_salary: 12000, currency_code: 'SAR', headcount: 2, filled_positions: 2, vacant_positions: 0, reports_to_id: 3, reports_to_title: 'HR Manager', is_active: true, created_at: '2024-01-01' },
      { id: 10, code: 'ADM-SEC', title: 'Administrative Secretary', title_ar: 'سكرتير إداري', department_id: 1, department_name: 'Executive Office', category: 'administrative', grade_level: 3, min_salary: 6000, max_salary: 9000, currency_code: 'SAR', headcount: 2, filled_positions: 2, vacant_positions: 0, is_active: true, created_at: '2024-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.title.trim()) newErrors.title = t('validation.required');
    if (formData.min_salary < 0) newErrors.min_salary = t('validation.positive');
    if (formData.max_salary < formData.min_salary) newErrors.max_salary = t('jobTitles.maxMustBeGreater', 'Max must be >= Min');
    if (formData.headcount < 1) newErrors.headcount = t('validation.positive');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/job-titles/${editingItem.id}`
        : 'http://localhost:4000/api/job-titles';
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(t('common.success'), 'success');
        fetchData();
        setShowModal(false);
        resetForm();
      } else {
        throw new Error();
      }
    } catch {
      const dept = departments.find(d => d.id === formData.department_id);
      const reportsTo = items.find(j => j.id === formData.reports_to_id);
      const newItem: JobTitle = {
        id: editingItem?.id || Date.now(),
        code: formData.code,
        title: formData.title,
        title_ar: formData.title_ar || undefined,
        department_id: formData.department_id || undefined,
        department_name: dept?.name,
        category: formData.category,
        grade_level: formData.grade_level,
        min_salary: formData.min_salary,
        max_salary: formData.max_salary,
        currency_code: formData.currency_code,
        headcount: formData.headcount,
        filled_positions: editingItem?.filled_positions || 0,
        vacant_positions: formData.headcount - (editingItem?.filled_positions || 0),
        reports_to_id: formData.reports_to_id || undefined,
        reports_to_title: reportsTo?.title,
        qualifications: formData.qualifications || undefined,
        responsibilities: formData.responsibilities || undefined,
        is_active: formData.is_active,
        created_at: new Date().toISOString(),
      };
      if (editingItem) {
        setItems(items.map(i => i.id === editingItem.id ? newItem : i));
      } else {
        setItems([...items, newItem]);
      }
      showToast(t('common.success'), 'success');
      setShowModal(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const item = items.find(i => i.id === deletingId);
    if (item && item.filled_positions > 0) {
      showToast(t('jobTitles.cannotDeleteWithEmployees', 'Cannot delete job title with employees'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/job-titles/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* continue */ }
    setItems(items.filter(i => i.id !== deletingId));
    showToast(t('common.deleted'), 'success');
    setIsDeleting(false);
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ code: '', title: '', title_ar: '', department_id: 0, category: 'professional', grade_level: 1, min_salary: 0, max_salary: 0, currency_code: 'SAR', headcount: 1, reports_to_id: 0, qualifications: '', responsibilities: '', is_active: true });
    setErrors({});
  };

  const openEdit = (item: JobTitle) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      title: item.title,
      title_ar: item.title_ar || '',
      department_id: item.department_id || 0,
      category: item.category,
      grade_level: item.grade_level,
      min_salary: item.min_salary,
      max_salary: item.max_salary,
      currency_code: item.currency_code,
      headcount: item.headcount,
      reports_to_id: item.reports_to_id || 0,
      qualifications: item.qualifications || '',
      responsibilities: item.responsibilities || '',
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    const matchDepartment = !filterDepartment || item.department_id === Number(filterDepartment);
    return matchSearch && matchCategory && matchDepartment;
  });

  const totalHeadcount = items.reduce((sum, j) => sum + j.headcount, 0);
  const totalFilled = items.reduce((sum, j) => sum + j.filled_positions, 0);
  const totalVacant = items.reduce((sum, j) => sum + j.vacant_positions, 0);

  const getCategoryInfo = (category: string) => {
    return JOB_CATEGORIES.find(c => c.value === category);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      executive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      management: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      professional: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      technical: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      administrative: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      operational: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return colors[category] || colors.professional;
  };

  const formatSalaryRange = (min: number, max: number) => {
    return `${(min / 1000).toFixed(0)}K - ${(max / 1000).toFixed(0)}K`;
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('jobTitles.title', 'Job Titles')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('jobTitles.title', 'Job Titles')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('jobTitles.subtitle', 'Define positions, grades, and salary ranges')}
            </p>
          </div>
          {hasPermission('master:hr:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('jobTitles.new', 'New Job Title')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BriefcaseIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('jobTitles.positions', 'Positions')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <UserGroupIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('jobTitles.headcount', 'Headcount')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalHeadcount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('jobTitles.filled', 'Filled')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalFilled}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <CurrencyDollarIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('jobTitles.vacant', 'Vacant')}</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{totalVacant}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('jobTitles.allCategories', 'All Categories')}</option>
            {JOB_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
          </select>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('jobTitles.allDepartments', 'All Departments')}</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <BriefcaseIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('jobTitles.position', 'Position')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('jobTitles.department', 'Department')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('jobTitles.category', 'Category')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('jobTitles.grade', 'Grade')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('jobTitles.salaryRange', 'Salary Range')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('jobTitles.headcount', 'Headcount')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const catInfo = getCategoryInfo(item.category);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{catInfo?.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{item.code}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                            {item.title_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.title_ar}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.department_name || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                          {catInfo?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                          G{item.grade_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatSalaryRange(item.min_salary, item.max_salary)}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{item.currency_code}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">{item.filled_positions}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.headcount}</span>
                          {item.vacant_positions > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded">
                              {item.vacant_positions} vacant
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                          {item.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('master:hr:update') && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('master:hr:delete') && item.filled_positions === 0 && (
                            <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('jobTitles.edit') : t('jobTitles.create')}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., HR-MGR"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('jobTitles.category', 'Category')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {JOB_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('jobTitles.position', 'Position Title')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              error={errors.title}
              required
            />
            <Input
              label={t('jobTitles.positionAr', 'Position Title (Arabic)')}
              value={formData.title_ar}
              onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('jobTitles.department', 'Department')}
              </label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value={0}>{t('common.select')}</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('jobTitles.reportsTo', 'Reports To')}
              </label>
              <select
                value={formData.reports_to_id}
                onChange={(e) => setFormData({ ...formData, reports_to_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value={0}>{t('common.none')}</option>
                {items.filter(j => j.id !== editingItem?.id).map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label={t('jobTitles.grade', 'Grade Level')}
              type="number"
              min="1"
              max="20"
              value={formData.grade_level}
              onChange={(e) => setFormData({ ...formData, grade_level: Number(e.target.value) })}
            />
            <Input
              label={t('jobTitles.headcount', 'Headcount')}
              type="number"
              min="1"
              value={formData.headcount}
              onChange={(e) => setFormData({ ...formData, headcount: Number(e.target.value) })}
              error={errors.headcount}
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5" />
              {t('jobTitles.salaryRange', 'Salary Range')}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label={t('jobTitles.minSalary', 'Minimum')}
                type="number"
                min="0"
                value={formData.min_salary}
                onChange={(e) => setFormData({ ...formData, min_salary: Number(e.target.value) })}
                error={errors.min_salary}
              />
              <Input
                label={t('jobTitles.maxSalary', 'Maximum')}
                type="number"
                min="0"
                value={formData.max_salary}
                onChange={(e) => setFormData({ ...formData, max_salary: Number(e.target.value) })}
                error={errors.max_salary}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.currency')}
                </label>
                <select
                  value={formData.currency_code}
                  onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="SAR">SAR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </div>

          <Input
            label={t('jobTitles.qualifications', 'Qualifications')}
            value={formData.qualifications}
            onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
            placeholder="e.g., MBA, 5+ years experience"
          />

          <Input
            label={t('jobTitles.responsibilities', 'Responsibilities')}
            value={formData.responsibilities}
            onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
              {t('common.active')}
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} loading={isSubmitting} className="flex-1">{t('common.save')}</Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1">{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('jobTitles.deleteWarning', 'This job title will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, JobTitlesPage);
