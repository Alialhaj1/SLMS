# Script to create missing pages for SLMS
# Run from: c:\projects\slms

$pagesDir = "c:\projects\slms\frontend-next\pages"

# Template for simple pages
$pageTemplate = @'
import ComingSoonPage from '{IMPORT_PATH}';

export default function {PAGE_NAME}Page() {
  return (
    <ComingSoonPage 
      title="{TITLE_EN}"
      titleAr="{TITLE_AR}"
    />
  );
}
'@

# Define all missing pages with their metadata
$missingPages = @(
    # ========== MASTER PAGES ==========
    @{ path="master/exchange-rates"; titleEn="Exchange Rates"; titleAr="أسعار الصرف" },
    @{ path="master/banks"; titleEn="Banks"; titleAr="البنوك" },
    @{ path="master/notice-types"; titleEn="Notice Types"; titleAr="أنواع الإشعارات" },
    @{ path="master/receipt-types"; titleEn="Receipt Types"; titleAr="أنواع سندات القبض" },
    @{ path="master/payment-types"; titleEn="Payment Types"; titleAr="أنواع سندات الصرف" },
    @{ path="master/parallel-currencies"; titleEn="Parallel Currencies"; titleAr="العملات الموازية" },
    @{ path="master/invoice-types"; titleEn="Invoice Types"; titleAr="أنواع الفواتير" },
    @{ path="master/purchase-order-types"; titleEn="Purchase Order Types"; titleAr="أنواع أوامر الشراء" },
    @{ path="master/vendor-payment-terms"; titleEn="Vendor Payment Terms"; titleAr="شروط دفع الموردين" },
    @{ path="master/supply-terms"; titleEn="Supply Terms"; titleAr="شروط التوريد" },
    @{ path="master/contract-status"; titleEn="Contract Status"; titleAr="حالات العقود" },
    @{ path="master/contract-approval-status"; titleEn="Contract Approval Status"; titleAr="حالات اعتماد العقود" },
    @{ path="master/group-types"; titleEn="Group Types"; titleAr="أنواع المجموعات" },
    @{ path="master/shipping-methods"; titleEn="Shipping Methods"; titleAr="طرق الشحن" },
    @{ path="master/freight-agents"; titleEn="Freight Agents"; titleAr="وكلاء الشحن" },
    @{ path="master/customs-duties"; titleEn="Customs Duties"; titleAr="الرسوم الجمركية" },
    @{ path="master/clearance-status"; titleEn="Clearance Status"; titleAr="حالات التخليص" },
    @{ path="master/bill-of-lading-types"; titleEn="Bill of Lading Types"; titleAr="أنواع بوالص الشحن" },
    @{ path="master/insurance-types"; titleEn="Insurance Types"; titleAr="أنواع التأمين" },
    @{ path="master/tax-exemptions"; titleEn="Tax Exemptions"; titleAr="الإعفاءات الضريبية" },
    @{ path="master/tax-regions"; titleEn="Tax Regions"; titleAr="المناطق الضريبية" },
    @{ path="master/tax-categories"; titleEn="Tax Categories"; titleAr="فئات الضرائب" },
    @{ path="master/zakat-codes"; titleEn="Zakat Codes"; titleAr="رموز الزكاة" },
    @{ path="master/transport-companies"; titleEn="Transport Companies"; titleAr="شركات النقل" },
    @{ path="master/vehicle-types"; titleEn="Vehicle Types"; titleAr="أنواع المركبات" },
    @{ path="master/vehicles"; titleEn="Vehicles"; titleAr="المركبات" },
    @{ path="master/drivers"; titleEn="Drivers"; titleAr="السائقين" },
    @{ path="master/transport-routes"; titleEn="Transport Routes"; titleAr="خطوط النقل" },
    @{ path="master/delivery-locations"; titleEn="Delivery Locations"; titleAr="مواقع التسليم" },
    @{ path="master/external-warehouses"; titleEn="External Warehouses"; titleAr="المستودعات الخارجية" },
    @{ path="master/shipment-types"; titleEn="Shipment Types"; titleAr="أنواع الشحنات" },
    @{ path="master/document-status"; titleEn="Document Status"; titleAr="حالات المستندات" },
    @{ path="master/invoice-templates"; titleEn="Invoice Templates"; titleAr="قوالب الفواتير" },
    @{ path="master/purchase-order-templates"; titleEn="Purchase Order Templates"; titleAr="قوالب أوامر الشراء" },
    @{ path="master/asset-categories"; titleEn="Asset Categories"; titleAr="فئات الأصول" },
    @{ path="master/asset-locations"; titleEn="Asset Locations"; titleAr="مواقع الأصول" },
    @{ path="master/asset-status"; titleEn="Asset Status"; titleAr="حالات الأصول" },
    @{ path="master/responsibility-centers"; titleEn="Responsibility Centers"; titleAr="مراكز المسؤولية" },
    @{ path="master/customs-fee-categories"; titleEn="Customs Fee Categories"; titleAr="فئات الرسوم الجمركية" },
    @{ path="master/cost-items"; titleEn="Cost Items"; titleAr="بنود التكلفة" },
    @{ path="master/pricing-methods"; titleEn="Pricing Methods"; titleAr="طرق التسعير" },
    @{ path="master/quality-status"; titleEn="Quality Status"; titleAr="حالات الجودة" },
    @{ path="master/risk-types"; titleEn="Risk Types"; titleAr="أنواع المخاطر" },
    @{ path="master/claim-status"; titleEn="Claim Status"; titleAr="حالات المطالبات" },
    @{ path="master/report-types"; titleEn="Report Types"; titleAr="أنواع التقارير" },
    @{ path="master/project-contract-types"; titleEn="Project Contract Types"; titleAr="أنواع عقود المشاريع" },
    @{ path="master/profit-centers"; titleEn="Profit Centers"; titleAr="مراكز الربحية" },
    @{ path="master/shipment-cost-centers"; titleEn="Shipment Cost Centers"; titleAr="مراكز تكلفة الشحنات" },
    
    # ========== ACCOUNTING PAGES ==========
    @{ path="accounting/budgets"; titleEn="Budgets"; titleAr="الموازنات" },
    @{ path="accounting/opening-balances"; titleEn="Opening Balances"; titleAr="الأرصدة الافتتاحية" },
    @{ path="accounting/receipt-voucher"; titleEn="Receipt Voucher"; titleAr="سند القبض" },
    @{ path="accounting/payment-voucher"; titleEn="Payment Voucher"; titleAr="سند الصرف" },
    @{ path="accounting/cash-deposit"; titleEn="Cash Deposit"; titleAr="إيداع نقدي" },
    @{ path="accounting/bank-matching"; titleEn="Bank Matching"; titleAr="مطابقة البنك" },
    @{ path="accounting/bank-reconciliation"; titleEn="Bank Reconciliation"; titleAr="تسوية البنك" },
    @{ path="accounting/debit-notes"; titleEn="Debit Notes"; titleAr="إشعارات مدينة" },
    @{ path="accounting/credit-notes"; titleEn="Credit Notes"; titleAr="إشعارات دائنة" },
    @{ path="accounting/cash-inventory"; titleEn="Cash Inventory"; titleAr="جرد النقدية" },
    @{ path="accounting/prepaid-expenses"; titleEn="Prepaid Expenses"; titleAr="المصروفات المدفوعة مقدماً" },
    @{ path="accounting/deferred-revenue"; titleEn="Deferred Revenue"; titleAr="الإيرادات المؤجلة" },
    @{ path="accounting/cheques-due"; titleEn="Cheques Due"; titleAr="الشيكات المستحقة" },
    @{ path="accounting/customers-ledger"; titleEn="Customers Ledger"; titleAr="كشف حساب العملاء" },
    @{ path="accounting/suppliers-ledger"; titleEn="Suppliers Ledger"; titleAr="كشف حساب الموردين" },
    @{ path="accounting/inventory-ledger"; titleEn="Inventory Ledger"; titleAr="كشف حساب المخزون" },
    @{ path="accounting/cash-ledger"; titleEn="Cash Ledger"; titleAr="كشف حساب النقدية" },
    @{ path="accounting/accrued-revenue"; titleEn="Accrued Revenue"; titleAr="الإيرادات المستحقة" },
    @{ path="accounting/default-accounts"; titleEn="Default Accounts"; titleAr="الحسابات الافتراضية" },
    @{ path="accounting/reports/cash-flow"; titleEn="Cash Flow Statement"; titleAr="قائمة التدفق النقدي" },
    
    # ========== SALES PAGES ==========
    @{ path="sales/quotations"; titleEn="Sales Quotations"; titleAr="عروض الأسعار" },
    @{ path="sales/customer-contracts"; titleEn="Customer Contracts"; titleAr="عقود العملاء" },
    @{ path="sales/orders"; titleEn="Sales Orders"; titleAr="أوامر البيع" },
    @{ path="sales/invoices"; titleEn="Sales Invoices"; titleAr="فواتير المبيعات" },
    @{ path="sales/returns"; titleEn="Sales Returns"; titleAr="مرتجعات المبيعات" },
    @{ path="sales/price-lists"; titleEn="Price Lists"; titleAr="قوائم الأسعار" },
    @{ path="sales/discount-agreements"; titleEn="Discount Agreements"; titleAr="اتفاقيات الخصم" },
    
    # ========== PURCHASING PAGES ==========
    @{ path="purchasing/invoices"; titleEn="Purchase Invoices"; titleAr="فواتير المشتريات" },
    @{ path="purchasing/orders"; titleEn="Purchase Orders"; titleAr="أوامر الشراء" },
    @{ path="purchasing/quotations"; titleEn="Purchase Quotations"; titleAr="طلبات عروض الأسعار" },
    @{ path="purchasing/contracts"; titleEn="Purchase Contracts"; titleAr="عقود الشراء" },
    @{ path="purchasing/returns"; titleEn="Purchase Returns"; titleAr="مرتجعات المشتريات" },
    @{ path="purchasing/vendor-price-lists"; titleEn="Vendor Price Lists"; titleAr="قوائم أسعار الموردين" },
    @{ path="purchasing/vendor-credit-limits"; titleEn="Vendor Credit Limits"; titleAr="حدود ائتمان الموردين" },
    
    # ========== ASSETS PAGES ==========
    @{ path="assets/fixed-assets"; titleEn="Fixed Assets"; titleAr="الأصول الثابتة" },
    @{ path="assets/depreciation-schedules"; titleEn="Depreciation Schedules"; titleAr="جداول الإهلاك" },
    @{ path="assets/maintenance-contracts"; titleEn="Maintenance Contracts"; titleAr="عقود الصيانة" },
    
    # ========== SHIPPING PAGES ==========
    @{ path="shipping/documents"; titleEn="Shipping Documents"; titleAr="مستندات الشحن" },
    @{ path="shipping/bill-of-lading"; titleEn="Bill of Lading"; titleAr="بوليصة الشحن" },
    @{ path="shipping/contracts"; titleEn="Shipping Contracts"; titleAr="عقود الشحن" },
    @{ path="shipping/schedules"; titleEn="Shipping Schedules"; titleAr="جداول الشحن" },
    @{ path="shipping/insurance"; titleEn="Shipping Insurance"; titleAr="تأمين الشحن" },
    
    # ========== HR PAGES ==========
    @{ path="hr/employees"; titleEn="Employees"; titleAr="الموظفين" },
    @{ path="hr/salaries"; titleEn="Salaries"; titleAr="الرواتب" },
    @{ path="hr/advances"; titleEn="Salary Advances"; titleAr="السلف" },
    @{ path="hr/expenses"; titleEn="Employee Expenses"; titleAr="مصروفات الموظفين" },
    
    # ========== CRM PAGES ==========
    @{ path="crm/addresses"; titleEn="Customer Addresses"; titleAr="عناوين العملاء" },
    @{ path="crm/contacts"; titleEn="Contacts"; titleAr="جهات الاتصال" },
    @{ path="crm/opportunities"; titleEn="Sales Opportunities"; titleAr="الفرص البيعية" },
    @{ path="crm/follow-up"; titleEn="Follow Up"; titleAr="المتابعة" },
    
    # ========== CUSTOMS PAGES ==========
    @{ path="customs/declarations"; titleEn="Customs Declarations"; titleAr="البيانات الجمركية" },
    @{ path="customs/clearance-documents"; titleEn="Clearance Documents"; titleAr="مستندات التخليص" },
    
    # ========== COMPLIANCE PAGES ==========
    @{ path="compliance/conformity-certificates"; titleEn="Conformity Certificates"; titleAr="شهادات المطابقة" },
    @{ path="compliance/origin-certificates"; titleEn="Origin Certificates"; titleAr="شهادات المنشأ" },
    @{ path="compliance/licenses"; titleEn="Licenses"; titleAr="التراخيص" },
    @{ path="compliance/regulations"; titleEn="Regulations"; titleAr="اللوائح" },
    
    # ========== DOCUMENTS PAGES ==========
    @{ path="documents/warranty"; titleEn="Warranty Documents"; titleAr="مستندات الضمان" },
    @{ path="documents/letter-of-credit"; titleEn="Letter of Credit"; titleAr="خطابات الاعتماد" },
    
    # ========== PROJECTS PAGES ==========
    @{ path="projects/index"; titleEn="Projects"; titleAr="المشاريع" },
    @{ path="projects/phases"; titleEn="Project Phases"; titleAr="مراحل المشاريع" },
    
    # ========== QUALITY PAGES ==========
    @{ path="quality/approved-vendors"; titleEn="Approved Vendors"; titleAr="الموردين المعتمدين" },
    
    # ========== RISKS PAGES ==========
    @{ path="risks/insurance-documents"; titleEn="Insurance Documents"; titleAr="وثائق التأمين" },
    
    # ========== INVENTORY PAGES ==========
    @{ path="inventory/item-expiry"; titleEn="Item Expiry"; titleAr="انتهاء صلاحية الأصناف" },
    
    # ========== INTEGRATIONS PAGES ==========
    @{ path="integrations/payment-gateways"; titleEn="Payment Gateways"; titleAr="بوابات الدفع" },
    @{ path="integrations/shipping-companies"; titleEn="Shipping Company Integration"; titleAr="تكامل شركات الشحن" },
    @{ path="integrations/banks"; titleEn="Bank Integration"; titleAr="تكامل البنوك" },
    
    # ========== NOTIFICATIONS PAGES ==========
    @{ path="notifications/payment-reminders"; titleEn="Payment Reminders"; titleAr="تذكيرات الدفع" },
    @{ path="notifications/renewal-alerts"; titleEn="Renewal Alerts"; titleAr="تنبيهات التجديد" },
    
    # ========== REPORTS PAGES ==========
    @{ path="reports/general"; titleEn="General Reports"; titleAr="التقارير العامة" },
    @{ path="reports/reference-data"; titleEn="Reference Data Reports"; titleAr="تقارير البيانات المرجعية" },
    @{ path="reports/purchasing"; titleEn="Purchasing Reports"; titleAr="تقارير المشتريات" },
    @{ path="reports/customs"; titleEn="Customs Reports"; titleAr="تقارير الجمارك" },
    @{ path="reports/costs-pricing"; titleEn="Costs & Pricing Reports"; titleAr="تقارير التكاليف والتسعير" },
    @{ path="reports/compliance"; titleEn="Compliance Reports"; titleAr="تقارير الامتثال" },
    @{ path="reports/hr"; titleEn="HR Reports"; titleAr="تقارير الموارد البشرية" },
    @{ path="reports/security"; titleEn="Security Reports"; titleAr="تقارير الأمان" },
    @{ path="reports/notifications"; titleEn="Notification Reports"; titleAr="تقارير الإشعارات" },
    @{ path="reports/warehouses"; titleEn="Warehouse Reports"; titleAr="تقارير المستودعات" },
    @{ path="reports/quality"; titleEn="Quality Reports"; titleAr="تقارير الجودة" },
    @{ path="reports/risks"; titleEn="Risk Reports"; titleAr="تقارير المخاطر" },
    @{ path="reports/kpis"; titleEn="KPI Reports"; titleAr="تقارير مؤشرات الأداء" },
    @{ path="reports/analytical-templates"; titleEn="Analytical Templates"; titleAr="القوالب التحليلية" },
    @{ path="reports/index"; titleEn="All Reports"; titleAr="جميع التقارير" },
    @{ path="reports/integrations"; titleEn="Integration Reports"; titleAr="تقارير التكاملات" },
    
    # ========== SETTINGS PAGES ==========
    @{ path="settings/email"; titleEn="Email Settings"; titleAr="إعدادات البريد الإلكتروني" },
    @{ path="settings/sms-whatsapp"; titleEn="SMS & WhatsApp Settings"; titleAr="إعدادات الرسائل وواتساب" },
    
    # ========== SHIPMENTS PAGES ==========
    @{ path="shipments/tracking"; titleEn="Shipment Tracking"; titleAr="تتبع الشحنات" }
)

$createdCount = 0
$skippedCount = 0

foreach ($page in $missingPages) {
    $fullPath = Join-Path $pagesDir "$($page.path).tsx"
    $dir = Split-Path $fullPath -Parent
    
    # Create directory if not exists
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Green
    }
    
    # Skip if file already exists
    if (Test-Path $fullPath) {
        Write-Host "Skipped (exists): $($page.path)" -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    # Calculate import path
    $depth = ($page.path -split '/').Count
    $importPath = ("../" * $depth) + "components/pages/ComingSoonPage"
    
    # Generate page name
    $pageName = ($page.path -split '/')[-1] -replace '-', ' '
    $pageName = (Get-Culture).TextInfo.ToTitleCase($pageName) -replace ' ', ''
    
    # Generate content
    $content = $pageTemplate -replace '{IMPORT_PATH}', $importPath
    $content = $content -replace '{PAGE_NAME}', $pageName
    $content = $content -replace '{TITLE_EN}', $page.titleEn
    $content = $content -replace '{TITLE_AR}', $page.titleAr
    
    # Write file
    Set-Content -Path $fullPath -Value $content -Encoding UTF8
    Write-Host "Created: $($page.path)" -ForegroundColor Cyan
    $createdCount++
}

Write-Host "`n========================================" -ForegroundColor White
Write-Host "Summary:" -ForegroundColor White
Write-Host "  Created: $createdCount pages" -ForegroundColor Green
Write-Host "  Skipped: $skippedCount pages (already exist)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor White
