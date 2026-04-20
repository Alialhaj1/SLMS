Set-Location c:\projects\slms
$tables = @(
  'shipment_types','incoterms','container_types','bill_of_lading_types',
  'insurance_types','border_points','ports','shipment_stages',
  'shipment_expense_types','shipping_companies','shipment_classifications',
  'customs_tariffs','customs_exemptions','customs_declaration_statuses',
  'insurance_companies','laboratories','project_types','group_categories',
  'item_categories','hs_codes','shipping_methods','system_languages',
  'ui_themes','request_statuses','reference_data','freight_agents','shipping_agents'
)
foreach ($t in $tables) {
  $sql = "SELECT '$t=' || count(*) FROM $t;"
  $result = $sql | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1
  if ($result -match "does not exist") {
    Write-Host "$t=NOT_EXISTS"
  } else {
    Write-Host $result
  }
}
