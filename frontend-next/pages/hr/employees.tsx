/**
 * 👥 Employees Management - إدارة الموظفين
 * ==========================================
 * إدارة بيانات الموظفين والسجلات الوظيفية
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  UserGroupIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  first_name_ar: string;
  last_name_ar: string;
  email: string;
  phone: string;
  department: string;
  department_ar: string;
  position: string;
  position_ar: string;
  hire_date: string;
  status: 'active' | 'on_leave' | 'terminated';
  salary: number;
  national_id?: string;
  photo_url?: string;
}

export default function EmployeesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const canManage = hasPermission('employees:manage');

  const departments = [
    { value: 'operations', label: 'Operations', label_ar: 'العمليات' },
    { value: 'finance', label: 'Finance', label_ar: 'المالية' },
    { value: 'sales', label: 'Sales', label_ar: 'المبيعات' },
    { value: 'hr', label: 'Human Resources', label_ar: 'الموارد البشرية' },
    { value: 'it', label: 'IT', label_ar: 'تقنية المعلومات' },
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      setEmployees([
        {
          id: 1, employee_code: 'EMP-001', first_name: 'Mohammed', last_name: 'Al-Rashid',
          first_name_ar: 'محمد', last_name_ar: 'الراشد', email: 'mohammed@slms.com',
          phone: '+966501234567', department: 'Operations', department_ar: 'العمليات',
          position: 'Operations Manager', position_ar: 'مدير العمليات',
          hire_date: '2020-03-15', status: 'active', salary: 18000, national_id: '1234567890'
        },
        {
          id: 2, employee_code: 'EMP-002', first_name: 'Sara', last_name: 'Ahmed',
          first_name_ar: 'سارة', last_name_ar: 'أحمد', email: 'sara@slms.com',
          phone: '+966502345678', department: 'Finance', department_ar: 'المالية',
          position: 'Senior Accountant', position_ar: 'محاسب أول',
          hire_date: '2021-06-01', status: 'active', salary: 14000
        },
        {
          id: 3, employee_code: 'EMP-003', first_name: 'Ahmad', last_name: 'Hassan',
          first_name_ar: 'أحمد', last_name_ar: 'حسن', email: 'ahmad@slms.com',
          phone: '+966503456789', department: 'Sales', department_ar: 'المبيعات',
          position: 'Sales Representative', position_ar: 'مندوب مبيعات',
          hire_date: '2022-01-10', status: 'active', salary: 10000
        },
        {
          id: 4, employee_code: 'EMP-004', first_name: 'Fatima', last_name: 'Ali',
          first_name_ar: 'فاطمة', last_name_ar: 'علي', email: 'fatima@slms.com',
          phone: '+966504567890', department: 'HR', department_ar: 'الموارد البشرية',
          position: 'HR Specialist', position_ar: 'أخصائي موارد بشرية',
          hire_date: '2021-09-15', status: 'on_leave', salary: 11000
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      if (selectedEmployee.id === 0) {
        setEmployees(prev => [...prev, { ...selectedEmployee, id: Date.now(), employee_code: `EMP-${Date.now().toString().slice(-3)}` }]);
      } else {
        setEmployees(prev => prev.map(e => e.id === selectedEmployee.id ? selectedEmployee : e));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      setEmployees(prev => prev.filter(e => e.id !== selectedEmployee.id));
      showToast(t('common.deleteSuccess') || 'Deleted', 'success');
    } finally {
      setConfirmDelete(false);
      setSelectedEmployee(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'terminated': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (filterDept !== 'all' && !emp.department.toLowerCase().includes(filterDept)) return false;
    if (filterStatus !== 'all' && emp.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return emp.first_name.toLowerCase().includes(query) ||
             emp.last_name.toLowerCase().includes(query) ||
             emp.employee_code.toLowerCase().includes(query) ||
             emp.email.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <MainLayout>
      <Head>
        <title>{t('hr.employees') || 'Employees'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <UserGroupIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('hr.employees') || 'Employees'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('hr.employeesSubtitle') || 'Manage employee records'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary">
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export
            </Button>
            <Button onClick={() => {
              setSelectedEmployee({
                id: 0, employee_code: '', first_name: '', last_name: '',
                first_name_ar: '', last_name_ar: '', email: '', phone: '',
                department: '', department_ar: '', position: '', position_ar: '',
                hire_date: new Date().toISOString().split('T')[0], status: 'active', salary: 0
              });
              setIsModalOpen(true);
            }} disabled={!canManage}>
              <UserPlusIcon className="w-5 h-5 me-2" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-indigo-600">{employees.length}</p>
            <p className="text-sm text-gray-500">Total Employees</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-green-600">{employees.filter(e => e.status === 'active').length}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-yellow-600">{employees.filter(e => e.status === 'on_leave').length}</p>
            <p className="text-sm text-gray-500">On Leave</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-2xl font-bold text-blue-600">{departments.length}</p>
            <p className="text-sm text-gray-500">Departments</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search employees..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
              </div>
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d.value} value={d.value}>{locale === 'ar' ? d.label_ar : d.label}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hire Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-medium">
                              {emp.first_name[0]}{emp.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {locale === 'ar' ? `${emp.first_name_ar} ${emp.last_name_ar}` : `${emp.first_name} ${emp.last_name}`}
                            </p>
                            <p className="text-xs text-gray-500">{emp.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="flex items-center gap-1"><EnvelopeIcon className="w-3 h-3" />{emp.email}</p>
                          <p className="flex items-center gap-1 text-gray-500"><PhoneIcon className="w-3 h-3" />{emp.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1">
                          <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                          {locale === 'ar' ? emp.department_ar : emp.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {locale === 'ar' ? emp.position_ar : emp.position}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">{emp.hire_date}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(emp.status))}>
                          {emp.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => { setSelectedEmployee(emp); setIsModalOpen(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <PencilIcon className="w-4 h-4 text-blue-600" />
                          </button>
                          <button onClick={() => { setSelectedEmployee(emp); setConfirmDelete(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <TrashIcon className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Employee Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedEmployee?.id ? 'Edit Employee' : 'Add Employee'} size="lg">
        {selectedEmployee && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="First Name (EN)" value={selectedEmployee.first_name}
                onChange={(e) => setSelectedEmployee({ ...selectedEmployee, first_name: e.target.value })} />
              <Input label="Last Name (EN)" value={selectedEmployee.last_name}
                onChange={(e) => setSelectedEmployee({ ...selectedEmployee, last_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="First Name (AR)" value={selectedEmployee.first_name_ar} dir="rtl"
                onChange={(e) => setSelectedEmployee({ ...selectedEmployee, first_name_ar: e.target.value })} />
              <Input label="Last Name (AR)" value={selectedEmployee.last_name_ar} dir="rtl"
                onChange={(e) => setSelectedEmployee({ ...selectedEmployee, last_name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Email" type="email" value={selectedEmployee.email}
                onChange={(e) => setSelectedEmployee({ ...selectedEmployee, email: e.target.value })} />
              <Input label="Phone" value={selectedEmployee.phone}
                onChange={(e) => setSelectedEmployee({ ...selectedEmployee, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Department</label>
                <select value={selectedEmployee.department}
                  onChange={(e) => {
                    const dept = departments.find(d => d.label === e.target.value);
                    setSelectedEmployee({ 
                      ...selectedEmployee, 
                      department: e.target.value,
                      department_ar: dept?.label_ar || ''
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.value} value={d.label}>{locale === 'ar' ? d.label_ar : d.label}</option>
                  ))}
                </select>
              </div>
              <Input label="Position" value={selectedEmployee.position}
                onChange={(e) => setSelectedEmployee({ ...selectedEmployee, position: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Hire Date" type="date" value={selectedEmployee.hire_date}
                onChange={(e) => setSelectedEmployee({ ...selectedEmployee, hire_date: e.target.value })} />
              <Input label="Salary (SAR)" type="number" value={selectedEmployee.salary}
                onChange={(e) => setSelectedEmployee({ ...selectedEmployee, salary: parseFloat(e.target.value) || 0 })} />
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select value={selectedEmployee.status}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
            <Input label="National ID" value={selectedEmployee.national_id || ''}
              onChange={(e) => setSelectedEmployee({ ...selectedEmployee, national_id: e.target.value })} />
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEmployee}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteEmployee} title="Delete Employee"
        message="Are you sure you want to delete this employee record?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}
