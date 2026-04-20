/**
 * Payment Methods Master Data — Enhanced Page Configuration
 * ══════════════════════════════════════════════════════════
 * Full accounting-aware config with dynamic form behavior.
 * Fields show/hide based on paymentBehavior selection.
 *
 * Behaviors: cash | bank | check | credit | digital | lc | sadad | offset | barter | bg | crypto
 */
import type { PageConfig, ColumnMeta, ActionMeta, PageSection, FieldMeta } from '@/lib/governance/types';

// ─── Entity Type ──────────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: number;
  code?: string;
  name?: string;
  name_en?: string;
  name_ar?: string;
  payment_type: string;
  payment_behavior: string;
  icon?: string;
  description?: string;
  description_en?: string;
  description_ar?: string;
  // Requirements
  requires_reference: boolean;
  requires_bank_account: boolean;
  requires_due_date: boolean;
  requires_cheque_number: boolean;
  // Processing
  clearing_days: number;
  transaction_fee_percent?: number;
  transaction_fee_fixed?: number;
  min_amount?: number;
  max_amount?: number;
  default_payment_terms?: number;
  // Accounting
  account_id?: number;
  gl_account_id?: number;
  gl_account_code?: string;
  default_debit_account_id?: number;
  default_credit_account_id?: number;
  debit_account_code?: string;
  debit_account_name?: string;
  credit_account_code?: string;
  credit_account_name?: string;
  gl_account_name?: string;
  gl_account_code_resolved?: string;
  // ZATCA
  zatca_code?: string;
  zatca_payment_code?: string;
  // Availability
  is_available_for_sales: boolean;
  is_available_for_purchases: boolean;
  is_available_for_expenses: boolean;
  is_available_for_receipts: boolean;
  is_available_for_payments: boolean;
  // Status
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by_name?: string;
  updated_by_name?: string;
}

export type { PaymentMethod as PaymentMethodType };

// ─── Behavior & Type Options ──────────────────────────────────────────────────

const BEHAVIOR_OPTIONS = [
  { value: 'cash',    label: 'Cash (نقدي)',               labelAr: 'نقدي' },
  { value: 'bank',    label: 'Bank Transfer (تحويل بنكي)', labelAr: 'تحويل بنكي' },
  { value: 'check',   label: 'Cheque (شيك)',              labelAr: 'شيك' },
  { value: 'credit',  label: 'Card Payment (بطاقة)',      labelAr: 'بطاقة دفع' },
  { value: 'digital', label: 'Digital Wallet (رقمية)',    labelAr: 'محفظة رقمية' },
  { value: 'lc',      label: 'Letter of Credit (اعتماد)', labelAr: 'اعتماد مستندي' },
  { value: 'sadad',   label: 'SADAD (سداد)',              labelAr: 'سداد' },
  { value: 'offset',  label: 'Offset (مقاصة)',            labelAr: 'مقاصة' },
  { value: 'barter',  label: 'Barter (مقايضة)',           labelAr: 'مقايضة' },
  { value: 'bg',      label: 'Bank Guarantee (ضمان)',     labelAr: 'ضمان بنكي' },
  { value: 'crypto',  label: 'Cryptocurrency',            labelAr: 'عملة رقمية' },
];

const TYPE_OPTIONS = [
  { value: 'cash',             label: 'Cash',              labelAr: 'نقدي' },
  { value: 'bank',             label: 'Bank',              labelAr: 'بنكي' },
  { value: 'bank_transfer',    label: 'Bank Transfer',     labelAr: 'تحويل بنكي' },
  { value: 'wire',             label: 'Wire Transfer',     labelAr: 'حوالة مصرفية' },
  { value: 'check',            label: 'Cheque',            labelAr: 'شيك' },
  { value: 'credit_card',      label: 'Credit Card',       labelAr: 'بطاقة ائتمانية' },
  { value: 'debit_card',       label: 'Debit Card',        labelAr: 'بطاقة خصم' },
  { value: 'digital_wallet',   label: 'Digital Wallet',    labelAr: 'محفظة رقمية' },
  { value: 'letter_of_credit', label: 'Letter of Credit',  labelAr: 'خطاب اعتماد' },
];

// ─── Dependency Helpers ───────────────────────────────────────────────────────

const showForBehaviors = (behaviors: string[]) =>
  behaviors.map(b => ({
    field: 'payment_behavior',
    condition: 'equals' as const,
    value: b,
    effect: 'show' as const,
  }));

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnMeta<PaymentMethod>[] = [
  { key: 'code',             label: 'Code',       sortable: true, width: 100 },
  { key: 'name_en',          label: 'Name (EN)',  sortable: true },
  { key: 'name_ar',          label: 'Name (AR)',  sortable: true },
  {
    key: 'payment_behavior',
    label: 'Behavior',
    sortable: true,
    width: 130,
  },
  { key: 'payment_type',     label: 'Type',       sortable: true, width: 120 },
  { key: 'clearing_days',    label: 'Clear Days', sortable: true, width: 90, align: 'center' },
  { key: 'gl_account_code',  label: 'GL Account', sortable: false, width: 100 },
  { key: 'is_available_for_sales',     label: 'Sales',     sortable: false, width: 70, align: 'center', format: 'boolean' },
  { key: 'is_available_for_purchases', label: 'Purchases', sortable: false, width: 80, align: 'center', format: 'boolean' },
  { key: 'is_active', label: 'Active', sortable: true, width: 80, format: 'boolean', align: 'center' },
];

// ─── Form Sections with Dynamic Dependencies ─────────────────────────────────

const formSections: PageSection[] = [
  // ── Section 1: Identity ──
  {
    key: 'identity',
    label: 'Method Identity',
    fields: [
      {
        key: 'code', label: 'Code', type: 'code', required: 'required',
        placeholder: 'e.g. CASH, BANK-TRF', autoUppercase: true, immutableAfterCreate: true, colSpan: 3,
        validation: [
          { type: 'required', message: 'Payment method code is required' },
          { type: 'maxLength', value: 20, message: 'Code must be ≤ 20 chars' },
        ],
      },
      {
        key: 'payment_type', label: 'Payment Type', type: 'select', required: 'required',
        options: TYPE_OPTIONS, colSpan: 3,
      },
      {
        key: 'payment_behavior', label: 'Accounting Behavior', type: 'select', required: 'required',
        options: BEHAVIOR_OPTIONS, colSpan: 3,
        helperText: 'Determines required fields and accounting entry pattern',
      },
      {
        key: 'icon', label: 'Icon', type: 'text', required: 'optional',
        placeholder: '💵, 🏦, 💳...', colSpan: 3,
      },
      {
        key: 'name_en', label: 'Name (English)', type: 'text', required: 'required',
        placeholder: 'Payment method name in English', colSpan: 6,
      },
      {
        key: 'name_ar', label: 'Name (Arabic)', type: 'text', required: 'recommended',
        placeholder: 'اسم طريقة الدفع بالعربية', colSpan: 6,
      },
      {
        key: 'description', label: 'Description', type: 'textarea', required: 'optional',
        placeholder: 'Brief description of this payment method and its usage', colSpan: 'full' as any,
      },
    ],
  },

  // ── Section 2: Accounting Setup ──
  {
    key: 'accounting',
    label: 'Accounting Setup',
    fields: [
      {
        key: 'gl_account_id', label: 'GL Account', type: 'searchable-select', required: 'recommended',
        helperText: 'Main general ledger account', colSpan: 4,
        dataSource: { type: 'api', endpoint: '/api/accounts?limit=500', valueField: 'id', labelField: 'name', labelArField: 'name_ar' },
      },
      {
        key: 'default_debit_account_id', label: 'Default Debit Account', type: 'searchable-select', required: 'optional',
        helperText: 'Debited when receiving payment', colSpan: 4,
        dataSource: { type: 'api', endpoint: '/api/accounts?limit=500', valueField: 'id', labelField: 'name', labelArField: 'name_ar' },
      },
      {
        key: 'default_credit_account_id', label: 'Default Credit Account', type: 'searchable-select', required: 'optional',
        helperText: 'Credited when making payment', colSpan: 4,
        dataSource: { type: 'api', endpoint: '/api/accounts?limit=500', valueField: 'id', labelField: 'name', labelArField: 'name_ar' },
      },
      {
        key: 'gl_account_code', label: 'GL Account Code (Manual)', type: 'text', required: 'optional',
        placeholder: 'e.g. 1110-001', helperText: 'Override when GL not selected', colSpan: 4,
      },
      {
        key: 'zatca_code', label: 'ZATCA Code', type: 'text', required: 'optional',
        placeholder: 'ZATCA payment means code', colSpan: 4,
      },
      {
        key: 'zatca_payment_code', label: 'ZATCA Payment Code', type: 'text', required: 'optional',
        placeholder: 'e.g. 10, 30, 48', colSpan: 4,
      },
    ],
  },

  // ── Section 3: Requirements ──
  {
    key: 'requirements',
    label: 'Requirements & Rules',
    fields: [
      {
        key: 'requires_reference', label: 'Requires Reference #', type: 'toggle', required: 'optional',
        defaultValue: false, helperText: 'Transaction reference number (bank transfers, SADAD)', colSpan: 3,
        dependencies: [
          { field: 'payment_behavior', condition: 'equals', value: 'bank',  effect: 'setValue', setValue: true },
          { field: 'payment_behavior', condition: 'equals', value: 'sadad', effect: 'setValue', setValue: true },
        ],
      },
      {
        key: 'requires_bank_account', label: 'Requires Bank Account', type: 'toggle', required: 'optional',
        defaultValue: false, helperText: 'Bank account selection required', colSpan: 3,
        dependencies: [
          { field: 'payment_behavior', condition: 'equals', value: 'bank',    effect: 'setValue', setValue: true },
          { field: 'payment_behavior', condition: 'equals', value: 'credit',  effect: 'setValue', setValue: true },
          { field: 'payment_behavior', condition: 'equals', value: 'digital', effect: 'setValue', setValue: true },
          { field: 'payment_behavior', condition: 'equals', value: 'check',   effect: 'setValue', setValue: true },
        ],
      },
      {
        key: 'requires_cheque_number', label: 'Requires Cheque #', type: 'toggle', required: 'optional',
        defaultValue: false, helperText: 'Cheque number must be provided', colSpan: 3,
        dependencies: [
          { field: 'payment_behavior', condition: 'equals', value: 'check', effect: 'setValue', setValue: true },
        ],
      },
      {
        key: 'requires_due_date', label: 'Requires Due Date', type: 'toggle', required: 'optional',
        defaultValue: false, helperText: 'Due/maturity date required', colSpan: 3,
        dependencies: [
          { field: 'payment_behavior', condition: 'equals', value: 'check', effect: 'setValue', setValue: true },
          { field: 'payment_behavior', condition: 'equals', value: 'lc',    effect: 'setValue', setValue: true },
          { field: 'payment_behavior', condition: 'equals', value: 'bg',    effect: 'setValue', setValue: true },
        ],
      },
    ],
  },

  // ── Section 4: Processing & Fees ──
  {
    key: 'processing',
    label: 'Processing & Fees',
    fields: [
      {
        key: 'clearing_days', label: 'Clearing Days', type: 'number', required: 'optional',
        defaultValue: 0, placeholder: '0 = instant', colSpan: 3,
      },
      {
        key: 'default_payment_terms', label: 'Payment Terms (days)', type: 'number', required: 'optional',
        placeholder: '30, 60, 90', colSpan: 3,
      },
      {
        key: 'transaction_fee_percent', label: 'Fee %', type: 'percentage', required: 'optional',
        placeholder: '2.5', helperText: 'Card processing fee', colSpan: 3,
        dependencies: [...showForBehaviors(['credit', 'digital'])],
      },
      {
        key: 'transaction_fee_fixed', label: 'Fixed Fee', type: 'currency', required: 'optional',
        placeholder: '1.00', helperText: 'Per-transaction fee', colSpan: 3,
        dependencies: [...showForBehaviors(['credit', 'digital'])],
      },
      {
        key: 'min_amount', label: 'Min Amount', type: 'currency', required: 'optional', defaultValue: 0, colSpan: 6,
      },
      {
        key: 'max_amount', label: 'Max Amount', type: 'currency', required: 'optional',
        placeholder: 'No limit', helperText: 'Empty = no maximum', colSpan: 6,
      },
    ],
  },

  // ── Section 5: Availability ──
  {
    key: 'availability',
    label: 'Availability & Scope',
    fields: [
      { key: 'is_available_for_sales',     label: 'Sales',     type: 'toggle', required: 'optional', defaultValue: true, colSpan: 4 },
      { key: 'is_available_for_purchases', label: 'Purchases', type: 'toggle', required: 'optional', defaultValue: true, colSpan: 4 },
      { key: 'is_available_for_expenses',  label: 'Expenses',  type: 'toggle', required: 'optional', defaultValue: true, colSpan: 4 },
      { key: 'is_available_for_receipts',  label: 'Receipts',  type: 'toggle', required: 'optional', defaultValue: true, colSpan: 4 },
      { key: 'is_available_for_payments',  label: 'Payments',  type: 'toggle', required: 'optional', defaultValue: true, colSpan: 4 },
      { key: 'sort_order',                 label: 'Sort Order', type: 'number', required: 'optional', defaultValue: 0, colSpan: 4 },
    ],
  },

  // ── Section 6: Status ──
  {
    key: 'status',
    label: 'Status',
    fields: [
      { key: 'is_active',  label: 'Active',        type: 'toggle', required: 'optional', defaultValue: true, colSpan: 6 },
      { key: 'is_default', label: 'Default Method', type: 'toggle', required: 'optional', defaultValue: false,
        helperText: 'Only one method can be default', colSpan: 6 },
    ],
  },
];

// ─── Actions ──────────────────────────────────────────────────────────────────

const actions: ActionMeta[] = [
  { key: 'create', label: 'Create New',  icon: 'PlusIcon',           variant: 'primary',   permission: 'master:payment_methods:create', position: ['toolbar'] },
  { key: 'edit',   label: 'Edit',        icon: 'PencilSquareIcon',   variant: 'secondary', permission: 'master:payment_methods:edit',   position: ['row'] },
  { key: 'delete', label: 'Delete',      icon: 'TrashIcon',          variant: 'danger',    permission: 'master:payment_methods:delete', position: ['row', 'bulk'], requireConfirmation: true, isDangerous: true },
  { key: 'export', label: 'Export',      icon: 'ArrowDownTrayIcon',  variant: 'secondary', permission: 'master:payment_methods:view',   position: ['toolbar'] },
];

// ─── Page Config ──────────────────────────────────────────────────────────────

export const paymentMethodsConfig: PageConfig<PaymentMethod> = {
  title: 'Payment Methods',
  titleKey: 'pages.master.paymentMethods.title',
  subtitle: 'Manage payment methods with accounting behavior, dynamic validation, and GL account linking',
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Master Data', href: '/master' },
    { label: 'Payment Methods' },
  ],
  apiEndpoint: '/api/master/payment-methods',
  resourceName: 'payment_methods',
  permissionPrefix: 'master:payment_methods',
  columns,
  formSections,
  actions,
  auditEnabled: true,
  exportEnabled: true,
  exportFilename: 'payment_methods',
  defaultSortField: 'sort_order',
  defaultSortOrder: 'asc',
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  bulkOperationsEnabled: true,
};
