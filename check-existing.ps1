Set-Location c:\projects\slms

# Check existing low-count data
$queries = @(
  "SELECT '--- customs_tariffs ---'; SELECT company_id, hs_code, country_code FROM customs_tariffs LIMIT 10;",
  "SELECT '--- customs_exemptions ---'; SELECT company_id, code, name_en FROM customs_exemptions LIMIT 10;",
  "SELECT '--- insurance_companies ---'; SELECT company_id, code, name_en FROM insurance_companies LIMIT 10;",
  "SELECT '--- laboratories ---'; SELECT company_id, code, name_en FROM laboratories LIMIT 10;",
  "SELECT '--- shipping_agents ---'; SELECT company_id, code, name_en FROM shipping_agents LIMIT 10;",
  "SELECT '--- shipment_stages (sample) ---'; SELECT company_id, code, name_en FROM shipment_stages LIMIT 10;",
  "SELECT '--- countries (SA) ---'; SELECT id, code, name FROM countries WHERE code IN ('SA','KW','AE','BH','OM','JO','YE','IQ','QA') LIMIT 10;",
  "SELECT '--- shipment_expense_types (sample) ---'; SELECT company_id, code, name_en FROM shipment_expense_types LIMIT 5;"
)

foreach ($q in $queries) {
  $result = $q | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1 | Where-Object { $_ -notmatch 'level=warning' }
  Write-Host $result
}
