# PowerShell script to add withPermission wrapper to all pages missing it
# Usage: .\add-permissions-to-pages.ps1

$frontendPath = "c:\projects\slms\frontend-next\pages"

# Define permission mappings for each page category
$permissionMappings = @{
    # Accounting
    "accounting/accrued-revenue.tsx" = "MenuPermissions.Accounting.AccruedRevenue.View"
    "accounting/bank-matching.tsx" = "MenuPermissions.Accounting.BankReconciliation.View"
    "accounting/bank-reconciliation.tsx" = "MenuPermissions.Accounting.BankReconciliation.View"
    "accounting/cash-deposit.tsx" = "MenuPermissions.Accounting.CashDeposit.View"
    "accounting/cash-inventory.tsx" = "MenuPermissions.Accounting.CashInventory.View"
    "accounting/cash-ledger.tsx" = "MenuPermissions.Accounting.CashLedger.View"
    "accounting/cheques-due.tsx" = "MenuPermissions.Accounting.ChequesDue.View"
    "accounting/credit-notes.tsx" = "MenuPermissions.Accounting.CreditNotes.View"
    "accounting/customers-ledger.tsx" = "MenuPermissions.Accounting.CustomersLedger.View"
    "accounting/debit-notes.tsx" = "MenuPermissions.Accounting.DebitNotes.View"
    "accounting/default-accounts.tsx" = "MenuPermissions.Accounting.DefaultAccounts.View"
    "accounting/deferred-revenue.tsx" = "MenuPermissions.Accounting.DeferredRevenue.View"
    "accounting/inventory-ledger.tsx" = "MenuPermissions.Accounting.InventoryLedger.View"
    "accounting/payment-voucher.tsx" = "MenuPermissions.Accounting.PaymentVoucher.View"
    "accounting/prepaid-expenses.tsx" = "MenuPermissions.Accounting.PrepaidExpenses.View"
    "accounting/receipt-voucher.tsx" = "MenuPermissions.Accounting.ReceiptVoucher.View"
    "accounting/shipment-closing.tsx" = "MenuPermissions.Accounting.ShipmentClosing.View"
    "accounting/shipment-default-accounts.tsx" = "MenuPermissions.Accounting.DefaultAccounts.View"
    "accounting/shipment-journal-links.tsx" = "MenuPermissions.Accounting.JournalLinks.View"
    "accounting/suppliers-ledger.tsx" = "MenuPermissions.Accounting.SuppliersLedger.View"
    "accounting/reports/cash-flow.tsx" = "MenuPermissions.Accounting.Reports.CashFlow.View"

    # Admin
    "admin/button-permissions.tsx" = "MenuPermissions.System.Permissions.View"
    "admin/field-permissions.tsx" = "MenuPermissions.System.Permissions.View"
    "admin/help-requests.tsx" = "MenuPermissions.System.HelpRequests.View"
    "admin/permissions-demo.tsx" = "MenuPermissions.System.Permissions.View"
    "admin/security/login-history.tsx" = "MenuPermissions.System.AuditLogs.View"

    # Approvals
    "approvals/index.tsx" = "'approvals:view'"
    "approvals/pending.tsx" = "'approvals:view'"

    # Assets
    "assets/depreciation-schedules.tsx" = "'assets:depreciation:view'"
    "assets/fixed-assets.tsx" = "'assets:fixed:view'"
    "assets/maintenance-contracts.tsx" = "'assets:maintenance:view'"

    # Compliance
    "compliance/conformity-certificates.tsx" = "'compliance:conformity:view'"
    "compliance/licenses.tsx" = "'compliance:licenses:view'"
    "compliance/origin-certificates.tsx" = "'compliance:origin:view'"
    "compliance/regulations.tsx" = "'compliance:regulations:view'"

    # Customs
    "customs/clearance-documents.tsx" = "MenuPermissions.Customs.Declarations.View"
    "customs/customs-exemptions.tsx" = "MenuPermissions.Logistics.CustomsExemptions.View"
    "customs/duty-calculation.tsx" = "MenuPermissions.Logistics.DutyCalculation.View"
    "customs/hs-codes.tsx" = "MenuPermissions.Logistics.HSCodes.View"
    "customs/tariff-rates.tsx" = "MenuPermissions.Logistics.CustomsTariffs.View"
    "customs/declarations/create.tsx" = "MenuPermissions.Customs.Declarations.Create"
    "customs/declarations/index.tsx" = "MenuPermissions.Customs.Declarations.View"

    # Documents
    "documents/letter-of-credit.tsx" = "'documents:lc:view'"
    "documents/warranty.tsx" = "'documents:warranty:view'"

    # Finance
    "finance/lc-alerts.tsx" = "'finance:lc:view'"
    "finance/lc-types.tsx" = "'finance:lc:view'"
    "finance/letters-of-credit/create.tsx" = "'finance:lc:create'"
    "finance/letters-of-credit/index.tsx" = "'finance:lc:view'"
    "finance/transfer-requests/create.tsx" = "'finance:transfers:create'"
    "finance/transfer-requests/index.tsx" = "'finance:transfers:view'"
    "finance/vendor-payments/create.tsx" = "MenuPermissions.Procurement.Payments.Create"
    "finance/vendor-payments/index.tsx" = "MenuPermissions.Procurement.Payments.View"

    # HR
    "hr/advances.tsx" = "'hr:advances:view'"
    "hr/employees.tsx" = "MenuPermissions.HR.View"
    "hr/expenses.tsx" = "'hr:expenses:view'"
    "hr/salaries.tsx" = "MenuPermissions.HR.Payroll.View"

    # Integrations
    "integrations/banks.tsx" = "'integrations:banks:view'"
    "integrations/payment-gateways.tsx" = "'integrations:payment_gateways:view'"
    "integrations/shipping-companies.tsx" = "'integrations:shipping:view'"

    # Inventory
    "inventory/item-expiry.tsx" = "MenuPermissions.Warehouses.InventoryOperations.View"
    "inventory/shipment-receiving.tsx" = "MenuPermissions.Warehouses.InventoryOperations.Receipts.View"

    # Master Data - Sample mappings (need to add all 85)
    "master/address-types.tsx" = "MenuPermissions.MasterData.AddressTypes.View"
    "master/banks.tsx" = "MenuPermissions.MasterData.Banks.View"
    "master/branches.tsx" = "MenuPermissions.System.Branches.View"
    "master/companies.tsx" = "MenuPermissions.System.Companies.View"
    "master/customer-groups.tsx" = "MenuPermissions.MasterData.CustomerGroups.View"
    "master/exchange-rates.tsx" = "MenuPermissions.MasterData.ExchangeRates.View"
    "master/languages.tsx" = "MenuPermissions.System.Languages.View"
    "master/numbering-series.tsx" = "MenuPermissions.MasterData.NumberingSeries.View"
    "master/payment-terms.tsx" = "MenuPermissions.MasterData.PaymentTerms.View"
    "master/permissions.tsx" = "MenuPermissions.System.Permissions.View"
    "master/ports.tsx" = "MenuPermissions.Logistics.Ports.View"
    "master/regions.tsx" = "MenuPermissions.MasterData.Regions.View"
    "master/roles.tsx" = "MenuPermissions.Roles.View"
    "master/users.tsx" = "MenuPermissions.Users.View"
    "master/shipment-types.tsx" = "MenuPermissions.Logistics.ShipmentTypes.View"
    "master/shipping-methods.tsx" = "MenuPermissions.Logistics.ShippingLines.View"

    # Notifications
    "notifications/payment-reminders.tsx" = "MenuPermissions.Notifications.View"
    "notifications/renewal-alerts.tsx" = "MenuPermissions.Notifications.View"

    # Procurement
    "procurement/payments/index.tsx" = "MenuPermissions.Procurement.Payments.View"
    "procurement/payments/new.tsx" = "MenuPermissions.Procurement.Payments.Create"
    "procurement/vendor-payments/create.tsx" = "MenuPermissions.Procurement.Payments.Create"

    # Projects
    "projects/create.tsx" = "MenuPermissions.Projects.Create"
    "projects/index.tsx" = "MenuPermissions.Projects.View"
    "projects/new.tsx" = "MenuPermissions.Projects.Create"
    "projects/phases.tsx" = "MenuPermissions.Projects.Phases.View"

    # Purchasing
    "purchasing/vendor-credit-limits.tsx" = "'purchasing:credit_limits:view'"
    "purchasing/vendor-price-lists.tsx" = "'purchasing:price_lists:view'"
    "purchasing/invoices/new.tsx" = "MenuPermissions.Procurement.PurchaseInvoices.Create"

    # Quality
    "quality/approved-vendors.tsx" = "MenuPermissions.Quality.ApprovedVendors.View"

    # Reports
    "reports/index.tsx" = "MenuPermissions.Reports.ReferenceData.View"
    "reports/compliance.tsx" = "'reports:compliance:view'"
    "reports/cost-variance.tsx" = "MenuPermissions.Reports.CostVariance.View"
    "reports/costs-pricing.tsx" = "'reports:costs_pricing:view'"
    "reports/customs.tsx" = "'reports:customs:view'"
    "reports/general.tsx" = "'reports:general:view'"
    "reports/hr.tsx" = "'reports:hr:view'"
    "reports/integrations.tsx" = "'reports:integrations:view'"
    "reports/item-landed-cost.tsx" = "MenuPermissions.Reports.ItemLandedCost.View"
    "reports/kpis.tsx" = "'reports:kpis:view'"
    "reports/notifications.tsx" = "'reports:notifications:view'"
    "reports/purchasing.tsx" = "'reports:purchasing:view'"
    "reports/quality.tsx" = "MenuPermissions.Reports.Quality.View"
    "reports/reference-data.tsx" = "MenuPermissions.Reports.ReferenceData.View"
    "reports/risks.tsx" = "MenuPermissions.Reports.Risks.View"
    "reports/security.tsx" = "MenuPermissions.Reports.Security.View"
    "reports/shipment-costs.tsx" = "MenuPermissions.Reports.ShipmentCosts.View"
    "reports/shipment-delays.tsx" = "MenuPermissions.Reports.ShipmentDelays.View"
    "reports/shipment-profitability.tsx" = "MenuPermissions.Reports.ShipmentProfitability.View"
    "reports/top-cost-suppliers.tsx" = "MenuPermissions.Reports.TopCostSuppliers.View"
    "reports/warehouses.tsx" = "MenuPermissions.Reports.Warehouses.View"
    "reports/analytical-templates.tsx" = "'reports:analytical:view'"

    # Requests
    "requests/index.tsx" = "'requests:view'"

    # Risks
    "risks/insurance-documents.tsx" = "MenuPermissions.Risks.InsuranceDocuments.View"

    # Roles
    "roles/index.tsx" = "MenuPermissions.Roles.View"

    # Settings
    "settings/index.tsx" = "MenuPermissions.System.Settings.View"
    "settings/notification-settings.tsx" = "MenuPermissions.Notifications.Manage"
    "settings/security-policies.tsx" = "MenuPermissions.System.SystemPolicies.View"

    # Shipments
    "shipments/alert-rules.tsx" = "MenuPermissions.Logistics.ShipmentAlerts.View"
    "shipments/alerts.tsx" = "MenuPermissions.Logistics.ShipmentAlerts.View"
    "shipments/cost-types.tsx" = "'shipments:cost_types:view'"
    "shipments/document-requirements.tsx" = "'shipments:documents:view'"
    "shipments/events.tsx" = "MenuPermissions.Logistics.ShipmentEventLog.View"
    "shipments/landed-cost-allocation.tsx" = "'shipments:landed_cost:view'"
    "shipments/landed-cost-settings.tsx" = "'shipments:landed_cost:view'"
    "shipments/milestones.tsx" = "'shipments:milestones:view'"
    "shipments/stages.tsx" = "MenuPermissions.Logistics.ShipmentStages.View"
    "shipments/statuses.tsx" = "MenuPermissions.Logistics.ShipmentLifecycleStatuses.View"

    # Shipping
    "shipping/bill-of-lading.tsx" = "'shipping:bill_of_lading:view'"
    "shipping/carrier-evaluations.tsx" = "MenuPermissions.Logistics.CarrierEvaluations.View"
    "shipping/carrier-quotes.tsx" = "MenuPermissions.Logistics.CarrierQuotes.View"
    "shipping/contracts.tsx" = "'shipping:contracts:view'"
    "shipping/documents.tsx" = "'shipping:documents:view'"
    "shipping/insurance.tsx" = "'shipping:insurance:view'"
    "shipping/schedules.tsx" = "'shipping:schedules:view'"

    # Shipping Bills
    "shipping-bills/create.tsx" = "'shipping_bills:create'"

    # System
    "system/backup.tsx" = "MenuPermissions.System.BackupSettings.View"

    # Root Pages
    "help.tsx" = "'help:view'"
    "me.tsx" = "'profile:view'"
    "notifications.tsx" = "MenuPermissions.Notifications.View"
    "profile.tsx" = "'profile:view'"
}

Write-Host "Starting permission wrapper addition..." -ForegroundColor Cyan
Write-Host "Found $($permissionMappings.Count) pages to process" -ForegroundColor Yellow

$processed = 0
$skipped = 0
$errors = 0

foreach ($page in $permissionMappings.Keys) {
    $filePath = Join-Path $frontendPath $page
    
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP: $page (file not found)" -ForegroundColor Yellow
        $skipped++
        continue
    }

    $content = Get-Content $filePath -Raw
    
    # Check if already has withPermission
    if ($content -match "withPermission") {
        Write-Host "SKIP: $page (already has withPermission)" -ForegroundColor Gray
        $skipped++
        continue
    }

    $permission = $permissionMappings[$page]
    
    # Determine import path depth
    $depth = ($page -split '/').Count - 1
    $importPath = "../" * $depth
    if ($depth -eq 0) { $importPath = "./" }
    
    try {
        # Add imports after first import block
        $importBlock = "import { withPermission } from '${importPath}utils/withPermission';`nimport { MenuPermissions } from '${importPath}config/menu.permissions';"
        
        # Find first import and add after it
        if ($content -match "^(import .+?;)") {
            $firstImport = $Matches[1]
            $content = $content.Replace($firstImport, "$firstImport`n$importBlock")
        }

        # Change "export default function XxxPage()" to "function XxxPage()"
        if ($content -match "export default function (\w+)\s*\(") {
            $funcName = $Matches[1]
            $content = $content -replace "export default function $funcName\s*\(", "function $funcName("
            
            # Add export at the end
            $content = $content.TrimEnd()
            $content = $content + "`n`nexport default withPermission($permission, $funcName);`n"
        }

        Set-Content $filePath -Value $content -NoNewline
        Write-Host "OK: $page" -ForegroundColor Green
        $processed++
    }
    catch {
        Write-Host "ERROR: $page - $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Processed: $processed" -ForegroundColor Green
Write-Host "  Skipped: $skipped" -ForegroundColor Yellow
Write-Host "  Errors: $errors" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
