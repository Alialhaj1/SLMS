/**
 * PURCHASE INVOICE PAGE - Main Orchestrator
 * Purpose: Complete invoice management with 5 tabs
 * Architecture: Orchestrates all hooks, tabs, and shared components
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../layout/MainLayout';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import { useInvoiceMasterData } from './hooks/useInvoiceMasterData';
import { useInvoiceForm } from './hooks/useInvoiceForm';
import { GeneralTab } from './tabs/GeneralTab';
import { ItemsTab } from './tabs/ItemsTab';
import { ExpensesTab } from './tabs/ExpensesTab';
import { FinancialsTab } from './tabs/FinancialsTab';
import { ApprovalTab } from './tabs/ApprovalTab';
import { companyStore } from '../../../lib/companyStore';

interface PurchaseInvoicePageProps {
  invoiceId?: number;
  mode: 'create' | 'edit' | 'view';
}

type TabKey = 'general' | 'items' | 'expenses' | 'financials' | 'approval';

export const PurchaseInvoicePage: React.FC<PurchaseInvoicePageProps> = ({
  invoiceId,
  mode = 'create',
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  
  // =============================================
  // STATE
  // =============================================
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // =============================================
  // HOOKS
  // =============================================
  const companyId = companyStore.getActiveCompanyId() || 1;
  
  // Master data hook
  const masterData = useInvoiceMasterData(companyId);
  
  // Form hook (initialize first, without invoice type)
  const {
    formData,
    setFormData,
    errors,
    touched,
    invoiceTypeRules,
    isLocked,
    canEdit,
    canPost,
    canApprove,
    validate,
    updateField,
    updateItem,
    addItem,
    removeItem,
    addExpense,
    updateExpense,
    removeExpense,
    calculateDueDate,
    reset,
  } = useInvoiceForm({
    initialData: undefined, // TODO: Load from API if editing
    invoiceType: undefined, // Will be updated via effect
  });
  
  // Get selected invoice type (after formData is defined)
  const selectedInvoiceType = masterData.invoiceTypes.find(
    t => t.id === formData.invoice_type_id
  );

  // =============================================
  // PERMISSIONS
  // =============================================
  const canCreate = hasPermission('purchase_invoices:create');
  const canUpdate = hasPermission('purchase_invoices:update');
  const canApprovePermission = hasPermission('purchase_invoices:approve');
  const canPostPermission = hasPermission('purchase_invoices:post');

  // =============================================
  // EFFECTS
  // =============================================
  useEffect(() => {
    // Set defaults on mount
    if (mode === 'create' && masterData.invoiceTypes.length > 0) {
      const defaultType = masterData.getDefaultInvoiceType();
      const defaultCurrency = masterData.getDefaultCurrency();
      const defaultPaymentTerm = masterData.getDefaultPaymentTerm();
      
      if (defaultType && !formData.invoice_type_id) {
        updateField('invoice_type_id', defaultType.id);
        updateField('invoice_type_code', defaultType.code);
      }
      
      if (defaultCurrency && !formData.currency_id) {
        updateField('currency_id', defaultCurrency.id);
      }
      
      if (defaultPaymentTerm && !formData.payment_term_id) {
        updateField('payment_term_id', defaultPaymentTerm.id);
      }
    }
  }, [masterData.invoiceTypes, masterData.currencies, masterData.paymentTerms, mode]);

  // Fetch invoice data if editing
  useEffect(() => {
    if (mode !== 'create' && invoiceId) {
      fetchInvoiceData(invoiceId);
    }
  }, [invoiceId, mode]);

  // =============================================
  // API CALLS
  // =============================================
  const fetchInvoiceData = async (id: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/procurement/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch invoice');
      
      const data = await response.json();
      setFormData(data);
      showToast('Invoice loaded', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to load invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveInvoice = async () => {
    if (!validate()) {
      showToast('Please fix validation errors', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = mode === 'create' 
        ? 'http://localhost:4000/api/procurement/invoices'
        : `http://localhost:4000/api/procurement/invoices/${invoiceId}`;
      
      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save invoice');
      
      const savedInvoice = await response.json();
      showToast(mode === 'create' ? 'Invoice created' : 'Invoice updated', 'success');
      
      // Navigate to invoice list or view mode
      router.push('/purchasing/invoices');
    } catch (error: any) {
      showToast(error.message || 'Failed to save invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!invoiceId) {
      showToast('Cannot approve unsaved invoice', 'error');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/procurement/invoices/${invoiceId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: 'Approved' }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to approve' }));
        throw new Error(error.message || 'Failed to approve invoice');
      }
      
      const updatedInvoice = await response.json();
      setFormData(prev => ({ ...prev, status: 'approved', approval_status: 'approved' }));
      showToast('Invoice approved successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to approve invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!invoiceId) {
      showToast('Cannot reject unsaved invoice', 'error');
      return;
    }
    
    const reason = prompt('Please enter rejection reason:');
    if (!reason) {
      showToast('Rejection cancelled - reason required', 'info');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/procurement/invoices/${invoiceId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: reason }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to reject' }));
        throw new Error(error.message || 'Failed to reject invoice');
      }
      
      const updatedInvoice = await response.json();
      setFormData(prev => ({ ...prev, status: 'draft', approval_status: 'rejected' }));
      showToast('Invoice rejected', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to reject invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async () => {
    if (!invoiceId) {
      showToast('Cannot post unsaved invoice', 'error');
      return;
    }
    
    if (formData.status !== 'approved') {
      showToast('Invoice must be approved before posting', 'error');
      return;
    }
    
    const confirmed = window.confirm('Are you sure you want to post this invoice? This action cannot be undone.');
    if (!confirmed) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/procurement/invoices/${invoiceId}/post`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to post' }));
        throw new Error(error.message || 'Failed to post invoice');
      }
      
      const updatedInvoice = await response.json();
      setFormData(prev => ({ 
        ...prev, 
        status: 'posted', 
        is_posted: true,
        posted_at: new Date().toISOString(),
      }));
      showToast('Invoice posted to General Ledger', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to post invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/purchasing/invoices');
  };

  // =============================================
  // TAB DEFINITIONS
  // =============================================
  const tabs: { key: TabKey; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    {
      key: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: 'items',
      label: 'Items',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      key: 'expenses',
      label: 'Expenses',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      disabled: formData.items.length === 0,
    },
    {
      key: 'financials',
      label: 'Financials',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: 'approval',
      label: 'Approval',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // =============================================
  // RENDER TAB CONTENT
  // =============================================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralTab
            formData={formData}
            masterData={masterData}
            errors={errors}
            canEdit={canEdit}
            onFieldChange={updateField}
            onDueDateCalculation={calculateDueDate}
          />
        );
      
      case 'items':
        return (
          <ItemsTab
            formData={formData}
            masterData={masterData}
            errors={errors}
            canEdit={canEdit}
            invoiceTypeRules={invoiceTypeRules}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
          />
        );
      
      case 'expenses':
        return (
          <ExpensesTab
            formData={formData}
            masterData={masterData}
            canEdit={canEdit}
            onAddExpense={addExpense}
            onUpdateExpense={updateExpense}
            onRemoveExpense={removeExpense}
          />
        );
      
      case 'financials':
        return (
          <FinancialsTab
            formData={formData}
            masterData={masterData}
            canEdit={canEdit}
            onFieldChange={updateField}
          />
        );
      
      case 'approval':
        return (
          <ApprovalTab
            formData={formData}
            canApprove={canApprove && canApprovePermission}
            canPost={canPost && canPostPermission}
            isLocked={isLocked}
            onApprove={handleApprove}
            onReject={handleReject}
            onPost={handlePost}
          />
        );
      
      default:
        return null;
    }
  };

  // =============================================
  // RENDER
  // =============================================
  if (!canCreate && mode === 'create') {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-red-600">Access denied: You don't have permission to create invoices</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4">
        
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {mode === 'create' ? 'Create Purchase Invoice' : 
                 mode === 'edit' ? 'Edit Purchase Invoice' : 
                 'View Purchase Invoice'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {formData.invoice_number || 'New Invoice'} 
                {formData.vendor_id && ` • Vendor: ${formData.vendor_id}`}
              </p>
            </div>

            {/* Lock Indicator */}
            {isLocked && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm font-medium">Locked</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const isDisabled = tab.disabled;
              
              return (
                <button
                  key={tab.key}
                  onClick={() => !isDisabled && setActiveTab(tab.key)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : isDisabled
                      ? 'border-transparent text-slate-400 cursor-not-allowed'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.key === 'items' && formData.items.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                      {formData.items.length}
                    </span>
                  )}
                  {tab.key === 'expenses' && formData.expenses.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      {formData.expenses.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* Totals Bar (Sticky Footer) */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sticky bottom-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {/* Left: Totals Summary */}
            <div className="flex items-center gap-8">
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Subtotal</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {formData.subtotal.toFixed(2)}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Discount</div>
                <div className="text-lg font-semibold text-red-600">
                  -{formData.total_discount.toFixed(2)}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Tax</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {formData.total_tax.toFixed(2)}
                </div>
              </div>
              
              {formData.total_expenses > 0 && (
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Expenses</div>
                  <div className="text-lg font-semibold text-amber-600">
                    {formData.total_expenses.toFixed(2)}
                  </div>
                </div>
              )}
              
              <div className="pl-8 border-l border-slate-300 dark:border-slate-600">
                <div className="text-xs text-slate-600 dark:text-slate-400">Total</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formData.total_amount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                Cancel
              </button>

              {canEdit && (
                <button
                  onClick={saveInvoice}
                  disabled={saving || formData.items.length === 0}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
                >
                  {saving && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {saving ? 'Saving...' : mode === 'create' ? 'Create Invoice' : 'Update Invoice'}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default PurchaseInvoicePage;
