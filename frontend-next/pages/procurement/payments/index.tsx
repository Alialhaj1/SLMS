import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { DataTablePro } from '../../../components/ui/DataTablePro';
import { companyStore } from '../../../lib/companyStore';
import { useTranslation } from '../../../hooks/useTranslation';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

interface Payment {
  id: number;
  payment_number: string;
  payment_date: string;
  vendor_name: string;
  payment_amount: string;
  allocated_amount: string;
  unallocated_amount: string;
  status: string;
  is_posted: boolean;
  payment_method: string;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unpostConfirmOpen, setUnpostConfirmOpen] = useState(false);
  const [paymentToUnpost, setPaymentToUnpost] = useState<Payment | null>(null);
  const [unposting, setUnposting] = useState(false);
  const [filters, setFilters] = useState({
    vendorId: '',
    status: '',
    startDate: '',
    endDate: '',
    unallocatedOnly: false
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId() || 1;
      
      const params = new URLSearchParams();
      
      if (filters.vendorId) params.append('vendor_id', filters.vendorId);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('from_date', filters.startDate);
      if (filters.endDate) params.append('to_date', filters.endDate);
      if (filters.unallocatedOnly) params.append('unallocated_only', 'true');

      const queryString = params.toString();
      const url = `http://localhost:4000/api/procurement/payments${queryString ? '?' + queryString : ''}`;
      
      const response = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId)
        }
      });

      if (!response.ok) {
        console.error('API response not OK:', response.status, await response.text());
        throw new Error('Failed to fetch payments');
      }

      const result = await response.json();
      setPayments(result.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      showToast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchPayments();
  };

  const handleClearFilters = () => {
    setFilters({
      vendorId: '',
      status: '',
      startDate: '',
      endDate: '',
      unallocatedOnly: false
    });
    setTimeout(fetchPayments, 100);
  };

  const handleViewDetails = (id: number) => {
    router.push(`/procurement/payments/${id}`);
  };

  const handleDeleteClick = (payment: Payment) => {
    setPaymentToDelete(payment);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId() || 1;
      
      const response = await fetch(`http://localhost:4000/api/procurement/payments/${paymentToDelete.id}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId)
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete payment');
      }

      showToast('Payment deleted successfully', 'success');
      fetchPayments(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || 'Failed to delete payment', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setPaymentToDelete(null);
    }
  };

  const handleUnpostClick = (payment: Payment) => {
    setPaymentToUnpost(payment);
    setUnpostConfirmOpen(true);
  };

  const handleUnpostConfirm = async () => {
    if (!paymentToUnpost) return;
    
    setUnposting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const companyId = companyStore.getActiveCompanyId() || 1;
      
      const response = await fetch(`http://localhost:4000/api/procurement/payments/${paymentToUnpost.id}/unpost`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Company-Id': String(companyId)
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unpost payment');
      }

      showToast('Payment reverted to draft successfully', 'success');
      fetchPayments(); // Refresh the list
    } catch (error: any) {
      console.error('Error unposting payment:', error);
      showToast(error.message || 'Failed to unpost payment', 'error');
    } finally {
      setUnposting(false);
      setUnpostConfirmOpen(false);
      setPaymentToUnpost(null);
    }
  };

  const getStatusBadge = (status: string, isPosted: boolean) => {
    if (isPosted) {
      return <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Posted</span>;
    }
    if (status === 'draft') {
      return <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Draft</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{status}</span>;
  };

  const columns = [
    {
      key: 'payment_number',
      label: 'Payment Number',
      sortable: true,
      render: (row: Payment) => row.payment_number
    },
    {
      key: 'payment_date',
      label: 'Date',
      sortable: true,
      render: (row: Payment) => new Date(row.payment_date).toLocaleDateString()
    },
    {
      key: 'vendor_name',
      label: 'Vendor',
      sortable: true,
      render: (row: Payment) => row.vendor_name
    },
    {
      key: 'payment_amount',
      label: 'Payment Amount',
      sortable: true,
      render: (row: Payment) => parseFloat(row.payment_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    {
      key: 'allocated_amount',
      label: 'Allocated',
      sortable: true,
      render: (row: Payment) => parseFloat(row.allocated_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    {
      key: 'unallocated_amount',
      label: 'Unallocated',
      sortable: true,
      render: (row: Payment) => {
        const unallocated = parseFloat(row.unallocated_amount);
        const color = unallocated > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400';
        return <span className={color}>{unallocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Payment) => getStatusBadge(row.status, row.is_posted)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Payment) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleViewDetails(row.id)}
          >
            View
          </Button>
          {hasPermission('procurement:payments:edit') && row.status === 'draft' && !row.is_posted && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push(`/procurement/payments/${row.id}/edit`)}
            >
              Edit
            </Button>
          )}
          {hasPermission('procurement:payments:unpost') && row.is_posted && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleUnpostClick(row)}
              title="Revert to Draft"
            >
              Unpost
            </Button>
          )}
          {hasPermission('procurement:payments:delete') && row.status === 'draft' && !row.is_posted && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDeleteClick(row)}
            >
              Delete
            </Button>
          )}
        </div>
      )
    }
  ];

  // Check permissions
  if (!hasPermission('procurement:payments:view')) {
    return (
      <MainLayout>
        <Head>
          <title>Vendor Payments - SLMS</title>
        </Head>
        <div className="text-center py-12">
          <p className="text-gray-500">{t('common.accessDenied')}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>Vendor Payments - SLMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Payments</h1>
          {hasPermission('procurement:payments:create') && (
            <Button onClick={() => router.push('/procurement/payments/new')}>
              New Payment
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              label="Vendor ID"
              type="text"
              value={filters.vendorId}
              onChange={(e) => handleFilterChange('vendorId', e.target.value)}
              placeholder="Enter vendor ID"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
              </select>
            </div>
            <Input
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="unallocatedOnly"
                checked={filters.unallocatedOnly}
                onChange={(e) => handleFilterChange('unallocatedOnly', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="unallocatedOnly" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                Show Unallocated Only
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
            <Button variant="secondary" onClick={handleClearFilters}>Clear</Button>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          <DataTablePro
            columns={columns}
            data={payments}
            keyExtractor={(row) => row.id.toString()}
            loading={loading}
            emptyMessage="No payments found"
            searchable={false}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setPaymentToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment"
        message={`Are you sure you want to delete payment "${paymentToDelete?.payment_number}"? This action cannot be undone and any related accounting entries will be reversed.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />

      {/* Unpost Confirmation Dialog */}
      <ConfirmDialog
        isOpen={unpostConfirmOpen}
        onClose={() => {
          setUnpostConfirmOpen(false);
          setPaymentToUnpost(null);
        }}
        onConfirm={handleUnpostConfirm}
        title="Revert Payment to Draft"
        message={`Are you sure you want to revert payment "${paymentToUnpost?.payment_number}" to draft status? Invoice balances will be recalculated.`}
        confirmText="Unpost"
        variant="danger"
        loading={unposting}
      />
    </MainLayout>
  );
}
