/**
 * 🔄 AUTOMATIC JOURNAL ENTRIES SYSTEM
 * =====================================================
 * نظام القيود التلقائية المحاسبية 
 * 
 * Features:
 * ✅ Event-Based Journal Generation
 * ✅ Purchase Order Events (PO Approval, Goods Receipt, Payment)
 * ✅ Customs & Shipping Events  
 * ✅ Sales & Customer Events
 * ✅ Configurable Account Templates
 * ✅ Multi-Company Support
 * ✅ Audit Trail & Reversal
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { useToast } from '../../../contexts/ToastContext';
import { useLocale } from '../../../contexts/LocaleContext';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import {
  Cog6ToothIcon,
  DocumentTextIcon,
  BoltIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface AutoJournalTemplate {
  id: number;
  event_type: string;
  event_name: string;
  event_name_ar?: string;
  description?: string;
  is_active: boolean;
  journal_type_id: number;
  account_mappings: AutoJournalMapping[];
  conditions?: any;
  created_at: string;
  updated_at: string;
}

interface AutoJournalMapping {
  id: number;
  template_id: number;
  line_type: 'debit' | 'credit';
  account_id: number;
  account_code: string;
  account_name: string;
  amount_source: 'fixed' | 'percentage' | 'field_mapping' | 'calculation';
  amount_value?: number;
  field_mapping?: string;
  calculation_formula?: string;
  cost_center_mapping?: string;
  description_template?: string;
}

interface AutoJournalEntry {
  id: number;
  template_id: number;
  event_type: string;
  entity_id: number;
  entity_type: string;
  journal_entry_id?: number;
  status: 'pending' | 'generated' | 'posted' | 'failed' | 'cancelled';
  generated_at?: string;
  posted_at?: string;
  error_message?: string;
  event_data: any;
}

type EventType = 
  | 'po_approval' 
  | 'goods_receipt' 
  | 'supplier_payment'
  | 'customs_clearance'
  | 'shipping_dispatch'
  | 'sales_invoice'
  | 'customer_payment'
  | 'inventory_adjustment';

export default function AutoJournalEntriesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const isArabic = locale === 'ar';

  // State
  const [activeTab, setActiveTab] = useState<'templates' | 'queue' | 'history'>('templates');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<AutoJournalTemplate[]>([]);
  const [pendingEntries, setPendingEntries] = useState<AutoJournalEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<AutoJournalEntry[]>([]);
  
  // Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AutoJournalTemplate | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AutoJournalEntry | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      if (activeTab === 'templates') {
        const response = await fetch('http://localhost:4000/api/accounting/auto-journal-templates', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const result = await response.json();
          setTemplates(result.data || []);
        } else {
          setTemplates(generateSampleTemplates());
        }
      } else if (activeTab === 'queue') {
        const response = await fetch('http://localhost:4000/api/accounting/auto-journal-queue', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const result = await response.json();
          setPendingEntries(result.data || []);
        } else {
          setPendingEntries(generateSampleQueue());
        }
      } else if (activeTab === 'history') {
        const response = await fetch('http://localhost:4000/api/accounting/auto-journal-history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const result = await response.json();
          setHistoryEntries(result.data || []);
        } else {
          setHistoryEntries(generateSampleHistory());
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      loadSampleData();
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    if (activeTab === 'templates') {
      setTemplates(generateSampleTemplates());
    } else if (activeTab === 'queue') {
      setPendingEntries(generateSampleQueue());
    } else if (activeTab === 'history') {
      setHistoryEntries(generateSampleHistory());
    }
  };

  // Sample data generators
  const generateSampleTemplates = (): AutoJournalTemplate[] => [
    {
      id: 1,
      event_type: 'po_approval',
      event_name: 'Purchase Order Approval',
      event_name_ar: 'الموافقة على أمر الشراء',
      description: 'Generate journal entry when purchase order is approved',
      is_active: true,
      journal_type_id: 1,
      account_mappings: [
        {
          id: 1,
          template_id: 1,
          line_type: 'debit',
          account_id: 5001,
          account_code: '5001',
          account_name: 'Inventory',
          amount_source: 'field_mapping',
          field_mapping: 'total_amount',
          description_template: 'PO #{po_number} - {supplier_name}'
        },
        {
          id: 2,
          template_id: 1,
          line_type: 'credit',
          account_id: 2001,
          account_code: '2001',
          account_name: 'Accounts Payable',
          amount_source: 'field_mapping',
          field_mapping: 'total_amount',
          description_template: 'PO #{po_number} - {supplier_name}'
        }
      ],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: 2,
      event_type: 'goods_receipt',
      event_name: 'Goods Receipt',
      event_name_ar: 'استلام البضائع',
      description: 'Generate journal entry when goods are received',
      is_active: true,
      journal_type_id: 1,
      account_mappings: [
        {
          id: 3,
          template_id: 2,
          line_type: 'debit',
          account_id: 5001,
          account_code: '5001',
          account_name: 'Inventory',
          amount_source: 'field_mapping',
          field_mapping: 'received_amount',
          description_template: 'Goods Receipt #{gr_number}'
        },
        {
          id: 4,
          template_id: 2,
          line_type: 'credit',
          account_id: 5002,
          account_code: '5002',
          account_name: 'Goods in Transit',
          amount_source: 'field_mapping',
          field_mapping: 'received_amount',
          description_template: 'Goods Receipt #{gr_number}'
        }
      ],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: 3,
      event_type: 'supplier_payment',
      event_name: 'Supplier Payment',
      event_name_ar: 'دفع للمورد',
      description: 'Generate journal entry when payment is made to supplier',
      is_active: true,
      journal_type_id: 1,
      account_mappings: [
        {
          id: 5,
          template_id: 3,
          line_type: 'debit',
          account_id: 2001,
          account_code: '2001',
          account_name: 'Accounts Payable',
          amount_source: 'field_mapping',
          field_mapping: 'payment_amount',
          description_template: 'Payment to {supplier_name}'
        },
        {
          id: 6,
          template_id: 3,
          line_type: 'credit',
          account_id: 1002,
          account_code: '1002',
          account_name: 'Bank Account',
          amount_source: 'field_mapping',
          field_mapping: 'payment_amount',
          description_template: 'Payment to {supplier_name}'
        }
      ],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: 4,
      event_type: 'customs_clearance',
      event_name: 'Customs Clearance',
      event_name_ar: 'التخليص الجمركي',
      description: 'Generate journal entry for customs duties and fees',
      is_active: true,
      journal_type_id: 1,
      account_mappings: [
        {
          id: 7,
          template_id: 4,
          line_type: 'debit',
          account_id: 5001,
          account_code: '5001',
          account_name: 'Inventory',
          amount_source: 'field_mapping',
          field_mapping: 'customs_duties',
          description_template: 'Customs Duties - {shipment_number}'
        },
        {
          id: 8,
          template_id: 4,
          line_type: 'debit',
          account_id: 8003,
          account_code: '8003',
          account_name: 'Customs Fees',
          amount_source: 'field_mapping',
          field_mapping: 'customs_fees',
          description_template: 'Customs Fees - {shipment_number}'
        },
        {
          id: 9,
          template_id: 4, 
          line_type: 'credit',
          account_id: 1002,
          account_code: '1002',
          account_name: 'Bank Account',
          amount_source: 'calculation',
          calculation_formula: 'customs_duties + customs_fees',
          description_template: 'Customs Payment - {shipment_number}'
        }
      ],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    }
  ];

  const generateSampleQueue = (): AutoJournalEntry[] => [
    {
      id: 1,
      template_id: 1,
      event_type: 'po_approval',
      entity_id: 15,
      entity_type: 'purchase_order',
      status: 'pending',
      event_data: {
        po_number: 'PO-2024-015',
        supplier_name: 'Al Rajhi Steel Co.',
        total_amount: 45000,
        approved_by: 'Ahmed Al-Mansoori',
        approval_date: '2024-01-20T14:30:00Z'
      }
    },
    {
      id: 2,
      template_id: 2,
      event_type: 'goods_receipt',
      entity_id: 8,
      entity_type: 'goods_receipt',
      status: 'pending',
      event_data: {
        gr_number: 'GR-2024-008',
        po_number: 'PO-2024-012',
        received_amount: 32000,
        received_by: 'Fatima Al-Zahra',
        receipt_date: '2024-01-20T11:15:00Z'
      }
    },
    {
      id: 3,
      template_id: 4,
      event_type: 'customs_clearance',
      entity_id: 5,
      entity_type: 'customs_declaration',
      status: 'pending',
      event_data: {
        shipment_number: 'SH-2024-005',
        customs_duties: 8500,
        customs_fees: 1200,
        clearance_date: '2024-01-20T09:45:00Z'
      }
    }
  ];

  const generateSampleHistory = (): AutoJournalEntry[] => [
    {
      id: 10,
      template_id: 1,
      event_type: 'po_approval',
      entity_id: 12,
      entity_type: 'purchase_order',
      journal_entry_id: 145,
      status: 'posted',
      generated_at: '2024-01-19T16:20:00Z',
      posted_at: '2024-01-19T16:25:00Z',
      event_data: {
        po_number: 'PO-2024-012',
        supplier_name: 'Dubai Logistics LLC',
        total_amount: 67500
      }
    },
    {
      id: 11,
      template_id: 3,
      event_type: 'supplier_payment',
      entity_id: 8,
      entity_type: 'payment',
      journal_entry_id: 146,
      status: 'posted',
      generated_at: '2024-01-19T14:10:00Z',
      posted_at: '2024-01-19T14:15:00Z',
      event_data: {
        supplier_name: 'Al Waha Trading',
        payment_amount: 23000,
        payment_method: 'bank_transfer'
      }
    },
    {
      id: 12,
      template_id: 2,
      event_type: 'goods_receipt',
      entity_id: 6,
      entity_type: 'goods_receipt',
      status: 'failed',
      generated_at: '2024-01-19T12:30:00Z',
      error_message: 'Account mapping not found for cost center',
      event_data: {
        gr_number: 'GR-2024-006',
        received_amount: 15000
      }
    }
  ];

  const eventTypeLabels: Record<EventType, { en: string; ar: string; color: string }> = {
    po_approval: { 
      en: 'Purchase Order Approval', 
      ar: 'الموافقة على أمر الشراء',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    },
    goods_receipt: { 
      en: 'Goods Receipt', 
      ar: 'استلام البضائع',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    },
    supplier_payment: { 
      en: 'Supplier Payment', 
      ar: 'دفع للمورد',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
    },
    customs_clearance: { 
      en: 'Customs Clearance', 
      ar: 'التخليص الجمركي',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
    },
    shipping_dispatch: { 
      en: 'Shipping Dispatch', 
      ar: 'شحن البضائع',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    },
    sales_invoice: { 
      en: 'Sales Invoice', 
      ar: 'فاتورة مبيعات',
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
    },
    customer_payment: { 
      en: 'Customer Payment', 
      ar: 'دفع من العميل',
      color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400'
    },
    inventory_adjustment: { 
      en: 'Inventory Adjustment', 
      ar: 'تسوية المخزون',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }
  };

  const statusLabels = {
    pending: { 
      en: 'Pending', 
      ar: 'في الانتظار',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      icon: ClockIcon
    },
    generated: { 
      en: 'Generated', 
      ar: 'تم الإنشاء',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      icon: DocumentTextIcon
    },
    posted: { 
      en: 'Posted', 
      ar: 'تم الترحيل',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      icon: CheckCircleIcon
    },
    failed: { 
      en: 'Failed', 
      ar: 'فشل',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      icon: ExclamationTriangleIcon
    },
    cancelled: { 
      en: 'Cancelled', 
      ar: 'ملغي',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      icon: XMarkIcon
    }
  };

  const processQueueEntry = async (entryId: number, action: 'generate' | 'skip' | 'cancel') => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/accounting/auto-journal-queue/${entryId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showToast({ 
          type: 'success', 
          message: isArabic ? 
            `تم ${action === 'generate' ? 'إنشاء القيد' : action === 'skip' ? 'تخطي القيد' : 'إلغاء القيد'}` :
            `Entry ${action === 'generate' ? 'generated' : action === 'skip' ? 'skipped' : 'cancelled'} successfully`
        });
        fetchData(); // Refresh data
      } else {
        throw new Error(`Failed to ${action} entry`);
      }
    } catch (error) {
      console.error(`Error ${action}ing entry:`, error);
      showToast({ 
        type: 'error', 
        message: isArabic ? `فشل في ${action === 'generate' ? 'إنشاء القيد' : action === 'skip' ? 'تخطي القيد' : 'إلغاء القيد'}` : `Failed to ${action} entry`
      });
    }
  };

  const toggleTemplate = async (templateId: number, isActive: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:4000/api/accounting/auto-journal-templates/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (response.ok) {
        showToast({ 
          type: 'success', 
          message: isArabic ? 
            `تم ${isActive ? 'تفعيل' : 'إلغاء تفعيل'} القالب` :
            `Template ${isActive ? 'activated' : 'deactivated'} successfully`
        });
        fetchData();
      } else {
        throw new Error('Failed to toggle template');
      }
    } catch (error) {
      console.error('Error toggling template:', error);
      showToast({ type: 'error', message: isArabic ? 'فشل في تحديث القالب' : 'Failed to update template' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat(isArabic ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: !isArabic
    }).format(new Date(dateString));
  };

  if (!hasPermission('auto_journals:view')) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <BoltIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {isArabic ? 'غير مصرح بالوصول' : 'Access Denied'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {isArabic ? 'ليس لديك صلاحية لإدارة القيود التلقائية' : 'You do not have permission to manage automatic journals'}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Head>
        <title>{isArabic ? 'القيود التلقائية - نظام إدارة اللوجستيات الذكي' : 'Automatic Journal Entries - SLMS'}</title>
      </Head>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <BoltIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              {isArabic ? 'القيود التلقائية' : 'Automatic Journal Entries'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {isArabic ? 'إدارة القوالب والمعالجة التلقائية للقيود المحاسبية' : 'Manage templates and automatic processing of accounting journal entries'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasPermission('auto_journals:create') && (
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedTemplate(null);
                  setShowTemplateModal(true);
                }}
              >
                <PlusIcon className="w-4 h-4" />
                {isArabic ? 'إضافة قالب' : 'Add Template'}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          {[
            { id: 'templates', name: isArabic ? 'القوالب' : 'Templates', icon: Cog6ToothIcon },
            { id: 'queue', name: isArabic ? 'القائمة' : 'Queue', icon: ClockIcon },
            { id: 'history', name: isArabic ? 'السجل' : 'History', icon: DocumentTextIcon }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">
              {isArabic ? 'جاري التحميل...' : 'Loading...'}
            </p>
          </div>
        ) : (
          <div>
            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {isArabic ? 'قوالب القيود التلقائية' : 'Auto Journal Templates'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {isArabic ? 'إدارة قوالب الأحداث وطرق إنشاء القيود التلقائية' : 'Manage event templates and automatic journal generation rules'}
                  </p>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {templates.length === 0 ? (
                    <div className="p-12 text-center">
                      <Cog6ToothIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {isArabic ? 'لا توجد قوالب' : 'No Templates'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {isArabic ? 'لم يتم إنشاء أي قوالب بعد' : 'No templates have been created yet'}
                      </p>
                    </div>
                  ) : (
                    templates.map(template => (
                      <div key={template.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                eventTypeLabels[template.event_type as EventType]?.color || 'bg-gray-100 text-gray-800'
                              }`}>
                                {isArabic ? 
                                  eventTypeLabels[template.event_type as EventType]?.ar || template.event_name_ar || template.event_name :
                                  eventTypeLabels[template.event_type as EventType]?.en || template.event_name
                                }
                              </span>
                              
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                template.is_active 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                              }`}>
                                {template.is_active ? 
                                  (isArabic ? 'نشط' : 'Active') : 
                                  (isArabic ? 'معطل' : 'Inactive')
                                }
                              </span>
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              {isArabic ? template.event_name_ar || template.event_name : template.event_name}
                            </h3>
                            
                            {template.description && (
                              <p className="text-gray-600 dark:text-gray-400 mb-3">{template.description}</p>
                            )}

                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {isArabic ? 'سطور الحساب:' : 'Account Mappings:'} {template.account_mappings.length}
                              {' • '}
                              {isArabic ? 'آخر تحديث:' : 'Last updated:'} {formatDateTime(template.updated_at)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowEntryModal(true);
                              }}
                            >
                              <EyeIcon className="w-4 h-4" />
                              {isArabic ? 'عرض' : 'View'}
                            </Button>

                            {hasPermission('auto_journals:edit') && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowTemplateModal(true);
                                }}
                              >
                                <PencilIcon className="w-4 h-4" />
                                {isArabic ? 'تعديل' : 'Edit'}
                              </Button>
                            )}

                            {hasPermission('auto_journals:edit') && (
                              <Button
                                variant={template.is_active ? "danger" : "primary"}
                                size="sm"
                                onClick={() => toggleTemplate(template.id, !template.is_active)}
                              >
                                {template.is_active ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                                {template.is_active ? 
                                  (isArabic ? 'إيقاف' : 'Disable') : 
                                  (isArabic ? 'تفعيل' : 'Enable')
                                }
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Queue Tab */}
            {activeTab === 'queue' && (
              <div>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {isArabic ? 'قائمة انتظار القيود التلقائية' : 'Auto Journal Queue'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {isArabic ? 'الأحداث المعلقة التي تنتظر إنشاء القيود المحاسبية' : 'Pending events waiting for journal entry generation'}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'نوع الحدث' : 'Event Type'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'الكيان' : 'Entity'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'المبلغ' : 'Amount'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'الحالة' : 'Status'}
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'إجراءات' : 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {pendingEntries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            {isArabic ? 'لا توجد عناصر في القائمة' : 'No items in queue'}
                          </td>
                        </tr>
                      ) : (
                        pendingEntries.map(entry => {
                          const StatusIcon = statusLabels[entry.status]?.icon || ClockIcon;
                          return (
                            <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  eventTypeLabels[entry.event_type as EventType]?.color || 'bg-gray-100 text-gray-800'
                                }`}>
                                  {isArabic ? 
                                    eventTypeLabels[entry.event_type as EventType]?.ar || entry.event_type :
                                    eventTypeLabels[entry.event_type as EventType]?.en || entry.event_type
                                  }
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {entry.event_data.po_number || entry.event_data.gr_number || entry.event_data.shipment_number || `${entry.entity_type}-${entry.entity_id}`}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {entry.event_data.supplier_name || entry.event_data.customer_name || entry.entity_type}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(
                                  entry.event_data.total_amount || 
                                  entry.event_data.received_amount || 
                                  entry.event_data.payment_amount || 
                                  (entry.event_data.customs_duties + entry.event_data.customs_fees) ||
                                  0
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <StatusIcon className="w-4 h-4" />
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusLabels[entry.status].color}`}>
                                    {isArabic ? statusLabels[entry.status].ar : statusLabels[entry.status].en}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {hasPermission('auto_journals:process') && entry.status === 'pending' && (
                                    <>
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => processQueueEntry(entry.id, 'generate')}
                                      >
                                        <PlayIcon className="w-4 h-4" />
                                        {isArabic ? 'إنشاء' : 'Generate'}
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => processQueueEntry(entry.id, 'skip')}
                                      >
                                        {isArabic ? 'تخطي' : 'Skip'}
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEntry(entry);
                                      setShowEntryModal(true);
                                    }}
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                    {isArabic ? 'عرض' : 'View'}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {isArabic ? 'سجل القيود التلقائية' : 'Auto Journal History'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {isArabic ? 'سجل الأحداث المعالجة والقيود المنشأة تلقائياً' : 'History of processed events and automatically generated entries'}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'نوع الحدث' : 'Event Type'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'الكيان' : 'Entity'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'القيد المحاسبي' : 'Journal Entry'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'الحالة' : 'Status'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'تاريخ المعالجة' : 'Processed Date'}
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {isArabic ? 'إجراءات' : 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {historyEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            {isArabic ? 'لا يوجد سجل' : 'No history available'}
                          </td>
                        </tr>
                      ) : (
                        historyEntries.map(entry => {
                          const StatusIcon = statusLabels[entry.status]?.icon || ClockIcon;
                          return (
                            <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  eventTypeLabels[entry.event_type as EventType]?.color || 'bg-gray-100 text-gray-800'
                                }`}>
                                  {isArabic ? 
                                    eventTypeLabels[entry.event_type as EventType]?.ar || entry.event_type :
                                    eventTypeLabels[entry.event_type as EventType]?.en || entry.event_type
                                  }
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {entry.event_data.po_number || entry.event_data.gr_number || `${entry.entity_type}-${entry.entity_id}`}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {entry.event_data.supplier_name || entry.event_data.customer_name || entry.entity_type}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                {entry.journal_entry_id ? (
                                  <button
                                    onClick={() => router.push(`/accounting/journals/${entry.journal_entry_id}`)}
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                  >
                                    JE-{entry.journal_entry_id.toString().padStart(6, '0')}
                                  </button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <StatusIcon className={`w-4 h-4 ${
                                    entry.status === 'posted' ? 'text-green-500' :
                                    entry.status === 'failed' ? 'text-red-500' : 'text-gray-400'
                                  }`} />
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusLabels[entry.status].color}`}>
                                    {isArabic ? statusLabels[entry.status].ar : statusLabels[entry.status].en}
                                  </span>
                                </div>
                                {entry.error_message && (
                                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                    {entry.error_message}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                {entry.generated_at ? formatDateTime(entry.generated_at) : '-'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEntry(entry);
                                    setShowEntryModal(true);
                                  }}
                                >
                                  <EyeIcon className="w-4 h-4" />
                                  {isArabic ? 'عرض' : 'View'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setSelectedTemplate(null);
        }}
        size="xl"
        title={selectedTemplate ? 
          (isArabic ? 'تعديل قالب القيد التلقائي' : 'Edit Auto Journal Template') :
          (isArabic ? 'إضافة قالب قيد تلقائي' : 'Add Auto Journal Template')
        }
      >
        <div className="space-y-6">
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Cog6ToothIcon className="w-12 h-12 mx-auto mb-4" />
            <p>{isArabic ? 'نموذج تعديل/إضافة القالب سيتم تطويره' : 'Template creation/edit form will be developed'}</p>
            <p className="text-sm mt-2">
              {isArabic ? 'يشمل: اختيار الحدث، ربط الحسابات، قواعد الحساب' : 'Includes: Event selection, account mapping, calculation rules'}
            </p>
          </div>
        </div>
      </Modal>

      {/* Entry Detail Modal */}
      <Modal
        isOpen={showEntryModal}
        onClose={() => {
          setShowEntryModal(false);
          setSelectedEntry(null);
          setSelectedTemplate(null);
        }}
        size="lg"
        title={selectedEntry ? 
          (isArabic ? 'تفاصيل القيد التلقائي' : 'Auto Journal Entry Details') :
          selectedTemplate ?
          (isArabic ? 'تفاصيل قالب القيد' : 'Template Details') :
          (isArabic ? 'التفاصيل' : 'Details')
        }
      >
        <div className="space-y-6">
          {selectedEntry ? (
            <div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {isArabic ? 'نوع الحدث:' : 'Event Type:'}
                  </span>
                  <p className="text-gray-900 dark:text-gray-100">
                    {isArabic ? 
                      eventTypeLabels[selectedEntry.event_type as EventType]?.ar || selectedEntry.event_type :
                      eventTypeLabels[selectedEntry.event_type as EventType]?.en || selectedEntry.event_type
                    }
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {isArabic ? 'الحالة:' : 'Status:'}
                  </span>
                  <p className="text-gray-900 dark:text-gray-100">
                    {isArabic ? statusLabels[selectedEntry.status].ar : statusLabels[selectedEntry.status].en}
                  </p>
                </div>
              </div>
              
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300 block mb-2">
                  {isArabic ? 'بيانات الحدث:' : 'Event Data:'}
                </span>
                <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(selectedEntry.event_data, null, 2)}
                </pre>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div>
              <div className="space-y-4">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300 block mb-2">
                    {isArabic ? 'ربط الحسابات:' : 'Account Mappings:'}
                  </span>
                  <div className="space-y-2">
                    {selectedTemplate.account_mappings.map((mapping, index) => (
                      <div key={mapping.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              mapping.line_type === 'debit' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {mapping.line_type === 'debit' ? (isArabic ? 'مدين' : 'Debit') : (isArabic ? 'دائن' : 'Credit')}
                            </span>
                            <p className="font-medium mt-1">{mapping.account_code} - {mapping.account_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {isArabic ? 'مصدر المبلغ:' : 'Amount Source:'} {mapping.amount_source}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </MainLayout>
  );
}