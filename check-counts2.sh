#!/bin/bash
for t in shipment_types incoterms container_types bill_of_lading_types insurance_types border_points ports shipment_stages shipment_expense_types shipping_companies shipment_classifications customs_tariffs customs_exemptions customs_declaration_statuses insurance_companies laboratories project_types group_categories item_categories hs_codes shipping_methods system_languages ui_themes request_statuses reference_data freight_agents; do
  cnt=$(psql -U slms -d slms_db --no-psqlrc -t -A -c "SELECT count(*) FROM $t" 2>/dev/null)
  echo "$t=$cnt"
done
