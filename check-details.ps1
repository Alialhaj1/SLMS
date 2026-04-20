Set-Location c:\projects\slms

# Check reference_data types
$sql1 = "SELECT type || '=' || count(*) FROM reference_data WHERE deleted_at IS NULL GROUP BY type ORDER BY type;"
$result1 = $sql1 | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1
Write-Host "=== REFERENCE DATA TYPES ==="
Write-Host $result1

# Check what tables exist related to what we need
$sql2 = "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('shipping_companies','shipment_classifications','group_categories','freight_agents','shipping_agents') ORDER BY tablename;"
$result2 = $sql2 | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1
Write-Host "=== EXISTING TABLES ==="
Write-Host $result2

# Verify company IDs
$sql3 = "SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY id;"
$result3 = $sql3 | docker compose exec -T -e PAGER=cat postgres psql -U slms -d slms_db --no-psqlrc -t -A -f - 2>&1
Write-Host "=== COMPANY IDS ==="
Write-Host $result3
