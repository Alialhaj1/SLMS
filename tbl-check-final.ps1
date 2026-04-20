Set-Location c:\projects\slms

$result = docker compose exec -T postgres bash -c "PAGER=cat LESS='' LESSOPEN='' psql -U slms -d slms_db --no-psqlrc -t -A -c 'SELECT tablename FROM pg_tables WHERE schemaname=chr(112)||chr(117)||chr(98)||chr(108)||chr(105)||chr(99) AND (tablename=chr(99)||chr(117)||chr(115)||chr(116)||chr(111)||chr(109)||chr(115)||chr(95)||chr(100)||chr(117)||chr(116)||chr(121)||chr(95)||chr(116)||chr(121)||chr(112)||chr(101)||chr(115) OR tablename=chr(115)||chr(117)||chr(112)||chr(112)||chr(108)||chr(105)||chr(101)||chr(114)||chr(95)||chr(98)||chr(97)||chr(110)||chr(107)||chr(95)||chr(97)||chr(99)||chr(99)||chr(111)||chr(117)||chr(110)||chr(116)||chr(115));'" 2>&1

Write-Host "=== TABLE CHECK RESULT ==="
if ($result) {
    Write-Host "Found tables: $result"
} else {
    Write-Host "NO tables found (customs_duty_types and supplier_bank_accounts do NOT exist)"
}
Write-Host "=== END ==="
