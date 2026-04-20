import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import logger from './utils/logger';
import { requestLogger, apiUsageLogger, requestIdMiddleware } from './middleware/requestLogger';
import { 
  initializeSentry, 
  sentryRequestHandler, 
  sentryTracingHandler, 
  sentryErrorHandler,
  sentryContextMiddleware 
} from './utils/sentry';
import healthRouter from './routes/health';
import healthDetailedRouter from './routes/healthDetailed';
import modulesRouter from './routes/modules';
import authRouter from './routes/auth';
import mfaRouter from './routes/mfa';
import meRouter from './routes/me';
import authorizationRouter from './routes/authorization';
import passwordResetRouter from './routes/passwordReset';
import notificationsRouter from './routes/notifications';
import helpRequestsRouter from './routes/helpRequests';
import shipmentsRouter from './routes/shipments';
import companiesRouter from './routes/companies';
import brandingRouter from './routes/branding';
import branchesRouter from './routes/branches';
import entityAccessRouter from './routes/entityAccess';
import settingsRouter from './routes/settings';
import auditLogsRouter from './routes/auditLogs';
import backupSettingsRouter from './routes/backupSettings';
import deletedRecordsRouter from './routes/deletedRecords';
import recoveryLogsRouter from './routes/recoveryLogs';
import backupsRouter from './routes/backups';
import rolesRouter from './routes/roles';
import usersRouter from './routes/users';
import userCompaniesRouter from './routes/userCompanies';
import approvalWorkflowsRouter from './routes/approvalWorkflows';
import approvalRequestsRouter from './routes/approvalRequests';
import approvalDelegationsRouter from './routes/approvalDelegations';
import fieldPermissionsRouter from './routes/fieldPermissions';
import dashboardRouter from './routes/dashboard';
// Auth Enhancement — API Keys & Sessions (Architecture §2)
import apiKeysRouter from './routes/apiKeys';
import sessionsRouter from './routes/sessions';
// Schema-per-Tenant (Architecture §3)
import tenantSchemasRouter from './routes/tenantSchemas';
import { schemaRouter } from './middleware/schemaRouter';
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
// Phase 4 — Accounting & Financial System
import cashRegistersRouter from './routes/cashRegisters';
import receiptVouchersRouter from './routes/receiptVouchers';
import inventoryTransfersRouter from './routes/inventoryTransfers';
import vatReturnsRouter from './routes/vatReturns';
import zatcaSubmissionsRouter from './routes/zatcaSubmissions';
import taxRatesRouter from './routes/taxRates';
import taxCodesRouter from './routes/taxCodes';
import taxTypesRouter from './routes/taxTypes';
import taxesRouter from './routes/master/taxes';
import unitsRouter from './routes/master/units';
import masterCompaniesRouter from './routes/master/companies';
import citiesRouter from './routes/master/cities';
import warehousesRouter from './routes/master/warehouses';
import warehouseLocationsRouter from './routes/master/warehouseLocations';
import itemBarcodesRouter from './routes/master/itemBarcodes';
import warehouseTypesRouter from './routes/master/warehouseTypes';
import trackingPoliciesRouter from './routes/master/trackingPolicies';
import shipmentTypesRouter from './routes/master/shipmentTypes';
import masterContainerTypesRouter from './routes/master/containerTypes';
import masterIncotermsRouter from './routes/master/incoterms';
import masterBillOfLadingTypesRouter from './routes/master/billOfLadingTypes';
import masterInsuranceTypesRouter from './routes/master/insuranceTypes';
import masterShipmentClassificationsRouter from './routes/master/shipmentClassifications';
import costCentersRouter from './routes/master/costCenters';
import countriesRouter from './routes/master/countries';
import masterRegionsRouter from './routes/master/regions';
import currenciesRouter from './routes/master/currencies';
import masterTimezonesRouter from './routes/master/timezones';
import masterLanguagesRouter from './routes/master/languages';
import masterUiThemesRouter from './routes/master/uiThemes';
import masterContactMethodsRouter from './routes/master/contactMethods';
import masterRecordStatusesRouter from './routes/master/recordStatuses';
import masterRequestStatusesRouter from './routes/master/requestStatuses';
import masterSupplierTypesRouter from './routes/master/supplierTypes';
import masterSupplierCategoriesRouter from './routes/master/supplierCategories';
import masterAddressTypesRouter from './routes/master/addressTypes';
import masterContactTypesRouter from './routes/master/contactTypes';
import masterCustomerTypesRouter from './routes/master/customerTypes';
import masterCustomerCategoriesRouter from './routes/master/customerCategories';
import masterCustomerGroupsRouter from './routes/master/customerGroups';
import masterSupplierStatusesRouter from './routes/master/supplierStatuses';
import supplierBankAccountsRouter from './routes/master/supplierBankAccounts';
import portsAirportsRouter from './routes/master/portsAirports';
import systemSetupRouter from './routes/master/systemSetup';
import shippingCompaniesRouter from './routes/master/shippingCompanies';
import freightAgentsRouter from './routes/master/freightAgents';
import masterCustomerStatusesRouter from './routes/master/customerStatuses';
import masterPoStatusesRouter from './routes/master/poStatuses';
import masterContractStatusesRouter from './routes/master/contractStatuses';
import masterCustomsStatusesRouter from './routes/master/customsStatuses';
import masterCustomsOfficesRouter from './routes/master/customsOffices';
import masterClearanceOfficesRouter from './routes/master/clearanceOffices';
import masterHsCodesRouter from './routes/master/hsCodes';
import masterTariffsRouter from './routes/master/tariffs';
import masterZatcaCodesRouter from './routes/master/zatcaCodes';
import masterShippingMethodsRouter from './routes/master/shippingMethods';
import masterTransportCompaniesRouter from './routes/master/transportCompanies';
import masterVehicleTypesRouter from './routes/master/vehicleTypes';
import masterVehiclesRouter from './routes/master/vehicles';
import masterDriversRouter from './routes/master/drivers';
import masterTransportRoutesRouter from './routes/master/transportRoutes';
import masterInsuranceCompaniesRouter from './routes/master/insuranceCompanies';
import masterStorageLocationTypesRouter from './routes/master/storageLocationTypes';
import masterGroupTypesRouter from './routes/master/groupTypes';
import masterGroupLevelsRouter from './routes/master/groupLevels';
import masterGroupCategoriesRouter from './routes/master/groupCategories';
import masterItemTypesRouter from './routes/master/itemTypes';
import masterItemGradesRouter from './routes/master/itemGrades';
import masterCustomsDutyTypesRouter from './routes/master/customsDutyTypes';
import masterDeferredPoliciesRouter from './routes/master/deferredPolicies';
import masterPrepaidPoliciesRouter from './routes/master/prepaidPolicies';
import masterTransactionDefaultsRouter from './routes/master/transactionDefaults';
import masterItemGroupsEnterpriseRouter from './routes/master/itemGroupsEnterprise';
import masterDocumentTypesRouter from './routes/master/documentTypes';
import bulkImportRouter from './routes/master/bulkImport';
import itemsImportRouter from './routes/master/itemsImport';
import masterSupplyTermsRouter from './routes/master/supplyTerms';
import masterDeliveryTermsRouter from './routes/master/deliveryTerms';
import customersRouter from './routes/master/customers';
import vendorsRouter from './routes/master/vendors';
import itemsRouter from './routes/master/items';
import itemCategoriesRouter from './routes/master/itemCategories';
import unitTypesRouter from './routes/master/unitTypes';
import itemGroupsRouter from './routes/master/itemGroups';
import contractTypesRouter from './routes/master/contractTypes';
import harvestSchedulesRouter from './routes/master/harvestSchedules';
import masterVendorTypesRouter from './routes/master/vendorTypes';
import masterVendorClassificationsRouter from './routes/master/vendorClassifications';
import masterVendorCategoriesRouter from './routes/master/vendorCategories';
import masterVendorStatusesRouter from './routes/master/vendorStatuses';
import masterPurchaseOrderTypesRouter from './routes/master/purchaseOrderTypes';
import masterPurchaseOrderStatusesRouter from './routes/master/purchaseOrderStatuses';
import masterVendorPaymentTermsRouter from './routes/master/vendorPaymentTerms';
import masterVendorPriceListsRouter from './routes/master/vendorPriceLists';
import masterLcTypesRouter from './routes/master/lcTypes';
import stockMovementsRouter from './routes/inventory/stockMovements';
// Master Data - Group 1: System & General Settings
import numberingSeriesRouter from './routes/numberingSeries';
import systemLanguagesRouter from './routes/systemLanguages';
import systemPoliciesRouter from './routes/systemPolicies';
import inventoryRouter from './routes/inventory';
import printedTemplatesRouter from './routes/printedTemplates';
import printRenderRouter from './routes/printRender';
import digitalSignaturesRouter from './routes/digitalSignatures';
import uiThemesRouter from './routes/uiThemes';
// Settings - Company scoped
import settingsCurrenciesRouter from './routes/settings/currencies';
import settingsLanguagesRouter from './routes/settings/languages';
// Master Data - Group 2: Reference Data (Geographic & Contact)
import regionsRouter from './routes/regions';
import borderPointsRouter from './routes/borderPoints';
// timeZonesRouter removed — consolidated into master/timezones enterprise route
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
import shipmentDocumentRequirementsRouter from './routes/shipmentDocumentRequirements';
import shipmentExpenseTypesRouter from './routes/shipmentExpenseTypes';
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
// Tax & Customs Complete Module
import withholdingTaxRouter from './routes/withholdingTax';
import taxCategoriesRouter from './routes/taxCategories';
import taxExemptionsRouter from './routes/taxExemptions';
import customsFeeCategoriesRouter from './routes/customsFeeCategories';
import clearanceDocumentsRouter from './routes/clearanceDocuments';
import customsReportsRouter from './routes/reports/customsReports';
import zatcaConfigRouter from './routes/zatcaConfig';
import taxZonesRouter from './routes/master/taxZones';
import entryExitPointsRouter from './routes/master/entryExitPoints';
import shipmentExpensesRouter from './routes/shipmentExpenses';
import shipmentExpensesV2Router from './routes/shipmentExpensesV2';
import shipmentAccountingRouter from './routes/shipmentAccounting';
import shipmentEventsRouter from './routes/shipmentEvents';
// Shipment Expenses Reference Data
import insuranceCompaniesRouter from './routes/insuranceCompanies';
import clearanceOfficesRouter from './routes/clearanceOffices';
import laboratoriesRouter from './routes/laboratories';
import shippingAgentsRouter from './routes/shippingAgents';
import shippingMethodsRouter from './routes/shippingMethods';
// Shipping Domain Architecture (Phase 1)
import containerTypesRouter from './routes/containerTypes';
import shipmentContainersRouter from './routes/shipmentContainers';
import shipmentPartiesRouter from './routes/shipmentParties';
import expenseCategoriesRouter from './routes/expenseCategories';
import shipmentDocumentsRouter from './routes/shipmentDocuments';
import shipmentCostAllocationsRouter from './routes/shipmentCostAllocations';
import shipmentComplianceRouter from './routes/shipmentCompliance';
import shipmentCockpitRouter from './routes/shipmentCockpit';
import referenceDataDashboardRouter from './routes/referenceDataDashboard';
// Master Data - Group 3: Inventory Management
import batchNumbersRouter from './routes/batchNumbers';
import inventoryPoliciesRouter from './routes/inventoryPolicies';
import reorderRulesRouter from './routes/reorderRules';
import cycleCountPoliciesRouter from './routes/cycleCountPolicies';
import costElementGroupsRouter from './routes/costElementGroups';
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
import cashFlowRouter from './routes/reports/cashFlow';
// Procurement Module
import procurementRouter from './routes/procurement';
import procurementReportsRouter from './routes/procurement/reports';
import procurementDashboardRouter from './routes/procurement/dashboard';
import procurementPaymentsRouter from './routes/procurement/payments';
import procurementInvoiceNumbersRouter from './routes/procurement/invoiceNumbers';
import procurementInvoiceTypesRouter from './routes/procurement/invoiceTypes';
import procurementExpenseTypesRouter from './routes/procurement/expenseTypes';
import financePaymentTermsRouter from './routes/finance/paymentTerms';
import currencyRevaluationRouter from './routes/currencyRevaluation';
// Project Management Module
import projectsRouter from './routes/projects';
import projectPhasesRouter from './routes/projectPhases';
import projectReportsRouter from './routes/reports/projectReports';
// Approvals
import approvalsRouter from './routes/approvals';
import approvalDocumentsRouter from './routes/approvalDocuments';
// Sales Module
import salesRouter from './routes/sales';
// Requests Module (طلباتي)
import expenseTypesRouter from './routes/expenseTypes';
import expenseRequestsRouter from './routes/expenseRequests';
import transferRequestsRouter from './routes/transferRequests';
import paymentRequestsRouter from './routes/paymentRequests';
// Letters of Credit Module (الاعتمادات المستندية)
import lettersOfCreditRouter from './routes/lettersOfCredit';
// Enterprise Expenses Module (المصروفات العامة)
import generalExpensesRouter from './routes/generalExpenses';
import entityLinksRouter from './routes/entityLinks';
// Multi-Tenant SaaS Platform
import tenantsRouter from './routes/tenants';
import tenantsPublicRouter from './routes/tenantsPublic';
import platformUsersRouter from './routes/platformUsers';
import supportTicketsRouter from './routes/supportTickets';
import subscriptionPlansRouter from './routes/subscriptionPlans';
import platformRouter from './routes/platform';
import platformSettingsRouter from './routes/platformSettings';
import platformTenantRequestsRouter from './routes/platformTenantRequests';
import platformMonitoringRouter from './routes/platformMonitoring';
import platformSuperAdminsRouter from './routes/platformSuperAdmins';
import platformModulesRouter from './routes/platformModules';
import platformTenantWizardRouter from './routes/platformTenantWizard';
import platformImpersonationRouter from './routes/platformImpersonation';
import companyManagementRouter from './routes/companyManagement';
import accountRequestsRouter from './routes/accountRequests';
import userAssignmentsRouter from './routes/userAssignments';
import loginPageContentRouter from './routes/loginPageContent';
// Admin - Backup & Restore
import backupRouter from './routes/admin/backup';
import profileRouter from './routes/profile';
// Data Governance & Compliance (CRITICAL FOR PRODUCTION)
import dataGovernanceRouter from './routes/dataGovernance';
// Tenant-Specific Routes
import tenantRolesRouter from './routes/tenantRoles';
import supervisorMappingRouter from './routes/supervisorMapping';
import userCompanyRolesRouter from './routes/userCompanyRoles';
import companySwitchRouter from './routes/companySwitch';
import companySettingsRouter from './routes/companySettings';
import tenantBackupRouter from './routes/tenantBackup';
import tenantCompaniesRouter from './routes/tenantCompanies';
import onboardingRouter from './routes/onboarding';
import lookupDataRouter from './routes/lookupData';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { enforceTenantIsolation } from './middleware/tenantIsolation';
import { sanitizeTenantFromBody, protectSuperAdmin } from './middleware/goldenRules';
import { xssSanitizer, pathTraversalGuard } from './middleware/inputSanitizer';
import { resolveCompanyContext } from './middleware/resolveCompanyContext';
import { preloadCompanyScope } from './middleware/companyScopeGuard';
import { checkTenantCompanySetup } from './middleware/onboarding';
import { dataScopeInjector } from './middleware/dataScopeInjector';
import { enforceSubscriptionStatus } from './middleware/subscriptionEnforcement';
import { apiVersionRewrite, apiVersionHeader, CURRENT_API_VERSION } from './middleware/apiVersion';
import { paginationDefaults } from './middleware/paginationDefaults';
import { idleSessionGuard, csrfDefenseHeaders } from './middleware/securityHardening';
import passwordResetWorkflowRouter from './routes/passwordResetWorkflow';
import tenantNotificationsRouter from './routes/tenantNotifications';
// Enterprise Hardening - Phase 2
import disasterRecoveryRouter from './routes/disasterRecovery';
import impersonationGovernanceRouter from './routes/impersonationGovernance';
import securityMonitorRouter from './routes/securityMonitor';
import dataRetentionRouter from './routes/dataRetention';
import consolidatedReportingRouter from './routes/consolidatedReporting';

// Enterprise Governance - Phase 3
import zeroTrustSessionsRouter from './routes/zeroTrustSessions';
import auditIntegrityRouter from './routes/auditIntegrity';
import eventBusRouter from './routes/eventBusRoutes';
import tenantQuotasRouter from './routes/tenantQuotas';
import featureFlagsRouter from './routes/featureFlags';
import slaMonitoringRouter from './routes/slaMonitoring';

// Master Data Provisioning Engine
import masterDataProvisioningRouter from './routes/masterDataProvisioning';
import masterDataStrategyRouter from './routes/masterDataStrategy';
import referenceDataGovernanceRouter from './routes/referenceDataGovernance';

// Accounting Engine Services (Subledger, Accrual/Deferral, Cost Allocation, Bank Reconciliation)
import subledgerRouter from './routes/subledger';
import accrualDeferralsRouter from './routes/accrualDeferrals';
import costAllocationsRouter from './routes/costAllocations';
import bankReconciliationRouter from './routes/bankReconciliation';

// Accounting Event Bridge (wires EventBus → Accounting Engine)
import { AccountingEventBridge } from './services/accountingEventBridge';

// Intelligent ERP Evolution - AI, Compliance, Consolidation, Master Data
import aiRouter from './routes/ai';
import smartAlertsRouter from './routes/smart-alerts';
import complianceRouter from './routes/compliance';
import globalDataRouter from './routes/global-data';
import consolidationRouter from './routes/consolidation';

// Intelligence Layer - Quality Gate, AI Accounting, Integration Hub, Automation, Feature Discovery, Enterprise Readiness
import qualityGateRouter from './routes/qualityGate';
import aiAccountingEngineRouter from './routes/aiAccountingEngine';
import integrationHubRouter from './routes/integrationHub';
import automationEngineRouter from './routes/automationEngine';
import featureDiscoveryRouter from './routes/featureDiscovery';
import enterpriseReadinessRouter from './routes/enterpriseReadiness';

// Enterprise Governance Scanner - Tenant Integrity, RBAC Coverage, Data Quality, Feature Coverage
import enterpriseGovernanceScannerRouter from './routes/enterpriseGovernanceScanner';

// Enterprise Core Engines (Phase 2)
import workflowEngineRouter from './routes/workflowEngine';
import referenceIntegrityRouter from './routes/referenceIntegrity';
import auditTrailRouter from './routes/auditTrail';

// ============================================================================
// §13 — Global Platform Additions
// ============================================================================
// §13.1 Security & Trust
import ipWhitelistRouter from './routes/ipWhitelist';
import anomalyDetectionRouter from './routes/anomalyDetection';
import passwordStrengthRouter from './routes/passwordStrength';
// §13.2 UX
import globalSearchRouter from './routes/globalSearch';
import userPreferencesRouter from './routes/userPreferences';
import notificationStreamRouter from './routes/notificationStream';
import exportDataRouter from './routes/exportData';
// §13.3 Business Logic
import emailTemplatesRouter from './routes/emailTemplates';
import documentsRouter from './routes/documents';
import scheduledReportsRouter from './routes/scheduledReports';
import tenantDataExportRouter from './routes/tenantDataExport';
// §13.4 Infrastructure
import backgroundJobsRouter from './routes/backgroundJobs';
import prometheusMetricsRouter from './services/prometheusMetrics';
import { metricsCounterMiddleware } from './services/prometheusMetrics';
// §14 Development Roadmap
import roadmapRouter from './routes/roadmap';
// §15 QA Standards
import qaStandardsRouter from './routes/qaStandards';

// TEST ROUTE - DELETE AFTER VERIFYING SENTRY
import testSentryRouter from './routes/testSentry';

// E-Commerce Store Module (public-facing API)
import storeRouter from './routes/store';

// E-Commerce Admin (ERP-authenticated management of store data)
import ecommerceAdminRouter from './routes/ecommerce';

// Multi-Vendor Marketplace (admin, vendor dashboard, storefront)
import marketplaceRouter from './routes/marketplace';

const app = express();

// Initialize Sentry FIRST (before any middleware)
initializeSentry(app);

// Sentry request handler - SECOND (captures request context)
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Request ID middleware - generates/uses X-Request-ID for end-to-end tracing
app.use(requestIdMiddleware);

// Winston logging - THIRD (after Sentry context and request ID)
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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id', 'x-branch-id', 'x-tenant-id', 'x-impersonate-user-id', 'x-impersonation-reason', 'x-session-token', 'X-Request-ID', 'X-MFA-Setup-Token'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Body parsing with size limits (larger for base64 image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// §13.4.5: Prometheus-compatible request counter
// ============================================================================
app.use(metricsCounterMiddleware);

// ============================================================================
// §17 SECURITY: Path Traversal Guard — Block directory traversal attempts
// ============================================================================
app.use(pathTraversalGuard);

// ============================================================================
// §17 SECURITY: XSS Input Sanitizer — Escape HTML in request body/query
// ============================================================================
app.use(xssSanitizer);

// ============================================================================
// §12 S07: CSRF Defense Headers (Cross-Origin restrictions)
// ============================================================================
app.use(csrfDefenseHeaders);

// SECURITY: Cache-Control for API responses (prevent caching sensitive data)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// ============================================================================
// API v1 GROUPED ROUTER — §11.1 Endpoint Organization
// ============================================================================
// Mounts canonical §11.1 groups: /api/v1/platform/*, /api/v1/tenant/*,
// /api/v1/auth/*, /api/v1/public/*, /api/v1/webhooks/*.
// Must be mounted BEFORE the v1 rewrite so grouped paths are handled first.
import v1Router from './routes/v1Router';
app.use('/api/v1', v1Router);

// ============================================================================
// API VERSIONING — §11.1 Backward Compatibility Rewrite
// ============================================================================
// Rewrites /api/v1/* → /api/* so existing flat route handlers still work.
// Also strips §11.1 group prefixes (/tenant/, /public/) for routes not
// handled by the v1 grouped router above.
// Both /api/ and /api/v1/ are supported; v1 is the canonical version.
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/v1/') || req.url === '/api/v1') {
    let rewritten = req.url.replace('/api/v1', '/api');

    // §11.1 group prefix stripping for tenant/public groups
    // (platform/* and auth/* already map directly to existing /api/platform/* and /api/auth/*)
    if (rewritten.startsWith('/api/tenant/')) {
      rewritten = '/api/' + rewritten.slice('/api/tenant/'.length);
    } else if (rewritten.startsWith('/api/public/')) {
      rewritten = '/api/' + rewritten.slice('/api/public/'.length);
    }

    req.url = rewritten;
    (req as any).apiVersion = 'v1';
  }
  next();
});

// Add X-API-Version header to all API responses
app.use(apiVersionHeader);

// ============================================================================
// PAGINATION DEFAULTS — §14.1 Default: page=1, limit=20
// ============================================================================
// Parses and normalizes pagination query params for all GET requests.
app.use('/api', paginationDefaults);

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

// MFA (Two-Factor Authentication) routes
app.use('/api/auth', mfaRouter);

// Authorization & Governance routes (context, menu, modules)
app.use('/api/auth', authorizationRouter);

// API Keys & Session Management (Architecture §2)
app.use('/api/api-keys', apiKeysRouter);
app.use('/api/sessions', sessionsRouter);

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

// Deleted records & recovery logs
app.use('/api/deleted-records', deletedRecordsRouter);
app.use('/api/recovery-logs', recoveryLogsRouter);

// Backups (user-facing)
app.use('/api/backups', backupsRouter);

// Login page dynamic content (public + admin management)
app.use('/api/login-page', loginPageContentRouter);

// Public tenants endpoint (before rate limiter - used by login page)
app.use('/api/tenants/public', tenantsPublicRouter);

// Public account request submission (§5.1 #6 — no auth required)
app.use('/api/tenant-requests', platformTenantRequestsRouter);

// Account requests (public submit + admin management)
app.use('/api/account-requests', accountRequestsRouter);

// Lookup data (read-only reference data for form dropdowns - no company context needed)
app.use('/api/lookup', lookupDataRouter);

// Platform User Management (super admin only - before tenant isolation)
app.use('/api/platform/users', platformUsersRouter);
app.use('/api/platform/impersonation-logs', impersonationGovernanceRouter);

// Platform Admin Dashboard & Analytics (before tenant isolation)
import platformDashboardRouter from './routes/platformDashboard';
app.use('/api/platform', platformDashboardRouter);

// Platform Layer — Architecture §5 (before tenant isolation)
app.use('/api/platform/settings', platformSettingsRouter);
app.use('/api/platform/tenant-requests', platformTenantRequestsRouter);
app.use('/api/platform/monitoring', platformMonitoringRouter);
app.use('/api/platform/super-admins', platformSuperAdminsRouter);
app.use('/api/platform/modules', platformModulesRouter);
app.use('/api/platform/tenants/wizard', platformTenantWizardRouter);
app.use('/api/platform/impersonation', platformImpersonationRouter);

// Schema-per-Tenant Management (Architecture §3 — platform admin only)
app.use('/api/tenant-schemas', tenantSchemasRouter);

// Module Management
app.use('/api/modules', modulesRouter);

// API routes (general rate limiting)
app.use('/api', apiRateLimiter);

// ============================================================================
// §17.1.2 — TENANT BODY SANITIZER — Strip tenant_id from request bodies
// ============================================================================
// GOLDEN RULE: Never trust tenant_id from request body — always take from JWT.
// Strips tenant_id, tenantId, company_id, companyId from all POST/PUT/PATCH bodies.
app.use(sanitizeTenantFromBody);

// ============================================================================
// TENANT ISOLATION — Applied globally to all routes below
// ============================================================================
// This middleware enforces that tenant users can only access their own data.
// Platform admin users (tenant_id = null) bypass isolation.
// Must be placed AFTER authenticate and BEFORE any business routes.
app.use(enforceTenantIsolation);

// ============================================================================
// §12 S18: Idle Session Timeout — Revoke sessions inactive beyond configured limit
// ============================================================================
// Checks last_activity_at on tenant_sessions; revokes if idle > policy value.
// Must be AFTER authenticate (needs req.user.jti).
app.use(idleSessionGuard);

// ============================================================================
// §3 SCHEMA ROUTER — Resolve tenant schema for search_path routing
// ============================================================================
// Resolves the active schema name (e.g. "tenant_haj") from tenant_id in JWT.
// Sets req.tenantSchema for downstream use by dataScopeInjector → TenantPool.
// Falls back to public schema if no tenant schema is provisioned yet.
app.use(schemaRouter);

// ============================================================================
// COMPANY CONTEXT — Lightweight global resolution
// ============================================================================
// Resolves req.companyId from JWT/header/user_companies for downstream use.
// Never returns errors — silently skips if no company can be resolved.
app.use(resolveCompanyContext);

// ============================================================================
// COMPANY SCOPE PRELOADER — Loads user's assigned company IDs globally
// ============================================================================
// Populates req.userCompanyIds for all requests (cached, non-blocking).
// Enables buildCompanyScopeFilter() in any handler without per-route setup.
app.use(preloadCompanyScope);

// ============================================================================
// §1.3 STEP 6: DATA SCOPE INJECTOR — Tenant context → AsyncLocalStorage
// ============================================================================
// Sets tenant context (including tenantSchema) in AsyncLocalStorage.
// Enables TenantPool to automatically set search_path + RLS session vars
// for schema-per-tenant isolation on every database query.
app.use(dataScopeInjector);

// ============================================================================
// SUBSCRIPTION ENFORCEMENT — Block mutations on expired/cancelled plans
// ============================================================================
// Checks subscription status for tenant users on write operations.
// GET/HEAD/OPTIONS always pass through (read-only access preserved).
// Platform admins (tenant_id = null) bypass this check.
app.use(enforceSubscriptionStatus);

// ============================================================================
// §4.3 MODULE GATING — Block access to disabled modules per tenant
// ============================================================================
// Automatically resolves the module from the request path and checks
// if it's enabled for the tenant. Core modules are always enabled.
// Platform admins bypass this check.
import { autoModuleGating } from './middleware/moduleGating';
app.use(autoModuleGating);

// ============================================================================
// GLOBAL AUDIT LOG — Automatic mutation logging for all routes
// ============================================================================
// Captures ALL POST/PUT/PATCH/DELETE requests from authenticated users.
// Provides 100% audit coverage without per-route middleware.
// Deduplicates with per-route auditLog middleware (via _auditCaptured flag).
import globalAuditLog from './middleware/globalAuditLog';
app.use(globalAuditLog);

// ============================================================================
// EVENT BUS → ACCOUNTING ENGINE BRIDGE
// ============================================================================
// Wires domain events to the accounting rules engine for auto journal generation.
// Must be initialized after all middleware but before route registration.
AccountingEventBridge.initialize();

// ============================================================================
// E-COMMERCE ADMIN API — ERP-authenticated store management
// ============================================================================
app.use('/api/ecommerce', ecommerceAdminRouter);

// E-COMMERCE STORE API — Public-facing storefront (no ERP auth required)
// ============================================================================
// Store routes use their own auth (storeCustomerAuth) and do not need
// tenant isolation, module gating, or onboarding checks.
app.use('/api/store', storeRouter);

// ============================================================================
// MULTI-VENDOR MARKETPLACE API
// ============================================================================
// Marketplace storefront is public (like store routes).
// Admin & vendor dashboard routes use ERP auth internally.
app.use('/api/marketplace', marketplaceRouter);

// ============================================================================
// ONBOARDING ENFORCEMENT — Block operations until setup is complete
// ============================================================================
// Tenant users must complete company setup (branches, chart of accounts, etc.)
// before accessing business modules. Skips auth, onboarding, and profile routes.
app.use((req, res, next) => {
  const skipPaths = [
    '/api/auth/', '/api/me', '/api/profile', '/api/onboarding',
    '/api/tenant/companies', '/api/tenants/', '/api/health',
    '/api/platform/', '/api/admin/', '/api/lookup',
    '/api/password-reset-requests', '/api/tenant-notifications',
    '/api/user-companies', '/api/companies', '/api/branches',
    '/api/settings', '/api/roles', '/api/tenant-roles',
    '/api/supervisor-mapping',
    '/api/user-company-roles', '/api/company-context',
  ];
  if (skipPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  return checkTenantCompanySetup(req, res, next);
});

// Password Reset Workflow (tenant-scoped approval)
app.use('/api/password-reset-requests', passwordResetWorkflowRouter);

// Tenant-scoped Notifications
app.use('/api/tenant-notifications', tenantNotificationsRouter);

// §17.1.5 — Super Admin Protection on all user mutation routes
app.use('/api/users/:id', protectSuperAdmin);

// §1.3 — Subscription Limit Enforcement on resource creation
import { enforceUserLimit, enforceCompanyLimit } from './middleware/subscriptionEnforcement';
app.post('/api/users', enforceUserLimit);
app.post('/api/companies', enforceCompanyLimit);
app.post('/api/tenant/companies', enforceCompanyLimit);

app.use('/api/users', usersRouter);
app.use('/api/user-companies', userCompaniesRouter);
app.use('/api/approval-workflows', approvalWorkflowsRouter);
app.use('/api/approval-requests', approvalRequestsRouter);
app.use('/api/approval-delegations', approvalDelegationsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/tenant-roles', tenantRolesRouter);
app.use('/api/supervisor-mapping', supervisorMappingRouter);
app.use('/api/user-company-roles', userCompanyRolesRouter);
app.use('/api/company-context', companySwitchRouter);
app.use('/api/field-permissions', fieldPermissionsRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/companies', brandingRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/entity-access', entityAccessRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/settings/currencies', settingsCurrenciesRouter);
app.use('/api/settings/languages', settingsLanguagesRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/backup-settings', backupSettingsRouter);
app.use('/api/company-settings', companySettingsRouter);
app.use('/api/tenant-backup', tenantBackupRouter);

// Tenant Companies & Onboarding (Setup Wizard)
app.use('/api/tenant/companies', tenantCompaniesRouter);
app.use('/api/onboarding', onboardingRouter);

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
app.use('/api/finance/revaluation', currencyRevaluationRouter);

// Accounting Engine APIs - Subledger, Accrual/Deferral, Cost Allocation, Bank Reconciliation
app.use('/api/subledger', subledgerRouter);
app.use('/api/accrual-deferrals', accrualDeferralsRouter);
app.use('/api/cost-allocations', costAllocationsRouter);
app.use('/api/bank-reconciliation', bankReconciliationRouter);

// Exchange Rates API
app.use('/api/exchange-rates', exchangeRatesRouter);

// ═══════════════════════════════════════════════════════════════════════════
// Phase 4 — Accounting & Financial System Routes
// ═══════════════════════════════════════════════════════════════════════════
app.use('/api/cash-registers', cashRegistersRouter);
app.use('/api/receipt-vouchers', receiptVouchersRouter);
app.use('/api/inventory-transfers', inventoryTransfersRouter);
app.use('/api/vat-returns', vatReturnsRouter);
app.use('/api/zatca/config', zatcaConfigRouter);
app.use('/api/zatca', zatcaSubmissionsRouter);

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
app.use('/api/master/regions', masterRegionsRouter);
app.use('/api/master/currencies', currenciesRouter);
app.use('/api/master/banks', banksRouter);
app.use('/api/master/warehouses', warehousesRouter);
app.use('/api/master/warehouse-types', warehouseTypesRouter);
app.use('/api/master/tracking-policies', trackingPoliciesRouter);
app.use('/api/master/shipment-types', shipmentTypesRouter);
app.use('/api/master/container-types', masterContainerTypesRouter);
app.use('/api/master/incoterms', masterIncotermsRouter);
app.use('/api/master/bill-of-lading-types', masterBillOfLadingTypesRouter);
app.use('/api/master/insurance-types', masterInsuranceTypesRouter);
app.use('/api/master/shipping-classifications', masterShipmentClassificationsRouter);
app.use('/api/master/warehouse-locations', warehouseLocationsRouter);
app.use('/api/master/cost-centers', costCentersRouter);
app.use('/api/master/customers', customersRouter);
app.use('/api/master/vendors', vendorsRouter);
app.use('/api/master/items', itemsRouter);
app.use('/api/master/item-categories', itemCategoriesRouter);
app.use('/api/master/unit-types', unitTypesRouter);
app.use('/api/master/item-groups', masterItemGroupsEnterpriseRouter);
app.use('/api/master/bulk', bulkImportRouter);
app.use('/api/master/items-import', itemsImportRouter);
app.use('/api/master/document-types', masterDocumentTypesRouter);
app.use('/api/document-types', masterDocumentTypesRouter);
app.use('/api/master/harvest-schedules', harvestSchedulesRouter);
app.use('/api/master/timezones', masterTimezonesRouter);
app.use('/api/master/languages', masterLanguagesRouter);
app.use('/api/master/ui-themes', masterUiThemesRouter);
app.use('/api/master/contact-methods', masterContactMethodsRouter);
app.use('/api/master/record-statuses', masterRecordStatusesRouter);
app.use('/api/master/request-statuses', masterRequestStatusesRouter);
app.use('/api/master/supplier-types', masterSupplierTypesRouter);
app.use('/api/master/supplier-categories', masterSupplierCategoriesRouter);
app.use('/api/master/address-types', masterAddressTypesRouter);
app.use('/api/master/contact-types', masterContactTypesRouter);
app.use('/api/master/customer-types', masterCustomerTypesRouter);
app.use('/api/master/customer-categories', masterCustomerCategoriesRouter);
app.use('/api/master/customer-groups', masterCustomerGroupsRouter);
app.use('/api/master/customer-classifications', customerClassificationsRouter);
app.use('/api/master/supplier-statuses', masterSupplierStatusesRouter);
app.use('/api/master/supplier-bank-accounts', supplierBankAccountsRouter);
app.use('/api/master/ports-airports', portsAirportsRouter);
app.use('/api/master/system-setup', systemSetupRouter);
app.use('/api/master/shipping-companies', shippingCompaniesRouter);
app.use('/api/master/freight-agents', freightAgentsRouter);
app.use('/api/master/customer-statuses', masterCustomerStatusesRouter);
app.use('/api/master/po-statuses', masterPoStatusesRouter);
app.use('/api/master/contract-statuses', masterContractStatusesRouter);
app.use('/api/master/customs-statuses', masterCustomsStatusesRouter);
app.use('/api/master/customs-offices', masterCustomsOfficesRouter);
app.use('/api/master/clearance-offices', masterClearanceOfficesRouter);
app.use('/api/master/hs-codes', masterHsCodesRouter);
app.use('/api/master/tariffs', masterTariffsRouter);
app.use('/api/master/zatca-codes', masterZatcaCodesRouter);
app.use('/api/master/shipping-methods', masterShippingMethodsRouter);
app.use('/api/master/transport-companies', masterTransportCompaniesRouter);
app.use('/api/master/vehicle-types', masterVehicleTypesRouter);
app.use('/api/master/vehicles', masterVehiclesRouter);
app.use('/api/master/drivers', masterDriversRouter);
app.use('/api/master/transport-routes', masterTransportRoutesRouter);
app.use('/api/master/insurance-companies', masterInsuranceCompaniesRouter);
app.use('/api/master/bin-types', masterStorageLocationTypesRouter);
app.use('/api/master/group-types', masterGroupTypesRouter);
app.use('/api/master/group-levels', masterGroupLevelsRouter);
app.use('/api/master/group-categories', masterGroupCategoriesRouter);
app.use('/api/master/item-types', masterItemTypesRouter);
app.use('/api/master/item-grades', masterItemGradesRouter);
app.use('/api/master/item-barcodes', itemBarcodesRouter);
app.use('/api/master/customs-duty-types', masterCustomsDutyTypesRouter);
app.use('/api/master/supply-terms', masterSupplyTermsRouter);
app.use('/api/master/delivery-terms', masterDeliveryTermsRouter);
app.use('/api/master/payment-terms', paymentTermsRouter);
app.use('/api/master/payment-methods', paymentMethodsRouter);
app.use('/api/master/cost-element-groups', costElementGroupsRouter);
app.use('/api/master/deferred-policies', masterDeferredPoliciesRouter);
app.use('/api/master/prepaid-policies', masterPrepaidPoliciesRouter);
app.use('/api/master/transaction-defaults', masterTransactionDefaultsRouter);
app.use('/api/master/vendor-types', masterVendorTypesRouter);
app.use('/api/master/vendor-classifications', masterVendorClassificationsRouter);
app.use('/api/master/vendor-categories', masterVendorCategoriesRouter);
app.use('/api/master/vendor-statuses', masterVendorStatusesRouter);
app.use('/api/master/purchase-order-types', masterPurchaseOrderTypesRouter);
app.use('/api/master/purchase-order-statuses', masterPurchaseOrderStatusesRouter);
app.use('/api/master/vendor-payment-terms', masterVendorPaymentTermsRouter);
app.use('/api/master/vendor-price-lists', masterVendorPriceListsRouter);
app.use('/api/master/lc-types', masterLcTypesRouter);

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
app.use('/api/item-groups', masterItemGroupsEnterpriseRouter);
app.use('/api/master/contract-types', contractTypesRouter);

// Master Data - Group 1: System & General Settings
app.use('/api/numbering-series', numberingSeriesRouter);
app.use('/api/system-languages', systemLanguagesRouter);
app.use('/api/system-policies', systemPoliciesRouter);
app.use('/api/printed-templates', printedTemplatesRouter);
app.use('/api/print', printRenderRouter);
app.use('/api/digital-signatures', digitalSignaturesRouter);
app.use('/api/ui-themes', uiThemesRouter);

// Master Data - Group 2: Reference Data (Geographic & Contact)
app.use('/api/regions', regionsRouter);
app.use('/api/border-points', borderPointsRouter);
// /api/time-zones removed — use /api/master/timezones instead
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

// Tax & Customs Complete Routes
app.use('/api/withholding-tax', withholdingTaxRouter);
app.use('/api/tax-categories', taxCategoriesRouter);
app.use('/api/tax-exemptions', taxExemptionsRouter);
app.use('/api/customs-fee-categories', customsFeeCategoriesRouter);
app.use('/api/clearance-documents', clearanceDocumentsRouter);
app.use('/api/reports/customs', customsReportsRouter);
app.use('/api/master/tax-zones', taxZonesRouter);
app.use('/api/master/entry-exit-points', entryExitPointsRouter);

// Shipment Expenses Management
app.use('/api', shipmentExpensesRouter);

// Shipment Expenses V2 (Enhanced with dynamic fields)
app.use('/api/shipment-expenses', shipmentExpensesV2Router);

// Shipment Accounting Engine (P&L, closing, mapping, revenue)
app.use('/api/shipment-accounting', shipmentAccountingRouter);

// Shipment Expenses Reference Data
app.use('/api/insurance-companies', insuranceCompaniesRouter);
app.use('/api/clearance-offices', clearanceOfficesRouter);
app.use('/api/laboratories', laboratoriesRouter);
app.use('/api/shipping-agents', shippingAgentsRouter);
app.use('/api/shipping-methods', shippingMethodsRouter);

// Shipment Lifecycle (no extra namespace; frontend-aligned)
app.use('/api/shipment-lifecycle-statuses', shipmentLifecycleStatusesRouter);
app.use('/api/shipment-stages', shipmentStagesRouter);

// Shipment Event Log (no extra namespace; frontend-aligned)
app.use('/api/shipment-events', shipmentEventsRouter);

// Logistics Integration (frontend-aligned)
app.use('/api/shipment-milestones', shipmentMilestonesRouter);
app.use('/api/shipment-alert-rules', shipmentAlertRulesRouter);
app.use('/api/shipment-document-requirements', shipmentDocumentRequirementsRouter);
app.use('/api/shipment-expense-types', shipmentExpenseTypesRouter);
app.use('/api/carrier-quotes', carrierQuotesRouter);
app.use('/api/carrier-evaluations', carrierEvaluationsRouter);

// Shipments V2 (Operational)
app.use('/api/logistics-shipments', logisticsShipmentsRouter);
app.use('/api/logistics-shipment-types', logisticsShipmentTypesRouter);
app.use('/api/logistics-shipment-default-accounts', logisticsShipmentDefaultAccountsRouter);
app.use('/api/shipping-bills', shippingBillsRouter);
app.use('/api/bill-types', billTypesRouter);

// Shipping Domain Architecture (Phase 1)
app.use('/api/container-types', containerTypesRouter);
app.use('/api/shipment-containers', shipmentContainersRouter);
app.use('/api/shipment-parties', shipmentPartiesRouter);
app.use('/api/expense-categories', expenseCategoriesRouter);
app.use('/api/shipment-documents', shipmentDocumentsRouter);
app.use('/api/shipment-cost-allocations', shipmentCostAllocationsRouter);
app.use('/api/shipment-compliance', shipmentComplianceRouter);
app.use('/api/shipment-cockpit', shipmentCockpitRouter);
app.use('/api/reference-data-dashboard', referenceDataDashboardRouter);

// Master Data - Group 3: Inventory Management
app.use('/api/batch-numbers', batchNumbersRouter);
app.use('/api/inventory-policies', inventoryPoliciesRouter);
app.use('/api/reorder-rules', reorderRulesRouter);
app.use('/api/stock-limits', reorderRulesRouter);
app.use('/api/cycle-count-policies', cycleCountPoliciesRouter);
app.use('/api/cost-element-groups', costElementGroupsRouter);
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
app.use('/api/reports/cash-flow', cashFlowRouter);

// Procurement Module
app.use('/api/procurement', procurementRouter);
app.use('/api/procurement/reports', procurementReportsRouter);
app.use('/api/procurement/dashboard', procurementDashboardRouter);
app.use('/api/procurement/payments', procurementPaymentsRouter);
app.use('/api/procurement/invoices', procurementInvoiceNumbersRouter);

// Approvals
app.use('/api/approvals', approvalsRouter);
app.use('/api/approval-documents', approvalDocumentsRouter);

// Sales Module
app.use('/api/sales', salesRouter);

// Project Management Module
app.use('/api/projects', projectsRouter);
app.use('/api/project-phases', projectPhasesRouter);
app.use('/api/reports/projects', projectReportsRouter);

// Requests Module (طلباتي - My Requests)
app.use('/api/expense-types', expenseTypesRouter);
app.use('/api/expense-requests', expenseRequestsRouter);
app.use('/api/transfer-requests', transferRequestsRouter);
app.use('/api/payment-requests', paymentRequestsRouter);

// Letters of Credit Module (الاعتمادات المستندية)
app.use('/api/letters-of-credit', lettersOfCreditRouter);

// Enterprise Expenses Module (المصروفات العامة)
app.use('/api/general-expenses', generalExpensesRouter);
app.use('/api/entity-links', entityLinksRouter);

// ============================================================================
// MASTER ALIAS ROUTES - frontend calls /api/master/X but route exists at /api/X
// ============================================================================
app.use('/api/master/cycle-count-policies', cycleCountPoliciesRouter);
app.use('/api/master/reorder-rules', reorderRulesRouter);
app.use('/api/master/backup-settings', backupSettingsRouter);
app.use('/api/master/expense-categories', expenseCategoriesRouter);
app.use('/api/master/ports', portsRouter);
app.use('/api/master/expense-types', expenseTypesRouter);

// ============================================================================
// MULTI-TENANT SAAS PLATFORM APIs
// ============================================================================
// Tenant Management (Super Admin)
app.use('/api/tenants', tenantsRouter);

// Support Tickets (Tenant users + Platform admins)
app.use('/api/support-tickets', supportTicketsRouter);

// Subscription Plans (Public pricing + Admin management)
app.use('/api/subscription-plans', subscriptionPlansRouter);

// Subscription Usage (Tenant usage tracking)
import subscriptionUsageRouter from './routes/subscriptionUsage';
app.use('/api/subscription', subscriptionUsageRouter);

// Platform Admin (Super Admin Dashboard, Analytics, Health)
app.use('/api/platform', platformRouter);

// Company Management (Hierarchical structure, branches)
app.use('/api/company-management', companyManagementRouter);

// User-Company Assignments (Multi-company assignment)
app.use('/api/user-assignments', userAssignmentsRouter);

// Admin - Backup & Restore (super_admin only)
app.use('/api/admin/backup', backupRouter);

// Admin - Master Data Provisioning Engine (Global→Country→Tenant data management)
app.use('/api/admin/provisioning', masterDataProvisioningRouter);

// Admin - Master Data Strategy (Governance, Health, Isolation, Lineage)
app.use('/api/admin/master-data', masterDataStrategyRouter);

// Admin - Reference Data Governance (Coverage, Duplicates, Suggestions, Import Pipeline)
app.use('/api/admin/reference-data', referenceDataGovernanceRouter);

// Data Governance & Compliance (CRITICAL FOR PRODUCTION)
// GDPR compliance, Data ownership, Backup management, Quota tracking
app.use('/api/data-governance', dataGovernanceRouter);

// Enterprise Hardening - Phase 2
app.use('/api/disaster-recovery', disasterRecoveryRouter);
app.use('/api/impersonation', impersonationGovernanceRouter);
app.use('/api/security-monitor', securityMonitorRouter);
app.use('/api/data-retention', dataRetentionRouter);
app.use('/api/consolidated', consolidatedReportingRouter);

// Enterprise Governance - Phase 3
app.use('/api/security', zeroTrustSessionsRouter);
app.use('/api/audit-integrity', auditIntegrityRouter);
app.use('/api/events', eventBusRouter);
app.use('/api/tenant-quotas', tenantQuotasRouter);
app.use('/api/feature-flags', featureFlagsRouter);
app.use('/api/sla', slaMonitoringRouter);

// Intelligent ERP Evolution - AI, Compliance, Consolidation, Master Data
app.use('/api/ai', aiRouter);
app.use('/api/smart-alerts', smartAlertsRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/global-data', globalDataRouter);
app.use('/api/consolidation', consolidationRouter);

// Intelligence Layer - Quality Gate, AI Accounting, Automation, Integration, Discovery, Readiness
app.use('/api/quality-gate', qualityGateRouter);
app.use('/api/ai-accounting', aiAccountingEngineRouter);
app.use('/api/integration-hub', integrationHubRouter);
app.use('/api/automation', automationEngineRouter);
app.use('/api/feature-discovery', featureDiscoveryRouter);
app.use('/api/enterprise-readiness', enterpriseReadinessRouter);

// Enterprise Governance Scanner - Tenant Integrity, RBAC Coverage, Data Quality
app.use('/api/governance-scanner', enterpriseGovernanceScannerRouter);

// Enterprise Core Engines (Phase 2)
app.use('/api/workflows', workflowEngineRouter);
app.use('/api/reference-integrity', referenceIntegrityRouter);
app.use('/api/audit-trail', auditTrailRouter);

// ============================================================================
// §13 — Global Platform Additions
// ============================================================================
// §13.1 Security & Trust
app.use('/api/ip-whitelist', ipWhitelistRouter);
app.use('/api/anomaly-detection', anomalyDetectionRouter);
app.use('/api/password-strength', passwordStrengthRouter);
// §13.2 UX
app.use('/api/search', globalSearchRouter);
app.use('/api/user-preferences', userPreferencesRouter);
app.use('/api/notifications', notificationStreamRouter);
app.use('/api/export', exportDataRouter);
// §13.3 Business Logic
app.use('/api/email-templates', emailTemplatesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/scheduled-reports', scheduledReportsRouter);
app.use('/api/data-export', tenantDataExportRouter);
// §13.4 Infrastructure
app.use('/api/background-jobs', backgroundJobsRouter);
app.use('/api/metrics', prometheusMetricsRouter);

// ============================================================================
// §14 — Development Roadmap (Sprints + Tech Stack)
// ============================================================================
app.use('/api/roadmap', roadmapRouter);

// ============================================================================
// §15 — QA Standards (Testing, DoD, Branch Policies, Quality Gates)
// ============================================================================
app.use('/api/qa', qaStandardsRouter);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Sentry error handler (BEFORE custom error handler, captures 5xx errors)
app.use(sentryErrorHandler());

// Global error handler (must be last)
app.use(errorHandler);

export default app;
