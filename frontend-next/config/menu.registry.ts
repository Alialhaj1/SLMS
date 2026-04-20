/**
 * 🗂️ MENU REGISTRY - المصدر الواحد للقائمة الجانبية
 * =====================================================
 */

import { MenuPermission, MenuPermissions } from './menu.permissions';

export type BadgeType = 
  | 'pendingApprovals'
  | 'pendingShipments'
  | 'pendingExpenses'
  | 'pendingJournals'
  | 'custom';

export interface MenuItemConfig {
  key: string;
  labelKey: string;
  icon: string;
  permission?: MenuPermission;
  path?: string;
  children?: MenuItemConfig[];
  badge?: BadgeType;
  badgeKey?: string;
  /** Module code this menu item belongs to. Used for tenant module filtering.
   *  If set, item only shows when the tenant has this module enabled.
   *  Core modules (dashboard, settings, users) should NOT set this field. */
  module?: string;
  /** If true, only visible to platform users (not tenant users) */
  platformOnly?: boolean;
  /** If true, only visible to tenant users (not platform users) */
  tenantOnly?: boolean;
}

function dedupeMenuByPath(items: MenuItemConfig[]): MenuItemConfig[] {
  const seen = new Set<string>();

  function walk(list: MenuItemConfig[]): MenuItemConfig[] {
    const result: MenuItemConfig[] = [];

    for (const item of list) {
      const path = item.path;
      if (path && seen.has(path)) {
        continue;
      }

      if (path) {
        seen.add(path);
      }

      const children = item.children ? walk(item.children) : undefined;
      const next: MenuItemConfig = children ? { ...item, children } : item;

      // If this is a pure grouping item (no path) and dedupe removed all its children, drop it.
      if (!next.path && (!next.children || next.children.length === 0)) {
        continue;
      }

      result.push(next);
    }

    return result;
  }

  return walk(items);
}

export const LEGACY_MENU_REGISTRY: MenuItemConfig[] = [
  // ═══════════════════════════════════════════════════════════
  // 📊 لوحة التحكم (Dashboard)
  // ═══════════════════════════════════════════════════════════
  {
    key: 'dashboard',
    icon: 'HomeIcon',
    labelKey: 'menu.dashboard',
    path: '/dashboard',
    permission: MenuPermissions.Dashboard.View,
    tenantOnly: true,
  },

  // ═══════════════════════════════════════════════════════════
  // 🏢 الإدارة العامة
  // ═══════════════════════════════════════════════════════════
  {
    key: 'generalLedger',
    icon: 'BookOpenIcon',
    labelKey: 'menu.generalLedger',
    permission: MenuPermissions.Finance.View,
    children: [
      {
        key: 'generalLedger.accounts',
        icon: 'TableCellsIcon',
        labelKey: 'menu.generalLedger.accounts',
        path: '/accounting/accounts',
        permission: MenuPermissions.Accounting.Accounts.View,
      },
      {
        key: 'generalLedger.journals',
        icon: 'BookOpenIcon',
        labelKey: 'menu.generalLedger.journals',
        path: '/accounting/journals',
        permission: MenuPermissions.Accounting.Journals.View,
      },
      {
        key: 'generalLedger.cashBoxes',
        icon: 'BanknotesIcon',
        labelKey: 'menu.generalLedger.cashBoxes',
        path: '/master/cash-boxes',
        permission: MenuPermissions.Finance.CashBoxes.View,
      },
      {
        key: 'generalLedger.bankAccounts',
        icon: 'BuildingLibraryIcon',
        labelKey: 'menu.generalLedger.bankAccounts',
        path: '/master/bank-accounts',
        permission: MenuPermissions.Finance.BankAccounts.View,
      },
      {
        key: 'generalLedger.accruedRevenue',
        icon: 'ArrowTrendingUpIcon',
        labelKey: 'menu.generalLedger.accruedRevenue',
        path: '/accounting/accrued-revenue',
        permission: MenuPermissions.Accounting.AccruedRevenue.View,
      },
      {
        key: 'generalLedger.openingBalances',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.generalLedger.openingBalances',
        path: '/accounting/opening-balances',
        permission: MenuPermissions.Accounting.OpeningBalances.View,
      },
      {
        key: 'generalLedger.fiscalYears',
        icon: 'CalendarDaysIcon',
        labelKey: 'menu.generalLedger.fiscalYears',
        path: '/accounting/fiscal-years',
        permission: MenuPermissions.Accounting.Periods.View,
      },
      {
        key: 'generalLedger.trialBalance',
        icon: 'ScaleIcon',
        labelKey: 'menu.generalLedger.trialBalance',
        path: '/accounting/reports/trial-balance',
        permission: MenuPermissions.Accounting.Reports.TrialBalance.View,
      },
      {
        key: 'generalLedger.incomeStatement',
        icon: 'ChartBarIcon',
        labelKey: 'menu.generalLedger.incomeStatement',
        path: '/accounting/reports/income-statement',
        permission: MenuPermissions.Accounting.Reports.IncomeStatement.View,
      },
      {
        key: 'generalLedger.generalLedgerReport',
        icon: 'DocumentMagnifyingGlassIcon',
        labelKey: 'menu.generalLedger.generalLedgerReport',
        path: '/accounting/reports/general-ledger',
        permission: MenuPermissions.Accounting.Reports.GeneralLedger.View,
      },
      // التقارير المالية
      {
        key: 'generalLedger.balanceSheet',
        icon: 'ScaleIcon',
        labelKey: 'menu.generalLedger.balanceSheet',
        path: '/accounting/reports/balance-sheet',
        permission: MenuPermissions.Accounting.Reports.BalanceSheet.View,
      },
      {
        key: 'generalLedger.cashFlow',
        icon: 'ArrowsRightLeftIcon',
        labelKey: 'menu.generalLedger.cashFlow',
        path: '/accounting/reports/cash-flow',
        permission: MenuPermissions.Accounting.Reports.CashFlow.View,
      },
      {
        key: 'generalLedger.defaultAccounts',
        icon: 'Cog6ToothIcon',
        labelKey: 'menu.generalLedger.defaultAccounts',
        path: '/accounting/default-accounts',
        permission: MenuPermissions.Accounting.DefaultAccounts.View,
      },
      {
        key: 'generalLedger.fixedAssets',
        icon: 'BuildingOffice2Icon',
        labelKey: 'menu.generalLedger.fixedAssets',
        path: '/assets/fixed-assets',
        permission: MenuPermissions.Assets.View,
      },
      // Additional Accounting Pages
      {
        key: 'generalLedger.bankMatching',
        icon: 'ArrowsRightLeftIcon',
        labelKey: 'menu.generalLedger.bankMatching',
        path: '/accounting/bank-matching',
        permission: MenuPermissions.Accounting.BankMatching.View,
      },
      {
        key: 'generalLedger.bankReconciliation',
        icon: 'CheckCircleIcon',
        labelKey: 'menu.generalLedger.bankReconciliation',
        path: '/accounting/bank-reconciliation',
        permission: MenuPermissions.Accounting.BankReconciliation.View,
      },
      {
        key: 'generalLedger.budgets',
        icon: 'CalculatorIcon',
        labelKey: 'menu.generalLedger.budgets',
        path: '/accounting/budgets',
        permission: MenuPermissions.Accounting.Budgets.View,
      },
      {
        key: 'generalLedger.cashDeposit',
        icon: 'BanknotesIcon',
        labelKey: 'menu.generalLedger.cashDeposit',
        path: '/accounting/cash-deposit',
        permission: MenuPermissions.Accounting.CashDeposit.View,
      },
      {
        key: 'generalLedger.cashInventory',
        icon: 'CurrencyDollarIcon',
        labelKey: 'menu.generalLedger.cashInventory',
        path: '/accounting/cash-inventory',
        permission: MenuPermissions.Accounting.CashInventory.View,
      },
      {
        key: 'generalLedger.cashLedger',
        icon: 'ClipboardDocumentListIcon',
        labelKey: 'menu.generalLedger.cashLedger',
        path: '/accounting/cash-ledger',
        permission: MenuPermissions.Accounting.CashLedger.View,
      },
      {
        key: 'generalLedger.chequesDue',
        icon: 'DocumentCheckIcon',
        labelKey: 'menu.generalLedger.chequesDue',
        path: '/accounting/cheques-due',
        permission: MenuPermissions.Accounting.ChequesDue.View,
      },
      {
        key: 'generalLedger.creditNotes',
        icon: 'DocumentMinusIcon',
        labelKey: 'menu.generalLedger.creditNotes',
        path: '/accounting/credit-notes',
        permission: MenuPermissions.Accounting.CreditNotes.View,
      },
      {
        key: 'generalLedger.customersLedger',
        icon: 'UsersIcon',
        labelKey: 'menu.generalLedger.customersLedger',
        path: '/accounting/customers-ledger',
        permission: MenuPermissions.Accounting.CustomersLedger.View,
      },
      {
        key: 'generalLedger.debitNotes',
        icon: 'DocumentPlusIcon',
        labelKey: 'menu.generalLedger.debitNotes',
        path: '/accounting/debit-notes',
        permission: MenuPermissions.Accounting.DebitNotes.View,
      },
      {
        key: 'generalLedger.deferredRevenue',
        icon: 'ClockIcon',
        labelKey: 'menu.generalLedger.deferredRevenue',
        path: '/accounting/deferred-revenue',
        permission: MenuPermissions.Accounting.DeferredRevenue.View,
      },
      {
        key: 'generalLedger.financialYears',
        icon: 'CalendarIcon',
        labelKey: 'menu.generalLedger.financialYears',
        path: '/accounting/financial-years',
        permission: MenuPermissions.Accounting.FinancialYears.View,
      },
      {
        key: 'generalLedger.inventoryLedger',
        icon: 'CubeIcon',
        labelKey: 'menu.generalLedger.inventoryLedger',
        path: '/accounting/inventory-ledger',
        permission: MenuPermissions.Accounting.InventoryLedger.View,
      },
      {
        key: 'generalLedger.paymentVoucher',
        icon: 'ReceiptRefundIcon',
        labelKey: 'menu.generalLedger.paymentVoucher',
        path: '/accounting/payment-voucher',
        permission: MenuPermissions.Accounting.PaymentVoucher.View,
      },
      {
        key: 'generalLedger.prepaidExpenses',
        icon: 'ArrowPathIcon',
        labelKey: 'menu.generalLedger.prepaidExpenses',
        path: '/accounting/prepaid-expenses',
        permission: MenuPermissions.Accounting.PrepaidExpenses.View,
      },
      {
        key: 'generalLedger.receiptVoucher',
        icon: 'ReceiptPercentIcon',
        labelKey: 'menu.generalLedger.receiptVoucher',
        path: '/accounting/receipt-vouchers',
        permission: MenuPermissions.Accounting.ReceiptVoucher.View,
      },
      {
        key: 'generalLedger.suppliersLedger',
        icon: 'TruckIcon',
        labelKey: 'menu.generalLedger.suppliersLedger',
        path: '/accounting/suppliers-ledger',
        permission: MenuPermissions.Accounting.SuppliersLedger.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 💰 المالية والمحاسبة
  // ═══════════════════════════════════════════════════════════
  {
    key: 'financeAccounting',
    icon: 'BanknotesIcon',
    labelKey: 'menu.financeAccounting',
    permission: MenuPermissions.Finance.View,
    children: [
      {
        key: 'financeAccounting.currencies',
        icon: 'CurrencyDollarIcon',
        labelKey: 'menu.financeAccounting.currencies',
        path: '/master/currencies',
        permission: MenuPermissions.MasterData.Currencies.Manage,
      },
      {
        key: 'financeAccounting.exchangeRates',
        icon: 'ArrowsRightLeftIcon',
        labelKey: 'menu.financeAccounting.exchangeRates',
        path: '/master/exchange-rates',
        permission: MenuPermissions.MasterData.ExchangeRates.View,
      },
      {
        key: 'financeAccounting.paymentMethods',
        icon: 'CreditCardIcon',
        labelKey: 'menu.financeAccounting.paymentMethods',
        path: '/master/payment-methods',
        permission: MenuPermissions.MasterData.PaymentMethods.View,
      },
      {
        key: 'financeAccounting.paymentTerms',
        icon: 'ClockIcon',
        labelKey: 'menu.financeAccounting.paymentTerms',
        path: '/master/payment-terms',
        permission: MenuPermissions.MasterData.PaymentTerms.View,
      },
      {
        key: 'financeAccounting.supplierBankAccounts',
        icon: 'BuildingLibraryIcon',
        labelKey: 'menu.financeAccounting.supplierBankAccounts',
        path: '/master/supplier-bank-accounts',
        permission: MenuPermissions.MasterData.SupplierBankAccounts.View,
      },
      {
        key: 'financeAccounting.banks',
        icon: 'BuildingLibraryIcon',
        labelKey: 'menu.financeAccounting.banks',
        path: '/master/banks',
        permission: MenuPermissions.MasterData.Banks.View,
      },
      {
        key: 'financeAccounting.voucherTypes',
        icon: 'TicketIcon',
        labelKey: 'menu.financeAccounting.voucherTypes',
        path: '/master/voucher-types',
        permission: MenuPermissions.MasterData.VoucherTypes.View,
      },
      {
        key: 'financeAccounting.noticeTypes',
        icon: 'BellIcon',
        labelKey: 'menu.financeAccounting.noticeTypes',
        path: '/master/notice-types',
        permission: MenuPermissions.MasterData.NoticeTypes.View,
      },
      {
        key: 'financeAccounting.journalTypes',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.financeAccounting.journalTypes',
        path: '/master/journal-types',
        permission: MenuPermissions.MasterData.JournalTypes.View,
      },
      {
        key: 'financeAccounting.receiptTypes',
        icon: 'ArrowDownTrayIcon',
        labelKey: 'menu.financeAccounting.receiptTypes',
        path: '/master/receipt-types',
        permission: MenuPermissions.MasterData.ReceiptTypes.View,
      },
      {
        key: 'financeAccounting.paymentTypes',
        icon: 'ArrowUpTrayIcon',
        labelKey: 'menu.financeAccounting.paymentTypes',
        path: '/master/payment-types',
        permission: MenuPermissions.MasterData.PaymentTypes.View,
      },
      {
        key: 'financeAccounting.parallelCurrencies',
        icon: 'BanknotesIcon',
        labelKey: 'menu.financeAccounting.parallelCurrencies',
        path: '/master/parallel-currencies',
        permission: MenuPermissions.MasterData.ParallelCurrencies.View,
      },
      {
        key: 'financeAccounting.transactionDefaults',
        icon: 'Cog6ToothIcon',
        labelKey: 'menu.financeAccounting.transactionDefaults',
        path: '/master/transaction-defaults',
        permission: MenuPermissions.MasterData.TransactionDefaults.View,
      },
      {
        key: 'financeAccounting.prepaidPolicies',
        icon: 'ClockIcon',
        labelKey: 'menu.financeAccounting.prepaidPolicies',
        path: '/master/prepaid-policies',
        permission: MenuPermissions.MasterData.PrepaidPolicies.View,
      },
      {
        key: 'financeAccounting.deferredPolicies',
        icon: 'ClockIcon',
        labelKey: 'menu.financeAccounting.deferredPolicies',
        path: '/master/deferred-policies',
        permission: MenuPermissions.MasterData.DeferredPolicies.View,
      },
      {
        key: 'financeAccounting.bankReconciliationSettings',
        icon: 'Cog6ToothIcon',
        labelKey: 'menu.financeAccounting.bankReconciliationSettings',
        path: '/settings/bank-reconciliation',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'financeAccounting.expenseDistribution',
        icon: 'ChartPieIcon',
        labelKey: 'menu.financeAccounting.expenseDistribution',
        path: '/master/expense-distribution',
        permission: MenuPermissions.MasterData.ExpenseDistribution.View,
      },
      // Additional Finance Items
      {
        key: 'financeAccounting.costCenters',
        icon: 'BuildingOffice2Icon',
        labelKey: 'menu.financeAccounting.costCenters',
        path: '/master/cost-centers',
        permission: MenuPermissions.MasterData.CostCenters.View,
      },
      {
        key: 'financeAccounting.profitCenters',
        icon: 'ChartBarIcon',
        labelKey: 'menu.financeAccounting.profitCenters',
        path: '/master/profit-centers',
        permission: MenuPermissions.MasterData.ProfitCenters.View,
      },
      {
        key: 'financeAccounting.fiscalPeriods',
        icon: 'CalendarDaysIcon',
        labelKey: 'menu.financeAccounting.fiscalPeriods',
        path: '/master/fiscal-periods',
        permission: MenuPermissions.Accounting.Periods.View,
      },
      {
        key: 'financeAccounting.chequeBooks',
        icon: 'DocumentCheckIcon',
        labelKey: 'menu.financeAccounting.chequeBooks',
        path: '/master/cheque-books',
        permission: MenuPermissions.Finance.ChequeBooks.View,
      },
      {
        key: 'financeAccounting.shipmentCostCenters',
        icon: 'TruckIcon',
        labelKey: 'menu.financeAccounting.shipmentCostCenters',
        path: '/master/shipment-cost-centers',
        permission: MenuPermissions.MasterData.ShipmentCostCenters.View,
      },
      // Letters of Credit (الاعتمادات المستندية)
      {
        key: 'financeAccounting.lettersOfCredit',
        icon: 'DocumentCheckIcon',
        labelKey: 'menu.financeAccounting.lettersOfCredit',
        children: [
          {
            key: 'financeAccounting.lettersOfCredit.main',
            icon: 'DocumentCheckIcon',
            labelKey: 'menu.financeAccounting.lettersOfCredit.main',
            path: '/finance/letters-of-credit',
            permission: MenuPermissions.Finance.View,
          },
          {
            key: 'financeAccounting.lettersOfCredit.types',
            icon: 'TagIcon',
            labelKey: 'menu.financeAccounting.lettersOfCredit.types',
            path: '/finance/lc-types',
            permission: MenuPermissions.Finance.View,
          },
          {
            key: 'financeAccounting.lettersOfCredit.alerts',
            icon: 'BellAlertIcon',
            labelKey: 'menu.financeAccounting.lettersOfCredit.alerts',
            path: '/finance/lc-alerts',
            permission: MenuPermissions.Finance.View,
          },
          {
            key: 'financeAccounting.lettersOfCredit.reports',
            icon: 'ChartBarIcon',
            labelKey: 'menu.financeAccounting.lettersOfCredit.reports',
            path: '/finance/letters-of-credit/reports',
            permission: MenuPermissions.Finance.View,
          },
        ],
      },
      {
        key: 'financeAccounting.transferRequests',
        icon: 'ArrowsRightLeftIcon',
        labelKey: 'menu.financeAccounting.transferRequests',
        path: '/finance/transfer-requests',
        permission: 'transfer_requests:view' as MenuPermission,
      },
      {
        key: 'financeAccounting.vendorPayments',
        icon: 'BanknotesIcon',
        labelKey: 'menu.financeAccounting.vendorPayments',
        path: '/finance/vendor-payments',
        permission: 'vendor_payments:view' as MenuPermission,
      },
      {
        key: 'financeAccounting.consolidation',
        icon: 'TableCellsIcon',
        labelKey: 'menu.financeAccounting.consolidation',
        path: '/settings/consolidation',
        permission: 'consolidation:view' as MenuPermission,
      },
      {
        key: 'financeAccounting.cashRegisters',
        icon: 'WalletIcon',
        labelKey: 'menu.financeAccounting.cashRegisters',
        path: '/accounting/cash-registers',
        permission: 'cash_registers:view' as MenuPermission,
      },
      {
        key: 'financeAccounting.vatReturns',
        icon: 'CalculatorIcon',
        labelKey: 'menu.financeAccounting.vatReturns',
        path: '/accounting/vat-returns',
        permission: 'vat_returns:view' as MenuPermission,
      },
      {
        key: 'financeAccounting.zatcaEInvoicing',
        icon: 'QrCodeIcon',
        labelKey: 'menu.financeAccounting.zatcaEInvoicing',
        path: '/accounting/zatca',
        permission: 'zatca:view' as MenuPermission,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🛒 إدارة المبيعات
  // ═══════════════════════════════════════════════════════════
  {
    key: 'sales',
    icon: 'ShoppingCartIcon',
    labelKey: 'menu.sales',
    permission: MenuPermissions.Sales.View,
    children: [
      {
        key: 'sales.quotations',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.sales.quotations',
        path: '/sales/quotations',
        permission: MenuPermissions.Sales.Quotations.View,
      },
      {
        key: 'sales.customerContracts',
        icon: 'DocumentDuplicateIcon',
        labelKey: 'menu.sales.customerContracts',
        path: '/sales/customer-contracts',
        permission: MenuPermissions.Sales.CustomerContracts.View,
      },
      {
        key: 'sales.salesOrders',
        icon: 'ClipboardDocumentListIcon',
        labelKey: 'menu.sales.salesOrders',
        path: '/sales/orders',
        permission: MenuPermissions.Sales.Orders.View,
      },
      {
        key: 'sales.salesInvoices',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.sales.salesInvoices',
        path: '/sales/invoices',
        permission: MenuPermissions.Sales.Invoices.View,
      },
      {
        key: 'sales.invoiceTypes',
        icon: 'TagIcon',
        labelKey: 'menu.sales.invoiceTypes',
        path: '/master/invoice-types',
        permission: MenuPermissions.MasterData.InvoiceTypes.View,
      },
      {
        key: 'sales.returns',
        icon: 'ArrowUturnLeftIcon',
        labelKey: 'menu.sales.returns',
        path: '/sales/returns',
        permission: MenuPermissions.Sales.Returns.View,
      },
      {
        key: 'sales.paymentTerms',
        icon: 'ClockIcon',
        labelKey: 'menu.sales.paymentTerms',
        path: '/master/payment-terms',
        permission: MenuPermissions.MasterData.PaymentTerms.View,
      },
      {
        key: 'sales.priceLists',
        icon: 'ListBulletIcon',
        labelKey: 'menu.sales.priceLists',
        path: '/sales/price-lists',
        permission: MenuPermissions.Sales.PriceLists.View,
      },
      {
        key: 'sales.discountAgreements',
        icon: 'ReceiptPercentIcon',
        labelKey: 'menu.sales.discountAgreements',
        path: '/sales/discount-agreements',
        permission: MenuPermissions.MasterData.DiscountAgreements.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🏭 الموردون
  // ═══════════════════════════════════════════════════════════
  {
    key: 'suppliers',
    icon: 'BuildingOfficeIcon',
    labelKey: 'menu.suppliers',
    path: '/suppliers',
    permission: MenuPermissions.MasterData.Vendors.View,
  },

  // ═══════════════════════════════════════════════════════════
  // 💸 المصاريف
  // ═══════════════════════════════════════════════════════════
  {
    key: 'expenses',
    icon: 'BanknotesIcon',
    labelKey: 'menu.expenses',
    path: '/expenses',
    permission: MenuPermissions.Finance.View,
    children: [
      {
        key: 'expenses.list',
        icon: 'ListBulletIcon',
        labelKey: 'menu.expenses.list',
        path: '/expenses',
        permission: MenuPermissions.Finance.View,
      },
      {
        key: 'expenses.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.expenses.reports',
        path: '/expenses/reports',
        permission: MenuPermissions.Finance.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 📦 المشتريات والموردين
  // ═══════════════════════════════════════════════════════════
  {
    key: 'purchasing',
    icon: 'ShoppingBagIcon',
    labelKey: 'menu.purchasing',
    permission: MenuPermissions.Procurement.View,
    children: [
      {
        key: 'purchasing.vendors',
        icon: 'BuildingOfficeIcon',
        labelKey: 'menu.purchasing.vendors',
        path: '/master/vendors',
        permission: MenuPermissions.MasterData.Vendors.View,
      },
      {
        key: 'purchasing.vendorClassifications',
        icon: 'AdjustmentsVerticalIcon',
        labelKey: 'menu.purchasing.vendorClassifications',
        path: '/master/vendor-classifications',
        permission: MenuPermissions.MasterData.SupplierCategories.View,
      },
      {
        key: 'purchasing.vendorTypes',
        icon: 'TagIcon',
        labelKey: 'menu.purchasing.vendorTypes',
        path: '/master/supplier-types',
        permission: MenuPermissions.MasterData.SupplierTypes.View,
      },
      {
        key: 'purchasing.vendorStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.purchasing.vendorStatus',
        path: '/master/vendor-status',
        permission: MenuPermissions.MasterData.SupplierStatuses.View,
      },
      {
        key: 'purchasing.purchaseInvoices',
        icon: 'DocumentChartBarIcon',
        labelKey: 'menu.purchasing.purchaseInvoices',
        path: '/purchasing/invoices',
        permission: MenuPermissions.Procurement.PurchaseInvoices.View,
      },
      {
        key: 'purchasing.purchaseOrders',
        icon: 'ClipboardDocumentListIcon',
        labelKey: 'menu.purchasing.purchaseOrders',
        path: '/purchasing/orders',
        permission: MenuPermissions.Procurement.PurchaseOrders.View,
      },
      {
        key: 'purchasing.payments',
        icon: 'BanknotesIcon',
        labelKey: 'menu.purchasing.payments',
        path: '/procurement/payments',
        permission: MenuPermissions.Procurement.Payments.View,
      },
      {
        key: 'purchasing.vendorQuotations',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.purchasing.vendorQuotations',
        path: '/purchasing/quotations',
        permission: MenuPermissions.Procurement.View,
      },
      {
        key: 'purchasing.vendorContracts',
        icon: 'DocumentDuplicateIcon',
        labelKey: 'menu.purchasing.vendorContracts',
        path: '/purchasing/contracts',
        permission: MenuPermissions.Procurement.VendorContracts.View,
      },
      {
        key: 'purchasing.purchaseReturns',
        icon: 'ArrowUturnLeftIcon',
        labelKey: 'menu.purchasing.purchaseReturns',
        path: '/purchasing/returns',
        permission: MenuPermissions.Procurement.View,
      },
      {
        key: 'purchasing.goodsReceipts',
        icon: 'ArchiveBoxArrowDownIcon',
        labelKey: 'menu.purchasing.goodsReceipts',
        path: '/purchasing/goods-receipts',
        permission: MenuPermissions.Procurement.View,
      },
      {
        key: 'purchasing.purchaseOrderTypes',
        icon: 'TagIcon',
        labelKey: 'menu.purchasing.purchaseOrderTypes',
        path: '/master/purchase-order-types',
        permission: MenuPermissions.MasterData.PurchaseOrderTypes.View,
      },
      {
        key: 'purchasing.vendorPaymentTerms',
        icon: 'ClockIcon',
        labelKey: 'menu.purchasing.vendorPaymentTerms',
        path: '/master/vendor-payment-terms',
        permission: MenuPermissions.MasterData.VendorPaymentTerms.View,
      },
      {
        key: 'purchasing.vendorPriceLists',
        icon: 'ListBulletIcon',
        labelKey: 'menu.purchasing.vendorPriceLists',
        path: '/purchasing/vendor-price-lists',
        permission: MenuPermissions.Procurement.View,
      },
      {
        key: 'purchasing.supplyTerms',
        icon: 'TruckIcon',
        labelKey: 'menu.purchasing.supplyTerms',
        path: '/master/supply-terms',
        permission: MenuPermissions.MasterData.SupplyTerms.View,
      },
      {
        key: 'purchasing.deliveryTerms',
        icon: 'TruckIcon',
        labelKey: 'menu.purchasing.deliveryTerms',
        path: '/master/delivery-terms',
        permission: MenuPermissions.MasterData.DeliveryTerms.View,
      },
      {
        key: 'purchasing.purchaseOrderStatus',
        icon: 'ClipboardDocumentListIcon',
        labelKey: 'menu.purchasing.purchaseOrderStatus',
        path: '/master/order-status',
        permission: MenuPermissions.MasterData.PoStatuses.View,
      },
      {
        key: 'purchasing.contractTypes',
        icon: 'DocumentDuplicateIcon',
        labelKey: 'menu.purchasing.contractTypes',
        path: '/master/contract-types',
        permission: MenuPermissions.MasterData.ContractTypes.View,
      },
      {
        key: 'purchasing.contractStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.purchasing.contractStatus',
        path: '/master/contract-status',
        permission: MenuPermissions.MasterData.ContractStatuses.View,
      },
      {
        key: 'purchasing.contractApprovalStatus',
        icon: 'CheckCircleIcon',
        labelKey: 'menu.purchasing.contractApprovalStatus',
        path: '/master/contract-approval-status',
        permission: MenuPermissions.MasterData.ContractApprovalStatus.View,
      },
      // Additional Procurement/Purchasing Items
      {
        key: 'purchasing.procurementDashboard',
        icon: 'ChartBarIcon',
        labelKey: 'menu.purchasing.procurementDashboard',
        path: '/procurement/dashboard',
        permission: MenuPermissions.Procurement.Dashboard.View,
      },
      {
        key: 'purchasing.procurementPurchaseInvoices',
        icon: 'DocumentChartBarIcon',
        labelKey: 'menu.purchasing.procurementPurchaseInvoices',
        path: '/procurement/purchase-invoices',
        permission: MenuPermissions.Procurement.PurchaseInvoices.View,
      },
      {
        key: 'purchasing.procurementReports',
        icon: 'ChartPieIcon',
        labelKey: 'menu.purchasing.procurementReports',
        path: '/procurement/reports',
        permission: MenuPermissions.Procurement.Reports.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🏭 المخازن والأصناف
  // ═══════════════════════════════════════════════════════════
  {
    key: 'inventory',
    icon: 'CubeIcon',
    labelKey: 'menu.inventory',
    permission: MenuPermissions.MasterData.Items.View,
    children: [
      {
        key: 'inventory.items',
        icon: 'CubeIcon',
        labelKey: 'menu.inventory.items',
        path: '/master/items',
        permission: MenuPermissions.MasterData.Items.View,
      },
      {
        key: 'inventory.itemBarcodes',
        icon: 'QrCodeIcon',
        labelKey: 'menu.inventory.itemBarcodes',
        path: '/master/item-barcodes',
        permission: MenuPermissions.MasterData.ItemBarcodes.View,
      },
      {
        key: 'inventory.itemGroups',
        icon: 'RectangleGroupIcon',
        labelKey: 'menu.inventory.itemGroups',
        path: '/master/item-groups',
        permission: MenuPermissions.MasterData.ItemGroups.View,
      },
      {
        key: 'inventory.groupTypes',
        icon: 'FolderIcon',
        labelKey: 'menu.inventory.groupTypes',
        path: '/master/group-types',
        permission: MenuPermissions.MasterData.GroupTypes.View,
      },
      {
        key: 'inventory.groupLevels',
        icon: 'Bars3BottomLeftIcon',
        labelKey: 'menu.inventory.groupLevels',
        path: '/master/group-levels',
        permission: MenuPermissions.MasterData.GroupLevels.View,
      },
      {
        key: 'inventory.groupCategories',
        icon: 'TagIcon',
        labelKey: 'menu.inventory.groupCategories',
        path: '/master/group-categories',
        permission: MenuPermissions.MasterData.GroupCategories.View,
      },
      {
        key: 'inventory.itemTypes',
        icon: 'TagIcon',
        labelKey: 'menu.inventory.itemTypes',
        path: '/master/item-types',
        permission: MenuPermissions.MasterData.ItemTypes.View,
      },
      {
        key: 'inventory.itemGrades',
        icon: 'ChartBarSquareIcon',
        labelKey: 'menu.inventory.itemGrades',
        path: '/master/item-grades',
        permission: MenuPermissions.MasterData.ItemGrades.View,
      },
      {
        key: 'inventory.harvestSchedules',
        icon: 'CalendarDaysIcon',
        labelKey: 'menu.inventory.harvestSchedules',
        path: '/master/harvest-schedules',
        permission: MenuPermissions.MasterData.HarvestSchedules?.View,
      },
      {
        key: 'inventory.units',
        icon: 'ScaleIcon',
        labelKey: 'menu.inventory.units',
        path: '/master/units',
        permission: MenuPermissions.MasterData.Units.View,
      },
      {
        key: 'inventory.unitTypes',
        icon: 'ScaleIcon',
        labelKey: 'menu.inventory.unitTypes',
        path: '/master/unit-types',
        permission: MenuPermissions.MasterData.UnitTypes.View,
      },
      {
        key: 'inventory.warehouses',
        icon: 'BuildingStorefrontIcon',
        labelKey: 'menu.inventory.warehouses',
        path: '/master/warehouses',
        permission: MenuPermissions.MasterData.Warehouses.View,
      },
      {
        key: 'inventory.warehouseTypes',
        icon: 'BuildingStorefrontIcon',
        labelKey: 'menu.inventory.warehouseTypes',
        path: '/master/warehouse-types',
        permission: MenuPermissions.MasterData.WarehouseTypes.View,
      },
      {
        key: 'inventory.warehouseLocations',
        icon: 'MapPinIcon',
        labelKey: 'menu.inventory.warehouseLocations',
        path: '/master/warehouse-locations',
        permission: MenuPermissions.MasterData.WarehouseLocations.View,
      },
      {
        key: 'inventory.binTypes',
        icon: 'ArchiveBoxIcon',
        labelKey: 'menu.inventory.binTypes',
        path: '/master/bin-types',
        permission: MenuPermissions.MasterData.StorageLocationTypes.View,
      },
      {
        key: 'inventory.batchNumbers',
        icon: 'QrCodeIcon',
        labelKey: 'menu.inventory.batchNumbers',
        path: '/master/batch-numbers',
        permission: MenuPermissions.MasterData.BatchNumbers.View,
      },
      {
        key: 'inventory.serialNumbers',
        icon: 'HashtagIcon',
        labelKey: 'menu.inventory.serialNumbers',
        path: '/master/serial-numbers',
        permission: MenuPermissions.MasterData.SerialNumbers.View,
      },
      {
        key: 'inventory.trackingPolicies',
        icon: 'MapIcon',
        labelKey: 'menu.inventory.trackingPolicies',
        path: '/master/tracking-policies',
        permission: MenuPermissions.MasterData.TrackingPolicies.View,
      },
      {
        key: 'inventory.stockLimits',
        icon: 'ExclamationTriangleIcon',
        labelKey: 'menu.inventory.stockLimits',
        path: '/master/stock-limits',
        permission: MenuPermissions.MasterData.StockLimits.View,
      },
      {
        key: 'inventory.minMaxPolicies',
        icon: 'AdjustmentsHorizontalIcon',
        labelKey: 'menu.inventory.minMaxPolicies',
        path: '/master/min-max-policies',
        permission: MenuPermissions.MasterData.MinMaxPolicies.View,
      },
      {
        key: 'inventory.inventoryPolicies',
        icon: 'ClipboardDocumentCheckIcon',
        labelKey: 'menu.inventory.inventoryPolicies',
        path: '/master/inventory-policies',
        permission: MenuPermissions.MasterData.InventoryPolicies.View,
      },
      {
        key: 'inventory.countingPolicies',
        icon: 'ClipboardDocumentListIcon',
        labelKey: 'menu.inventory.countingPolicies',
        path: '/master/counting-policies',
        permission: MenuPermissions.MasterData.CycleCountPolicies.View,
      },
      {
        key: 'inventory.expiryPolicies',
        icon: 'ClockIcon',
        labelKey: 'menu.inventory.expiryPolicies',
        path: '/master/expiry-policies',
        permission: MenuPermissions.MasterData.ExpiryPolicies.View,
      },
      {
        key: 'inventory.externalWarehouses',
        icon: 'BuildingOffice2Icon',
        labelKey: 'menu.inventory.externalWarehouses',
        path: '/master/external-warehouses',
        permission: MenuPermissions.MasterData.ExternalWarehouses.View,
      },
      {
        key: 'inventory.valuationMethods',
        icon: 'CalculatorIcon',
        labelKey: 'menu.inventory.valuationMethods',
        path: '/master/valuation-methods',
        permission: MenuPermissions.MasterData.ValuationMethods.View,
      },
      // Additional Inventory Items
      {
        key: 'inventory.itemCategories',
        icon: 'RectangleStackIcon',
        labelKey: 'menu.inventory.itemCategories',
        path: '/master/item-categories',
        permission: MenuPermissions.Inventory.Categories.View,
      },
      {
        key: 'inventory.inventoryCounting',
        icon: 'ClipboardDocumentCheckIcon',
        labelKey: 'menu.inventory.inventoryCounting',
        path: '/master/inventory-counting',
        permission: MenuPermissions.MasterData.InventoryCounting.View,
      },
      {
        key: 'inventory.reorderRules',
        icon: 'ArrowPathIcon',
        labelKey: 'menu.inventory.reorderRules',
        path: '/master/reorder-rules',
        permission: MenuPermissions.MasterData.ReorderRules.View,
      },
      {
        key: 'inventory.transfers',
        icon: 'ArrowsRightLeftIcon',
        labelKey: 'menu.inventory.transfers',
        path: '/inventory/transfers',
        permission: MenuPermissions.Inventory.Stock.Transfer,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🚢 الاستيراد والتصدير
  // ═══════════════════════════════════════════════════════════
  {
    key: 'importExport',
    icon: 'GlobeAltIcon',
    labelKey: 'menu.importExport',
    permission: MenuPermissions.Logistics.View,
    children: [
      {
        key: 'importExport.incoterms',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.importExport.incoterms',
        path: '/master/incoterms',
        permission: MenuPermissions.MasterData.Incoterms.View,
      },
      {
        key: 'importExport.shippingMethods',
        icon: 'TruckIcon',
        labelKey: 'menu.importExport.shippingMethods',
        path: '/master/shipping-methods',
        permission: MenuPermissions.MasterData.ShippingMethods.View,
      },
      {
        key: 'importExport.shippingCompanies',
        icon: 'TruckIcon',
        labelKey: 'menu.importExport.shippingCompanies',
        path: '/master/shipping-companies',
        permission: MenuPermissions.Logistics.ShippingCompanies.View,
      },
      {
        key: 'importExport.shippingClassifications',
        icon: 'AdjustmentsVerticalIcon',
        labelKey: 'menu.importExport.shippingClassifications',
        path: '/master/shipping-classifications',
        permission: MenuPermissions.MasterData.ShipmentClassifications.View,
      },
      {
        key: 'importExport.freightAgents',
        icon: 'UserGroupIcon',
        labelKey: 'menu.importExport.freightAgents',
        path: '/master/freight-agents',
        permission: MenuPermissions.Logistics.FreightAgents.View,
      },
      {
        key: 'importExport.containerTypes',
        icon: 'CubeTransparentIcon',
        labelKey: 'menu.importExport.containerTypes',
        path: '/master/container-types',
        permission: MenuPermissions.MasterData.ContainerTypes.View,
      },
      {
        key: 'importExport.hsCodes',
        icon: 'QrCodeIcon',
        labelKey: 'menu.importExport.hsCodes',
        path: '/master/hs-codes',
        permission: MenuPermissions.MasterData.HSCodes.View,
      },
      {
        key: 'importExport.tariffs',
        icon: 'ReceiptPercentIcon',
        labelKey: 'menu.importExport.tariffs',
        path: '/master/tariffs',
        permission: MenuPermissions.MasterData.Tariffs.View,
      },
      {
        key: 'importExport.customsDuties',
        icon: 'ReceiptPercentIcon',
        labelKey: 'menu.importExport.customsDuties',
        path: '/master/customs-duties',
        permission: MenuPermissions.MasterData.CustomsDuties.View,
      },
      {
        key: 'importExport.customsDutyTypes',
        icon: 'BuildingLibraryIcon',
        labelKey: 'menu.importExport.customsDutyTypes',
        path: '/master/customs-duty-types',
        permission: MenuPermissions.MasterData.CustomsDutyTypes.View,
      },
      {
        key: 'importExport.clearanceStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.importExport.clearanceStatus',
        path: '/master/clearance-status',
        permission: MenuPermissions.MasterData.CustomsStatuses.View,
      },
      {
        key: 'importExport.clearingOffices',
        icon: 'BuildingOfficeIcon',
        labelKey: 'menu.importExport.clearingOffices',
        path: '/master/customs-offices',
        permission: MenuPermissions.MasterData.CustomsOffices.View,
      },
      {
        key: 'importExport.portsAirports',
        icon: 'BuildingOffice2Icon',
        labelKey: 'menu.importExport.portsAirports',
        path: '/master/ports',
        permission: MenuPermissions.MasterData.Ports.View,
      },
      {
        key: 'importExport.entryExitPoints',
        icon: 'ArrowRightOnRectangleIcon',
        labelKey: 'menu.importExport.entryExitPoints',
        path: '/master/entry-exit-points',
        permission: MenuPermissions.MasterData.EntryExitPoints.View,
      },
      {
        key: 'importExport.borderPoints',
        icon: 'MapPinIcon',
        labelKey: 'menu.importExport.borderPoints',
        path: '/master/border-points',
        permission: MenuPermissions.MasterData.BorderPoints.View,
      },
      {
        key: 'importExport.billOfLadingTypes',
        icon: 'TagIcon',
        labelKey: 'menu.importExport.billOfLadingTypes',
        path: '/master/bill-of-lading-types',
        permission: MenuPermissions.MasterData.BillOfLadingTypes.View,
      },
      {
        key: 'importExport.insuranceTypes',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.importExport.insuranceTypes',
        path: '/master/insurance-types',
        permission: MenuPermissions.MasterData.InsuranceTypes.View,
      },
      {
        key: 'importExport.shipmentTypes',
        icon: 'TruckIcon',
        labelKey: 'menu.importExport.shipmentTypes',
        path: '/master/shipment-types',
        permission: MenuPermissions.MasterData.ShipmentTypes.View,
      },
      // Additional Import/Export Items
      {
        key: 'importExport.insuranceCompanies',
        icon: 'ShieldExclamationIcon',
        labelKey: 'menu.importExport.insuranceCompanies',
        path: '/master/insurance-companies',
        permission: MenuPermissions.MasterData.InsuranceCompanies.View,
      },
      {
        key: 'importExport.laboratories',
        icon: 'BeakerIcon',
        labelKey: 'menu.importExport.laboratories',
        path: '/master/laboratories',
        permission: MenuPermissions.MasterData.Laboratories.View,
      },
      // ─────────────────────────────────────────────────────
      // Shipping Domain Reference Data (Phase 1)
      // ─────────────────────────────────────────────────────
      {
        key: 'importExport.containerTypesV2',
        icon: 'CubeTransparentIcon',
        labelKey: 'menu.importExport.containerTypes',
        path: '/master/container-types',
        permission: MenuPermissions.MasterData.ContainerTypes.View,
      },
      {
        key: 'importExport.expenseCategories',
        icon: 'BanknotesIcon',
        labelKey: 'menu.importExport.expenseCategories',
        path: '/shipping/expense-categories',
        permission: MenuPermissions.MasterData.ShippingExpenseCategories.View,
      },
      {
        key: 'importExport.documentTypes',
        icon: 'DocumentDuplicateIcon',
        labelKey: 'menu.importExport.documentTypes',
        path: '/shipping/document-types',
        permission: MenuPermissions.MasterData.ShippingDocumentTypes.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 📋 إدارة البيانات المرجعية
  // ═══════════════════════════════════════════════════════════
  {
    key: 'referenceData',
    icon: 'CircleStackIcon',
    labelKey: 'menu.referenceData',
    permission: MenuPermissions.Master.View,
    children: [
      {
        key: 'referenceData.countries',
        icon: 'GlobeAltIcon',
        labelKey: 'menu.referenceData.countries',
        path: '/master/countries',
        permission: MenuPermissions.MasterData.Countries.View,
      },
      {
        key: 'referenceData.timezones',
        icon: 'ClockIcon',
        labelKey: 'menu.referenceData.timeZones',
        path: '/master/timezones',
        permission: MenuPermissions.MasterData.TimeZones.View,
      },
      {
        key: 'referenceData.cities',
        icon: 'BuildingLibraryIcon',
        labelKey: 'menu.referenceData.cities',
        path: '/master/cities',
        permission: MenuPermissions.MasterData.Cities.View,
      },
      {
        key: 'referenceData.ports',
        icon: 'BuildingOffice2Icon',
        labelKey: 'menu.referenceData.ports',
        path: '/master/ports',
        permission: MenuPermissions.MasterData.Ports.View,
      },
      {
        key: 'referenceData.clearingOffices',
        icon: 'BuildingOfficeIcon',
        labelKey: 'menu.referenceData.clearingOffices',
        path: '/master/customs-offices',
        permission: MenuPermissions.MasterData.CustomsOffices.View,
      },
      {
        key: 'referenceData.deliveryLocations',
        icon: 'MapPinIcon',
        labelKey: 'menu.referenceData.deliveryLocations',
        path: '/master/delivery-locations',
        permission: MenuPermissions.MasterData.DeliveryLocations.View,
      },
      {
        key: 'referenceData.taxZones',
        icon: 'MapIcon',
        labelKey: 'menu.referenceData.taxZones',
        path: '/master/tax-zones',
        permission: MenuPermissions.MasterData.TaxRegions.View,
      },
      {
        key: 'referenceData.recordStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.referenceData.recordStatus',
        path: '/master/record-status',
        permission: MenuPermissions.MasterData.RecordStatuses.View,
      },
      {
        key: 'referenceData.requestStatus',
        icon: 'ClipboardDocumentCheckIcon',
        labelKey: 'menu.referenceData.requestStatus',
        path: '/master/request-status',
        permission: MenuPermissions.MasterData.RequestStatuses.View,
      },
      {
        key: 'referenceData.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.referenceData.reports',
        path: '/reports/reference-data',
        permission: MenuPermissions.Reports.ReferenceData.View,
      },
      // Additional Reference Data Items
      {
        key: 'referenceData.regions',
        icon: 'MapIcon',
        labelKey: 'menu.referenceData.regions',
        path: '/master/regions',
        permission: MenuPermissions.MasterData.Regions.View,
      },
      {
        key: 'referenceData.branches',
        icon: 'BuildingStorefrontIcon',
        labelKey: 'menu.referenceData.branches',
        path: '/master/branches',
        permission: MenuPermissions.System.Branches.View,
      },
      {
        key: 'referenceData.companies',
        icon: 'BuildingOfficeIcon',
        labelKey: 'menu.referenceData.companies',
        path: '/master/companies',
        platformOnly: true,
      },
      {
        key: 'referenceData.languages',
        icon: 'LanguageIcon',
        labelKey: 'menu.referenceData.languages',
        path: '/master/languages',
        permission: MenuPermissions.MasterData.Languages.View,
      },

      {
        key: 'referenceData.uiThemes',
        icon: 'PaintBrushIcon',
        labelKey: 'menu.referenceData.uiThemes',
        path: '/master/ui-themes',
        permission: MenuPermissions.MasterData.UIThemes.View,
      },
      {
        key: 'referenceData.numberingSeries',
        icon: 'HashtagIcon',
        labelKey: 'menu.referenceData.numberingSeries',
        path: '/master/numbering-series',
        permission: MenuPermissions.MasterData.NumberingSeries.View,
      },
      {
        key: 'referenceData.printedTemplates',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.referenceData.printedTemplates',
        path: '/master/printed-templates',
        permission: MenuPermissions.MasterData.PrintedTemplates.View,
      },
      {
        key: 'referenceData.contactMethods',
        icon: 'PhoneIcon',
        labelKey: 'menu.referenceData.contactMethods',
        path: '/master/contact-methods',
        permission: MenuPermissions.MasterData.ContactMethods.View,
      },
      {
        key: 'referenceData.clearanceOfficesPage',
        icon: 'BuildingOfficeIcon',
        labelKey: 'menu.referenceData.clearanceOfficesPage',
        path: '/master/clearance-offices',
        permission: MenuPermissions.MasterData.ClearanceOffices.View,
      },
      {
        key: 'referenceData.systemPolicies',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.referenceData.systemPolicies',
        path: '/master/system-policies',
        permission: MenuPermissions.MasterData.SystemPolicies.View,
      },
      {
        key: 'referenceData.systemSetup',
        icon: 'Cog6ToothIcon',
        labelKey: 'menu.referenceData.systemSetup',
        path: '/master/system-setup',
        permission: MenuPermissions.System.SystemSetup.View,
      },
      {
        key: 'referenceData.digitalSignatures',
        icon: 'FingerPrintIcon',
        labelKey: 'menu.referenceData.digitalSignatures',
        path: '/master/digital-signatures',
        permission: MenuPermissions.MasterData.DigitalSignatures.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 💵 الضرائب والالتزامات الحكومية
  // ═══════════════════════════════════════════════════════════
  {
    key: 'taxes',
    icon: 'ReceiptPercentIcon',
    labelKey: 'menu.taxes',
    permission: MenuPermissions.Tax.View,
    children: [
      {
        key: 'taxes.taxTypes',
        icon: 'TagIcon',
        labelKey: 'menu.taxes.taxTypes',
        path: '/master/tax-types',
        permission: MenuPermissions.Tax.Types.View,
      },
      {
        key: 'taxes.taxRates',
        icon: 'ReceiptPercentIcon',
        labelKey: 'menu.taxes.taxRates',
        path: '/master/tax-rates',
        permission: MenuPermissions.Tax.Rates.View,
      },
      {
        key: 'taxes.taxCodes',
        icon: 'CodeBracketIcon',
        labelKey: 'menu.taxes.taxCodes',
        path: '/master/tax-codes',
        permission: MenuPermissions.Tax.Codes.View,
      },
      {
        key: 'taxes.taxExemptions',
        icon: 'ShieldExclamationIcon',
        labelKey: 'menu.taxes.taxExemptions',
        path: '/master/tax-exemptions',
        permission: MenuPermissions.MasterData.TaxExemptions.View,
      },
      {
        key: 'taxes.taxCategories',
        icon: 'FolderIcon',
        labelKey: 'menu.taxes.taxCategories',
        path: '/master/tax-categories',
        permission: MenuPermissions.MasterData.TaxCategories.View,
      },
      {
        key: 'taxes.taxItemCategories',
        icon: 'CubeIcon',
        labelKey: 'menu.taxes.taxItemCategories',
        path: '/master/tax-item-categories',
        permission: MenuPermissions.MasterData.TaxCategories.View,
      },
      {
        key: 'taxes.zakatCodes',
        icon: 'QrCodeIcon',
        labelKey: 'menu.taxes.zakatCodes',
        path: '/master/zakat-codes',
        permission: MenuPermissions.MasterData.ZakatCodes.View,
      },
      {
        key: 'taxes.zatcaSettings',
        icon: 'LinkIcon',
        labelKey: 'menu.taxes.zatcaSettings',
        path: '/settings/zatca',
        permission: MenuPermissions.MasterData.SystemPolicies.View,
      },
      // Additional Tax Items
      {
        key: 'taxes.taxes',
        icon: 'ReceiptPercentIcon',
        labelKey: 'menu.taxes.taxes',
        path: '/master/taxes',
        permission: MenuPermissions.MasterData.Taxes.View,
      },
      {
        key: 'taxes.taxRegions',
        icon: 'MapIcon',
        labelKey: 'menu.taxes.taxRegions',
        path: '/master/tax-regions',
        permission: MenuPermissions.MasterData.TaxRegions.View,
      },
      {
        key: 'taxes.withholdingTax',
        icon: 'DocumentMinusIcon',
        labelKey: 'menu.taxes.withholdingTax',
        path: '/master/withholding-tax',
        permission: MenuPermissions.Tax.View,
      },
      {
        key: 'taxes.zatcaIntegration',
        icon: 'LinkIcon',
        labelKey: 'menu.taxes.zatcaIntegration',
        path: '/master/zatca-integration',
        permission: MenuPermissions.Tax.ZATCA.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🚛 الشحن واللوجستيات
  // ═══════════════════════════════════════════════════════════
  {
    key: 'logistics',
    icon: 'TruckIcon',
    labelKey: 'menu.logistics',
    permission: MenuPermissions.Logistics.View,
    children: [
      {
        key: 'logistics.shipmentsV2',
        icon: 'TruckIcon',
        labelKey: 'menu.shipments',
        path: '/shipments',
        permission: MenuPermissions.Logistics.Shipments.View,
      },
      {
        key: 'logistics.shipmentsV2Receiving',
        icon: 'InboxStackIcon',
        labelKey: 'menu.logistics.shipmentManagement.receiving',
        path: '/shipments?mode=receiving',
        permission: MenuPermissions.Logistics.ShipmentReceiving.View,
      },
      {
        key: 'logistics.shipmentsV2Costs',
        icon: 'CurrencyDollarIcon',
        labelKey: 'menu.logistics.shipmentAccounting',
        path: '/shipments?mode=costs',
        permission: MenuPermissions.Logistics.ShipmentAccountingBridge.View,
      },
      // ─────────────────────────────────────────────────────
      // Shipping Bills (B/L, AWB)
      // ─────────────────────────────────────────────────────
      {
        key: 'logistics.shippingBills',
        icon: 'DocumentDuplicateIcon',
        labelKey: 'menu.logistics.shippingBills',
        path: '/shipping-bills',
        permission: MenuPermissions.Logistics.ShippingBills.View,
      },
      // ─────────────────────────────────────────────────────
      // Smart Modules (critical missing)
      // ─────────────────────────────────────────────────────
      {
        key: 'logistics.shipmentManagement',
        icon: 'RectangleGroupIcon',
        labelKey: 'menu.logistics.shipmentManagement',
        permission: MenuPermissions.Logistics.View,
        children: [
          {
            key: 'logistics.shipmentManagement.lifecycleStatuses',
            icon: 'FlagIcon',
            labelKey: 'menu.logistics.shipmentManagement.lifecycleStatuses',
            path: '/shipments/statuses',
            permission: MenuPermissions.Logistics.ShipmentLifecycleStatuses.View,
          },
          {
            key: 'logistics.shipmentManagement.stages',
            icon: 'ListBulletIcon',
            labelKey: 'menu.logistics.shipmentManagement.stages',
            path: '/shipments/stages',
            permission: MenuPermissions.Logistics.ShipmentStages.View,
          },
          {
            key: 'logistics.shipmentManagement.eventLog',
            icon: 'ClockIcon',
            labelKey: 'menu.logistics.shipmentManagement.eventLog',
            path: '/shipments/events',
            permission: MenuPermissions.Logistics.ShipmentEventLog.View,
          },
          {
            key: 'logistics.shipmentManagement.milestones',
            icon: 'CalendarDaysIcon',
            labelKey: 'menu.logistics.shipmentManagement.milestones',
            path: '/shipments/milestones',
            permission: MenuPermissions.Logistics.ShipmentMilestones.View,
          },
          {
            key: 'logistics.shipmentManagement.alertRules',
            icon: 'BellAlertIcon',
            labelKey: 'menu.logistics.shipmentManagement.alertRules',
            path: '/shipments/alert-rules',
            permission: MenuPermissions.Logistics.ShipmentAlertRules.View,
          },
          // Additional Shipment Items
          {
            key: 'logistics.shipmentManagement.tracking',
            icon: 'MapPinIcon',
            labelKey: 'menu.logistics.shipmentManagement.tracking',
            path: '/shipments/tracking',
            permission: MenuPermissions.Logistics.Shipments.View,
          },
          {
            key: 'logistics.shipmentManagement.alerts',
            icon: 'BellIcon',
            labelKey: 'menu.logistics.shipmentManagement.alerts',
            path: '/shipments/alerts',
            permission: MenuPermissions.Logistics.ShipmentAlerts.View,
          },
          {
            key: 'logistics.shipmentManagement.costTypes',
            icon: 'CurrencyDollarIcon',
            labelKey: 'menu.logistics.shipmentManagement.costTypes',
            path: '/shipments/cost-types',
            permission: MenuPermissions.Logistics.ShipmentCostTypes.View,
          },
          {
            key: 'logistics.shipmentManagement.documentRequirements',
            icon: 'DocumentTextIcon',
            labelKey: 'menu.logistics.shipmentManagement.documentRequirements',
            path: '/shipments/document-requirements',
            permission: MenuPermissions.Logistics.ShipmentDocumentRequirements.View,
          },
          {
            key: 'logistics.shipmentManagement.landedCostAllocation',
            icon: 'CalculatorIcon',
            labelKey: 'menu.logistics.shipmentManagement.landedCostAllocation',
            path: '/shipments/landed-cost-allocation',
            permission: MenuPermissions.Logistics.LandedCostAllocation.View,
          },
          // ─────────────────────────────────────────────────────
          // Shipping Domain Architecture (Phase 1)
          // ─────────────────────────────────────────────────────
          {
            key: 'logistics.shipmentManagement.containers',
            icon: 'CubeTransparentIcon',
            labelKey: 'menu.logistics.shipmentManagement.containers',
            path: '/shipping/shipment-containers',
            permission: MenuPermissions.Logistics.Shipments.View,
          },
          {
            key: 'logistics.shipmentManagement.parties',
            icon: 'UserGroupIcon',
            labelKey: 'menu.logistics.shipmentManagement.parties',
            path: '/shipping/shipment-parties',
            permission: MenuPermissions.Logistics.Shipments.View,
          },
          {
            key: 'logistics.shipmentManagement.compliance',
            icon: 'ShieldCheckIcon',
            labelKey: 'menu.logistics.shipmentManagement.compliance',
            path: '/shipping/shipment-compliance',
            permission: MenuPermissions.ComplianceModule.View,
          },
        ],
      },
      {
        key: 'logistics.customsDuties',
        icon: 'GlobeAltIcon',
        labelKey: 'menu.logistics.customsDuties',
        permission: MenuPermissions.Logistics.Customs.View,
        children: [
          {
            key: 'logistics.customsDuties.hsCodes',
            icon: 'QrCodeIcon',
            labelKey: 'menu.logistics.customsDuties.hsCodes',
            path: '/master/hs-codes',
            permission: MenuPermissions.MasterData.HSCodes.View,
          },
          {
            key: 'logistics.customsDuties.tariffs',
            icon: 'ScaleIcon',
            labelKey: 'menu.logistics.customsDuties.tariffs',
            path: '/master/tariffs',
            permission: MenuPermissions.Logistics.CustomsTariffs.View,
          },
          {
            key: 'logistics.customsDuties.exemptions',
            icon: 'ShieldCheckIcon',
            labelKey: 'menu.logistics.customsDuties.exemptions',
            path: '/customs/customs-exemptions',
            permission: MenuPermissions.Logistics.CustomsExemptions.View,
          },
          {
            key: 'logistics.customsDuties.calculation',
            icon: 'CalculatorIcon',
            labelKey: 'menu.logistics.customsDuties.calculation',
            path: '/customs/duty-calculation',
            permission: MenuPermissions.Logistics.DutyCalculation.View,
          },
        ],
      },

      // Customs Declarations (Operational)
      {
        key: 'logistics.customsDeclarations',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.logistics.customsDeclarations',
        path: '/customs/declarations',
        permission: MenuPermissions.Customs.Declarations.View,
      },
      {
        key: 'logistics.shipmentAccounting',
        icon: 'BanknotesIcon',
        labelKey: 'menu.logistics.shipmentAccounting',
        permission: MenuPermissions.Logistics.ShipmentAccountingBridge.View,
        children: [
          {
            key: 'logistics.shipmentAccounting.linkJournals',
            icon: 'LinkIcon',
            labelKey: 'menu.logistics.shipmentAccounting.linkJournals',
            path: '/accounting/shipment-journal-links',
            permission: MenuPermissions.Logistics.ShipmentAccountingBridge.View,
          },
          {
            key: 'logistics.shipmentAccounting.defaultAccounts',
            icon: 'ClipboardDocumentListIcon',
            labelKey: 'menu.logistics.shipmentAccounting.defaultAccounts',
            path: '/accounting/shipment-default-accounts',
            permission: MenuPermissions.Logistics.ShipmentAccountingBridge.Manage,
          },
          {
            key: 'logistics.shipmentAccounting.closeShipment',
            icon: 'CheckCircleIcon',
            labelKey: 'menu.logistics.shipmentAccounting.closeShipment',
            path: '/accounting/shipment-closing',
            permission: MenuPermissions.Logistics.ShipmentAccountingBridge.Close,
          },
          {
            key: 'logistics.shipmentAccounting.financialDashboard',
            icon: 'PresentationChartBarIcon',
            labelKey: 'menu.logistics.shipmentAccounting.financialDashboard',
            path: '/accounting/shipment-financial-dashboard',
            permission: MenuPermissions.Logistics.ShipmentAccountingBridge.View,
          },
          {
            key: 'logistics.shipmentAccounting.mappingMatrix',
            icon: 'TableCellsIcon',
            labelKey: 'menu.logistics.shipmentAccounting.mappingMatrix',
            path: '/accounting/shipment-accounting-map',
            permission: MenuPermissions.Logistics.ShipmentAccountingBridge.Manage,
          },
        ],
      },
      {
        key: 'logistics.analytics',
        icon: 'ChartBarIcon',
        labelKey: 'menu.logistics.analytics',
        permission: MenuPermissions.Reports.ShipmentCosts.View,
        children: [
          {
            key: 'logistics.analytics.shipmentCosts',
            icon: 'CurrencyDollarIcon',
            labelKey: 'menu.logistics.analytics.shipmentCosts',
            path: '/reports/shipment-costs',
            permission: MenuPermissions.Reports.ShipmentCosts.View,
          },
          {
            key: 'logistics.analytics.itemLandedCost',
            icon: 'CubeIcon',
            labelKey: 'menu.logistics.analytics.itemLandedCost',
            path: '/reports/item-landed-cost',
            permission: MenuPermissions.Reports.ItemLandedCost.View,
          },
          {
            key: 'logistics.analytics.shipmentDelays',
            icon: 'ExclamationTriangleIcon',
            labelKey: 'menu.logistics.analytics.shipmentDelays',
            path: '/reports/shipment-delays',
            permission: MenuPermissions.Reports.ShipmentDelays.View,
          },
          {
            key: 'logistics.analytics.shipmentProfitability',
            icon: 'ArrowTrendingUpIcon',
            labelKey: 'menu.logistics.analytics.shipmentProfitability',
            path: '/reports/shipment-profitability',
            permission: MenuPermissions.Reports.ShipmentProfitability.View,
          },
          {
            key: 'logistics.analytics.costVariance',
            icon: 'ScaleIcon',
            labelKey: 'menu.logistics.analytics.costVariance',
            path: '/reports/cost-variance',
            permission: MenuPermissions.Reports.CostVariance.View,
          },
          {
            key: 'logistics.analytics.topCostSuppliers',
            icon: 'BuildingOffice2Icon',
            labelKey: 'menu.logistics.analytics.topCostSuppliers',
            path: '/reports/top-cost-suppliers',
            permission: MenuPermissions.Reports.TopCostSuppliers.View,
          },
        ],
      },
      {
        key: 'logistics.transportCompanies',
        icon: 'BuildingOfficeIcon',
        labelKey: 'menu.logistics.transportCompanies',
        path: '/master/transport-companies',
        permission: MenuPermissions.MasterData.TransportCompanies.View,
      },
      {
        key: 'logistics.vehicleTypes',
        icon: 'TruckIcon',
        labelKey: 'menu.logistics.vehicleTypes',
        path: '/master/vehicle-types',
        permission: MenuPermissions.MasterData.VehicleTypes.View,
      },
      {
        key: 'logistics.vehicles',
        icon: 'TruckIcon',
        labelKey: 'menu.logistics.vehicles',
        path: '/master/vehicles',
        permission: MenuPermissions.MasterData.Vehicles.View,
      },
      {
        key: 'logistics.drivers',
        icon: 'UserIcon',
        labelKey: 'menu.logistics.drivers',
        path: '/master/drivers',
        permission: MenuPermissions.MasterData.Drivers.View,
      },
      {
        key: 'logistics.transportRoutes',
        icon: 'MapIcon',
        labelKey: 'menu.logistics.transportRoutes',
        path: '/master/transport-routes',
        permission: MenuPermissions.MasterData.TransportRoutes.View,
      },
      {
        key: 'logistics.deliveryLocations',
        icon: 'MapPinIcon',
        labelKey: 'menu.logistics.deliveryLocations',
        path: '/master/delivery-locations',
        permission: MenuPermissions.MasterData.DeliveryLocations.View,
      },
      {
        key: 'logistics.externalWarehouses',
        icon: 'BuildingStorefrontIcon',
        labelKey: 'menu.logistics.externalWarehouses',
        path: '/master/external-warehouses',
        permission: MenuPermissions.MasterData.ExternalWarehouses.View,
      },
      {
        key: 'logistics.shipmentTypes',
        icon: 'TagIcon',
        labelKey: 'menu.logistics.shipmentTypes',
        path: '/master/shipment-types',
        permission: MenuPermissions.MasterData.ShipmentTypes.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // � الشحن البحري والجوي
  // ═══════════════════════════════════════════════════════════
  {
    key: 'shipping',
    icon: 'GlobeAltIcon',
    labelKey: 'menu.shipping',
    permission: MenuPermissions.Logistics.View,
    children: [
      {
        key: 'shipping.billOfLading',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.shipping.billOfLading',
        path: '/shipping/bill-of-lading',
        permission: MenuPermissions.Shipping.BillOfLading.View,
      },
      {
        key: 'shipping.documents',
        icon: 'DocumentDuplicateIcon',
        labelKey: 'menu.shipping.documents',
        path: '/shipping/documents',
        permission: MenuPermissions.Shipping.Documents.View,
      },
      {
        key: 'shipping.schedules',
        icon: 'CalendarDaysIcon',
        labelKey: 'menu.shipping.schedules',
        path: '/shipping/schedules',
        permission: MenuPermissions.Shipping.Schedules.View,
      },
      {
        key: 'shipping.contracts',
        icon: 'ClipboardDocumentListIcon',
        labelKey: 'menu.shipping.contracts',
        path: '/shipping/contracts',
        permission: MenuPermissions.Shipping.Contracts.View,
      },
      {
        key: 'shipping.insurance',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.shipping.insurance',
        path: '/shipping/insurance',
        permission: MenuPermissions.Shipping.Insurance.View,
      },
      {
        key: 'shipping.carrierQuotes',
        icon: 'CurrencyDollarIcon',
        labelKey: 'menu.shipping.carrierQuotes',
        path: '/shipping/carrier-quotes',
        permission: MenuPermissions.Logistics.CarrierQuotes.View,
      },
      {
        key: 'shipping.carrierEvaluations',
        icon: 'StarIcon',
        labelKey: 'menu.shipping.carrierEvaluations',
        path: '/shipping/carrier-evaluations',
        permission: MenuPermissions.Logistics.CarrierEvaluations.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // �📄 المستندات والإجراءات
  // ═══════════════════════════════════════════════════════════
  {
    key: 'documents',
    icon: 'DocumentDuplicateIcon',
    labelKey: 'menu.documents',
    permission: MenuPermissions.Documents.View,
    children: [
      {
        key: 'documents.documentTypes',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.documents.documentTypes',
        path: '/master/document-types',
        permission: MenuPermissions.Documents.Types.View,
      },
      {
        key: 'documents.documentStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.documents.documentStatus',
        path: '/master/document-status',
        permission: MenuPermissions.MasterData.DocumentStatus.View,
      },
      {
        key: 'documents.approvalWorkflows',
        icon: 'ArrowPathIcon',
        labelKey: 'menu.documents.approvalWorkflows',
        path: '/master/approval-workflows',
        permission: MenuPermissions.Documents.Workflows.View,
      },
      {
        key: 'documents.invoiceTemplates',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.documents.invoiceTemplates',
        path: '/master/invoice-templates',
        permission: MenuPermissions.MasterData.InvoiceTemplates.View,
      },
      {
        key: 'documents.purchaseOrderTemplates',
        icon: 'ClipboardDocumentListIcon',
        labelKey: 'menu.documents.purchaseOrderTemplates',
        path: '/master/purchase-order-templates',
        permission: MenuPermissions.MasterData.PurchaseOrderTemplates.View,
      },
      {
        key: 'documents.contractTemplates',
        icon: 'DocumentDuplicateIcon',
        labelKey: 'menu.documents.contractTemplates',
        path: '/master/contract-templates',
        permission: MenuPermissions.Documents.Templates.View,
      },
      {
        key: 'documents.warrantyDocuments',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.documents.warrantyDocuments',
        path: '/documents/warranty',
        permission: MenuPermissions.Documents.View,
      },
      {
        key: 'documents.lcDocuments',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.documents.lcDocuments',
        path: '/documents/letter-of-credit',
        permission: MenuPermissions.Documents.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🏗️ إدارة الأصول الثابتة
  // ═══════════════════════════════════════════════════════════
  {
    key: 'fixedAssets',
    icon: 'BuildingOffice2Icon',
    labelKey: 'menu.fixedAssets',
    permission: MenuPermissions.Assets.View,
    children: [
      {
        key: 'fixedAssets.assets',
        icon: 'BuildingOffice2Icon',
        labelKey: 'menu.fixedAssets.assets',
        path: '/assets/fixed-assets',
        permission: MenuPermissions.Assets.FixedAssets.View,
      },
      {
        key: 'fixedAssets.assetCategories',
        icon: 'FolderIcon',
        labelKey: 'menu.fixedAssets.assetCategories',
        path: '/master/asset-categories',
        permission: MenuPermissions.MasterData.AssetCategories.View,
      },
      {
        key: 'fixedAssets.assetLocations',
        icon: 'MapPinIcon',
        labelKey: 'menu.fixedAssets.assetLocations',
        path: '/master/asset-locations',
        permission: MenuPermissions.MasterData.AssetLocations.View,
      },
      {
        key: 'fixedAssets.assetStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.fixedAssets.assetStatus',
        path: '/master/asset-status',
        permission: MenuPermissions.MasterData.AssetStatus.View,
      },
      {
        key: 'fixedAssets.depreciationSchedules',
        icon: 'ChartBarIcon',
        labelKey: 'menu.fixedAssets.depreciationSchedules',
        path: '/assets/depreciation-schedules',
        permission: MenuPermissions.Assets.DepreciationSchedules.View,
      },
      {
        key: 'fixedAssets.maintenanceContracts',
        icon: 'WrenchIcon',
        labelKey: 'menu.fixedAssets.maintenanceContracts',
        path: '/assets/maintenance-contracts',
        permission: MenuPermissions.Assets.MaintenanceContracts.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 👔 الموارد البشرية والرواتب
  // ═══════════════════════════════════════════════════════════
  {
    key: 'hr',
    icon: 'UserGroupIcon',
    labelKey: 'menu.hr',
    permission: MenuPermissions.HR.View,
    children: [
      {
        key: 'hr.employees',
        icon: 'UsersIcon',
        labelKey: 'menu.hr.employees',
        path: '/hr/employees',
        permission: MenuPermissions.HR.View,
      },
      {
        key: 'hr.employeeStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.hr.employeeStatus',
        path: '/master/employee-status',
        permission: MenuPermissions.MasterData.EmployeeStatus.View,
      },
      {
        key: 'hr.departments',
        icon: 'BuildingOfficeIcon',
        labelKey: 'menu.hr.departments',
        path: '/master/departments',
        permission: MenuPermissions.HR.Departments.View,
      },
      {
        key: 'hr.responsibilityCenters',
        icon: 'ChartPieIcon',
        labelKey: 'menu.hr.responsibilityCenters',
        path: '/master/responsibility-centers',
        permission: MenuPermissions.MasterData.ResponsibilityCenters.View,
      },
      {
        key: 'hr.allowanceTypes',
        icon: 'BanknotesIcon',
        labelKey: 'menu.hr.allowanceTypes',
        path: '/master/allowance-types',
        permission: MenuPermissions.MasterData.AllowanceTypes.View,
      },
      {
        key: 'hr.deductionTypes',
        icon: 'MinusCircleIcon',
        labelKey: 'menu.hr.deductionTypes',
        path: '/master/deduction-types',
        permission: MenuPermissions.MasterData.DeductionTypes.View,
      },
      {
        key: 'hr.advanceTypes',
        icon: 'CurrencyDollarIcon',
        labelKey: 'menu.hr.advanceTypes',
        path: '/master/advance-types',
        permission: MenuPermissions.MasterData.AdvanceTypes.View,
      },
      {
        key: 'hr.expenseTypes',
        icon: 'ReceiptPercentIcon',
        labelKey: 'menu.hr.expenseTypes',
        path: '/master/hr-expense-types',
        permission: MenuPermissions.MasterData.HrExpenseTypes.View,
      },
      {
        key: 'hr.payrollSchedules',
        icon: 'CalendarIcon',
        labelKey: 'menu.hr.payrollSchedules',
        path: '/master/payroll-periods',
        permission: MenuPermissions.MasterData.PayrollPeriods.View,
      },
      {
        key: 'hr.attendanceSettings',
        icon: 'ClockIcon',
        labelKey: 'menu.hr.attendanceSettings',
        path: '/settings/attendance',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'hr.contractTypes',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.hr.contractTypes',
        path: '/master/hr-contract-types',
        permission: MenuPermissions.MasterData.HrContractTypes.View,
      },
      {
        key: 'hr.contractStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.hr.contractStatus',
        path: '/master/hr-contract-status',
        permission: MenuPermissions.MasterData.HrContractStatus.View,
      },
      {
        key: 'hr.allowancesDeductions',
        icon: 'CalculatorIcon',
        labelKey: 'menu.hr.allowancesDeductions',
        path: '/master/allowances',
        permission: MenuPermissions.HR.Payroll.View,
      },
      // Additional HR Items
      {
        key: 'hr.jobTitles',
        icon: 'IdentificationIcon',
        labelKey: 'menu.hr.jobTitles',
        path: '/master/job-titles',
        permission: MenuPermissions.MasterData.JobTitles.View,
      },
      {
        key: 'hr.deductions',
        icon: 'MinusCircleIcon',
        labelKey: 'menu.hr.deductions',
        path: '/master/deductions',
        permission: MenuPermissions.MasterData.DeductionTypes.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🤝 إدارة العملاء (CRM)
  // ═══════════════════════════════════════════════════════════
  {
    key: 'crm',
    icon: 'HeartIcon',
    labelKey: 'menu.crm',
    permission: MenuPermissions.CRM.View,
    children: [
      {
        key: 'crm.customers',
        icon: 'UsersIcon',
        labelKey: 'menu.crm.customers',
        path: '/master/customers',
        permission: MenuPermissions.MasterData.Customers.View,
      },
      {
        key: 'crm.customerClassifications',
        icon: 'StarIcon',
        labelKey: 'menu.crm.customerClassifications',
        path: '/master/customer-classifications',
        permission: MenuPermissions.MasterData.CustomerCategories.View,
      },
      {
        key: 'crm.customerTypes',
        icon: 'TagIcon',
        labelKey: 'menu.crm.customerTypes',
        path: '/master/customer-types',
        permission: MenuPermissions.MasterData.CustomerTypes.View,
      },
      {
        key: 'crm.customerStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.crm.customerStatus',
        path: '/master/customer-status',
        permission: MenuPermissions.MasterData.CustomerStatuses.View,
      },
      {
        key: 'crm.creditLimits',
        icon: 'CreditCardIcon',
        labelKey: 'menu.crm.creditLimits',
        path: '/master/credit-limits',
        permission: MenuPermissions.MasterData.Customers.View,
      },
      {
        key: 'crm.discountAgreements',
        icon: 'ReceiptPercentIcon',
        labelKey: 'menu.crm.discountAgreements',
        path: '/master/discount-agreements',
        permission: MenuPermissions.MasterData.DiscountAgreements.View,
      },
      {
        key: 'crm.paymentMethods',
        icon: 'CreditCardIcon',
        labelKey: 'menu.crm.paymentMethods',
        path: '/master/payment-methods',
        permission: MenuPermissions.MasterData.PaymentMethods.View,
      },
      {
        key: 'crm.addresses',
        icon: 'MapPinIcon',
        labelKey: 'menu.crm.addresses',
        path: '/crm/addresses',
        permission: MenuPermissions.CRM.Addresses.View,
      },
      {
        key: 'crm.addressTypes',
        icon: 'HomeModernIcon',
        labelKey: 'menu.crm.addressTypes',
        path: '/master/address-types',
        permission: MenuPermissions.MasterData.AddressTypes.View,
      },
      {
        key: 'crm.contacts',
        icon: 'PhoneIcon',
        labelKey: 'menu.crm.contacts',
        path: '/crm/contacts',
        permission: MenuPermissions.CRM.Contacts.View,
      },
      {
        key: 'crm.contactTypes',
        icon: 'ChatBubbleLeftRightIcon',
        labelKey: 'menu.crm.contactTypes',
        path: '/master/contact-types',
        permission: MenuPermissions.MasterData.ContactTypes.View,
      },
      {
        key: 'crm.salesOpportunities',
        icon: 'SparklesIcon',
        labelKey: 'menu.crm.salesOpportunities',
        path: '/crm/opportunities',
        permission: MenuPermissions.CRM.Opportunities.View,
      },
      {
        key: 'crm.customerFollowUp',
        icon: 'ArrowPathIcon',
        labelKey: 'menu.crm.customerFollowUp',
        path: '/crm/follow-up',
        permission: MenuPermissions.CRM.FollowUp.View,
      },
      // Additional CRM Items
      {
        key: 'crm.customerGroups',
        icon: 'UsersIcon',
        labelKey: 'menu.crm.customerGroups',
        path: '/master/customer-groups',
        permission: MenuPermissions.MasterData.CustomerGroups.View,
      },
      {
        key: 'crm.supplierTypes',
        icon: 'TagIcon',
        labelKey: 'menu.crm.supplierTypes',
        path: '/master/supplier-types',
        permission: MenuPermissions.MasterData.SupplierTypes.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 📊 إدارة المشتريات المتقدمة
  // ═══════════════════════════════════════════════════════════
  {
    key: 'advancedPurchasing',
    icon: 'ShoppingBagIcon',
    labelKey: 'menu.advancedPurchasing',
    permission: MenuPermissions.AdvancedPurchasing.View,
    children: [
      {
        key: 'advancedPurchasing.purchaseOrders',
        icon: 'ClipboardDocumentListIcon',
        labelKey: 'menu.advancedPurchasing.purchaseOrders',
        path: '/purchasing/orders',
        permission: MenuPermissions.Procurement.PurchaseOrders.View,
      },
      {
        key: 'advancedPurchasing.purchaseReturns',
        icon: 'ArrowUturnLeftIcon',
        labelKey: 'menu.advancedPurchasing.purchaseReturns',
        path: '/purchasing/returns',
        permission: MenuPermissions.Procurement.View,
      },
      {
        key: 'advancedPurchasing.vendorCreditLimits',
        icon: 'CreditCardIcon',
        labelKey: 'menu.advancedPurchasing.vendorCreditLimits',
        path: '/purchasing/vendor-credit-limits',
        permission: MenuPermissions.Procurement.View,
      },
      {
        key: 'advancedPurchasing.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.advancedPurchasing.reports',
        path: '/reports/purchasing',
        permission: MenuPermissions.Procurement.Reports.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🛃 إدارة الجمارك المتقدمة
  // ═══════════════════════════════════════════════════════════
  {
    key: 'advancedCustoms',
    icon: 'BuildingOfficeIcon',
    labelKey: 'menu.advancedCustoms',
    permission: MenuPermissions.AdvancedCustoms.View,
    children: [
      {
        key: 'advancedCustoms.customsDeclarations',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.advancedCustoms.customsDeclarations',
        path: '/customs/declarations',
        permission: MenuPermissions.Customs.Declarations.View,
      },
      {
        key: 'advancedCustoms.feeCategories',
        icon: 'TagIcon',
        labelKey: 'menu.advancedCustoms.feeCategories',
        path: '/master/customs-fee-categories',
        permission: MenuPermissions.MasterData.CustomsFeeCategories.View,
      },
      {
        key: 'advancedCustoms.clearanceDocuments',
        icon: 'DocumentDuplicateIcon',
        labelKey: 'menu.advancedCustoms.clearanceDocuments',
        path: '/customs/clearance-documents',
        permission: MenuPermissions.Logistics.Customs.View,
      },
      {
        key: 'advancedCustoms.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.advancedCustoms.reports',
        path: '/reports/customs',
        permission: MenuPermissions.AdvancedCustoms.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 💲 إدارة التكاليف والتسعير
  // ═══════════════════════════════════════════════════════════
  {
    key: 'costsPricing',
    icon: 'CalculatorIcon',
    labelKey: 'menu.costsPricing',
    permission: MenuPermissions.CostsPricing.View,
    children: [
      {
        key: 'costsPricing.costItems',
        icon: 'ListBulletIcon',
        labelKey: 'menu.costsPricing.costItems',
        path: '/master/cost-items',
        permission: MenuPermissions.MasterData.CostItems.View,
      },
      {
        key: 'costsPricing.costElementGroups',
        icon: 'RectangleGroupIcon',
        labelKey: 'menu.costsPricing.costElementGroups',
        path: '/master/cost-element-groups',
        permission: MenuPermissions.MasterData.CostElementGroups.View,
      },
      {
        key: 'costsPricing.pricingMethods',
        icon: 'CalculatorIcon',
        labelKey: 'menu.costsPricing.pricingMethods',
        path: '/master/pricing-methods',
        permission: MenuPermissions.MasterData.PricingMethods.View,
      },
      {
        key: 'costsPricing.priceLists',
        icon: 'ListBulletIcon',
        labelKey: 'menu.costsPricing.priceLists',
        path: '/sales/price-lists',
        permission: MenuPermissions.MasterData.PriceLists.View,
      },
      {
        key: 'costsPricing.exchangeRates',
        icon: 'ArrowsRightLeftIcon',
        labelKey: 'menu.costsPricing.exchangeRates',
        path: '/master/exchange-rates',
        permission: MenuPermissions.MasterData.ExchangeRates.View,
      },
      {
        key: 'costsPricing.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.costsPricing.reports',
        path: '/reports/costs-pricing',
        permission: MenuPermissions.CostsPricing.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // ✅ إدارة الامتثال
  // ═══════════════════════════════════════════════════════════
  {
    key: 'compliance',
    icon: 'ShieldCheckIcon',
    labelKey: 'menu.compliance',
    permission: MenuPermissions.ComplianceModule.View,
    children: [
      {
        key: 'compliance.conformityCertificates',
        icon: 'DocumentCheckIcon',
        labelKey: 'menu.compliance.conformityCertificates',
        path: '/compliance/conformity-certificates',
        permission: MenuPermissions.ComplianceModule.ConformityCertificates.View,
      },
      {
        key: 'compliance.originCertificates',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.compliance.originCertificates',
        path: '/compliance/origin-certificates',
        permission: MenuPermissions.ComplianceModule.OriginCertificates.View,
      },
      {
        key: 'compliance.importExportLicenses',
        icon: 'IdentificationIcon',
        labelKey: 'menu.compliance.importExportLicenses',
        path: '/compliance/licenses',
        permission: MenuPermissions.ComplianceModule.Licenses.View,
      },
      {
        key: 'compliance.regulationsStandards',
        icon: 'BookOpenIcon',
        labelKey: 'menu.compliance.regulationsStandards',
        path: '/compliance/regulations',
        permission: MenuPermissions.ComplianceModule.Regulations.View,
      },
      {
        key: 'compliance.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.compliance.reports',
        path: '/reports/compliance',
        permission: MenuPermissions.ComplianceModule.View,
      },
      {
        key: 'compliance.ifrsCompliance',
        icon: 'ScaleIcon',
        labelKey: 'menu.compliance.ifrsCompliance',
        path: '/settings/ifrs-compliance',
        permission: 'compliance:view' as MenuPermission,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 💼 إدارة الموارد البشرية المرتبطة
  // ═══════════════════════════════════════════════════════════
  {
    key: 'hrLinked',
    icon: 'BriefcaseIcon',
    labelKey: 'menu.hrLinked',
    permission: MenuPermissions.HR.View,
    children: [
      {
        key: 'hrLinked.salaries',
        icon: 'BanknotesIcon',
        labelKey: 'menu.hrLinked.salaries',
        path: '/hr/salaries',
        permission: MenuPermissions.HR.Payroll.View,
      },
      {
        key: 'hrLinked.advances',
        icon: 'CurrencyDollarIcon',
        labelKey: 'menu.hrLinked.advances',
        path: '/hr/advances',
        permission: MenuPermissions.HR.View,
      },
      {
        key: 'hrLinked.expenses',
        icon: 'ReceiptPercentIcon',
        labelKey: 'menu.hrLinked.expenses',
        path: '/hr/expenses',
        permission: MenuPermissions.HR.View,
      },
      {
        key: 'hrLinked.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.hrLinked.reports',
        path: '/reports/hr',
        permission: MenuPermissions.HR.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // ✅ إدارة الاعتمادات (Approval Workflow Engine)
  // ═══════════════════════════════════════════════════════════
  {
    key: 'approvals',
    icon: 'CheckCircleIcon',
    labelKey: 'menu.approvals',
    permission: 'approval_documents:view',
    children: [
      {
        key: 'approvals.inbox',
        icon: 'InboxStackIcon',
        labelKey: 'menu.approvals.inbox',
        path: '/approvals/inbox',
        permission: 'approval_documents:view',
        badge: 'pendingApprovals',
      },
      {
        key: 'approvals.myRequests',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.approvals.myRequests',
        path: '/approvals/my-requests',
        permission: 'approval_documents:view',
      },
      {
        key: 'approvals.monitor',
        icon: 'ChartBarIcon',
        labelKey: 'menu.approvals.monitor',
        path: '/approvals/monitor',
        permission: 'approval_documents:monitor',
      },
      {
        key: 'approvals.settings',
        icon: 'Cog6ToothIcon',
        labelKey: 'menu.approvals.settings',
        path: '/approvals/settings',
        permission: 'approval_routes:view',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🏢 الهيكل التنظيمي (الشركات والفروع)
  // ═══════════════════════════════════════════════════════════
  {
    key: 'organization',
    icon: 'BuildingOffice2Icon',
    labelKey: 'menu.organization',
    permission: MenuPermissions.System.Companies.View,
    platformOnly: true,
    children: [
      {
        key: 'organization.companies',
        icon: 'BuildingOfficeIcon',
        labelKey: 'menu.organization.companies',
        path: '/admin/companies',
        permission: MenuPermissions.System.Companies.View,
      },
      {
        key: 'organization.branches',
        icon: 'BuildingStorefrontIcon',
        labelKey: 'menu.organization.branches',
        path: '/admin/branches',
        permission: MenuPermissions.System.Branches.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🔐 إدارة الأمن والصلاحيات
  // ═══════════════════════════════════════════════════════════
  {
    key: 'security',
    icon: 'LockClosedIcon',
    labelKey: 'menu.security',
    permission: MenuPermissions.Users.View,
    children: [
      {
        key: 'security.users',
        icon: 'UserGroupIcon',
        labelKey: 'menu.security.users',
        path: '/master/users',
        permission: MenuPermissions.Users.View,
      },
      {
        key: 'security.userAssignments',
        icon: 'UserPlusIcon',
        labelKey: 'menu.security.userAssignments',
        path: '/admin/user-assignments',
        permission: MenuPermissions.Users.View,
        platformOnly: true,
      },
      {
        key: 'security.rolesPermissions',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.security.rolesPermissions',
        path: '/admin/roles',
        permission: MenuPermissions.Roles.View,
        platformOnly: true,
      },
      {
        key: 'security.tenantRolesPermissions',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.security.tenantRolesPermissions',
        path: '/settings/roles',
        permission: MenuPermissions.Roles.View,
        tenantOnly: true,
      },
      {
        key: 'security.tenantPermissionMatrix',
        icon: 'TableCellsIcon',
        labelKey: 'menu.security.permissionMatrix',
        path: '/admin/permissions-matrix',
        permission: MenuPermissions.Roles.View,
        tenantOnly: true,
      },
      {
        key: 'security.entityAccess',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.security.entityAccess',
        path: '/admin/entity-access',
        permission: MenuPermissions.System.EntityAccess.View,
        tenantOnly: true,
      },
      {
        key: 'security.permissions',
        icon: 'KeyIcon',
        labelKey: 'menu.security.permissions',
        path: '/master/permissions',
        permission: MenuPermissions.System.Permissions.View,
        platformOnly: true,
      },
      {
        key: 'security.permissionMatrix',
        icon: 'TableCellsIcon',
        labelKey: 'menu.security.permissionMatrix',
        path: '/admin/permission-matrix',
        permission: MenuPermissions.System.Permissions.View,
        platformOnly: true,
      },
      {
        key: 'security.fieldPermissions',
        icon: 'LockClosedIcon',
        labelKey: 'menu.security.fieldPermissions',
        path: '/admin/field-permissions',
        permission: MenuPermissions.System.Permissions.View,
        platformOnly: true,
      },
      {
        key: 'security.buttonPermissions',
        icon: 'CursorArrowRaysIcon',
        labelKey: 'menu.security.buttonPermissions',
        path: '/admin/button-permissions',
        permission: MenuPermissions.System.Permissions.View,
        platformOnly: true,
      },
      {
        key: 'security.auditLogs',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.security.auditLogs',
        path: '/admin/audit-logs',
        permission: MenuPermissions.System.AuditLogs.View,
      },
      {
        key: 'security.deletedRecords',
        icon: 'TrashIcon',
        labelKey: 'menu.security.deletedRecords',
        path: '/admin/deleted-records',
        permission: MenuPermissions.System.AuditLogs.View,
      },
      {
        key: 'security.recoveryLogs',
        icon: 'ArrowPathIcon',
        labelKey: 'menu.security.recoveryLogs',
        path: '/admin/recovery-logs',
        permission: MenuPermissions.System.AuditLogs.View,
      },
      {
        key: 'security.helpRequests',
        icon: 'QuestionMarkCircleIcon',
        labelKey: 'menu.security.helpRequests',
        path: '/admin/help-requests',
        permission: MenuPermissions.System.AuditLogs.View,
      },
      {
        key: 'security.loginHistory',
        icon: 'ClockIcon',
        labelKey: 'menu.security.loginHistory',
        path: '/admin/security/login-history',
        permission: MenuPermissions.System.AuditLogs.View,
      },
      {
        key: 'security.passwordResets',
        icon: 'KeyIcon',
        labelKey: 'menu.security.passwordResets',
        path: '/admin/password-resets',
        permission: MenuPermissions.Users.View,
      },
      {
        key: 'security.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.security.reports',
        path: '/reports/security',
        permission: MenuPermissions.Reports.Security.View,
      },
      {
        key: 'security.securityDashboard',
        icon: 'ShieldExclamationIcon',
        labelKey: 'menu.security.securityDashboard',
        path: '/admin/security/dashboard',
        permission: MenuPermissions.System.AuditLogs.View,
        platformOnly: true,
      },
      {
        key: 'security.dataRetention',
        icon: 'ArchiveBoxIcon',
        labelKey: 'menu.security.dataRetention',
        path: '/admin/security/data-retention',
        permission: MenuPermissions.System.AuditLogs.View,
        platformOnly: true,
      },
      {
        key: 'security.disasterRecovery',
        icon: 'ServerStackIcon',
        labelKey: 'menu.security.disasterRecovery',
        path: '/admin/security/disaster-recovery',
        permission: MenuPermissions.System.AuditLogs.View,
        platformOnly: true,
      },
      // Enterprise Governance - Phase 3
      {
        key: 'security.enterpriseGovernance',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.security.enterpriseGovernance',
        path: '/admin/governance/enterprise',
        permission: MenuPermissions.System.AuditLogs.View,
        platformOnly: true,
      },
      {
        key: 'security.featureFlags',
        icon: 'FlagIcon',
        labelKey: 'menu.security.featureFlags',
        path: '/admin/governance/feature-flags',
        permission: MenuPermissions.System.AuditLogs.View,
        platformOnly: true,
      },
      {
        key: 'security.slaMonitoring',
        icon: 'ChartBarSquareIcon',
        labelKey: 'menu.security.slaMonitoring',
        path: '/admin/governance/sla-monitoring',
        permission: MenuPermissions.System.AuditLogs.View,
        platformOnly: true,
      },
      {
        key: 'security.mfaManagement',
        icon: 'FingerPrintIcon',
        labelKey: 'menu.security.mfaManagement',
        path: '/admin/security/mfa-management',
        permission: MenuPermissions.System.AuditLogs.View,
      },
      {
        key: 'security.adminBackup',
        icon: 'CloudArrowDownIcon',
        labelKey: 'menu.security.adminBackup',
        path: '/admin/backup',
        permission: MenuPermissions.System.AuditLogs.View,
      },
    ],
  },

  // 🔔 Approvals & Workflow
  // ═══════════════════════════════════════════════════════════
  {
    key: 'approvals',
    icon: 'CheckCircleIcon',
    labelKey: 'menu.approvals',
    permission: MenuPermissions.Users.View,
    children: [
      {
        key: 'approvals.pending',
        icon: 'ClockIcon',
        labelKey: 'menu.approvals.pending',
        path: '/approvals/pending',
        permission: MenuPermissions.Users.View,
        badge: 'pendingApprovals',
      },
      {
        key: 'approvals.delegations',
        icon: 'UserGroupIcon',
        labelKey: 'menu.approvals.delegations',
        path: '/approvals/delegations',
        permission: MenuPermissions.Users.View,
      },
      {
        key: 'approvals.workflows',
        icon: 'AdjustmentsHorizontalIcon',
        labelKey: 'menu.approvals.workflows',
        path: '/admin/approval-workflows',
        permission: MenuPermissions.System.Settings.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // ⚙️ إعدادات النظام
  // ═══════════════════════════════════════════════════════════
  {
    key: 'systemSettings',
    icon: 'Cog6ToothIcon',
    labelKey: 'menu.systemSettings',
    permission: MenuPermissions.System.Settings.View,
    children: [
      {
        key: 'systemSettings.myCompanies',
        icon: 'BuildingOffice2Icon',
        labelKey: 'menu.systemSettings.myCompanies',
        path: '/settings/companies',
        permission: 'tenant_companies:view',
      },
      {
        key: 'systemSettings.baseCurrency',
        icon: 'CurrencyDollarIcon',
        labelKey: 'menu.systemSettings.baseCurrency',
        path: '/settings/base-currency',
        permission: 'settings:currency:view',
      },
      {
        key: 'systemSettings.defaultLanguage',
        icon: 'LanguageIcon',
        labelKey: 'menu.systemSettings.defaultLanguage',
        path: '/settings/default-language',
        permission: 'settings:language:view',
      },
      {
        key: 'systemSettings.dataBackup',
        icon: 'CloudArrowDownIcon',
        labelKey: 'menu.systemSettings.dataBackup',
        path: '/tenant/backup',
        permission: 'backup:view',
        tenantOnly: true,
      },
      {
        key: 'systemSettings.backup',
        icon: 'CircleStackIcon',
        labelKey: 'menu.systemSettings.backup',
        path: '/system/backup',
        permission: 'backup:view',
        platformOnly: true,
      },
      {
        key: 'systemSettings.referenceDataDashboard',
        icon: 'ChartBarIcon',
        labelKey: 'menu.systemSettings.referenceDataDashboard',
        path: '/system/reference-data-dashboard',
        permission: 'backup:view',
        platformOnly: true,
      },
      {
        key: 'systemSettings.backupSecurity',
        icon: 'ShieldExclamationIcon',
        labelKey: 'menu.systemSettings.backupSecurity',
        path: '/settings/backup-security',
        permission: 'backup:view',
        platformOnly: true,
      },
      {
        key: 'systemSettings.securityPolicies',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.systemSettings.securityPolicies',
        path: '/settings/security-policies',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
      {
        key: 'systemSettings.passwordPolicies',
        icon: 'KeyIcon',
        labelKey: 'menu.systemSettings.passwordPolicies',
        path: '/settings/password-policies',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
      {
        key: 'systemSettings.sessionSettings',
        icon: 'ClockIcon',
        labelKey: 'menu.systemSettings.sessionSettings',
        path: '/settings/sessions',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
      {
        key: 'systemSettings.auditSettings',
        icon: 'DocumentMagnifyingGlassIcon',
        labelKey: 'menu.systemSettings.auditSettings',
        path: '/settings/audit',
        permission: MenuPermissions.System.AuditLogs.View,
      },
      {
        key: 'systemSettings.notificationSettings',
        icon: 'BellIcon',
        labelKey: 'menu.systemSettings.notificationSettings',
        path: '/settings/notifications',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'systemSettings.smtpSettings',
        icon: 'EnvelopeIcon',
        labelKey: 'menu.systemSettings.smtpSettings',
        path: '/settings/smtp',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
      {
        key: 'systemSettings.smsWhatsappSettings',
        icon: 'ChatBubbleLeftIcon',
        labelKey: 'menu.systemSettings.smsWhatsappSettings',
        path: '/settings/sms-whatsapp',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
      {
        key: 'systemSettings.approvalEngine',
        icon: 'CheckCircleIcon',
        labelKey: 'menu.systemSettings.approvalEngine',
        path: '/settings/approval-engine',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'systemSettings.dualApproval',
        icon: 'UsersIcon',
        labelKey: 'menu.systemSettings.dualApproval',
        path: '/settings/dual-approval',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'systemSettings.freezeSettings',
        icon: 'LockClosedIcon',
        labelKey: 'menu.systemSettings.freezeSettings',
        path: '/settings/freeze',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'systemSettings.visibilityPolicies',
        icon: 'EyeIcon',
        labelKey: 'menu.systemSettings.visibilityPolicies',
        path: '/settings/visibility-policies',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'systemSettings.zatcaIntegration',
        icon: 'LinkIcon',
        labelKey: 'menu.systemSettings.zatcaIntegration',
        path: '/settings/zatca',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'systemSettings.smartAlerts',
        icon: 'BellAlertIcon',
        labelKey: 'menu.systemSettings.smartAlerts',
        path: '/settings/smart-alerts',
        permission: 'smart_alerts:view' as MenuPermission,
      },
      {
        key: 'systemSettings.aiIntelligence',
        icon: 'SparklesIcon',
        labelKey: 'menu.systemSettings.aiIntelligence',
        path: '/settings/ai-intelligence',
        permission: 'ai_suggestions:view' as MenuPermission,
      },
      {
        key: 'systemSettings.dataGovernance',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.systemSettings.dataGovernance',
        path: '/settings/data-governance',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
      {
        key: 'systemSettings.governanceScanner',
        icon: 'ClipboardDocumentCheckIcon',
        labelKey: 'menu.systemSettings.governanceScanner',
        path: '/settings/governance-scanner',
        permission: 'governance_scanner:view' as MenuPermission,
      },
      {
        key: 'systemSettings.branding',
        icon: 'PaintBrushIcon',
        labelKey: 'menu.systemSettings.branding',
        path: '/settings/branding',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
      {
        key: 'systemSettings.companyProfile',
        icon: 'BuildingOffice2Icon',
        labelKey: 'menu.systemSettings.companyProfile',
        path: '/settings/company-profile',
        permission: 'companies:view' as MenuPermission,
        tenantOnly: true,
      },
      {
        key: 'systemSettings.mfa',
        icon: 'FingerPrintIcon',
        labelKey: 'menu.systemSettings.mfa',
        path: '/settings/mfa',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
      {
        key: 'systemSettings.subscription',
        icon: 'CreditCardIcon',
        labelKey: 'menu.systemSettings.subscription',
        path: '/settings/subscription',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
      {
        key: 'systemSettings.modules',
        icon: 'CubeIcon',
        labelKey: 'menu.systemSettings.modules',
        path: '/settings/modules',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
      {
        key: 'systemSettings.tenant',
        icon: 'BuildingOfficeIcon',
        labelKey: 'menu.systemSettings.tenant',
        path: '/settings/tenant',
        permission: MenuPermissions.System.SystemPolicies.View,
        tenantOnly: true,
      },
      {
        key: 'systemSettings.systemSettingsPage',
        icon: 'Cog8ToothIcon',
        labelKey: 'menu.systemSettings.systemSettingsPage',
        path: '/settings/system-settings',
        permission: MenuPermissions.System.SystemPolicies.View,
        platformOnly: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🔔 إدارة التنبيهات والتذكيرات
  // ═══════════════════════════════════════════════════════════
  {
    key: 'notifications',
    icon: 'BellIcon',
    labelKey: 'menu.notifications',
    permission: MenuPermissions.Notifications.View,
    children: [
      {
        key: 'notifications.systemNotifications',
        icon: 'BellAlertIcon',
        labelKey: 'menu.notifications.systemNotifications',
        path: '/notifications',
        permission: MenuPermissions.Notifications.View,
      },
      {
        key: 'notifications.alertRules',
        icon: 'ExclamationCircleIcon',
        labelKey: 'menu.notifications.alertRules',
        path: '/settings/alerts',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'notifications.notificationSettings',
        icon: 'AdjustmentsHorizontalIcon',
        labelKey: 'menu.notifications.notificationSettings',
        path: '/settings/notification-settings',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'notifications.emailSettings',
        icon: 'EnvelopeIcon',
        labelKey: 'menu.notifications.emailSettings',
        path: '/settings/email',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'notifications.smsWhatsapp',
        icon: 'ChatBubbleLeftIcon',
        labelKey: 'menu.notifications.smsWhatsapp',
        path: '/settings/sms-whatsapp',
        permission: MenuPermissions.System.SystemPolicies.View,
      },
      {
        key: 'notifications.paymentReminders',
        icon: 'CalendarDaysIcon',
        labelKey: 'menu.notifications.paymentReminders',
        path: '/notifications/payment-reminders',
        permission: MenuPermissions.Notifications.View,
      },
      {
        key: 'notifications.renewalAlerts',
        icon: 'ArrowPathIcon',
        labelKey: 'menu.notifications.renewalAlerts',
        path: '/notifications/renewal-alerts',
        permission: MenuPermissions.Notifications.View,
      },
      {
        key: 'notifications.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.notifications.reports',
        path: '/reports/notifications',
        permission: MenuPermissions.Notifications.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🏬 إدارة المستودعات المتقدمة
  // ═══════════════════════════════════════════════════════════
  {
    key: 'advancedWarehouses',
    icon: 'BuildingStorefrontIcon',
    labelKey: 'menu.advancedWarehouses',
    permission: MenuPermissions.Warehouses.View,
    children: [
      {
        key: 'advancedWarehouses.inventoryBalances',
        icon: 'Squares2X2Icon',
        labelKey: 'menu.advancedWarehouses.inventoryBalances',
        path: '/warehouses/inventory',
        permission: MenuPermissions.Warehouses.InventoryOperations.Balances.View,
      },
      {
        key: 'advancedWarehouses.stockReceipts',
        icon: 'ArrowDownTrayIcon',
        labelKey: 'menu.advancedWarehouses.stockReceipts',
        path: '/inventory/stock-receipts',
        permission: MenuPermissions.Warehouses.InventoryOperations.Receipts.View,
      },
      {
        key: 'advancedWarehouses.stockIssues',
        icon: 'ArrowUpTrayIcon',
        labelKey: 'menu.advancedWarehouses.stockIssues',
        path: '/inventory/stock-issues',
        permission: MenuPermissions.Warehouses.InventoryOperations.Issues.View,
      },
      {
        key: 'advancedWarehouses.stockTransfers',
        icon: 'ArrowsRightLeftIcon',
        labelKey: 'menu.advancedWarehouses.stockTransfers',
        path: '/inventory/stock-transfers',
        permission: MenuPermissions.Warehouses.InventoryOperations.Transfers.View,
      },
      {
        key: 'advancedWarehouses.stockReturns',
        icon: 'ArrowUturnLeftIcon',
        labelKey: 'menu.advancedWarehouses.stockReturns',
        path: '/inventory/stock-returns',
        permission: MenuPermissions.Warehouses.InventoryOperations.Returns.View,
      },
      {
        key: 'advancedWarehouses.itemExpiry',
        icon: 'ClockIcon',
        labelKey: 'menu.advancedWarehouses.itemExpiry',
        path: '/inventory/item-expiry',
        permission: MenuPermissions.Inventory.Stock.View,
      },
      {
        key: 'advancedWarehouses.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.advancedWarehouses.reports',
        path: '/reports/warehouses',
        permission: MenuPermissions.Reports.Warehouses.View,
      },
      // Additional Warehouse Items
      {
        key: 'advancedWarehouses.warehousesList',
        icon: 'BuildingStorefrontIcon',
        labelKey: 'menu.advancedWarehouses.warehousesList',
        path: '/warehouses',
        permission: MenuPermissions.Warehouses.View,
      },
      {
        key: 'advancedWarehouses.shipmentReceiving',
        icon: 'InboxArrowDownIcon',
        labelKey: 'menu.advancedWarehouses.shipmentReceiving',
        path: '/inventory/shipment-receiving',
        permission: MenuPermissions.Logistics.ShipmentReceiving.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 📋 إدارة المشاريع والعقود
  // ═══════════════════════════════════════════════════════════
  {
    key: 'projects',
    icon: 'FolderIcon',
    labelKey: 'menu.projects',
    permission: MenuPermissions.Projects.View,
    children: [
      {
        key: 'projects.projectsList',
        icon: 'FolderOpenIcon',
        labelKey: 'menu.projects.projectsList',
        path: '/projects',
        permission: MenuPermissions.Projects.Projects.View,
      },
      {
        key: 'projects.newProject',
        icon: 'PlusCircleIcon',
        labelKey: 'menu.projects.newProject',
        path: '/projects/new',
        permission: MenuPermissions.Projects.Create,
      },
      {
        key: 'projects.projectTypes',
        icon: 'TagIcon',
        labelKey: 'menu.projects.projectTypes',
        path: '/master/project-types',
        permission: MenuPermissions.Projects.View,
      },
      {
        key: 'projects.projectPhases',
        icon: 'ListBulletIcon',
        labelKey: 'menu.projects.projectPhases',
        path: '/projects/phases',
        permission: MenuPermissions.Projects.Phases.View,
      },
      {
        key: 'projects.reports',
        icon: 'PresentationChartBarIcon',
        labelKey: 'menu.projects.reports',
        path: '/projects/reports',
        permission: 'projects:reports:view',
      },
      {
        key: 'projects.contractTypes',
        icon: 'DocumentTextIcon',
        labelKey: 'menu.projects.contractTypes',
        path: '/master/project-contract-types',
        permission: MenuPermissions.MasterData.ProjectContractTypes.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // ✨ إدارة الجودة
  // ═══════════════════════════════════════════════════════════
  {
    key: 'quality',
    icon: 'CheckBadgeIcon',
    labelKey: 'menu.quality',
    permission: MenuPermissions.Quality.View,
    children: [
      {
        key: 'quality.qualityStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.quality.qualityStatus',
        path: '/master/quality-status',
        permission: MenuPermissions.MasterData.QualityStatus.View,
      },
      {
        key: 'quality.approvedVendors',
        icon: 'CheckCircleIcon',
        labelKey: 'menu.quality.approvedVendors',
        path: '/quality/approved-vendors',
        permission: MenuPermissions.Quality.ApprovedVendors.View,
      },
      {
        key: 'quality.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.quality.reports',
        path: '/reports/quality',
        permission: MenuPermissions.Reports.Quality.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // ⚠️ إدارة المخاطر والتأمين
  // ═══════════════════════════════════════════════════════════
  {
    key: 'risks',
    icon: 'ExclamationTriangleIcon',
    labelKey: 'menu.risks',
    permission: MenuPermissions.Risks.View,
    children: [
      {
        key: 'risks.riskTypes',
        icon: 'ExclamationCircleIcon',
        labelKey: 'menu.risks.riskTypes',
        path: '/master/risk-types',
        permission: MenuPermissions.MasterData.RiskTypes.View,
      },
      {
        key: 'risks.insuranceDocuments',
        icon: 'ShieldCheckIcon',
        labelKey: 'menu.risks.insuranceDocuments',
        path: '/risks/insurance-documents',
        permission: MenuPermissions.Risks.InsuranceDocuments.View,
      },
      {
        key: 'risks.claimStatus',
        icon: 'FlagIcon',
        labelKey: 'menu.risks.claimStatus',
        path: '/master/claim-status',
        permission: MenuPermissions.MasterData.ClaimStatus.View,
      },
      {
        key: 'risks.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.risks.reports',
        path: '/reports/risks',
        permission: MenuPermissions.Reports.Risks.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 📈 إدارة التقارير والتحليلات
  // ═══════════════════════════════════════════════════════════
  {
    key: 'reportsAnalytics',
    icon: 'ChartBarIcon',
    labelKey: 'menu.reportsAnalytics',
    permission: MenuPermissions.Reports.ReferenceData.View,
    children: [
      {
        key: 'reportsAnalytics.reportTypes',
        icon: 'DocumentChartBarIcon',
        labelKey: 'menu.reportsAnalytics.reportTypes',
        path: '/master/report-types',
        permission: MenuPermissions.MasterData.ReportTypes.View,
      },
      {
        key: 'reportsAnalytics.kpis',
        icon: 'PresentationChartLineIcon',
        labelKey: 'menu.reportsAnalytics.kpis',
        path: '/reports/kpis',
        permission: MenuPermissions.Reports.ReferenceData.View,
      },
      {
        key: 'reportsAnalytics.analyticalTemplates',
        icon: 'ChartPieIcon',
        labelKey: 'menu.reportsAnalytics.analyticalTemplates',
        path: '/reports/analytical-templates',
        permission: MenuPermissions.Reports.ReferenceData.View,
      },
      {
        key: 'reportsAnalytics.mainReports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.reportsAnalytics.mainReports',
        path: '/reports',
        permission: MenuPermissions.Reports.ReferenceData.View,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 🔗 التكاملات
  // ═══════════════════════════════════════════════════════════
  {
    key: 'integrations',
    icon: 'LinkIcon',
    labelKey: 'menu.integrations',
    permission: MenuPermissions.Integrations.View,
    children: [
      {
        key: 'integrations.paymentGateways',
        icon: 'CreditCardIcon',
        labelKey: 'menu.integrations.paymentGateways',
        path: '/integrations/payment-gateways',
        permission: MenuPermissions.Integrations.PaymentGateways.View,
      },
      {
        key: 'integrations.shippingCompanies',
        icon: 'TruckIcon',
        labelKey: 'menu.integrations.shippingCompanies',
        path: '/integrations/shipping-companies',
        permission: MenuPermissions.Integrations.ShippingCompanies.View,
      },
      {
        key: 'integrations.bankIntegration',
        icon: 'BuildingLibraryIcon',
        labelKey: 'menu.integrations.bankIntegration',
        path: '/integrations/banks',
        permission: MenuPermissions.Integrations.BankIntegration.View,
      },
      {
        key: 'integrations.reports',
        icon: 'ChartBarIcon',
        labelKey: 'menu.integrations.reports',
        path: '/reports/integrations',
        permission: MenuPermissions.Integrations.View,
      },
    ],
  },
];

function defined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

function findByKey(items: MenuItemConfig[], key: string): MenuItemConfig | undefined {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children) {
      const found = findByKey(item.children, key);
      if (found) return found;
    }
  }
  return undefined;
}

function pick(legacy: MenuItemConfig[], key: string): MenuItemConfig | undefined {
  return findByKey(legacy, key);
}

/** Tag a menu item (or its children) with a module code for tenant-based filtering */
function withModule(item: MenuItemConfig | undefined, mod: string): MenuItemConfig | undefined {
  if (!item) return undefined;
  return { ...item, module: mod };
}

function section(key: string, labelKey: string, icon: string, children: Array<MenuItemConfig | undefined>): MenuItemConfig {
  return {
    key,
    labelKey,
    icon,
    children: children.filter(defined),
  };
}

/**
 * 🧭 Enterprise Menu (SAP/Oracle-style)
 * - Few main sections
 * - Deep, logical grouping
 * - Reuses existing leaf pages + permissions
 */
export const MENU_REGISTRY: MenuItemConfig[] = (() => {
  const legacy = LEGACY_MENU_REGISTRY;

  // Home
  const home = section('home', 'menu.home', 'HomeIcon', [
    pick(legacy, 'dashboard'),
    pick(legacy, 'notifications'),
  ]);

  // My Requests (طلباتي)
  const myRequests = {
    key: 'myRequests',
    labelKey: 'menu.myRequests',
    icon: 'DocumentTextIcon',
    children: [
      {
        key: 'myRequests.all',
        labelKey: 'menu.myRequests.all',
        icon: 'QueueListIcon',
        path: '/requests',
        permission: 'expense_requests:view' as MenuPermission,
      },
      {
        key: 'myRequests.expenseRequests',
        labelKey: 'menu.myRequests.expenseRequests',
        icon: 'DocumentTextIcon',
        path: '/requests?tab=expense',
        permission: 'expense_requests:view' as MenuPermission,
      },
      {
        key: 'myRequests.transferRequests',
        labelKey: 'menu.myRequests.transferRequests',
        icon: 'BanknotesIcon',
        path: '/requests?tab=transfer',
        permission: 'transfer_requests:view' as MenuPermission,
      },
      {
        key: 'myRequests.paymentRequests',
        labelKey: 'menu.myRequests.paymentRequests',
        icon: 'CreditCardIcon',
        path: '/requests?tab=payment',
        permission: 'payment_requests:view' as MenuPermission,
      },
      {
        key: 'myRequests.printed',
        labelKey: 'menu.myRequests.printed',
        icon: 'PrinterIcon',
        path: '/requests?tab=printed',
        permission: 'transfer_requests:view' as MenuPermission,
      },
      {
        key: 'myRequests.unprinted',
        labelKey: 'menu.myRequests.unprinted',
        icon: 'DocumentMinusIcon',
        path: '/requests?tab=unprinted',
        permission: 'transfer_requests:view' as MenuPermission,
      },
    ],
  };

  // General Ledger (legacy group) - keep as a top-level section for accountants
  const generalLedgerSystem = withModule(pick(legacy, 'generalLedger'), 'accounting');

  // Financials
  const generalAccounting = section('financials.generalAccounting', 'menu.financials.generalAccounting', 'BookOpenIcon', [
    pick(legacy, 'generalLedger.accounts'),
    pick(legacy, 'generalLedger.journals'),
    pick(legacy, 'generalLedger.ledgerBook'),
    {
      key: 'financials.chartOfAccounts',
      icon: 'ClipboardDocumentListIcon',
      labelKey: 'menu.generalAdmin.chartOfAccounts',
      path: '/master/chart-of-accounts',
      permission: MenuPermissions.Accounting.Accounts.View,
    },
    {
      key: 'financials.accountingRules',
      icon: 'CogIcon',
      labelKey: 'menu.financials.accountingRules',
      path: '/accounting/rules',
      permission: MenuPermissions.Accounting.Accounts.View,
    },
    {
      key: 'financials.autoPostings',
      icon: 'ArrowPathIcon',
      labelKey: 'menu.financials.autoPostings',
      path: '/accounting/auto-postings',
      permission: MenuPermissions.Accounting.Accounts.View,
    },
    pick(legacy, 'financeAccounting.costCenters'),
    pick(legacy, 'generalLedger.openingBalances'),
    pick(legacy, 'generalLedger.financialYears'),
    pick(legacy, 'financeAccounting.fiscalPeriods'),
    pick(legacy, 'generalLedger.budgets'),
  ]);

  const cashBanks = section('financials.cashBanks', 'menu.financials.cashBanks', 'BuildingLibraryIcon', [
    pick(legacy, 'generalLedger.cash'),
    pick(legacy, 'generalLedger.cashBoxes'),
    {
      key: 'financials.cashBanks.banks',
      icon: 'BuildingLibraryIcon',
      labelKey: 'menu.financeAccounting.banks',
      path: '/master/banks',
      permission: MenuPermissions.MasterData.Banks.View,
    },
    pick(legacy, 'generalLedger.bankAccounts'),
    pick(legacy, 'financeAccounting.currencies'),
    pick(legacy, 'financeAccounting.exchangeRates'),
    pick(legacy, 'financeAccounting.paymentMethods'),
    pick(legacy, 'financeAccounting.paymentTerms'),
    pick(legacy, 'generalLedger.receiptVoucher'),
    pick(legacy, 'generalLedger.paymentVoucher'),
    pick(legacy, 'generalLedger.cashDeposit'),
    pick(legacy, 'generalLedger.chequeBooks'),
    pick(legacy, 'generalLedger.chequesDue'),
    pick(legacy, 'generalLedger.bankMatching'),
    pick(legacy, 'generalLedger.bankReconciliation'),
  ]);

  const expensesRevenue = section('financials.expensesRevenue', 'menu.financials.expensesRevenue', 'ReceiptPercentIcon', [
    pick(legacy, 'generalLedger.prepaidExpenses'),
    pick(legacy, 'generalLedger.deferredRevenue'),
    pick(legacy, 'generalLedger.accruedRevenue'),
    pick(legacy, 'financeAccounting.expenseDistribution'),
  ]);

  const taxesZakat = section('financials.taxesZakat', 'menu.financials.taxesZakat', 'QrCodeIcon', [
    pick(legacy, 'taxes'),
  ]);

  const financialStatements = section('financials.financialStatements', 'menu.financials.financialStatements', 'ChartBarIcon', [
    pick(legacy, 'generalLedger.trialBalance'),
    pick(legacy, 'generalLedger.incomeStatement'),
    pick(legacy, 'generalLedger.generalLedgerReport'),
    pick(legacy, 'generalLedger.balanceSheet'),
    pick(legacy, 'generalLedger.cashFlow'),
  ]);

  const financials = section('financials', 'menu.financials', 'BanknotesIcon', [
    generalAccounting,
    cashBanks,
    expensesRevenue,
    taxesZakat,
    financialStatements,
    pick(legacy, 'financeAccounting.lettersOfCredit'),
  ]);
  financials.module = 'accounting';

  // Business Operations
  const businessOperations = section('businessOperations', 'menu.businessOperations', 'ShoppingCartIcon', [
    withModule(pick(legacy, 'sales'), 'sales'),
    withModule(pick(legacy, 'crm'), 'crm'),
    withModule(pick(legacy, 'purchasing'), 'procurement'),
  ]);

  // Inventory & Logistics
  const inventoryLogistics = section('inventoryLogistics', 'menu.inventoryLogistics', 'CubeIcon', [
    withModule(pick(legacy, 'inventory'), 'warehousing'),
    withModule(pick(legacy, 'advancedWarehouses'), 'warehousing'),
    withModule(pick(legacy, 'logistics'), 'shipments'),
    withModule(pick(legacy, 'importExport'), 'customs'),
  ]);

  // Assets & Resources
  const assetsResources = section('assetsResources', 'menu.assetsResources', 'BriefcaseIcon', [
    withModule(pick(legacy, 'fixedAssets'), 'accounting'),
    withModule(pick(legacy, 'hr'), 'hr'),
    withModule(pick(legacy, 'projects'), 'projects'),
  ]);

  // Master Data
  const masterData = section('masterDataHub', 'menu.masterDataHub', 'CircleStackIcon', [
    pick(legacy, 'organization'),
    pick(legacy, 'referenceData'),
  ]);

  // Admin & Security
  const adminSecurity = section('adminSecurity', 'menu.adminSecurity', 'ShieldCheckIcon', [
    pick(legacy, 'security'),
    withModule(pick(legacy, 'compliance'), 'customs'),
    pick(legacy, 'risks'),
  ]);

  // ═══════════════════════════════════════════════════════════
  // 🌐 Super Admin Platform (Multi-Tenant SaaS Management)
  // Only visible to super_admin role
  // ═══════════════════════════════════════════════════════════
  const superAdminPlatform: MenuItemConfig = {
    key: 'superAdminPlatform',
    labelKey: 'menu.superAdminPlatform',
    icon: 'GlobeAltIcon',
    permission: 'platform:view' as MenuPermission,
    platformOnly: true,
    children: [
      {
        key: 'superAdminPlatform.dashboard',
        labelKey: 'menu.superAdminPlatform.dashboard',
        icon: 'ChartBarSquareIcon',
        path: '/admin/platform',
        permission: 'platform:view' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.tenants',
        labelKey: 'menu.superAdminPlatform.tenants',
        icon: 'BuildingOffice2Icon',
        path: '/admin/tenants',
        permission: 'tenants:view' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.subscriptionPlans',
        labelKey: 'menu.superAdminPlatform.subscriptionPlans',
        icon: 'CreditCardIcon',
        path: '/admin/subscription-plans',
        permission: 'subscription_plans:view' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.platformUsers',
        labelKey: 'menu.superAdminPlatform.platformUsers',
        icon: 'UserGroupIcon',
        path: '/admin/platform/users',
        permission: 'platform:view' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.impersonationLogs',
        labelKey: 'menu.superAdminPlatform.impersonationLogs',
        icon: 'FingerPrintIcon',
        path: '/admin/platform/impersonation-logs',
        permission: 'impersonation_logs:view' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.platformAuditLogs',
        labelKey: 'menu.superAdminPlatform.platformAuditLogs',
        icon: 'DocumentMagnifyingGlassIcon',
        path: '/admin/platform/audit-logs',
        permission: 'platform_audit_logs:view' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.platformSettings',
        labelKey: 'menu.superAdminPlatform.platformSettings',
        icon: 'Cog8ToothIcon',
        path: '/admin/platform/settings',
        permission: 'platform:settings' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.accountRequests',
        labelKey: 'menu.superAdminPlatform.accountRequests',
        icon: 'UserPlusIcon',
        path: '/admin/account-requests',
        permission: 'account_requests:view' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.provisioning',
        labelKey: 'menu.superAdminPlatform.provisioning',
        icon: 'ServerStackIcon',
        path: '/admin/provisioning',
        permission: 'platform:view' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.monitoring',
        labelKey: 'menu.superAdminPlatform.monitoring',
        icon: 'ComputerDesktopIcon',
        path: '/admin/monitoring',
        permission: 'platform:view' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.modules',
        labelKey: 'menu.superAdminPlatform.modules',
        icon: 'CubeIcon',
        path: '/admin/modules',
        permission: 'platform:view' as MenuPermission,
      },
      {
        key: 'superAdminPlatform.superAdmins',
        labelKey: 'menu.superAdminPlatform.superAdmins',
        icon: 'ShieldCheckIcon',
        path: '/admin/super-admins',
        permission: 'platform:view' as MenuPermission,
      },
    ],
  };

  // Settings & Integrations
  const settingsIntegrations = section('settingsIntegrations', 'menu.settingsIntegrations', 'Cog6ToothIcon', [
    pick(legacy, 'systemSettings'),
    pick(legacy, 'integrations'),
  ]);

  // Reports & Analytics
  const reportsAnalyticsCenter = section('reportsAnalyticsCenter', 'menu.reportsAnalyticsCenter', 'ChartBarIcon', [
    pick(legacy, 'reportsAnalytics'),
  ]);
  reportsAnalyticsCenter.module = 'reports';

  // Intelligence Layer
  const intelligenceLayer: MenuItemConfig = {
    key: 'intelligenceLayer',
    labelKey: 'menu.intelligenceLayer',
    icon: 'SparklesIcon',
    children: [
      {
        key: 'intelligenceLayer.qualityGate',
        labelKey: 'menu.intelligenceLayer.qualityGate',
        icon: 'ShieldCheckIcon',
        path: '/admin/quality-gate',
        permission: 'quality_gate:view' as MenuPermission,
      },
      {
        key: 'intelligenceLayer.aiAccounting',
        labelKey: 'menu.intelligenceLayer.aiAccounting',
        icon: 'CpuChipIcon',
        path: '/settings/ai-accounting',
        permission: 'ai_accounting:view' as MenuPermission,
      },
      {
        key: 'intelligenceLayer.automationEngine',
        labelKey: 'menu.intelligenceLayer.automationEngine',
        icon: 'BoltIcon',
        path: '/settings/automation',
        permission: 'automation:view' as MenuPermission,
      },
      {
        key: 'intelligenceLayer.integrationHub',
        labelKey: 'menu.intelligenceLayer.integrationHub',
        icon: 'ArrowsRightLeftIcon',
        path: '/settings/integration-hub',
        permission: 'integrations:view' as MenuPermission,
      },
      {
        key: 'intelligenceLayer.featureDiscovery',
        labelKey: 'menu.intelligenceLayer.featureDiscovery',
        icon: 'MagnifyingGlassCircleIcon',
        path: '/admin/feature-discovery',
        permission: 'settings:view' as MenuPermission,
      },
      {
        key: 'intelligenceLayer.enterpriseReadiness',
        labelKey: 'menu.intelligenceLayer.enterpriseReadiness',
        icon: 'DocumentChartBarIcon',
        path: '/admin/enterprise-readiness',
        permission: 'settings:view' as MenuPermission,
      },
    ],
  };

  // E-Commerce Store
  const ecommerceStore: MenuItemConfig = {
    key: 'ecommerceStore',
    labelKey: 'menu.ecommerceStore',
    icon: 'ShoppingCartIcon',
    module: 'ecommerce',
    permission: MenuPermissions.Store.View,
    children: [
      {
        key: 'ecommerceStore.storeSettings',
        labelKey: 'menu.ecommerceStore.storeSettings',
        icon: 'Cog6ToothIcon',
        path: '/ecommerce/settings',
        permission: MenuPermissions.Store.Settings.View,
      },
      {
        key: 'ecommerceStore.products',
        labelKey: 'menu.ecommerceStore.products',
        icon: 'CubeIcon',
        path: '/ecommerce/products',
        permission: MenuPermissions.Store.Products.View,
      },
      {
        key: 'ecommerceStore.orders',
        labelKey: 'menu.ecommerceStore.orders',
        icon: 'ShoppingBagIcon',
        path: '/ecommerce/orders',
        permission: MenuPermissions.Store.Orders.View,
      },
      {
        key: 'ecommerceStore.customers',
        labelKey: 'menu.ecommerceStore.customers',
        icon: 'UserGroupIcon',
        path: '/ecommerce/customers',
        permission: MenuPermissions.Store.Customers.View,
      },
      {
        key: 'ecommerceStore.coupons',
        labelKey: 'menu.ecommerceStore.coupons',
        icon: 'TicketIcon',
        path: '/ecommerce/coupons',
        permission: MenuPermissions.Store.Coupons.View,
      },
      {
        key: 'ecommerceStore.reviews',
        labelKey: 'menu.ecommerceStore.reviews',
        icon: 'StarIcon',
        path: '/ecommerce/reviews',
        permission: MenuPermissions.Store.Reviews.View,
      },
      {
        key: 'ecommerceStore.shipping',
        labelKey: 'menu.ecommerceStore.shipping',
        icon: 'TruckIcon',
        path: '/ecommerce/shipping',
        permission: MenuPermissions.Store.Shipping.View,
      },
      {
        key: 'ecommerceStore.analytics',
        labelKey: 'menu.ecommerceStore.analytics',
        icon: 'ChartBarIcon',
        path: '/ecommerce/analytics',
        permission: MenuPermissions.Store.Analytics.View,
      },
    ],
  };

  // Multi-Vendor Marketplace
  const marketplace: MenuItemConfig = {
    key: 'marketplace',
    labelKey: 'menu.marketplace',
    icon: 'BuildingStorefrontIcon',
    module: 'marketplace',
    permission: MenuPermissions.Marketplace.View,
    children: [
      {
        key: 'marketplace.dashboard',
        labelKey: 'menu.marketplace.dashboard',
        icon: 'ChartBarIcon',
        path: '/marketplace/dashboard',
        permission: MenuPermissions.Marketplace.View,
      },
      {
        key: 'marketplace.vendors',
        labelKey: 'menu.marketplace.vendors',
        icon: 'BuildingStorefrontIcon',
        path: '/marketplace/vendors',
        permission: MenuPermissions.Marketplace.Vendors.View,
      },
      {
        key: 'marketplace.listings',
        labelKey: 'menu.marketplace.listings',
        icon: 'CubeIcon',
        path: '/marketplace/listings',
        permission: MenuPermissions.Marketplace.Listings.View,
      },
      {
        key: 'marketplace.orders',
        labelKey: 'menu.marketplace.orders',
        icon: 'ShoppingBagIcon',
        path: '/marketplace/orders',
        permission: MenuPermissions.Marketplace.Orders.View,
      },
      {
        key: 'marketplace.payouts',
        labelKey: 'menu.marketplace.payouts',
        icon: 'BanknotesIcon',
        path: '/marketplace/payouts',
        permission: MenuPermissions.Marketplace.Payouts.View,
      },
      {
        key: 'marketplace.settings',
        labelKey: 'menu.marketplace.settings',
        icon: 'Cog6ToothIcon',
        path: '/marketplace/settings',
        permission: MenuPermissions.Marketplace.Manage,
      },
    ],
  };

  // Vendor Dashboard (for marketplace vendors)
  const vendorDashboard: MenuItemConfig = {
    key: 'vendorDashboard',
    labelKey: 'menu.vendorDashboard',
    icon: 'BuildingStorefrontIcon',
    module: 'seller_dashboard',
    permission: MenuPermissions.VendorDashboard.View,
    children: [
      {
        key: 'vendorDashboard.overview',
        labelKey: 'menu.vendorDashboard.overview',
        icon: 'ChartBarIcon',
        path: '/vendor/dashboard',
        permission: MenuPermissions.VendorDashboard.View,
      },
      {
        key: 'vendorDashboard.products',
        labelKey: 'menu.vendorDashboard.products',
        icon: 'CubeIcon',
        path: '/vendor/products',
        permission: MenuPermissions.VendorDashboard.Listings.View,
      },
      {
        key: 'vendorDashboard.orders',
        labelKey: 'menu.vendorDashboard.orders',
        icon: 'ShoppingBagIcon',
        path: '/vendor/orders',
        permission: MenuPermissions.VendorDashboard.Orders.View,
      },
      {
        key: 'vendorDashboard.wallet',
        labelKey: 'menu.vendorDashboard.wallet',
        icon: 'WalletIcon',
        path: '/vendor/wallet',
        permission: MenuPermissions.VendorDashboard.Wallet.View,
      },
      {
        key: 'vendorDashboard.payouts',
        labelKey: 'menu.vendorDashboard.payouts',
        icon: 'BanknotesIcon',
        path: '/vendor/payouts',
        permission: MenuPermissions.VendorDashboard.Payouts.View,
      },
      {
        key: 'vendorDashboard.settings',
        labelKey: 'menu.vendorDashboard.settings',
        icon: 'Cog6ToothIcon',
        path: '/vendor/settings',
        permission: MenuPermissions.VendorDashboard.Settings.View,
      },
    ],
  };

  return dedupeMenuByPath(
    [
      home,
      myRequests,
      financials,
      businessOperations,
      inventoryLogistics,
      ecommerceStore,
      marketplace,
      vendorDashboard,
      assetsResources,
      masterData,
      adminSecurity,
      superAdminPlatform,
      intelligenceLayer,
      settingsIntegrations,
      reportsAnalyticsCenter,
    ].filter(defined)
  ).filter((x) => (x.children?.length || 0) > 0);
})();

export function getAllLabelKeys(): string[] {
  const keys: string[] = [];
  function extractKeys(items: MenuItemConfig[]) {
    for (const item of items) {
      keys.push(item.labelKey);
      if (item.children) extractKeys(item.children);
    }
  }
  extractKeys(MENU_REGISTRY);
  return keys;
}

export function getAllPermissions(): string[] {
  const permissions: string[] = [];
  function extractPermissions(items: MenuItemConfig[]) {
    for (const item of items) {
      if (item.permission) permissions.push(item.permission);
      if (item.children) extractPermissions(item.children);
    }
  }
  extractPermissions(MENU_REGISTRY);
  return [...new Set(permissions)];
}

// ─── Tenant Module Tree Helpers ──────────────────────────────────────────────

/** Screen node for tenant module tree display */
export interface ModuleScreenNode {
  key: string;
  labelKey: string;
  icon: string;
  path?: string;
  children?: ModuleScreenNode[];
}

/**
 * Build a map of module_code → screen tree nodes from MENU_REGISTRY.
 * Used by the tenant management page to show which screens each module includes.
 * Excludes platformOnly items.
 */
export function getModuleScreenMap(): Record<string, ModuleScreenNode[]> {
  const map: Record<string, ModuleScreenNode[]> = {};

  function toNode(item: MenuItemConfig): ModuleScreenNode | null {
    if (item.platformOnly) return null;
    const children = item.children
      ?.map(toNode)
      .filter((c): c is ModuleScreenNode => c !== null);
    if (!item.path && (!children || children.length === 0)) return null;
    return {
      key: item.key,
      labelKey: item.labelKey,
      icon: item.icon,
      path: item.path,
      ...(children && children.length > 0 ? { children } : {}),
    };
  }

  function collect(items: MenuItemConfig[]) {
    for (const item of items) {
      if (item.platformOnly) continue;
      if (item.module) {
        const node = toNode(item);
        if (node) {
          if (!map[item.module]) map[item.module] = [];
          map[item.module].push(node);
        }
      } else if (item.children) {
        collect(item.children);
      }
    }
  }

  collect(MENU_REGISTRY);
  return map;
}

/** Count total leaf screens (paths) in a node tree */
export function countModuleScreens(nodes: ModuleScreenNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.path) count++;
    if (node.children) count += countModuleScreens(node.children);
  }
  return count;
}
