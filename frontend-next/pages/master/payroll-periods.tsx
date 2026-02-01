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
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlayIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

interface PayrollPeriod {
  id: number;
  code: string;
  name: string;
  name_ar?: string;
  year: number;
  month: number;
  period_type: 'monthly' | 'bi_weekly' | 'weekly';
  start_date: string;
  end_date: string;
  payment_date: string;
  cutoff_date: string;
  working_days: number;
  actual_working_days?: number;
  employee_count: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: 'draft' | 'open' | 'processing' | 'calculated' | 'approved' | 'paid' | 'closed';
  processed_by?: string;
  processed_at?: string;
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
  is_locked: boolean;
  notes?: string;
  created_at: string;
}

const PERIOD_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray', icon: '📝' },
  { value: 'open', label: 'Open', color: 'blue', icon: '📂' },
  { value: 'processing', label: 'Processing', color: 'yellow', icon: '⏳' },
  { value: 'calculated', label: 'Calculated', color: 'orange', icon: '🔢' },
  { value: 'approved', label: 'Approved', color: 'purple', icon: '✅' },
  { value: 'paid', label: 'Paid', color: 'green', icon: '💰' },
  { value: 'closed', label: 'Closed', color: 'red', icon: '🔒' },
];

const MONTHS = [
  { value: 1, label: 'January', labelAr: 'يناير' },
  { value: 2, label: 'February', labelAr: 'فبراير' },
  { value: 3, label: 'March', labelAr: 'مارس' },
  { value: 4, label: 'April', labelAr: 'أبريل' },
  { value: 5, label: 'May', labelAr: 'مايو' },
  { value: 6, label: 'June', labelAr: 'يونيو' },
  { value: 7, label: 'July', labelAr: 'يوليو' },
  { value: 8, label: 'August', labelAr: 'أغسطس' },
  { value: 9, label: 'September', labelAr: 'سبتمبر' },
  { value: 10, label: 'October', labelAr: 'أكتوبر' },
  { value: 11, label: 'November', labelAr: 'نوفمبر' },
  { value: 12, label: 'December', labelAr: 'ديسمبر' },
];

function PayrollPeriodsPage() {
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const hasFetched = useRef(false);

  const [items, setItems] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PayrollPeriod | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<{
    year: number;
    month: number;
    period_type: PayrollPeriod['period_type'];
    start_date: string;
    end_date: string;
    payment_date: string;
    cutoff_date: string;
    working_days: number;
    notes: string;
  }>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    period_type: 'monthly',
    start_date: '',
    end_date: '',
    payment_date: '',
    cutoff_date: '',
    working_days: 22,
    notes: '',
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
      const res = await fetch('http://localhost:4000/api/payroll-periods', {
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
    const currentYear = new Date().getFullYear();
    setItems([
      { id: 1, code: 'PAY-2024-01', name: 'January 2024', name_ar: 'يناير 2024', year: 2024, month: 1, period_type: 'monthly', start_date: '2024-01-01', end_date: '2024-01-31', payment_date: '2024-01-28', cutoff_date: '2024-01-25', working_days: 22, actual_working_days: 22, employee_count: 120, total_gross: 1250000, total_deductions: 185000, total_net: 1065000, status: 'closed', processed_by: 'HR Admin', processed_at: '2024-01-26', approved_by: 'Finance Manager', approved_at: '2024-01-27', paid_at: '2024-01-28', is_locked: true, created_at: '2023-12-25' },
      { id: 2, code: 'PAY-2024-02', name: 'February 2024', name_ar: 'فبراير 2024', year: 2024, month: 2, period_type: 'monthly', start_date: '2024-02-01', end_date: '2024-02-29', payment_date: '2024-02-28', cutoff_date: '2024-02-25', working_days: 21, actual_working_days: 21, employee_count: 122, total_gross: 1275000, total_deductions: 188000, total_net: 1087000, status: 'closed', processed_by: 'HR Admin', processed_at: '2024-02-26', approved_by: 'Finance Manager', approved_at: '2024-02-27', paid_at: '2024-02-28', is_locked: true, created_at: '2024-01-25' },
      { id: 3, code: 'PAY-2024-03', name: 'March 2024', name_ar: 'مارس 2024', year: 2024, month: 3, period_type: 'monthly', start_date: '2024-03-01', end_date: '2024-03-31', payment_date: '2024-03-28', cutoff_date: '2024-03-25', working_days: 21, actual_working_days: 21, employee_count: 125, total_gross: 1300000, total_deductions: 192000, total_net: 1108000, status: 'closed', is_locked: true, created_at: '2024-02-25' },
      { id: 4, code: 'PAY-2024-04', name: 'April 2024', name_ar: 'أبريل 2024', year: 2024, month: 4, period_type: 'monthly', start_date: '2024-04-01', end_date: '2024-04-30', payment_date: '2024-04-28', cutoff_date: '2024-04-25', working_days: 22, actual_working_days: 21, employee_count: 125, total_gross: 1310000, total_deductions: 194000, total_net: 1116000, status: 'closed', is_locked: true, created_at: '2024-03-25' },
      { id: 5, code: 'PAY-2024-05', name: 'May 2024', name_ar: 'مايو 2024', year: 2024, month: 5, period_type: 'monthly', start_date: '2024-05-01', end_date: '2024-05-31', payment_date: '2024-05-28', cutoff_date: '2024-05-25', working_days: 22, employee_count: 128, total_gross: 1340000, total_deductions: 198000, total_net: 1142000, status: 'paid', is_locked: true, created_at: '2024-04-25' },
      { id: 6, code: 'PAY-2024-06', name: 'June 2024', name_ar: 'يونيو 2024', year: 2024, month: 6, period_type: 'monthly', start_date: '2024-06-01', end_date: '2024-06-30', payment_date: '2024-06-27', cutoff_date: '2024-06-24', working_days: 20, employee_count: 128, total_gross: 1345000, total_deductions: 199000, total_net: 1146000, status: 'approved', is_locked: false, created_at: '2024-05-25' },
      { id: 7, code: 'PAY-2024-07', name: 'July 2024', name_ar: 'يوليو 2024', year: 2024, month: 7, period_type: 'monthly', start_date: '2024-07-01', end_date: '2024-07-31', payment_date: '2024-07-28', cutoff_date: '2024-07-25', working_days: 22, employee_count: 130, total_gross: 0, total_deductions: 0, total_net: 0, status: 'open', is_locked: false, created_at: '2024-06-25' },
      { id: 8, code: 'PAY-2024-08', name: 'August 2024', name_ar: 'أغسطس 2024', year: 2024, month: 8, period_type: 'monthly', start_date: '2024-08-01', end_date: '2024-08-31', payment_date: '2024-08-28', cutoff_date: '2024-08-25', working_days: 22, employee_count: 130, total_gross: 0, total_deductions: 0, total_net: 0, status: 'draft', is_locked: false, created_at: '2024-07-25' },
    ]);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.year) newErrors.year = t('validation.required');
    if (!formData.month) newErrors.month = t('validation.required');
    if (!formData.start_date) newErrors.start_date = t('validation.required');
    if (!formData.end_date) newErrors.end_date = t('validation.required');
    if (!formData.payment_date) newErrors.payment_date = t('validation.required');
    if (formData.working_days < 1 || formData.working_days > 31) newErrors.working_days = t('payrollPeriods.invalidDays', 'Must be 1-31');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    
    const monthName = MONTHS.find(m => m.value === formData.month)?.label || '';
    const code = `PAY-${formData.year}-${String(formData.month).padStart(2, '0')}`;
    const name = `${monthName} ${formData.year}`;
    
    try {
      const token = localStorage.getItem('accessToken');
      const url = editingItem 
        ? `http://localhost:4000/api/payroll-periods/${editingItem.id}`
        : 'http://localhost:4000/api/payroll-periods';
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, code, name }),
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
      const newItem: PayrollPeriod = {
        id: editingItem?.id || Date.now(),
        code,
        name,
        name_ar: MONTHS.find(m => m.value === formData.month)?.labelAr + ' ' + formData.year,
        year: formData.year,
        month: formData.month,
        period_type: formData.period_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        payment_date: formData.payment_date,
        cutoff_date: formData.cutoff_date || formData.end_date,
        working_days: formData.working_days,
        employee_count: editingItem?.employee_count || 0,
        total_gross: editingItem?.total_gross || 0,
        total_deductions: editingItem?.total_deductions || 0,
        total_net: editingItem?.total_net || 0,
        status: editingItem?.status || 'draft',
        is_locked: editingItem?.is_locked || false,
        notes: formData.notes || undefined,
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
    if (item?.is_locked) {
      showToast(t('payrollPeriods.cannotDeleteLocked', 'Cannot delete locked payroll period'), 'error');
      setConfirmOpen(false);
      return;
    }
    if (item?.status !== 'draft') {
      showToast(t('payrollPeriods.cannotDeleteProcessed', 'Can only delete draft periods'), 'error');
      setConfirmOpen(false);
      return;
    }
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`http://localhost:4000/api/payroll-periods/${deletingId}`, {
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
    const now = new Date();
    setFormData({ year: now.getFullYear(), month: now.getMonth() + 1, period_type: 'monthly', start_date: '', end_date: '', payment_date: '', cutoff_date: '', working_days: 22, notes: '' });
    setErrors({});
  };

  const openEdit = (item: PayrollPeriod) => {
    if (item.is_locked) {
      showToast(t('payrollPeriods.cannotEditLocked', 'Cannot edit locked period'), 'error');
      return;
    }
    setEditingItem(item);
    setFormData({
      year: item.year,
      month: item.month,
      period_type: item.period_type,
      start_date: item.start_date,
      end_date: item.end_date,
      payment_date: item.payment_date,
      cutoff_date: item.cutoff_date,
      working_days: item.working_days,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = !searchTerm || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchYear = item.year === filterYear;
    const matchStatus = !filterStatus || item.status === filterStatus;
    return matchSearch && matchYear && matchStatus;
  });

  const totalPayroll = filteredItems.reduce((sum, p) => sum + p.total_net, 0);
  const openPeriod = items.find(p => p.status === 'open');
  const lastPaidPeriod = [...items].filter(p => p.status === 'paid' || p.status === 'closed').sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      calculated: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      approved: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      closed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || colors.draft;
  };

  const getStatusInfo = (status: string) => {
    return PERIOD_STATUSES.find(s => s.value === status);
  };

  const autoFillDates = () => {
    const year = formData.year;
    const month = formData.month;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const paymentDate = new Date(year, month - 1, 28);
    if (paymentDate > endDate) paymentDate.setDate(endDate.getDate());
    const cutoffDate = new Date(paymentDate);
    cutoffDate.setDate(cutoffDate.getDate() - 3);
    
    setFormData({
      ...formData,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      payment_date: paymentDate.toISOString().split('T')[0],
      cutoff_date: cutoffDate.toISOString().split('T')[0],
    });
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <MainLayout>
      <Head>
        <title>{t('payrollPeriods.title', 'Payroll Periods')} - SLMS</title>
      </Head>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('payrollPeriods.title', 'Payroll Periods')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('payrollPeriods.subtitle', 'Manage payroll processing periods and cycles')}
            </p>
          </div>
          {hasPermission('master:hr:create') && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              {t('payrollPeriods.new', 'New Period')}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('payrollPeriods.periods', 'Periods')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{items.filter(p => p.year === filterYear).length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <BanknotesIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('payrollPeriods.yearTotal', 'Year Total')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{(totalPayroll / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <PlayIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('payrollPeriods.openPeriod', 'Open Period')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{openPeriod ? MONTHS.find(m => m.value === openPeriod.month)?.label?.slice(0, 3) : 'None'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <CheckCircleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('payrollPeriods.lastPaid', 'Last Paid')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{lastPaidPeriod ? MONTHS.find(m => m.value === lastPaidPeriod.month)?.label?.slice(0, 3) : 'N/A'}</p>
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
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">{t('payrollPeriods.allStatuses', 'All Statuses')}</option>
            {PERIOD_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.icon} {status.label}</option>
            ))}
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            {t('common.showing')}: {filteredItems.length}
          </div>
        </div>
      </Card>

      {/* Timeline View */}
      <Card className="mb-6">
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{filterYear} {t('payrollPeriods.timeline', 'Timeline')}</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {MONTHS.map(month => {
              const period = items.find(p => p.year === filterYear && p.month === month.value);
              const statusInfo = period ? getStatusInfo(period.status) : null;
              return (
                <div
                  key={month.value}
                  className={`flex-shrink-0 w-20 p-2 rounded-lg text-center ${
                    period ? getStatusColor(period.status) : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
                  }`}
                >
                  <div className="text-xs font-medium">{month.label.slice(0, 3)}</div>
                  <div className="text-lg">{statusInfo?.icon || '—'}</div>
                  {period && (
                    <div className="text-xs truncate">{statusInfo?.label}</div>
                  )}
                </div>
              );
            })}
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
              <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('common.noData')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('payrollPeriods.period', 'Period')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('payrollPeriods.dates', 'Dates')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('payrollPeriods.status', 'Status')}</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('payrollPeriods.employees', 'Employees')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('payrollPeriods.gross', 'Gross')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('payrollPeriods.deductions', 'Deductions')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('payrollPeriods.net', 'Net')}</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.sort((a, b) => b.month - a.month).map((item) => {
                  const statusInfo = getStatusInfo(item.status);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.is_locked && <LockClosedIcon className="w-4 h-4 text-red-500" />}
                          <div>
                            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{item.code}</span>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                            {item.name_ar && <p className="text-xs text-gray-500 dark:text-gray-400">{item.name_ar}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {new Date(item.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(item.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </div>
                        <p className="text-xs text-gray-400">{item.working_days} working days</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                          {statusInfo?.icon} {statusInfo?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.employee_count}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.total_gross > 0 ? item.total_gross.toLocaleString() : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          {item.total_deductions > 0 ? `-${item.total_deductions.toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {item.total_net > 0 ? item.total_net.toLocaleString() : '—'}
                        </span>
                        <p className="text-xs text-gray-400">SAR</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {hasPermission('master:hr:update') && !item.is_locked && (
                            <button onClick={() => openEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('master:hr:delete') && item.status === 'draft' && !item.is_locked && (
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
        title={editingItem ? t('payrollPeriods.edit') : t('payrollPeriods.create')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payrollPeriods.year', 'Year')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payrollPeriods.month', 'Month')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="secondary" onClick={autoFillDates} className="w-full">
                <CalendarDaysIcon className="w-4 h-4 mr-2" />
                {t('payrollPeriods.autoFill', 'Auto-Fill Dates')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('payrollPeriods.startDate', 'Start Date')}
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              error={errors.start_date}
              required
            />
            <Input
              label={t('payrollPeriods.endDate', 'End Date')}
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              error={errors.end_date}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('payrollPeriods.paymentDate', 'Payment Date')}
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              error={errors.payment_date}
              required
            />
            <Input
              label={t('payrollPeriods.cutoffDate', 'Cutoff Date')}
              type="date"
              value={formData.cutoff_date}
              onChange={(e) => setFormData({ ...formData, cutoff_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('payrollPeriods.workingDays', 'Working Days')}
              type="number"
              min="1"
              max="31"
              value={formData.working_days}
              onChange={(e) => setFormData({ ...formData, working_days: Number(e.target.value) })}
              error={errors.working_days}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payrollPeriods.periodType', 'Period Type')}
              </label>
              <select
                value={formData.period_type}
                onChange={(e) => setFormData({ ...formData, period_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="monthly">Monthly</option>
                <option value="bi_weekly">Bi-Weekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <Input
            label={t('common.notes')}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any special notes for this period..."
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
        message={t('payrollPeriods.deleteWarning', 'This payroll period will be permanently deleted.')}
        confirmText={t('common.delete')}
        variant="danger"
        loading={isDeleting}
      />
    </MainLayout>
  );
}

export default withPermission(MenuPermissions.Master.View, PayrollPeriodsPage);
