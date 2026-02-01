import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import logger from './utils/logger';
import { requestLogger, apiUsageLogger } from './middleware/requestLogger';
import { 
  initializeSentry, 
  sentryRequestHandler, 
  sentryTracingHandler, 
  sentryErrorHandler,
  sentryContextMiddleware 
} from './utils/sentry';
import healthRouter from './routes/health';
import healthDetailedRouter from './routes/healthDetailed';
import authRouter from './routes/auth';
import meRouter from './routes/me';
import passwordResetRouter from './routes/passwordReset';
import notificationsRouter from './routes/notifications';
import helpRequestsRouter from './routes/helpRequests';
import shipmentsRouter from './routes/shipments';
import companiesRouter from './routes/companies';
import branchesRouter from './routes/branches';
import settingsRouter from './routes/settings';
import auditLogsRouter from './routes/auditLogs';
import backupSettingsRouter from './routes/backupSettings';
import rolesRouter from './routes/roles';
import usersRouter from './routes/users';
import fieldPermissionsRouter from './routes/fieldPermissions';
import dashboardRouter from './routes/dashboard';
// Master Data & Accounting APIs
import accountsRouter from './routes/accounts';
import journalsRouter from './routes/journals';
import accountingRulesRouter from './routes/accountingRules';
import fiscalPeriodsRouter from './routes/fiscalPeriods';
import openingBalancesRouter from './routes/openingBalances';
import budgetsRouter from './routes/budgets';
import bankAccountsRouter from './routes/bankAccounts';
import chequeBooksRouter from './routes/chequeBooks';
import cashDepositsRouter from './routes/cashDeposits';
import paymentVouchersRouter from './routes/paymentVouchers';
import banksRouter from './routes/banks';
import cashBoxesRouter from './routes/cashBoxes';
import taxRatesRouter from './routes/taxRates';
import taxCodesRouter from './routes/taxCodes';
import taxTypesRouter from './routes/taxTypes';
import taxesRouter from './routes/master/taxes';
import unitsRouter from './routes/master/units';
import masterCompaniesRouter from './routes/master/companies';
import citiesRouter from './routes/master/cities';
import warehousesRouter from './routes/master/warehouses';
import warehouseLocationsRouter from './routes/master/warehouseLocations';
import warehouseTypesRouter from './routes/master/warehouseTypes';
import costCentersRouter from './routes/master/costCenters';
import countriesRouter from './routes/master/countries';
import currenciesRouter from './routes/master/currencies';
import customersRouter from './routes/master/customers';
import vendorsRouter from './routes/master/vendors';
import itemsRouter from './routes/master/items';
import itemCategoriesRouter from './routes/master/itemCategories';
import unitTypesRouter from './routes/master/unitTypes';
import itemGroupsRouter from './routes/master/itemGroups';
import contractTypesRouter from './routes/master/contractTypes';
import harvestSchedulesRouter from './routes/master/harvestSchedules';
import stockMovementsRouter from './routes/inventory/stockMovements';
// Master Data - Group 1: System & General Settings
import numberingSeriesRouter from './routes/numberingSeries';
import systemLanguagesRouter from './routes/systemLanguages';
import systemPoliciesRouter from './routes/systemPolicies';
import inventoryRouter from './routes/inventory';
import printedTemplatesRouter from './routes/printedTemplates';
import digitalSignaturesRouter from './routes/digitalSignatures';
import uiThemesRouter from './routes/uiThemes';
// Settings - Company scoped
import settingsCurrenciesRouter from './routes/settings/currencies';
import settingsLanguagesRouter from './routes/settings/languages';
// Master Data - Group 2: Reference Data (Geographic & Contact)
import regionsRouter from './routes/regions';
import borderPointsRouter from './routes/borderPoints';
import timeZonesRouter from './routes/timeZones';
import addressTypesRouter from './routes/addressTypes';
import contactMethodsRouter from './routes/contactMethods';
// Master Data - Group 2: Enhanced Existing Entities
import countriesEnhancedRouter from './routes/countries';
import citiesEnhancedRouter from './routes/cities';
import currenciesEnhancedRouter from './routes/currencies';
import portsRouter from './routes/ports';
import customsOfficesRouter from './routes/customsOffices';
import paymentTermsRouter from './routes/paymentTerms';
import paymentMethodsRouter from './routes/paymentMethods';
import customerClassificationsRouter from './routes/customerClassifications';
import shipmentLifecycleStatusesRouter from './routes/shipmentLifecycleStatuses';
import shipmentStagesRouter from './routes/shipmentStages';
import shipmentMilestonesRouter from './routes/shipmentMilestones';
import shipmentAlertRulesRouter from './routes/shipmentAlertRules';
import carrierQuotesRouter from './routes/carrierQuotes';
import carrierEvaluationsRouter from './routes/carrierEvaluations';
import logisticsShipmentsRouter from './routes/logisticsShipments';
import logisticsShipmentTypesRouter from './routes/logisticsShipmentTypes';
import logisticsShipmentDefaultAccountsRouter from './routes/logisticsShipmentDefaultAccounts';
import shippingBillsRouter from './routes/shippingBills';
import billTypesRouter from './routes/billTypes';
// Customs Engine
import hsCodesRouter from './routes/hsCodes';
import customsTariffsRouter from './routes/customsTariffs';
import customsExemptionsRouter from './routes/customsExemptions';
import customsDutiesRouter from './routes/customsDuties';
import customsDutyCalculationRouter from './routes/customsDutyCalculation';
import customsDeclarationsRouter from './routes/customsDeclarations';
import shipmentExpensesRouter from './routes/shipmentExpenses';
import shipmentExpensesV2Router from './routes/shipmentExpensesV2';
import shipmentEventsRouter from './routes/shipmentEvents';
// Shipment Expenses Reference Data
import insuranceCompaniesRouter from './routes/insuranceCompanies';
import clearanceOfficesRouter from './routes/clearanceOffices';
import laboratoriesRouter from './routes/laboratories';
import shippingAgentsRouter from './routes/shippingAgents';
// Master Data - Group 3: Inventory Management
import batchNumbersRouter from './routes/batchNumbers';
import inventoryPoliciesRouter from './routes/inventoryPolicies';
import reorderRulesRouter from './routes/reorderRules';
import referenceDataRouter from './routes/referenceData';
// Logistics Analytics Reports
import shipmentProfitabilityReportRouter from './routes/reports/shipmentProfitability';
import costVarianceReportRouter from './routes/reports/costVariance';
import topCostSuppliersReportRouter from './routes/reports/topCostSuppliers';
import balanceSheetRouter from './routes/reports/balanceSheet';
// Finance - Financial Years
import financialYearsRouter from './routes/finance/financialYears';
import financeCostCentersRouter from './routes/finance/costCenters';
import financeProjectsRouter from './routes/finance/projects';
import financeCurrenciesRouter from './routes/finance/currencies';
import financePaymentMethodsRouter from './routes/finance/paymentMethods';
import financeBankAccountsRouter from './routes/finance/bankAccounts';
import financeCashBoxesRouter from './routes/finance/cashBoxes';
import exchangeRatesRouter from './routes/exchangeRates';
import inventoryWarehousesRouter from './routes/inventory/warehouses';
import trialBalanceRouter from './routes/reports/trialBalance';
import generalLedgerRouter from './routes/reports/generalLedger';
import incomeStatementRouter from './routes/reports/incomeStatement';
// Procurement Module
import procurementRouter from './routes/procurement';
import procurementReportsRouter from './routes/procurement/reports';
import procurementDashboardRouter from './routes/procurement/dashboard';
import procurementPaymentsRouter from './routes/procurement/payments';
import procurementInvoiceNumbersRouter from './routes/procurement/invoiceNumbers';
import procurementInvoiceTypesRouter from './routes/procurement/invoiceTypes';
import procurementExpenseTypesRouter from './routes/procurement/expenseTypes';
import financePaymentTermsRouter from './routes/finance/paymentTerms';
// Project Management Module
import projectsRouter from './routes/projects';
// Approvals
import approvalsRouter from './routes/approvals';
// Sales Module
import salesRouter from './routes/sales';
// Requests Module (طلباتي)
import expenseTypesRouter from './routes/expenseTypes';
import expenseRequestsRouter from './routes/expenseRequests';
import transferRequestsRouter from './routes/transferRequests';
import paymentRequestsRouter from './routes/paymentRequests';
// Letters of Credit Module (الاعتمادات المستندية)
import lettersOfCreditRouter from './routes/lettersOfCredit';
// Admin - Backup & Restore
import backupRouter from './routes/admin/backup';
import profileRouter from './routes/profile';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// TEST ROUTE - DELETE AFTER VERIFYING SENTRY
import testSentryRouter from './routes/testSentry';

const app = express();

// Initialize Sentry FIRST (before any middleware)
initializeSentry(app);

// Sentry request handler - SECOND (captures request context)
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Winston logging - THIRD (after Sentry context)
app.use(requestLogger);
app.use(apiUsageLogger);

logger.info('🚀 Application starting...', {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: config.PORT,
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:4000"],
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// CORS - restrict to known origins in production
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id']
}));

// Body parsing with size limits (larger for base64 image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (logos, etc.) with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Health check (no rate limiting)
app.use('/api/health', healthRouter);

// Detailed health check (no auth, used by load balancers/monitoring)
app.use('/api/health/detailed', healthDetailedRouter);

// Authentication routes (strict rate limiting)
app.use('/api/auth', authRouter);

// Me endpoint (no rate limiting - frequently called)
app.use('/api/me', meRouter);

// Sentry context middleware (AFTER authentication, captures user/company context)
app.use(sentryContextMiddleware);

// Password reset routes (rate limiting handled per endpoint)
app.use('/api/password-reset', passwordResetRouter);

// Dashboard routes (before rate limiter for better dev experience)
app.use('/api/dashboard', dashboardRouter);

// Notifications routes (before rate limiter)
app.use('/api/notifications', notificationsRouter);

// Help requests routes (authenticated users)
app.use('/api/help-requests', helpRequestsRouter);

// API routes (general rate limiting)
app.use('/api', apiRateLimiter);

app.use('/api/users', usersRouter);
app.use('/api/profile', profileRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/field-permissions', fieldPermissionsRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/settings/currencies', settingsCurrenciesRouter);
app.use('/api/settings/languages', settingsLanguagesRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/backup-settings', backupSettingsRouter);

// Master Data & Accounting APIs
app.use('/api/accounts', accountsRouter);
app.use('/api/journals', journalsRouter);
app.use('/api/accounting-rules', accountingRulesRouter);
app.use('/api/fiscal-periods', fiscalPeriodsRouter);
app.use('/api/financial-years', financialYearsRouter);
app.use('/api/opening-balances', openingBalancesRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/banks', banksRouter);
app.use('/api/bank-accounts', bankAccountsRouter);
app.use('/api/cash-boxes', cashBoxesRouter);
app.use('/api/cheque-books', chequeBooksRouter);
app.use('/api/cash-deposits', cashDepositsRouter);
app.use('/api/payment-vouchers', paymentVouchersRouter);
app.use('/api/tax-rates', taxRatesRouter);
app.use('/api/tax-codes', taxCodesRouter);
app.use('/api/tax-types', taxTypesRouter);

// Inventory APIs
app.use('/api/inventory', inventoryRouter);

// Finance Module - New endpoints
app.use('/api/finance/cost-centers', financeCostCentersRouter);
app.use('/api/finance/projects', financeProjectsRouter);
app.use('/api/finance/currencies', financeCurrenciesRouter);
app.use('/api/finance/payment-methods', financePaymentMethodsRouter);
app.use('/api/finance/payment-terms', financePaymentTermsRouter);
app.use('/api/finance/bank-accounts', financeBankAccountsRouter);
app.use('/api/finance/cash-boxes', financeCashBoxesRouter);

// Exchange Rates API
app.use('/api/exchange-rates', exchangeRatesRouter);

// Inventory Module - New endpoints
app.use('/api/inventory/warehouses', inventoryWarehousesRouter);

// Procurement Module - Master Data
app.use('/api/procurement/invoice-types', procurementInvoiceTypesRouter);
app.use('/api/procurement/expense-types', procurementExpenseTypesRouter);
app.use('/api/procurement/invoices', procurementInvoiceNumbersRouter);

// Master Data - Primary routes (with /master prefix)
app.use('/api/master/companies', masterCompaniesRouter);
app.use('/api/master/taxes', taxesRouter);
app.use('/api/master/units', unitsRouter);
app.use('/api/master/cities', citiesRouter);
app.use('/api/master/countries', countriesRouter);
app.use('/api/master/currencies', currenciesRouter);
app.use('/api/master/banks', banksRouter);
app.use('/api/master/warehouses', warehousesRouter);
app.use('/api/master/warehouse-types', warehouseTypesRouter);
app.use('/api/master/warehouse-locations', warehouseLocationsRouter);
app.use('/api/master/cost-centers', costCentersRouter);
app.use('/api/master/customers', customersRouter);
app.use('/api/master/vendors', vendorsRouter);
app.use('/api/master/items', itemsRouter);
app.use('/api/master/item-categories', itemCategoriesRouter);
app.use('/api/master/unit-types', unitTypesRouter);
app.use('/api/master/item-groups', itemGroupsRouter);
app.use('/api/master/harvest-schedules', harvestSchedulesRouter);

// Inventory - Stock Management
app.use('/api/inventory/stock-movements', stockMovementsRouter);

// Master Data - Alias routes (without /master prefix for backward compatibility)
app.use('/api/taxes', taxesRouter);
app.use('/api/units', unitsRouter);
app.use('/api/cities', citiesRouter);
app.use('/api/countries', countriesRouter);
app.use('/api/currencies', currenciesRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/warehouse-types', warehouseTypesRouter);
app.use('/api/warehouse-locations', warehouseLocationsRouter);
app.use('/api/cost-centers', costCentersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/item-categories', itemCategoriesRouter);
app.use('/api/unit-types', unitTypesRouter);
app.use('/api/item-groups', itemGroupsRouter);
app.use('/api/contract-types', contractTypesRouter);

// Master Data - Group 1: System & General Settings
app.use('/api/numbering-series', numberingSeriesRouter);
app.use('/api/system-languages', systemLanguagesRouter);
app.use('/api/system-policies', systemPoliciesRouter);
app.use('/api/printed-templates', printedTemplatesRouter);
app.use('/api/digital-signatures', digitalSignaturesRouter);
app.use('/api/ui-themes', uiThemesRouter);

// Master Data - Group 2: Reference Data (Geographic & Contact)
app.use('/api/regions', regionsRouter);
app.use('/api/border-points', borderPointsRouter);
app.use('/api/time-zones', timeZonesRouter);
app.use('/api/address-types', addressTypesRouter);
app.use('/api/contact-methods', contactMethodsRouter);

// Master Data - Group 2: Enhanced Existing Entities
app.use('/api/countries-enhanced', countriesEnhancedRouter);
app.use('/api/cities-enhanced', citiesEnhancedRouter);
app.use('/api/currencies-enhanced', currenciesEnhancedRouter);
app.use('/api/ports', portsRouter);
app.use('/api/customs-offices', customsOfficesRouter);
app.use('/api/payment-terms', paymentTermsRouter);
app.use('/api/payment-methods', paymentMethodsRouter);

// Customer Classifications (frontend-aligned)
app.use('/api/customer-classifications', customerClassificationsRouter);

// Customs Engine (no extra namespace; frontend-aligned)
app.use('/api/hs-codes', hsCodesRouter);
app.use('/api/customs-tariffs', customsTariffsRouter);
app.use('/api/customs-exemptions', customsExemptionsRouter);
app.use('/api/customs-duties', customsDutiesRouter);
app.use('/api/customs-duty-calculation', customsDutyCalculationRouter);

// Customs Declarations Module
app.use('/api/customs-declarations', customsDeclarationsRouter);

// Shipment Expenses Management
app.use('/api', shipmentExpensesRouter);

// Shipment Expenses V2 (Enhanced with dynamic fields)
app.use('/api/shipment-expenses', shipmentExpensesV2Router);

// Shipment Expenses Reference Data
app.use('/api/insurance-companies', insuranceCompaniesRouter);
app.use('/api/clearance-offices', clearanceOfficesRouter);
app.use('/api/laboratories', laboratoriesRouter);
app.use('/api/shipping-agents', shippingAgentsRouter);

// Shipment Lifecycle (no extra namespace; frontend-aligned)
app.use('/api/shipment-lifecycle-statuses', shipmentLifecycleStatusesRouter);
app.use('/api/shipment-stages', shipmentStagesRouter);

// Shipment Event Log (no extra namespace; frontend-aligned)
app.use('/api/shipment-events', shipmentEventsRouter);

// Logistics Integration (frontend-aligned)
app.use('/api/shipment-milestones', shipmentMilestonesRouter);
app.use('/api/shipment-alert-rules', shipmentAlertRulesRouter);
app.use('/api/carrier-quotes', carrierQuotesRouter);
app.use('/api/carrier-evaluations', carrierEvaluationsRouter);

// Shipments V2 (Operational)
app.use('/api/logistics-shipments', logisticsShipmentsRouter);
app.use('/api/logistics-shipment-types', logisticsShipmentTypesRouter);
app.use('/api/logistics-shipment-default-accounts', logisticsShipmentDefaultAccountsRouter);
app.use('/api/shipping-bills', shippingBillsRouter);
app.use('/api/bill-types', billTypesRouter);

// Master Data - Group 3: Inventory Management
app.use('/api/batch-numbers', batchNumbersRouter);
app.use('/api/inventory-policies', inventoryPoliciesRouter);
app.use('/api/reorder-rules', reorderRulesRouter);
app.use('/api/stock-limits', reorderRulesRouter);
app.use('/api/reference-data', referenceDataRouter);

// Logistics Analytics Reports
app.use('/api/reports/shipment-profitability', shipmentProfitabilityReportRouter);
app.use('/api/reports/cost-variance', costVarianceReportRouter);
app.use('/api/reports/top-cost-suppliers', topCostSuppliersReportRouter);

// TEST ROUTES - DELETE AFTER VERIFYING SENTRY WORKS
app.use('/api/test/sentry', testSentryRouter);

app.use('/api/reports/trial-balance', trialBalanceRouter);
app.use('/api/reports/general-ledger', generalLedgerRouter);
app.use('/api/reports/income-statement', incomeStatementRouter);
app.use('/api/reports/balance-sheet', balanceSheetRouter);

// Procurement Module
app.use('/api/procurement', procurementRouter);
app.use('/api/procurement/reports', procurementReportsRouter);
app.use('/api/procurement/dashboard', procurementDashboardRouter);
app.use('/api/procurement/payments', procurementPaymentsRouter);
app.use('/api/procurement/invoices', procurementInvoiceNumbersRouter);

// Approvals
app.use('/api/approvals', approvalsRouter);

// Sales Module
app.use('/api/sales', salesRouter);

// Project Management Module
app.use('/api/projects', projectsRouter);

// Requests Module (طلباتي - My Requests)
app.use('/api/expense-types', expenseTypesRouter);
app.use('/api/expense-requests', expenseRequestsRouter);
app.use('/api/transfer-requests', transferRequestsRouter);
app.use('/api/payment-requests', paymentRequestsRouter);

// Letters of Credit Module (الاعتمادات المستندية)
app.use('/api/letters-of-credit', lettersOfCreditRouter);

// Admin - Backup & Restore (super_admin only)
app.use('/api/admin/backup', backupRouter);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Sentry error handler (BEFORE custom error handler, captures 5xx errors)
app.use(sentryErrorHandler());

// Global error handler (must be last)
app.use(errorHandler);

export default app;
