/**
 * 📘 JOURNAL ENTRIES LIST PAGE  
 * =====================================================
 * قائمة القيود اليومية - إدارة القيود المحاسبية
 * 
 * Features:
 * ✅ Manual & Auto Journal Entries
 * ✅ Post/Cancel/Delete Operations  
 * ✅ Advanced Filtering & Search
 * ✅ Arabic/English Bilingual Support
 * ✅ Real-time Balance Validation
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import { useLocale } from '../../../contexts/LocaleContext';
import { DataTablePro } from '../../../components/ui/DataTablePro';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import {
  PlusIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  HashtagIcon,
  ArrowPathIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface JournalEntry {
  id: number;
  journal_code: string;
  journal_type_id: number;
  journal_type_name: string;
  date: string;
  description: string;
  reference?: string;
  currency_code: string;
  exchange_rate: number;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted' | 'cancelled';
  created_by_name: string;
  created_at: string;
  posted_by_name?: string;
  posted_at?: string;
  lines_count: number;
  is_auto_generated: boolean;
  source_module?: string;
  source_id?: number;
}

interface JournalType {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
}

const statusColors = {
  draft: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  posted: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
};

const statusLabels = {
  draft: 'مسودة',
  posted: 'مُرحّل',
  cancelled: 'ملغي'
};

export default function JournalEntriesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale, t } = useLocale();
  const isArabic = locale === 'ar';
  
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  
  // Modals and dialogs
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter options
  const [journalTypes, setJournalTypes] = useState<JournalType[]>([]);

  useEffect(() => {
    fetchJournalTypes();
    fetchJournalEntries();
  }, []);

  useEffect(() => {
    fetchJournalEntries();
  }, [searchTerm, statusFilter, typeFilter, dateRange]);

  const fetchJournalEntries = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showToast({ type: 'error', message: isArabic ? 'غير مصرح بالوصول' : 'Access denied' });
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: '1',
        limit: '50'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter && typeFilter !== 'all') params.append('journal_type_id', typeFilter);
      if (dateRange.start) params.append('from_date', dateRange.start);
      if (dateRange.end) params.append('to_date', dateRange.end);

      const response = await fetch(`http://localhost:4000/api/accounting/journal-entries?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('فشل تحميل القيود اليومية');
      }

      const result = await response.json();
      
      // Transform data
      const transformedEntries: JournalEntry[] = result.data.map((entry: any) => ({
        id: entry.id,
        journal_code: entry.journal_code,
        journal_type_id: entry.journal_type_id,
        journal_type_name: entry.journal_type_name,
        date: entry.date,
        description: entry.description,
        reference: entry.reference,
        currency_code: entry.currency_code || 'SAR',
        exchange_rate: entry.exchange_rate || 1,
        total_debit: entry.total_debit || 0,
        total_credit: entry.total_credit || 0,
        status: entry.status,
        created_by_name: entry.created_by_name,
        created_at: entry.created_at,
        posted_by_name: entry.posted_by_name,
        posted_at: entry.posted_at,
        lines_count: entry.lines_count || 0,
        is_auto_generated: entry.is_auto_generated || false,
        source_module: entry.source_module,
        source_id: entry.source_id
      }));

      setJournalEntries(transformedEntries);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      showToast({ type: 'error', message: isArabic ? 'فشل تحميل القيود اليومية' : 'Failed to load journal entries' });
      
      // Fallback sample data
      const sampleEntries: JournalEntry[] = [
        {
          id: 1,
          journal_code: 'JRN-2026-001',
          journal_type_id: 1,
          journal_type_name: isArabic ? 'قيد يدوي' : 'Manual Entry',
          date: '2026-03-01',
          description: isArabic ? 'قيد افتتاحي للحسابات' : 'Opening balance entry',
          reference: 'OPN-001',
          currency_code: 'SAR',
          exchange_rate: 1,
          total_debit: 100000,
          total_credit: 100000,
          status: 'posted',
          created_by_name: isArabic ? 'أحمد محمد' : 'Ahmed Mohamed',
          created_at: '2026-03-01T09:00:00Z',
          posted_by_name: isArabic ? 'فاطمة السالم' : 'Fatima Salem',
          posted_at: '2026-03-01T09:30:00Z',
          lines_count: 4,
          is_auto_generated: false
        },
        {
          id: 2,
          journal_code: 'JRN-2026-002',
          journal_type_id: 2,
          journal_type_name: isArabic ? 'قيد تلقائي - شراء' : 'Auto Entry - Purchase',
          date: '2026-03-01',
          description: isArabic ? 'قيد موافقة أمر الشراء PO-2026-045' : 'Purchase order approval JE for PO-2026-045',
          reference: 'PO-2026-045',
          currency_code: 'SAR',
          exchange_rate: 1,
          total_debit: 45000,
          total_credit: 45000,
          status: 'posted',
          created_by_name: isArabic ? 'النظام الآلي' : 'System Auto',
          created_at: '2026-03-01T14:30:00Z',
          posted_by_name: isArabic ? 'النظام الآلي' : 'System Auto',
          posted_at: '2026-03-01T14:30:00Z',
          lines_count: 2,
          is_auto_generated: true,
          source_module: 'procurement',
          source_id: 45
        }
      ];
      setJournalEntries(sampleEntries);
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalTypes = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/accounting/journal-types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setJournalTypes(result.data || []);
      } else {
        // Fallback data
        setJournalTypes([
          { id: 1, name: 'Manual Entry', name_ar: 'قيد يدوي', code: 'MAN' },
          { id: 2, name: 'Auto Purchase', name_ar: 'قيد تلقائي - شراء', code: 'APO' },
          { id: 3, name: 'Auto Receipt', name_ar: 'قيد تلقائي - استلام', code: 'ARN' },
          { id: 4, name: 'Auto Payment', name_ar: 'قيد تلقائي - دفع', code: 'APY' },
          { id: 5, name: 'Auto Customs', name_ar: 'قيد تلقائي - جمارك', code: 'ACU' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching journal types:', error);
    }
  };

  const handlePostEntry = async (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setShowPostDialog(true);
  };

  const handleCancelEntry = async (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setShowCancelDialog(true);
  };

  const confirmPost = async () => {
    if (!selectedEntry) return;
    
    try {
      setActionLoading(true);
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/accounting/journal-entries/${selectedEntry.id}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('فشل ترحيل القيد');
      
      showToast({ type: 'success', message: isArabic ? 'تم ترحيل القيد بنجاح' : 'Journal entry posted successfully' });
      setShowPostDialog(false);
      fetchJournalEntries();
    } catch (error) {
      console.error('Error posting entry:', error);
      showToast({ type: 'error', message: isArabic ? 'فشل ترحيل القيد' : 'Failed to post journal entry' });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmCancel = async () => {
    if (!selectedEntry) return;
    
    try {
      setActionLoading(true);
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/accounting/journal-entries/${selectedEntry.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('فشل إلغاء القيد');
      
      showToast({ type: 'success', message: isArabic ? 'تم إلغاء القيد بنجاح' : 'Journal entry cancelled successfully' });
      setShowCancelDialog(false);
      fetchJournalEntries();
    } catch (error) {
      console.error('Error cancelling entry:', error);
      showToast({ type: 'error', message: isArabic ? 'فشل إلغاء القيد' : 'Failed to cancel journal entry' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    
    try {
      setActionLoading(true);
      
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/accounting/journal-entries/${deletingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('فشل حذف القيد');
      
      showToast({ type: 'success', message: isArabic ? 'تم حذف القيد بنجاح' : 'Journal entry deleted successfully' });
      setShowDeleteDialog(false);
      fetchJournalEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      showToast({ type: 'error', message: isArabic ? 'فشل حذف القيد' : 'Failed to delete journal entry' });
    } finally {
      setActionLoading(false);
      setDeletingId(null);
    }
  };

  const formatCurrency = (amount: number, currencyCode: string = 'SAR') => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + currencyCode;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isArabic ? 'ar-SA' : 'en-GB');
  };

  const columns = [
    {
      key: 'journal_code',
      label: isArabic ? 'رقم القيد' : 'Journal Code',
      sortable: true,
      render: (entry: JournalEntry) => (
        <div className="font-medium text-blue-600 dark:text-blue-400">
          <Link href={`/accounting/journals/view/${entry.id}`}>
            {entry.journal_code}
          </Link>
          {entry.is_auto_generated && (
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
              {isArabic ? 'تلقائي' : 'Auto'}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'date',
      label: isArabic ? 'التاريخ' : 'Date',
      sortable: true,
      render: (entry: JournalEntry) => formatDate(entry.date)
    },
    {
      key: 'journal_type_name',
      label: isArabic ? 'نوع القيد' : 'Type',
      sortable: true
    },
    {
      key: 'description',
      label: isArabic ? 'الوصف' : 'Description',
      render: (entry: JournalEntry) => (
        <div className="max-w-xs truncate" title={entry.description}>
          {entry.description}
        </div>
      )
    },
    {
      key: 'reference',
      label: isArabic ? 'المرجع' : 'Reference',
      render: (entry: JournalEntry) => entry.reference || '—'
    },
    {
      key: 'total_debit',
      label: isArabic ? 'إجمالي المدين' : 'Total Debit',
      render: (entry: JournalEntry) => formatCurrency(entry.total_debit, entry.currency_code)
    },
    {
      key: 'total_credit',
      label: isArabic ? 'إجمالي الدائن' : 'Total Credit',
      render: (entry: JournalEntry) => formatCurrency(entry.total_credit, entry.currency_code)
    },
    {
      key: 'status',
      label: isArabic ? 'الحالة' : 'Status',
      render: (entry: JournalEntry) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[entry.status]}`}>
          {isArabic ? statusLabels[entry.status] : entry.status}
        </span>
      )
    },
    {
      key: 'created_by_name',
      label: isArabic ? 'أنشئ بواسطة' : 'Created By',
      render: (entry: JournalEntry) => entry.created_by_name
    },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      render: (entry: JournalEntry) => (
        <div className="flex items-center gap-2">
          <Link href={`/accounting/journals/view/${entry.id}`}>
            <Button variant="secondary" size="sm">
              <EyeIcon className="w-4 h-4" />
            </Button>
          </Link>
          
          {entry.status === 'draft' && hasPermission('journal_entries:edit') && (
            <Link href={`/accounting/journals/edit/${entry.id}`}>
              <Button variant="secondary" size="sm">
                <PencilIcon className="w-4 h-4" />
              </Button>
            </Link>
          )}

          {entry.status === 'draft' && hasPermission('journal_entries:post') && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handlePostEntry(entry)}
              title={isArabic ? 'ترحيل القيد' : 'Post Entry'}
            >
              <CheckCircleIcon className="w-4 h-4" />
            </Button>
          )}

          {entry.status === 'posted' && hasPermission('journal_entries:cancel') && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleCancelEntry(entry)}
              title={isArabic ? 'إلغاء القيد' : 'Cancel Entry'}
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          )}

          {entry.status === 'draft' && hasPermission('journal_entries:delete') && !entry.is_auto_generated && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(entry.id)}
              title={isArabic ? 'حذف القيد' : 'Delete Entry'}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  if (!hasPermission('journal_entries:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {isArabic ? 'غير مصرح بالوصول' : 'Access Denied'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {isArabic ? 'ليس لديك صلاحية لعرض القيود اليومية' : 'You do not have permission to view journal entries'}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'القيود اليومية - SLMS' : 'Journal Entries - SLMS'}</title>
      </Head>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <DocumentTextIcon className="w-7 h-7" />
              {isArabic ? 'القيود اليومية' : 'Journal Entries'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isArabic ? 'إدارة القيود المحاسبية اليدوية والتلقائية' : 'Manage manual and automatic accounting journal entries'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/accounting/reports">
              <Button variant="secondary">
                <DocumentCheckIcon className="w-4 h-4" />
                {isArabic ? 'التقارير المالية' : 'Financial Reports'}
              </Button>
            </Link>
            
            {hasPermission('journal_entries:create') && (
              <Link href="/accounting/journals/new">
                <Button variant="primary">
                  <PlusIcon className="w-4 h-4" />
                  {isArabic ? 'قيد جديد' : 'New Entry'}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            label={isArabic ? 'البحث' : 'Search'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isArabic ? 'بحث برقم القيد أو الوصف...' : 'Search by code or description...'}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isArabic ? 'الحالة' : 'Status'}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">{isArabic ? 'جميع الحالات' : 'All Status'}</option>
              <option value="draft">{isArabic ? 'مسودة' : 'Draft'}</option>
              <option value="posted">{isArabic ? 'مُرحّل' : 'Posted'}</option>
              <option value="cancelled">{isArabic ? 'ملغي' : 'Cancelled'}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isArabic ? 'نوع القيد' : 'Entry Type'}
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">{isArabic ? 'جميع الأنواع' : 'All Types'}</option>
              {journalTypes.map(type => (
                <option key={type.id} value={type.id.toString()}>
                  {isArabic ? type.name_ar || type.name : type.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={isArabic ? 'من تاريخ' : 'From Date'}
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />

          <Input
            label={isArabic ? 'إلى تاريخ' : 'To Date'}
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <HashtagIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {journalEntries.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isArabic ? 'إجمالي القيود' : 'Total Entries'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {journalEntries.filter(e => e.status === 'draft').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isArabic ? 'مسودات' : 'Drafts'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {journalEntries.filter(e => e.status === 'posted').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isArabic ? 'مُرحّلة' : 'Posted'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {journalEntries.filter(e => e.is_auto_generated).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isArabic ? 'قيود تلقائية' : 'Auto Entries'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <DataTablePro
          data={journalEntries}
          columns={columns}
          loading={loading}
          searchable
          emptyMessage={isArabic ? 'لا توجد قيود يومية' : 'No journal entries found'}
          keyExtractor={(row) => String(row.id)}
        />
      </div>

      {/* Modals */}
      <ConfirmDialog
        isOpen={showPostDialog}
        onClose={() => setShowPostDialog(false)}
        onConfirm={confirmPost}
        title={isArabic ? 'ترحيل القيد' : 'Post Journal Entry'}
        message={isArabic ? 
          'هل أنت متأكد من ترحيل هذا القيد؟ لن يمكن تعديله بعد الترحيل.' :
          'Are you sure you want to post this journal entry? It cannot be modified after posting.'
        }
        confirmText={isArabic ? 'ترحيل' : 'Post'}
        variant="primary"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={confirmCancel}
        title={isArabic ? 'إلغاء القيد' : 'Cancel Journal Entry'}
        message={isArabic ? 
          'هل أنت متأكد من إلغاء هذا القيد؟ سيتم عكس جميع المبالغ.' :
          'Are you sure you want to cancel this journal entry? All amounts will be reversed.'
        }
        confirmText={isArabic ? 'إلغاء' : 'Cancel Entry'}
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title={isArabic ? 'حذف القيد' : 'Delete Journal Entry'}
        message={isArabic ? 
          'هل أنت متأكد من حذف هذا القيد نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.' :
          'Are you sure you want to permanently delete this journal entry? This action cannot be undone.'
        }
        confirmText={isArabic ? 'حذف' : 'Delete'}
        variant="danger"
        loading={actionLoading}
      />
    </MainLayout>
  );
}