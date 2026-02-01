/**
 * 💰 Salaries Management - إدارة الرواتب
 * ========================================
 * إدارة رواتب الموظفين ومسيرات الرواتب
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  BanknotesIcon,
  CalculatorIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '../../components/layout/MainLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePermissions } from '../../hooks/usePermissions';
import clsx from 'clsx';

interface SalaryRecord {
  id: number;
  employee_code: string;
  employee_name: string;
  employee_name_ar: string;
  department: string;
  department_ar: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  overtime: number;
  deductions: number;
  net_salary: number;
  status: 'pending' | 'approved' | 'paid';
}

interface PayrollRun {
  id: number;
  month: string;
  year: number;
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: 'draft' | 'processing' | 'approved' | 'paid';
  created_at: string;
  paid_at?: string;
}

export default function SalariesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payroll' | 'employees'>('payroll');
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [processing, setProcessing] = useState(false);

  const canManage = hasPermission('salaries:manage');
  const canApprove = hasPermission('salaries:approve');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      setPayrollRuns([
        {
          id: 1, month: 'January', year: 2024, total_employees: 45,
          total_gross: 650000, total_deductions: 85000, total_net: 565000,
          status: 'paid', created_at: '2024-01-25', paid_at: '2024-01-28'
        },
        {
          id: 2, month: 'December', year: 2023, total_employees: 42,
          total_gross: 620000, total_deductions: 80000, total_net: 540000,
          status: 'paid', created_at: '2023-12-25', paid_at: '2023-12-28'
        },
        {
          id: 3, month: 'February', year: 2024, total_employees: 46,
          total_gross: 670000, total_deductions: 87000, total_net: 583000,
          status: 'approved', created_at: '2024-02-20'
        },
      ]);

      setSalaryRecords([
        {
          id: 1, employee_code: 'EMP-001', employee_name: 'Mohammed Al-Rashid', employee_name_ar: 'محمد الراشد',
          department: 'Operations', department_ar: 'العمليات', basic_salary: 12000, housing_allowance: 3000,
          transport_allowance: 1500, other_allowances: 1500, overtime: 2000, deductions: 2000, net_salary: 18000, status: 'paid'
        },
        {
          id: 2, employee_code: 'EMP-002', employee_name: 'Sara Ahmed', employee_name_ar: 'سارة أحمد',
          department: 'Finance', department_ar: 'المالية', basic_salary: 10000, housing_allowance: 2500,
          transport_allowance: 1000, other_allowances: 500, overtime: 0, deductions: 1500, net_salary: 12500, status: 'paid'
        },
        {
          id: 3, employee_code: 'EMP-003', employee_name: 'Ahmad Hassan', employee_name_ar: 'أحمد حسن',
          department: 'Sales', department_ar: 'المبيعات', basic_salary: 7000, housing_allowance: 1750,
          transport_allowance: 750, other_allowances: 500, overtime: 1500, deductions: 1000, net_salary: 10500, status: 'approved'
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayroll = async () => {
    setProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const [year, month] = selectedMonth.split('-');
      const newRun: PayrollRun = {
        id: Date.now(),
        month: months[parseInt(month) - 1],
        year: parseInt(year),
        total_employees: 46,
        total_gross: 680000,
        total_deductions: 88000,
        total_net: 592000,
        status: 'draft',
        created_at: new Date().toISOString().split('T')[0]
      };
      setPayrollRuns(prev => [newRun, ...prev]);
      showToast('Payroll created successfully', 'success');
    } catch (error) {
      showToast('Failed to create payroll', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprovePayroll = async (runId: number) => {
    try {
      setPayrollRuns(prev => prev.map(r => r.id === runId ? { ...r, status: 'approved' as const } : r));
      showToast('Payroll approved', 'success');
    } catch (error) {
      showToast('Failed to approve', 'error');
    }
  };

  const handleProcessPayment = async (runId: number) => {
    setProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPayrollRuns(prev => prev.map(r => 
        r.id === runId ? { ...r, status: 'paid' as const, paid_at: new Date().toISOString().split('T')[0] } : r
      ));
      showToast('Payment processed successfully', 'success');
    } catch (error) {
      showToast('Payment failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'processing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentPayroll = payrollRuns.find(r => r.status !== 'paid');
  const totalPaidThisYear = payrollRuns.filter(r => r.year === 2024 && r.status === 'paid').reduce((sum, r) => sum + r.total_net, 0);

  return (
    <MainLayout>
      <Head>
        <title>{t('hr.salaries') || 'Salaries'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BanknotesIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('hr.salaries') || 'Salaries & Payroll'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('hr.salariesSubtitle') || 'Manage employee salaries and payroll'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary">
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export
            </Button>
            <Button onClick={handleCreatePayroll} loading={processing} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              Create Payroll
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{payrollRuns.filter(r => r.status === 'paid').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Paid Payrolls</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{payrollRuns.filter(r => r.status === 'approved').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Pending Payment</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-purple-600">
              <span className="text-2xl font-bold">{(totalPaidThisYear / 1000).toFixed(0)}K</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Total Paid (2024)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-indigo-600">
              <span className="text-2xl font-bold">{currentPayroll?.total_employees || 0}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Current Employees</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button onClick={() => setActiveTab('payroll')}
                className={clsx('px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'payroll' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500')}>
                <CalculatorIcon className="w-5 h-5 inline-block me-2" />
                Payroll Runs
              </button>
              <button onClick={() => setActiveTab('employees')}
                className={clsx('px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'employees' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500')}>
                <BanknotesIcon className="w-5 h-5 inline-block me-2" />
                Employee Salaries
              </button>
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <>
                {activeTab === 'payroll' && (
                  <div className="space-y-4">
                    {payrollRuns.map((run) => (
                      <div key={run.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                              <BanknotesIcon className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {run.month} {run.year}
                              </h3>
                              <p className="text-sm text-gray-500">{run.total_employees} employees</p>
                            </div>
                            <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(run.status))}>
                              {run.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{(run.total_gross / 1000).toFixed(0)}K</p>
                              <p className="text-xs text-gray-500">Gross</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-red-600">-{(run.total_deductions / 1000).toFixed(0)}K</p>
                              <p className="text-xs text-gray-500">Deductions</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-green-600">{(run.total_net / 1000).toFixed(0)}K</p>
                              <p className="text-xs text-gray-500">Net</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => { setSelectedRun(run); setIsDetailOpen(true); }}>
                              <EyeIcon className="w-4 h-4 me-1" />View
                            </Button>
                            {run.status === 'draft' && canApprove && (
                              <Button size="sm" onClick={() => handleApprovePayroll(run.id)}>Approve</Button>
                            )}
                            {run.status === 'approved' && canManage && (
                              <Button size="sm" onClick={() => handleProcessPayment(run.id)} loading={processing}>
                                Process Payment
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'employees' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Employee</th>
                          <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Department</th>
                          <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Basic</th>
                          <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Allowances</th>
                          <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Overtime</th>
                          <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Deductions</th>
                          <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {salaryRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {locale === 'ar' ? record.employee_name_ar : record.employee_name}
                              </p>
                              <p className="text-xs text-gray-500">{record.employee_code}</p>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {locale === 'ar' ? record.department_ar : record.department}
                            </td>
                            <td className="px-4 py-3 text-end">{record.basic_salary.toLocaleString()}</td>
                            <td className="px-4 py-3 text-end text-green-600">
                              +{(record.housing_allowance + record.transport_allowance + record.other_allowances).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-end text-blue-600">
                              {record.overtime > 0 ? `+${record.overtime.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-end text-red-600">
                              -{record.deductions.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-end font-bold text-gray-900 dark:text-white">
                              {record.net_salary.toLocaleString()} SAR
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(record.status))}>
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payroll Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)}
        title={selectedRun ? `Payroll - ${selectedRun.month} ${selectedRun.year}` : 'Payroll Details'} size="lg">
        {selectedRun && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(selectedRun.status))}>
                  {selectedRun.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Employees</p>
                <p className="font-bold">{selectedRun.total_employees}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-bold">{selectedRun.created_at}</p>
              </div>
              {selectedRun.paid_at && (
                <div>
                  <p className="text-sm text-gray-500">Paid On</p>
                  <p className="font-bold">{selectedRun.paid_at}</p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{selectedRun.total_gross.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Gross Salary (SAR)</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{selectedRun.total_deductions.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Deductions (SAR)</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{selectedRun.total_net.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Net Payable (SAR)</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>Close</Button>
              <Button variant="secondary">
                <DocumentArrowDownIcon className="w-4 h-4 me-2" />Export
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
  );
}
