# PowerShell script to add withPermission wrapper to remaining master pages
# These pages use a generic 'master:view' permission

$frontendPath = "c:\projects\slms\frontend-next\pages\master"

# List of remaining master pages that need permissions
$masterPages = @(
    "advance-types.tsx",
    "allowance-types.tsx",
    "asset-categories.tsx",
    "asset-locations.tsx",
    "asset-status.tsx",
    "backup-settings.tsx",
    "batch-numbers.tsx",
    "bill-of-lading-types.tsx",
    "bin-types.tsx",
    "border-points.tsx",
    "cash-boxes.tsx",
    "claim-status.tsx",
    "clearance-offices.tsx",
    "clearance-status.tsx",
    "contact-methods.tsx",
    "contact-types.tsx",
    "contract-approval-status.tsx",
    "contract-status.tsx",
    "cost-items.tsx",
    "counting-policies.tsx",
    "credit-limits.tsx",
    "customer-status.tsx",
    "customer-types.tsx",
    "customs-duties.tsx",
    "customs-fee-categories.tsx",
    "customs-offices.tsx",
    "deduction-types.tsx",
    "delivery-locations.tsx",
    "delivery-terms.tsx",
    "digital-signatures.tsx",
    "discount-agreements.tsx",
    "document-status.tsx",
    "drivers.tsx",
    "employee-status.tsx",
    "entry-exit-points.tsx",
    "expense-distribution.tsx",
    "expiry-policies.tsx",
    "external-warehouses.tsx",
    "forwarders.tsx",
    "freight-agents.tsx",
    "group-types.tsx",
    "hr-contract-status.tsx",
    "hr-contract-types.tsx",
    "hr-expense-types.tsx",
    "hs-codes.tsx",
    "insurance-companies.tsx",
    "insurance-types.tsx",
    "inventory-policies.tsx",
    "invoice-templates.tsx",
    "invoice-types.tsx",
    "item-grades.tsx",
    "item-types.tsx",
    "laboratories.tsx",
    "min-max-policies.tsx",
    "notice-types.tsx",
    "order-status.tsx",
    "parallel-currencies.tsx",
    "payment-types.tsx",
    "pricing-methods.tsx",
    "printed-templates.tsx",
    "profit-centers.tsx",
    "project-contract-types.tsx",
    "project-types.tsx",
    "purchase-order-templates.tsx",
    "purchase-order-types.tsx",
    "quality-status.tsx",
    "receipt-types.tsx",
    "record-status.tsx",
    "reorder-rules.tsx",
    "report-types.tsx",
    "request-status.tsx",
    "responsibility-centers.tsx",
    "risk-types.tsx",
    "shipment-cost-centers.tsx",
    "shipping-classifications.tsx",
    "supply-terms.tsx",
    "system-languages.tsx",
    "system-policies.tsx",
    "system-setup.tsx",
    "tariffs.tsx",
    "tax-categories.tsx",
    "tax-exemptions.tsx",
    "tax-item-categories.tsx",
    "tax-regions.tsx",
    "tax-zones.tsx",
    "time-zones.tsx",
    "tracking-policies.tsx",
    "transport-companies.tsx",
    "transport-routes.tsx",
    "ui-themes.tsx",
    "vehicle-types.tsx",
    "vehicles.tsx",
    "vendor-classifications.tsx",
    "vendor-payment-terms.tsx",
    "vendor-status.tsx",
    "vendor-types.tsx",
    "zakat-codes.tsx"
)

Write-Host "Starting permission wrapper addition for Master pages..." -ForegroundColor Cyan
Write-Host "Found $($masterPages.Count) pages to process" -ForegroundColor Yellow

$processed = 0
$skipped = 0
$errors = 0

foreach ($page in $masterPages) {
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

    # Use generic master permission
    $permission = "MenuPermissions.Master.View"
    
    try {
        # Add imports after first import block
        $importBlock = "import { withPermission } from '../utils/withPermission';`nimport { MenuPermissions } from '../config/menu.permissions';"
        
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
