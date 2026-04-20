Push-Location c:\projects\slms

# Write SQL to temp file
@"
SELECT 'customs_duty_types=' || EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='customs_duty_types')::text;
SELECT 'supplier_bank_accounts=' || EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='supplier_bank_accounts')::text;
SELECT 'customs_duty_types_cols=' || string_agg(column_name, ',') FROM information_schema.columns WHERE table_name='customs_duty_types' AND table_schema='public';
SELECT 'supplier_bank_accounts_cols=' || string_agg(column_name, ',') FROM information_schema.columns WHERE table_name='supplier_bank_accounts' AND table_schema='public';
"@ | Set-Content -Path "temp-tbl-check.sql" -Encoding UTF8

docker compose exec -T postgres bash -c "PAGER=cat LESS='' psql -U slms -d slms_db --no-psqlrc -t -A" < temp-tbl-check.sql 2>&1

Pop-Location
