/**
 * 💵 Salary Advances Management - إدارة السلف
 * =============================================
 * إدارة السلف والقروض للموظفين
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  BanknotesIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
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

interface Advance {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_name_ar: string;
  department: string;
  department_ar: string;
  amount: number;
  reason: string;
  reason_ar: string;
  request_date: string;
  repayment_start: string;
  installments: number;
  installment_amount: number;
  remaining_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed';
  approved_by?: string;
  approval_date?: string;
  notes?: string;
}

export default function AdvancesPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const canManage = hasPermission('advances:manage');
  const canApprove = hasPermission('advances:approve');

  useEffect(() => {
    fetchAdvances();
  }, []);

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      setAdvances([
        {
          id: 1, employee_id: 101, employee_name: 'Ahmed Al-Farsi', employee_name_ar: 'أحمد الفارسي',
          department: 'Operations', department_ar: 'العمليات', amount: 15000, reason: 'Home renovation',
          reason_ar: 'تجديد المنزل', request_date: '2024-01-10', repayment_start: '2024-02-01',
          installments: 6, installment_amount: 2500, remaining_amount: 10000, status: 'active'
        },
        {
          id: 2, employee_id: 102, employee_name: 'Sara Hassan', employee_name_ar: 'سارة حسن',
          department: 'Finance', department_ar: 'المالية', amount: 8000, reason: 'Medical expenses',
          reason_ar: 'نفقات طبية', request_date: '2024-01-15', repayment_start: '2024-03-01',
          installments: 4, installment_amount: 2000, remaining_amount: 8000, status: 'approved'
        },
        {
          id: 3, employee_id: 103, employee_name: 'Khalid Omar', employee_name_ar: 'خالد عمر',
          department: 'Sales', department_ar: 'المبيعات', amount: 5000, reason: 'Emergency',
          reason_ar: 'طوارئ', request_date: '2024-01-18', repayment_start: '',
          installments: 0, installment_amount: 0, remaining_amount: 5000, status: 'pending'
        },
        {
          id: 4, employee_id: 104, employee_name: 'Fatima Al-Qahtani', employee_name_ar: 'فاطمة القحطاني',
          department: 'HR', department_ar: 'الموارد البشرية', amount: 20000, reason: 'Vehicle purchase',
          reason_ar: 'شراء سيارة', request_date: '2023-06-01', repayment_start: '2023-07-01',
          installments: 10, installment_amount: 2000, remaining_amount: 0, status: 'completed'
        },
      ]);
    } catch (error) {
      showToast(t('common.fetchError') || 'Failed to fetch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdvance = async () => {
    if (!selectedAdvance) return;
    try {
      if (selectedAdvance.id === 0) {
        const installmentAmt = selectedAdvance.installments > 0 
          ? selectedAdvance.amount / selectedAdvance.installments : 0;
        setAdvances(prev => [...prev, { 
          ...selectedAdvance, 
          id: Date.now(),
          installment_amount: installmentAmt,
          remaining_amount: selectedAdvance.amount,
          status: 'pending'
        }]);
      } else {
        setAdvances(prev => prev.map(a => a.id === selectedAdvance.id ? selectedAdvance : a));
      }
      showToast(t('common.saveSuccess') || 'Saved', 'success');
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('common.error') || 'Error', 'error');
    }
  };

  const handleApprove = (advance: Advance) => {
    setAdvances(prev => prev.map(a => 
      a.id === advance.id ? { ...a, status: 'approved', approval_date: new Date().toISOString().split('T')[0] } : a
    ));
    showToast('Advance approved', 'success');
  };

  const handleReject = (advance: Advance) => {
    setAdvances(prev => prev.map(a => a.id === advance.id ? { ...a, status: 'rejected' } : a));
    showToast('Advance rejected', 'info');
  };

  const handleDeleteAdvance = async () => {
    if (!selectedAdvance) return;
    setAdvances(prev => prev.filter(a => a.id !== selectedAdvance.id));
    showToast(t('common.deleteSuccess') || 'Deleted', 'success');
    setConfirmDelete(false);
    setSelectedAdvance(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAdvances = advances.filter(adv => {
    if (filterStatus !== 'all' && adv.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return adv.employee_name.toLowerCase().includes(query) ||
             adv.employee_name_ar.includes(query);
    }
    return true;
  });

  const totalPending = advances.filter(a => a.status === 'pending').reduce((s, a) => s + a.amount, 0);
  const totalActive = advances.filter(a => a.status === 'active').reduce((s, a) => s + a.remaining_amount, 0);

  return (
    <MainLayout>
      <Head>
        <title>{t('hr.advances') || 'Salary Advances'} | SLMS</title>
      </Head>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BanknotesIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('hr.advances') || 'Salary Advances'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {locale === 'ar' ? 'إدارة سلف وقروض الموظفين' : 'Manage employee advances and loans'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary">
              <DocumentArrowDownIcon className="w-5 h-5 me-2" />
              Export
            </Button>
            <Button onClick={() => {
              setSelectedAdvance({
                id: 0, employee_id: 0, employee_name: '', employee_name_ar: '',
                department: '', department_ar: '', amount: 0, reason: '', reason_ar: '',
                request_date: new Date().toISOString().split('T')[0], repayment_start: '',
                installments: 0, installment_amount: 0, remaining_amount: 0, status: 'pending'
              });
              setIsModalOpen(true);
            }} disabled={!canManage}>
              <PlusIcon className="w-5 h-5 me-2" />
              New Request
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600">
              <ClockIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{advances.filter(a => a.status === 'pending').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Pending Requests</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{advances.filter(a => a.status === 'active').length}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Active Advances</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{totalPending.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Pending Amount (SAR)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-purple-600">
              <CurrencyDollarIcon className="w-5 h-5" />
              <span className="text-2xl font-bold">{totalActive.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Outstanding (SAR)</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search employee..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg" />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
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
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Installments</th>
                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 uppercase">Remaining</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAdvances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {locale === 'ar' ? adv.employee_name_ar : adv.employee_name}
                            </p>
                            <p className="text-xs text-gray-500">{adv.request_date}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {locale === 'ar' ? adv.department_ar : adv.department}
                      </td>
                      <td className="px-4 py-3 text-end font-medium">{adv.amount.toLocaleString()} SAR</td>
                      <td className="px-4 py-3 text-sm max-w-[150px] truncate">
                        {locale === 'ar' ? adv.reason_ar : adv.reason}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {adv.installments > 0 ? `${adv.installments} × ${adv.installment_amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <span className={clsx(adv.remaining_amount > 0 ? 'text-orange-600' : 'text-green-600')}>
                          {adv.remaining_amount.toLocaleString()} SAR
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', getStatusBadge(adv.status))}>
                          {adv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          {adv.status === 'pending' && canApprove && (
                            <>
                              <button onClick={() => handleApprove(adv)}
                                className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Approve">
                                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                              </button>
                              <button onClick={() => handleReject(adv)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="Reject">
                                <XCircleIcon className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                          <button onClick={() => { setSelectedAdvance(adv); setIsModalOpen(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                            <PencilIcon className="w-4 h-4 text-blue-600" />
                          </button>
                          <button onClick={() => { setSelectedAdvance(adv); setConfirmDelete(true); }}
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

      {/* Advance Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedAdvance?.id ? 'Edit Advance' : 'New Advance Request'} size="lg">
        {selectedAdvance && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Employee Name (EN)" value={selectedAdvance.employee_name}
                onChange={(e) => setSelectedAdvance({ ...selectedAdvance, employee_name: e.target.value })} />
              <Input label="Employee Name (AR)" value={selectedAdvance.employee_name_ar} dir="rtl"
                onChange={(e) => setSelectedAdvance({ ...selectedAdvance, employee_name_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Department (EN)" value={selectedAdvance.department}
                onChange={(e) => setSelectedAdvance({ ...selectedAdvance, department: e.target.value })} />
              <Input label="Department (AR)" value={selectedAdvance.department_ar} dir="rtl"
                onChange={(e) => setSelectedAdvance({ ...selectedAdvance, department_ar: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Amount (SAR)" type="number" value={selectedAdvance.amount}
                onChange={(e) => setSelectedAdvance({ ...selectedAdvance, amount: parseFloat(e.target.value) || 0 })} />
              <Input label="Number of Installments" type="number" value={selectedAdvance.installments}
                onChange={(e) => setSelectedAdvance({ ...selectedAdvance, installments: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Request Date" type="date" value={selectedAdvance.request_date}
                onChange={(e) => setSelectedAdvance({ ...selectedAdvance, request_date: e.target.value })} />
              <Input label="Repayment Start" type="date" value={selectedAdvance.repayment_start}
                onChange={(e) => setSelectedAdvance({ ...selectedAdvance, repayment_start: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Reason (EN)" value={selectedAdvance.reason}
                onChange={(e) => setSelectedAdvance({ ...selectedAdvance, reason: e.target.value })} />
              <Input label="Reason (AR)" value={selectedAdvance.reason_ar} dir="rtl"
                onChange={(e) => setSelectedAdvance({ ...selectedAdvance, reason_ar: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveAdvance}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeleteAdvance} title="Delete Advance"
        message="Are you sure you want to delete this advance record?" confirmText="Delete" variant="danger" />
    </MainLayout>
  );
}
