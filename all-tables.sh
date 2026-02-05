#!/bin/bash
echo "=== All Tables with Counts ==="
docker exec slms-postgres-prod psql -U slms_prod -d slms_production -c "
SELECT 
    schemaname,
    relname as table_name,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 30;
"
