@echo off
docker exec slms-postgres-1 psql -U slms -d slms_db -c "SELECT 'shipments' as tbl, COUNT(*) FROM shipments UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers UNION ALL SELECT 'companies', COUNT(*) FROM companies;"
