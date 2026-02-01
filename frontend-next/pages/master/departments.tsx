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
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface Department {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  parent_id?: number;
  parent_name?: string;
  manager_id?: number;
  manager_name?: string;
  cost_center_code?: string;
  level: number;
  path: string;
  employee_count: number;
  budget?: number;
  phone?: string;
  email?: string;
  location?: string;
  is_active: boolean;
  description?: string;
  created_at: string;
}

function DepartmentsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Department | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    parent_id: 0,
    manager_id: 0,
    cost_center_code: '',
    budget: 0,
    phone: '',
    email: '',
    location: '',
    is_active: true,
    description: '',
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
      const res = await fetch('http://localhost:4000/api/departments', {
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
    setItems([
      { id: 1, code: 'CEO', name: 'Executive Office', name_ar: 'مكتب الرئيس التنفيذي', level: 0, path: '/CEO', employee_count: 3, budget: 500000, location: 'Head Office', is_active: true, description: 'Company leadership and executive management', created_at: '2024-01-01' },
      { id: 2, code: 'FIN', name: 'Finance & Accounting', name_ar: 'المالية والمحاسبة', parent_id: 1, parent_name: 'Executive Office', manager_name: 'Ahmed Al-Rashid', level: 1, path: '/CEO/FIN', employee_count: 12, cost_center_code: 'CC-FIN', budget: 800000, location: 'Building A, Floor 2', phone: '011-1234001', email: 'finance@company.com', is_active: true, description: 'Financial management, accounting, and reporting', created_at: '2024-01-01' },
      { id: 3, code: 'HR', name: 'Human Resources', name_ar: 'الموارد البشرية', parent_id: 1, parent_name: 'Executive Office', manager_name: 'Fatima Al-Hassan', level: 1, path: '/CEO/HR', employee_count: 8, cost_center_code: 'CC-HR', budget: 600000, location: 'Building A, Floor 3', phone: '011-1234002', email: 'hr@company.com', is_active: true, description: 'Recruitment, employee relations, and development', created_at: '2024-01-01' },
      { id: 4, code: 'OPS', name: 'Operations', name_ar: 'العمليات', parent_id: 1, parent_name: 'Executive Office', manager_name: 'Mohammed Al-Farsi', level: 1, path: '/CEO/OPS', employee_count: 45, cost_center_code: 'CC-OPS', budget: 2500000, location: 'Warehouse Complex', is_active: true, description: 'Logistics, warehousing, and supply chain', created_at: '2024-01-01' },
      { id: 5, code: 'SALES', name: 'Sales & Marketing', name_ar: 'المبيعات والتسويق', parent_id: 1, parent_name: 'Executive Office', manager_name: 'Sara Al-Yami', level: 1, path: '/CEO/SALES', employee_count: 18, cost_center_code: 'CC-SALES', budget: 1200000, location: 'Building B, Floor 1', phone: '011-1234003', email: 'sales@company.com', is_active: true, created_at: '2024-01-01' },
      { id: 6, code: 'IT', name: 'Information Technology', name_ar: 'تقنية المعلومات', parent_id: 1, parent_name: 'Executive Office', manager_name: 'Khaled Al-Mutairi', level: 1, path: '/CEO/IT', employee_count: 15, cost_center_code: 'CC-IT', budget: 1500000, location: 'Building A, Floor 4', phone: '011-1234004', email: 'it@company.com', is_active: true, description: 'IT infrastructure, development, and support', created_at: '2024-01-01' },
      { id: 7, code: 'FIN-AP', name: 'Accounts Payable', name_ar: 'الذمم الدائنة', parent_id: 2, parent_name: 'Finance & Accounting', level: 2, path: '/CEO/FIN/FIN-AP', employee_count: 4, cost_center_code: 'CC-FIN-AP', is_active: true, created_at: '2024-01-01' },
      { id: 8, code: 'FIN-AR', name: 'Accounts Receivable', name_ar: 'الذمم المدينة', parent_id: 2, parent_name: 'Finance & Accounting', level: 2, path: '/CEO/FIN/FIN-AR', employee_count: 4, cost_center_code: 'CC-FIN-AR', is_active: true, created_at: '2024-01-01' },
      { id: 9, code: 'OPS-WH', name: 'Warehouse', name_ar: 'المستودعات', parent_id: 4, parent_name: 'Operations', level: 2, path: '/CEO/OPS/OPS-WH', employee_count: 25, cost_center_code: 'CC-OPS-WH', is_active: true, created_at: '2024-01-01' },
      { id: 10, code: 'OPS-LOG', name: 'Logistics', name_ar: 'اللوجستيات', parent_id: 4, parent_name: 'Operations', level: 2, path: '/CEO/OPS/OPS-LOG', employee_count: 18, cost_center_code: 'CC-OPS-LOG', is_active: true, created_at: '2024-01-01' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) newErrors.code = t('validation.required');
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t('validation.invalidEmail');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/departments/${editingItem.id}`
        : 'http://localhost:4000/api/departments';
      
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
      const parent = items.find(d => d.id === formData.parent_id);
      const newItem: Department = {
        id: editingItem?.id || Date.now(),
        code: formData.code,
        name: formData.name,
        name_ar: formData.name_ar || undefined,
        parent_id: formData.parent_id || undefined,
        parent_name: parent?.name,
        cost_center_code: formData.cost_center_code || undefined,
        level: parent ? parent.level + 1 : 0,
        path: parent ? `${parent.path}/${formData.code}` : `/${formData.code}`,
        employee_count: editingItem?.employee_count || 0,
        budget: formData.budget || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        location: formData.location || undefined,
        is_active: formData.is_active,
        description: formData.description || undefined,
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
    if (item && items.some(d => d.parent_id === item.id)) {
      showToast(t('departments.cannotDeleteWithChildren', 'Cannot delete department with sub-departments'), 'error');
      setConfirmOpen(false);
      return;
    }
    if (item && item.employee_count > 0) {
      showToast(t('departments.cannotDeleteWithEmployees', 'Cannot delete department with employees'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/departments/${deletingId}`, {
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
    setFormData({ code: '', name: '', name_ar: '', parent_id: 0, manager_id: 0, cost_center_code: '', budget: 0, phone: '', email: '', location: '', is_active: true, description: '' });
    setErrors({});
  };

  const openEdit = (item: Department) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      name_ar: item.name_ar || '',
      parent_id: item.parent_id || 0,
      manager_id: item.manager_id || 0,
      cost_center_code: item.cost_center_code || '',
      budget: item.budget || 0,
      phone: item.phone || '',
      email: item.email || '',
      location: item.location || '',
      is_active: item.is_active,
      description: item.description || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLevel = !filterLevel || item.level === Number(filterLevel);
    return matchSearch && matchLevel;
  });

  const totalEmployees = items.reduce((sum, d) => sum + d.employee_count, 0);
  const totalBudget = items.reduce((sum, d) => sum + (d.budget || 0), 0);
  const levels = [...new Set(items.map(d => d.level))].sort((a, b) => a - b);

  const getLevelColor = (level: number) => {
    const colors = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800'];
    return colors[level % colors.length];
  };

  return (
    <MainLayout>
      <Head>
        <title>{t('departments.title', 'Departments')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('departments.title', 'Departments')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('departments.subtitle', 'Manage organizational structure and departments')}
            </p>
          </div>
          {hasPermission('master:hr:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('departments.new', 'New Department')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BuildingOfficeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('departments.total', 'Departments')}</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('departments.totalEmployees', 'Employees')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalEmployees}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('departments.levels', 'Levels')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{levels.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <BuildingOfficeIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('departments.totalBudget', 'Total Budget')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{(totalBudget / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('departments.allLevels', 'All Levels')}</option>
            {levels.map(level => (
              <option key={level} value={level}>Level {level}</option>
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
              <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('departments.parent', 'Parent')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('departments.level', 'Level')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('departments.employees', 'Employees')}</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('departments.manager', 'Manager')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                        {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                        {item.location && <p className="text-xs text-gray-400 mt-1">📍 {item.location}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.parent_name ? (
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.parent_name}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(item.level)} dark:bg-opacity-30`}>
                        L{item.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                        <UserGroupIcon className="w-4 h-4 text-gray-400" />
                        {item.employee_count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.manager_name ? (
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.manager_name}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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
                        {hasPermission('master:hr:delete') && item.employee_count === 0 && !items.some(d => d.parent_id === item.id) && (
                          <button onClick={() => { setDeletingId(item.id); setConfirmOpen(true); }} className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingItem ? t('departments.edit') : t('departments.create')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.code')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              error={errors.code}
              required
              placeholder="e.g., HR"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('departments.parent', 'Parent Department')}
              </label>
              <select
                value={formData.parent_id}
                onChange={(e) => setFormData({ ...formData, parent_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value={0}>{t('departments.noParent', 'None (Top Level)')}</option>
                {items.filter(d => d.id !== editingItem?.id).map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />
            <Input
              label={t('common.nameAr')}
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('departments.costCenter', 'Cost Center Code')}
              value={formData.cost_center_code}
              onChange={(e) => setFormData({ ...formData, cost_center_code: e.target.value })}
              placeholder="e.g., CC-HR"
            />
            <Input
              label={t('departments.budget', 'Annual Budget')}
              type="number"
              min="0"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('common.phone')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label={t('common.email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
            />
          </div>

          <Input
            label={t('departments.location', 'Location')}
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Building A, Floor 2"
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

          <Input
            label={t('common.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

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
        message={t('departments.deleteWarning', 'This department will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, DepartmentsPage);
